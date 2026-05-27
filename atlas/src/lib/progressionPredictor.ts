/**
 * Predictive load progression algorithm.
 *
 * Uses 5 signals to predict readiness to progress BEFORE a session:
 * 1. e1RM trend (last 4 sessions) — is strength increasing?
 * 2. Average RPE trend — are sessions getting easier?
 * 3. Rep quality — hitting upper end of rep range?
 * 4. Consistency — % of sets completed
 * 5. Recovery — ACWR + days since last session
 *
 * All functions are pure and deterministic.
 */

import type { Session, PlannedExercise } from "@/data/types";
import type { ReadinessState } from "@/hooks/useReadiness";
import { average1RM, roundWeight, getProgressionIncrement } from "@/lib/loadCalculator";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProgressionPrediction {
  exerciseId: string;
  recommendedWeight: number;
  confidence: "high" | "medium" | "low";
  basis: string;
  readyToProgress: boolean;
  estimatedSessionsUntilProgression: number;
}

// ─── Core Algorithm ─────────────────────────────────────────────────────────

/**
 * Predict whether a user is ready to increase weight on an exercise.
 *
 * SCORE BREAKDOWN (0-100):
 * - e1RM trend increasing: +30
 * - Average RPE decreasing (getting easier): +25
 * - Rep quality ≥80%: +25, ≥60%: +15
 * - Completion rate ≥90%: +20, ≥70%: +10
 *
 * Ready to progress if score ≥ 60 AND readiness ≥ 55
 *
 * @param exerciseId - The exercise to predict for
 * @param sessions - All historical sessions
 * @param plan - The planned exercise configuration
 * @param readiness - Current readiness state
 * @returns ProgressionPrediction with recommendation
 */
export function predictProgression(
  exerciseId: string,
  sessions: Session[],
  plan: PlannedExercise,
  readiness: ReadinessState,
): ProgressionPrediction {
  const recentSessions = getLastNSessionsForExercise(exerciseId, sessions, 4);

  if (recentSessions.length < 2) {
    return {
      exerciseId,
      recommendedWeight: plan.lastWeight ?? 20,
      confidence: "low",
      basis: "Need more data — complete 2+ sessions first",
      readyToProgress: false,
      estimatedSessionsUntilProgression: 2 - recentSessions.length,
    };
  }

  // Signal 1: e1RM trend
  const e1rmTrend = analyzeE1RMTrend(recentSessions, exerciseId);

  // Signal 2: RPE trend
  const rpeTrend = analyzeRPETrend(recentSessions, exerciseId);

  // Signal 3: Rep quality
  const repQuality = computeRepQuality(recentSessions, exerciseId, plan.reps);

  // Signal 4: Consistency
  const completionRate = computeCompletionRate(recentSessions, exerciseId);

  // Composite score
  const score =
    (e1rmTrend === "increasing" ? 30 : 0) +
    (rpeTrend === "decreasing" ? 25 : 0) +
    (repQuality >= 0.8 ? 25 : repQuality >= 0.6 ? 15 : 0) +
    (completionRate >= 0.9 ? 20 : completionRate >= 0.7 ? 10 : 0);

  const readyToProgress = score >= 60 && readiness.score >= 55;
  const increment = getProgressionIncrement(plan.lastWeight ?? 0);

  return {
    exerciseId,
    recommendedWeight: readyToProgress
      ? roundWeight((plan.lastWeight ?? 0) + increment)
      : plan.lastWeight ?? 0,
    confidence: score >= 80 ? "high" : score >= 50 ? "medium" : "low",
    basis: buildBasisString(e1rmTrend, rpeTrend, repQuality, completionRate),
    readyToProgress,
    estimatedSessionsUntilProgression: readyToProgress
      ? 0
      : Math.ceil((60 - score) / 15),
  };
}

// ─── Signal Analyzers ───────────────────────────────────────────────────────

