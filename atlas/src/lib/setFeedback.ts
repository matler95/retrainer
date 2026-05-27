/**
 * Real-time set feedback algorithm.
 *
 * After each set is logged, analyzes the performance and provides:
 * - Quality assessment (easy / good / hard / failed)
 * - Next-set weight/rep suggestion
 * - Adaptive rest timer recommendation
 * - Movement cues from the exercise database
 *
 * All functions are pure and deterministic.
 */

import type { SetLog } from "@/data/types";
import { EXERCISES } from "@/data/exercises";
import { roundWeight, getProgressionIncrement } from "@/lib/loadCalculator";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SetQuality = "easy" | "good" | "hard" | "failed";

export interface SetFeedback {
  quality: SetQuality;
  /** Movement cue from exercise database (if available) */
  cue?: string;
  /** Suggestion for the next set */
  nextSetSuggestion?: {
    weight: number;
    reps: number;
    reason: string;
  };
  /** Recommended rest time in seconds */
  restSeconds: number;
  /** Short encouragement message */
  message: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const REST_BASE_SECONDS = 120;

// ─── Core Algorithm ─────────────────────────────────────────────────────────

/**
 * Analyze a completed set and provide real-time feedback.
 *
 * DECISION TREE:
 * 1. If reps > maxTarget + 2 and RPE ≤ 6 → "easy" — suggest weight increase
 * 2. If reps ≥ maxTarget and RPE ≤ 7.5 → "good" — maintain, encourage
 * 3. If reps ≥ minTarget and RPE > 8 → "hard" — maintain, focus on recovery
 * 4. If reps < minTarget → "failed" — suggest weight reduction or technique focus
 * 5. Default → "good" with encouragement
 *
 * @param set - The completed set log
 * @param targetReps - Target rep range as [min, max] e.g. [8, 12]
 * @param previousSets - Sets completed before this one in the same exercise
 * @param exerciseId - The exercise ID for cue lookup
 * @returns SetFeedback with quality, suggestions, and rest recommendation
 */
export function analyzeSet(
  set: SetLog,
  targetReps: [number, number],
  previousSets: SetLog[],
  exerciseId: string,
): SetFeedback {
  const [minReps, maxReps] = targetReps;
  const rpe = set.rpe ?? 7;
  const exercise = EXERCISES.find((e) => e.id === exerciseId);
  const cue = exercise?.cues?.[0];

  // Adaptive rest based on RPE
  const restSeconds = adaptiveRest(rpe, exercise?.restSec ?? REST_BASE_SECONDS);

  // Quality assessment
  if (set.reps > maxReps + 2 && rpe <= 6) {
    // Crushed it — suggest bumping weight
    const increment = getProgressionIncrement(set.weight);
    const suggestedWeight = roundWeight(set.weight + increment);
    return {
      quality: "easy",
      cue,
      nextSetSuggestion: {
        weight: suggestedWeight,
        reps: minReps,
        reason: `Felt easy at ${set.weight}kg — try ${suggestedWeight}kg next set`,
      },
      restSeconds,
      message: `Crushed it! ${set.reps} reps at RPE ${rpe} 💪`,
    };
  }

  if (set.reps >= maxReps && rpe <= 7.5) {
    // Hit top of range at moderate effort — good
    return {
      quality: "good",
      cue,
      restSeconds,
      message: `Solid set — ${set.reps} reps at RPE ${rpe}. Stay here.`,
    };
  }

  if (set.reps >= minReps && rpe >= 8) {
    // Hit target but at high effort — hard
    return {
      quality: "hard",
      cue,
      nextSetSuggestion: {
        weight: set.weight,
        reps: Math.max(minReps, set.reps - 1),
        reason: `High RPE (${rpe}) — aim for ${Math.max(minReps, set.reps - 1)} reps next set`,
      },
      restSeconds: Math.min(restSeconds + 30, 300), // Extra rest
      message: `Hard set. RPE ${rpe} — take extra rest.`,
    };
  }

  if (set.reps < minReps) {
    // Missed minimum reps — failed
    const previousAvgWeight = previousSets.length > 0
      ? previousSets.reduce((sum, s) => sum + s.weight, 0) / previousSets.length
      : set.weight;

    const shouldReduce = previousSets.filter((s) => s.done && s.reps < minReps).length >= 1;

    return {
      quality: "failed",
      cue,
      nextSetSuggestion: shouldReduce
        ? {
            weight: roundWeight(set.weight * 0.9),
            reps: minReps,
            reason: `Multiple missed sets — reduce to ${roundWeight(set.weight * 0.9)}kg`,
          }
        : {
            weight: set.weight,
            reps: minReps,
            reason: `Aim for ${minReps} reps — focus on form`,
          },
      restSeconds: Math.min(restSeconds + 60, 300), // Significant extra rest
      message: `Tough set — ${set.reps} reps. ${shouldReduce ? "Consider reducing weight." : "Focus on form next set."}`,
    };
  }

  // Default — moderate performance
  return {
    quality: "good",
    cue,
    restSeconds,
    message: `Good effort — ${set.reps} reps. Keep pushing.`,
  };
}

/**
 * Compute adaptive rest time based on RPE and exercise defaults.
 *
 * LOGIC:
 * - RPE ≥ 9: 1.5× base rest (high CNS demand)
 * - RPE 7-8: 1.0× base rest (standard)
 * - RPE ≤ 6: 0.75× base rest (lighter effort, faster recovery)
 *
 * @param rpe - Rate of perceived exertion (1-10)
 * @param baseRest - Default rest time for this exercise in seconds
 * @returns Recommended rest time in seconds
 */
export function adaptiveRest(rpe: number, baseRest: number): number {
  const multiplier = rpe >= 9 ? 1.5 : rpe >= 7 ? 1.0 : 0.75;
  return Math.round(baseRest * multiplier);
}

/**
 * Get session tags for quick journaling.
 */
export const SESSION_TAGS = [
  { id: "felt_strong", emoji: "💪", label: "Felt strong" },
  { id: "low_energy", emoji: "😴", label: "Low energy" },
  { id: "pr_day", emoji: "🔥", label: "PR day" },
  { id: "pain_discomfort", emoji: "⚠️", label: "Pain/discomfort" },
  { id: "bad_sleep", emoji: "🌧️", label: "Bad sleep" },
  { id: "great_pump", emoji: "💦", label: "Great pump" },
  { id: "stressed", emoji: "😤", label: "Stressed" },
  { id: "well_rested", emoji: "😊", label: "Well rested" },
] as const;