/**
 * Deterministic progression engine for exercise load decisions.
 *
 * This engine uses a clear decision tree to recommend:
 * - increase load — user hit all reps at low RPE
 * - maintain load — user hit reps but RPE was high
 * - technique focus — user missed multiple sets
 * - deload — plateau or declining e1RM detected
 * - variation — long-term plateau, suggest exercise swap
 *
 * All decisions are deterministic — no randomness, no ML.
 * Every recommendation includes an explanation of WHY.
 */

import type { PlannedExercise, Session } from "@/store/useAppStore";
import type { E1RMRecord, E1RMTrendResult } from "@/lib/loadCalculator";
import { analyzeE1RMTrend } from "@/lib/loadCalculator";

export interface ProgressionDecision {
  /** Human-readable explanation of the recommendation */
  message: string;
  /** Suggested weight for next session */
  nextWeight: number;
  /**
   * Recommended action:
   * - increase: Add weight next session
   * - maintain: Keep weight, focus on technique
   * - deload: Reduce load significantly
   * - technique: Stay at weight but work on form
   * - variation: Consider a different exercise variation
   */
  action: "increase" | "maintain" | "deload" | "technique" | "variation";
  /** Additional context for why this decision was made */
  reasoning: string;
}

/**
 * Thresholds for progression decisions.
 * These are constants to avoid magic numbers and make the decision tree transparent.
 */
const PROGRESSION_THRESHOLDS = {
  /** Average RPE below this threshold → increase weight */
  INCREASE_RPE_MAX: 7.5,
  /** Average RPE above this threshold → maintain (high effort) */
  HIGH_RPE_MIN: 8.5,
  /** Number of failed sets (below target min reps) to trigger technique focus */
  FAILED_SET_THRESHOLD: 2,
  /** Plateau: consecutive sessions without any weight increase */
  PLATEAU_SESSION_COUNT: 3,
  /** Long plateau: sessions without progress → suggest variation */
  LONG_PLATEAU_SESSION_COUNT: 6,
  /** e1RM decline rate (kg/week) below this triggers deload */
  E1RM_DECLINE_THRESHOLD: -2,
  /** Minimum weight to use standard progression increments */
  STANDARD_PROGRESSION_MIN: 60,
  /** e1RM trend needs at least this many data points to be reliable */
  MIN_E1RM_TREND_POINTS: 3,
} as const;

/**
 * Assess exercise progress based on logged sets and e1RM trend.
 *
 * DECISION TREE (evaluated in order):
 * 1. If e1RM trend is declining → deload
 * 2. If long plateau detected → suggest variation
 * 3. If plateau detected → deload
 * 4. If all sets hit target and RPE ≤ 7.5 → increase weight
 * 5. If all sets hit target but RPE > 8.5 → maintain (too close to failure)
 * 6. If 2+ sets failed minimum reps → technique focus
 * 7. If all sets hit target with moderate RPE (7.5 - 8.5) → maintain
 * 8. Otherwise → maintain with encouragement
 *
 * @param plan - The planned exercise from the plan
 * @param log - The actual logged sets with weight, reps, RPE
 * @param e1rmTrend - Optional e1RM trend analysis for plateau/deload detection
 * @returns Progression decision with explanation
 */