/**
 * Get the last N sessions that contain a specific exercise.
 */
function getLastNSessionsForExercise(
  exerciseId: string,
  sessions: Session[],
  n: number,
): Session[] {
  return sessions
    .filter((s) => s.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, n);
}

/**
 * Analyze e1RM trend across recent sessions.
 */
function analyzeE1RMTrend(
  sessions: Session[],
  exerciseId: string,
): "increasing" | "stable" | "declining" {
  const e1rms = sessions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((s) => {
      const log = s.exercises.find((e) => e.exerciseId === exerciseId);
      if (!log) return 0;
      const bestSet = log.sets
        .filter((set) => set.done && set.reps > 0 && set.weight > 0)
        .reduce(
          (best, set) => {
            const est = average1RM(set.weight, set.reps);
            return est > best.est ? { est, set } : best;
          },
          { est: 0, set: log.sets[0] },
        );
      return bestSet.est;
    })
    .filter((v) => v > 0);

  if (e1rms.length < 2) return "stable";

  const first = e1rms[0];
  const last = e1rms[e1rms.length - 1];
  const change = last - first;

  if (change > 1) return "increasing";
  if (change < -1) return "declining";
  return "stable";
}

/**
 * Analyze RPE trend — decreasing RPE means sessions are getting easier.
 */
function analyzeRPETrend(
  sessions: Session[],
  exerciseId: string,
): "decreasing" | "stable" | "increasing" {
  const avgRPEs = sessions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((s) => {
      const log = s.exercises.find((e) => e.exerciseId === exerciseId);
      if (!log) return null;
      const rpes = log.sets.filter((set) => set.done && set.rpe !== undefined).map((set) => set.rpe!);
      if (rpes.length === 0) return null;
      return rpes.reduce((sum, r) => sum + r, 0) / rpes.length;
    })
    .filter((v): v is number => v !== null);

  if (avgRPEs.length < 2) return "stable";

  const first = avgRPEs[0];
  const last = avgRPEs[avgRPEs.length - 1];
  const change = last - first;

  if (change < -0.5) return "decreasing"; // Getting easier
  if (change > 0.5) return "increasing"; // Getting harder
  return "stable";
}

/**
 * Compute rep quality: ratio of sets hitting the upper end of the rep range.
 */
function computeRepQuality(
  sessions: Session[],
  exerciseId: string,
  targetReps: string,
): number {
  const maxTarget = parseInt(targetReps.split("-").pop() || "12");

  let totalSets = 0;
  let qualitySets = 0;

  for (const session of sessions) {
    const log = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!log) continue;

    for (const set of log.sets) {
      if (!set.done) continue;
      totalSets++;
      if (set.reps >= maxTarget) qualitySets++;
    }
  }

  return totalSets > 0 ? qualitySets / totalSets : 0;
}

/**
 * Compute completion rate: ratio of completed sets to total sets.
 */
function computeCompletionRate(
  sessions: Session[],
  exerciseId: string,
): number {
  let totalSets = 0;
  let completedSets = 0;

  for (const session of sessions) {
    const log = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!log) continue;

    totalSets += log.sets.length;
    completedSets += log.sets.filter((s) => s.done).length;
  }

  return totalSets > 0 ? completedSets / totalSets : 0;
}

/**
 * Build a human-readable basis string from the signals.
 */
function buildBasisString(
  e1rmTrend: string,
  rpeTrend: string,
  repQuality: number,
  completionRate: number,
): string {
  const parts: string[] = [];

  if (e1rmTrend === "increasing") parts.push("strength trending up");
  if (rpeTrend === "decreasing") parts.push("sessions getting easier");
  if (repQuality >= 0.8) parts.push("hitting top of rep range");
  if (completionRate >= 0.9) parts.push("high consistency");

  if (parts.length === 0) {
    return "More data needed for confident prediction";
  }

  return parts.join(", ");
}