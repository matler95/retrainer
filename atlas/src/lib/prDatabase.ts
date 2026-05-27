/**
 * Per-rep PR (Personal Record) database.
 *
 * Tracks PRs at common rep milestones per exercise:
 * 1RM, 3RM, 5RM, 8RM, 10RM, 12RM, 20RM
 *
 * After each session, scans sets for new PRs by comparing
 * weight at each rep milestone against historical bests.
 *
 * All functions are pure and deterministic.
 */

import type { Session, ExercisePR, RepMilestone } from "@/data/types";
import { average1RM } from "@/lib/loadCalculator";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Common rep milestones for PR tracking */
const REP_MILESTONES: RepMilestone[] = [1, 2, 3, 4, 5, 6, 8, 10, 12, 20];

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Find the nearest rep milestone for a given rep count.
 * E.g., 7 reps → 8, 4 reps → 5, 11 reps → 12
 */
export function nearestRepMilestone(reps: number): RepMilestone {
  let closest: RepMilestone = 1;
  let minDiff = Infinity;

  for (const milestone of REP_MILESTONES) {
    const diff = Math.abs(reps - milestone);
    if (diff < minDiff) {
      minDiff = diff;
      closest = milestone;
    }
  }

  return closest;
}

/**
 * Detect new PRs from a completed session.
 *
 * Scans all completed sets and compares against existing PRs.
 * Returns only newly achieved PRs (weight exceeds previous best at that rep milestone).
 *
 * @param session - The completed session
 * @param existingPRs - Current PR database
 * @returns Array of new PR records
 */
export function detectNewPRs(
  session: Session,
  existingPRs: ExercisePR[],
): ExercisePR[] {
  const newPRs: ExercisePR[] = [];

  for (const exerciseLog of session.exercises) {
    for (const set of exerciseLog.sets) {
      if (!set.done || set.reps <= 0 || set.weight <= 0) continue;

      const repKey = nearestRepMilestone(set.reps);
      const existing = existingPRs.find(
        (pr) =>
          pr.exerciseId === exerciseLog.exerciseId &&
          pr.repCount === repKey,
      );

      // New PR if no existing record or weight exceeds previous best
      if (!existing || set.weight > existing.weightKg) {
        newPRs.push({
          exerciseId: exerciseLog.exerciseId,
          repCount: repKey,
          weightKg: set.weight,
          achievedAt: session.date,
          sessionId: session.id,
          estimated1RM: Math.round(average1RM(set.weight, set.reps) * 100) / 100,
        });
      }
    }
  }

  return newPRs;
}

/**
 * Get the best PR for a specific exercise at a specific rep milestone.
 */
export function getBestPR(
  exerciseId: string,
  repCount: RepMilestone,
  prs: ExercisePR[],
): ExercisePR | null {
  const matching = prs.filter(
    (pr) => pr.exerciseId === exerciseId && pr.repCount === repCount,
  );

  if (matching.length === 0) return null;

  return matching.reduce((best, pr) =>
    pr.weightKg > best.weightKg ? pr : best,
  );
}

/**
 * Get all PRs for a specific exercise, sorted by rep count.
 */
export function getExercisePRs(
  exerciseId: string,
  prs: ExercisePR[],
): ExercisePR[] {
  return prs
    .filter((pr) => pr.exerciseId === exerciseId)
    .sort((a, b) => a.repCount - b.repCount);
}

/**
 * Get the best estimated 1RM for a specific exercise from PR data.
 */
export function getBestE1RM(
  exerciseId: string,
  prs: ExercisePR[],
): number {
  const exercisePRs = getExercisePRs(exerciseId, prs);
  if (exercisePRs.length === 0) return 0;
  return Math.max(...exercisePRs.map((pr) => pr.estimated1RM));
}

/**
 * Back-compute PRs from historical sessions.
 * Useful for initializing the PR database from existing session history.
 *
 * @param sessions - All historical sessions (newest first)
 * @returns Complete PR database
 */
export function backComputePRs(sessions: Session[]): ExercisePR[] {
  const allPRs: ExercisePR[] = [];

  // Process sessions oldest first for correct PR detection
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  for (const session of sorted) {
    const newPRs = detectNewPRs(session, allPRs);
    allPRs.push(...newPRs);
  }

  return allPRs;
}

/**
 * Get a summary of PR activity for a given time period.
 */
export function getPRSummary(
  prs: ExercisePR[],
  sinceDate?: string,
): {
  totalPRs: number;
  byExercise: Record<string, number>;
  bestE1RMImprovement: { exerciseId: string; improvement: number } | null;
} {
  const filtered = sinceDate
    ? prs.filter((pr) => pr.achievedAt >= sinceDate)
    : prs;

  const byExercise: Record<string, number> = {};
  for (const pr of filtered) {
    byExercise[pr.exerciseId] = (byExercise[pr.exerciseId] ?? 0) + 1;
  }

  return {
    totalPRs: filtered.length,
    byExercise,
    bestE1RMImprovement: null, // Would need historical e1RM comparison
  };
}