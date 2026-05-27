/**
 * Post-workout session summary computation.
 *
 * Computes a comprehensive summary after a workout session including:
 * - Total volume (weight × reps)
 * - PRs breached
 * - Average RPE
 * - Top set
 * - Progression decisions for each exercise
 * - Next session hints
 * - Duration
 *
 * All functions are pure and deterministic.
 */

import type { Session, SessionExerciseLog, SetLog, PlannedExercise } from "@/data/types";
import { EXERCISES } from "@/data/exercises";
import { average1RM, roundWeight, getProgressionIncrement } from "@/lib/loadCalculator";
import { assessExerciseProgress, type ProgressionDecision } from "@/lib/progressionEngine";
import { analyzeE1RMTrend, type E1RMRecord } from "@/lib/loadCalculator";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SessionSummary {
  /** Session duration in minutes */
  duration: number;
  /** Total volume: sum of (weight × reps) for all completed sets */
  totalVolume: number;
  /** Number of completed sets */
  setsCompleted: number;
  /** Total number of planned sets */
  setsPlanned: number;
  /** PRs breached during this session */
  prsBreached: PRBreach[];
  /** Average RPE across all completed sets with RPE logged */
  avgRpe: number;
  /** The single best set (highest estimated 1RM) */
  topSet: { exercise: string; weight: number; reps: number; e1rm: number } | null;
  /** Progression decisions per exercise */
  progressionDecisions: ExerciseProgressionResult[];
  /** Hint for the next session */
  nextSessionHint: string;
  /** Completion rate */
  completionRate: number;
}

export interface PRBreach {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  previousBest: number;
}

export interface ExerciseProgressionResult {
  exerciseId: string;
  exerciseName: string;
  decision: ProgressionDecision;
}

// ─── Core Computation ───────────────────────────────────────────────────────

/**
 * Compute a comprehensive session summary from a completed workout.
 *
 * @param session - The completed session
 * @param planExercises - The planned exercises for this day
 * @param allSessions - All historical sessions for PR detection
 * @returns SessionSummary with all computed metrics
 */
export function computeSessionSummary(
  session: Session,
  planExercises: PlannedExercise[],
  allSessions: Session[],
): SessionSummary {
  // ── Volume & sets ──
  let totalVolume = 0;
  let setsCompleted = 0;
  let setsPlanned = 0;
  let rpeSum = 0;
  let rpeCount = 0;
  let topE1RM = 0;
  let topSet: SessionSummary["topSet"] = null;

  const prsBreached: PRBreach[] = [];
  const progressionDecisions: ExerciseProgressionResult[] = [];

  for (const exerciseLog of session.exercises) {
    const exercise = EXERCISES.find((e) => e.id === exerciseLog.exerciseId);
    const planEx = planExercises.find((pe) => pe.exerciseId === exerciseLog.exerciseId);

    setsPlanned += exerciseLog.sets.length;

    for (const set of exerciseLog.sets) {
      if (!set.done) continue;

      setsCompleted++;
      const volume = set.weight * Math.max(1, set.reps);
      totalVolume += volume;

      if (set.rpe !== undefined) {
        rpeSum += set.rpe;
        rpeCount++;
      }

      // Track top set
      const e1rm = average1RM(set.weight, Math.max(1, set.reps));
      if (e1rm > topE1RM) {
        topE1RM = e1rm;
        topSet = {
          exercise: exercise?.name ?? exerciseLog.exerciseId,
          weight: set.weight,
          reps: set.reps,
          e1rm: Math.round(e1rm * 100) / 100,
        };
      }

      // PR detection: compare against historical best
      const historicalBest = getHistoricalBestE1RM(
        exerciseLog.exerciseId,
        set.reps,
        allSessions,
      );

      if (e1rm > historicalBest && historicalBest > 0) {
        prsBreached.push({
          exerciseId: exerciseLog.exerciseId,
          exerciseName: exercise?.name ?? exerciseLog.exerciseId,
          weight: set.weight,
          reps: set.reps,
          estimated1RM: Math.round(e1rm * 100) / 100,
          previousBest: Math.round(historicalBest * 100) / 100,
        });
      }
    }

    // Progression decision for this exercise
    if (planEx) {
      const decision = assessExerciseProgress(
        planEx,
        {
          lastWeight: planEx.lastWeight,
          sets: exerciseLog.sets,
        },
      );

      progressionDecisions.push({
        exerciseId: exerciseLog.exerciseId,
        exerciseName: exercise?.name ?? exerciseLog.exerciseId,
        decision,
      });
    }
  }

  const avgRpe = rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : 0;
  const completionRate = setsPlanned > 0 ? Math.round((setsCompleted / setsPlanned) * 100) : 0;

  // ── Duration ──
  const duration = session.durationMin ?? estimateDuration(session);

  // ── Next session hint ──
  const nextSessionHint = buildNextSessionHint(progressionDecisions);

  return {
    duration,
    totalVolume: Math.round(totalVolume),
    setsCompleted,
    setsPlanned,
    prsBreached,
    avgRpe,
    topSet,
    progressionDecisions,
    nextSessionHint,
    completionRate,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Get the historical best e1RM for a specific exercise at a given rep count.
 */
function getHistoricalBestE1RM(
  exerciseId: string,
  reps: number,
  allSessions: Session[],
): number {
  let best = 0;

  for (const session of allSessions) {
    for (const exerciseLog of session.exercises) {
      if (exerciseLog.exerciseId !== exerciseId) continue;

      for (const set of exerciseLog.sets) {
        if (!set.done) continue;
        const e1rm = average1RM(set.weight, Math.max(1, set.reps));
        if (e1rm > best) best = e1rm;
      }
    }
  }

  return best;
}

/**
 * Estimate session duration from timestamps if not explicitly set.
 */
function estimateDuration(session: Session): number {
  if (session.startedAt && session.finishedAt) {
    const start = new Date(session.startedAt).getTime();
    const end = new Date(session.finishedAt).getTime();
    return Math.round((end - start) / (1000 * 60));
  }
  // Rough estimate: ~3-4 min per set
  const totalSets = session.exercises.reduce(
    (sum, e) => sum + e.sets.filter((s) => s.done).length,
    0,
  );
  return Math.round(totalSets * 3.5);
}

/**
 * Build a hint for the next session based on progression decisions.
 */
function buildNextSessionHint(decisions: ExerciseProgressionResult[]): string {
  const increasing = decisions.filter((d) => d.decision.action === "increase");
  const maintaining = decisions.filter((d) => d.decision.action === "maintain");
  const deloading = decisions.filter((d) => d.decision.action === "deload");

  if (increasing.length > 0) {
    const ex = increasing[0];
    return `Next time: try ${ex.decision.nextWeight}kg on ${ex.exerciseName} 🎯`;
  }

  if (deloading.length > 0) {
    return `Consider a lighter session — ${deloading[0].exerciseName} needs recovery.`;
  }

  if (maintaining.length > 0) {
    return `Keep building consistency. Aim for top of rep range next session.`;
  }

  return "Great session! Keep showing up. 💪";
}