export function assessExerciseProgress(
  plan: PlannedExercise,
  log: Pick<PlannedExercise, "lastWeight"> & {
    sets: { reps: number; weight: number; rpe?: number; done: boolean }[];
  },
  e1rmTrend?: E1RMTrendResult,
): ProgressionDecision {
  const targetReps = plan.reps; // e.g., "8-12"
  const maxTarget = parseInt(targetReps.split("-").pop() || "0");
  const targetMin = parseInt(targetReps.split("-")[0] || "0");
  const completedSets = log.sets.filter((set) => set.done);
  const lastWeight = log.lastWeight ?? 0;

  // No completed sets — no data to decide
  if (completedSets.length === 0) {
    return {
      message: "No completed sets logged. Start with a conservative weight.",
      nextWeight: lastWeight || 20,
      action: "maintain",
      reasoning: "No data available — starting conservative.",
    };
  }

  const allHit = completedSets.every(
    (set) => set.reps >= maxTarget && set.weight > 0,
  );
  const avgRpe =
    completedSets.reduce((sum, set) => sum + (set.rpe ?? 7), 0) /
    completedSets.length;
  const failedSets = completedSets.filter((set) => set.reps < targetMin).length;

  // Step 1: Declining e1RM trend → deload
  if (
    e1rmTrend &&
    e1rmTrend.dataPoints >= PROGRESSION_THRESHOLDS.MIN_E1RM_TREND_POINTS &&
    e1rmTrend.trend === "declining" &&
    e1rmTrend.ratePerWeek <= PROGRESSION_THRESHOLDS.E1RM_DECLINE_THRESHOLD
  ) {
    const deloadWeight = Math.round(lastWeight * 0.85);
    return {
      message: `Your estimated 1RM is declining (${e1rmTrend.ratePerWeek} kg/week). Time for a deload — drop to ~${deloadWeight} kg and focus on recovery.`,
      nextWeight: deloadWeight,
      action: "deload",
      reasoning: `e1RM declining at ${Math.abs(e1rmTrend.ratePerWeek)} kg/week — accumulated fatigue detected.`,
    };
  }

  // Step 2: Long plateau → suggest variation
  if (
    e1rmTrend &&
    e1rmTrend.plateauLength >=
      PROGRESSION_THRESHOLDS.LONG_PLATEAU_SESSION_COUNT
  ) {
    return {
      message: `You've been at the same strength level for ${e1rmTrend.plateauLength} sessions. Consider swapping to a variation (e.g., pause reps, different grip, or accessory).`,
      nextWeight: lastWeight,
      action: "variation",
      reasoning: `Extended plateau (${e1rmTrend.plateauLength} sessions with no e1RM increase).`,
    };
  }

  // Step 3: Plateau detected → deload
  if (e1rmTrend && e1rmTrend.isPlateau) {
    const deloadWeight = Math.round(lastWeight * 0.9);
    return {
      message: `You've plateaued (${e1rmTrend.plateauLength} sessions without progress). Drop to ~${deloadWeight} kg for a mini-deload, then build back up.`,
      nextWeight: deloadWeight,
      action: "deload",
      reasoning: `Plateau detected: ${e1rmTrend.plateauLength} consecutive sessions without e1RM improvement.`,
    };
  }

  // Step 4: All sets hit target at low RPE → increase
  if (allHit && avgRpe <= PROGRESSION_THRESHOLDS.INCREASE_RPE_MAX) {
    const increment =
      lastWeight >= PROGRESSION_THRESHOLDS.STANDARD_PROGRESSION_MIN ? 2.5 : 1;
    const nextWeight = lastWeight + increment;
    const rpeNote =
      avgRpe <= 5
        ? " RPE was very low — consider a bigger jump."
        : "";
    return {
      message: `Great work! All reps hit with RPE ${avgRpe.toFixed(1)}. Add ${increment} kg next session.${rpeNote}`,
      nextWeight,
      action: "increase",
      reasoning: `All ${completedSets.length} sets hit ${maxTarget}+ reps at avg RPE ${avgRpe.toFixed(1)} — well within capacity.`,
    };
  }

  // Step 5: All sets hit but very high RPE → maintain
  if (allHit && avgRpe >= PROGRESSION_THRESHOLDS.HIGH_RPE_MIN) {
    return {
      message: `You hit all reps but at high RPE (${avgRpe.toFixed(1)}). Stay at ${lastWeight} kg and work on smoother execution.`,
      nextWeight: lastWeight,
      action: "maintain",
      reasoning: `All reps completed but avg RPE ${avgRpe.toFixed(1)} indicates near-max effort — more volume at this weight needed.`,
    };
  }

  // Step 6: Failed multiple sets → technique focus
  if (failedSets >= PROGRESSION_THRESHOLDS.FAILED_SET_THRESHOLD) {
    return {
      message: `${failedSets} sets didn't hit minimum reps (${targetMin}). Stay at ${lastWeight} kg and focus on technique and consistent rep quality.`,
      nextWeight: lastWeight,
      action: "technique",
      reasoning: `${failedSets} of ${completedSets.length} sets below minimum rep target (${targetMin}).`,
    };
  }

  // Step 7: All sets hit at moderate RPE → maintain
  if (allHit) {
    return {
      message: `All reps hit at moderate RPE (${avgRpe.toFixed(1)}). Stay at ${lastWeight} kg — you'll be ready to increase soon.`,
      nextWeight: lastWeight,
      action: "maintain",
      reasoning: `All sets completed at moderate RPE — good adaptation stimulus.`,
    };
  }

  // Step 8: Default — maintain with encouragement
  return {
    message: `Solid effort! Some reps still below ${maxTarget}. Stay at ${lastWeight} kg and aim for the top of the rep range next time.`,
    nextWeight: lastWeight,
    action: "maintain",
    reasoning: `Incomplete rep targets — more volume at this weight will build capacity.`,
  };
}

/**
 * Get the progression decision for the most recent session of a day.
 * Returns the first valid decision, or a default message if no data.
 */
export function progressionDecisionForSession(
  session: Session,
  plan: PlannedExercise[],
  e1rmRecords?: E1RMRecord[],
): ProgressionDecision {
  const decisions = session.exercises
    .map((log) => {
      const planExercise = plan.find((e) => e.exerciseId === log.exerciseId);
      if (!planExercise) return null;

      // Get e1RM trend for this exercise if available
      const exerciseRecords = e1rmRecords?.filter(
        (r) => r.exerciseId === log.exerciseId,
      );
      const trend = exerciseRecords
        ? analyzeE1RMTrend(exerciseRecords)
        : undefined;

      return assessExerciseProgress(
        planExercise,
        {
          lastWeight: planExercise.lastWeight,
          sets: log.sets,
        },
        trend,
      );
    })
    .filter(Boolean) as ProgressionDecision[];

  return decisions.length > 0
    ? decisions[0]
    : {
        message: "Nice work — keep building consistency.",
        nextWeight: 0,
        action: "maintain",
        reasoning: "No progression data available.",
      };
}

/**
 * Summarize progression decisions across all plan days.
 * Useful for the dashboard/progress page to show overall training status.
 */
export function summarizeProgression(
  sessions: Session[],
  plan: PlannedExercise[],
  e1rmRecords?: E1RMRecord[],
): {
  increasing: number;
  maintaining: number;
  deloading: number;
  technique: number;
  variation: number;
  total: number;
} {
  const summary = {
    increasing: 0,
    maintaining: 0,
    deloading: 0,
    technique: 0,
    variation: 0,
    total: 0,
  };

  const processedIds = new Set<string>();

  for (const session of sessions) {
    for (const log of session.exercises) {
      if (processedIds.has(log.exerciseId)) continue;
      const planExercise = plan.find((e) => e.exerciseId === log.exerciseId);
      if (!planExercise) continue;

      const exerciseRecords = e1rmRecords?.filter(
        (r) => r.exerciseId === log.exerciseId,
      );
      const trend = exerciseRecords
        ? analyzeE1RMTrend(exerciseRecords)
        : undefined;

      const decision = assessExerciseProgress(
        planExercise,
        {
          lastWeight: planExercise.lastWeight,
          sets: log.sets,
        },
        trend,
      );

      processedIds.add(log.exerciseId);
      summary.total++;
      if (decision.action === "increase") summary.increasing++;
      else if (decision.action === "maintain") summary.maintaining++;
      else if (decision.action === "deload") summary.deloading++;
      else if (decision.action === "technique") summary.technique++;
      else if (decision.action === "variation") summary.variation++;
    }
  }

  return summary;
}

// ─── Future AI Integration Points ─────────────────────────────────────────────
// TODO: When adding AI-powered recommendations:
// 1. Replace `assessExerciseProgress` with an AI model that takes the same inputs
// 2. The AI should still output `ProgressionDecision` for compatibility
// 3. Add a flag `useAiProgression` to the store to toggle between rules and AI
// 4. Ensure AI recommendations include `reasoning` for transparency