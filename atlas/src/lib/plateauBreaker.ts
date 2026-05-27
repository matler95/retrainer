/**
 * Plateau breaker protocol.
 *
 * When a plateau is detected (≥6 sessions without e1RM improvement),
 * recommends a strategy to break through:
 *
 * - deload: 1 week at 60% volume
 * - variation: substitute exercise for 3-4 weeks
 * - rep_scheme: change rep range (e.g., 8-12 → 5×5)
 * - technique_focus: reduce weight 20%, focus on form
 * - frequency_bump: add 1 extra session per week for this muscle
 * - back_off_sets: add 2 back-off sets at 75% weight
 *
 * Rotates strategies to avoid repeating the same approach.
 *
 * All functions are pure and deterministic.
 */

import type { Profile } from "@/data/types";
import { EXERCISES } from "@/data/exercises";

// ─── Types ──────────────────────────────────────────────────────────────────

export type PlateauBreakStrategy =
  | "deload"
  | "variation"
  | "rep_scheme"
  | "technique_focus"
  | "frequency_bump"
  | "back_off_sets";

export interface PlateauBreakPlan {
  strategy: PlateauBreakStrategy;
  durationWeeks: number;
  description: string;
  weightModifier: number; // 1.0 = no change, 0.8 = 80% of current
  setModifier: number; // 1.0 = no change, 0.6 = 60% of current
  repOverride?: string; // e.g., "5-5" for rep scheme change
  substituteExerciseId?: string;
}

// ─── Strategy Descriptions ──────────────────────────────────────────────────

const STRATEGY_INFO: Record<PlateauBreakStrategy, { description: string; weeks: number }> = {
  deload: {
    description: "Drop to 60% volume for 1 week. Let your body fully recover, then rebuild.",
    weeks: 1,
  },
  variation: {
    description: "Swap to a similar exercise for 3-4 weeks. New stimulus breaks the plateau.",
    weeks: 4,
  },
  rep_scheme: {
    description: "Change your rep range entirely. If you've been doing 8-12, try 5×5 for strength.",
    weeks: 3,
  },
  technique_focus: {
    description: "Reduce weight by 20% and focus on perfect form. Film yourself for self-coaching.",
    weeks: 2,
  },
  frequency_bump: {
    description: "Add one extra session per week targeting this muscle group.",
    weeks: 3,
  },
  back_off_sets: {
    description: "After your working sets, add 2 sets at 75% weight for extra volume.",
    weeks: 3,
  },
};

// ─── Strategy Rotation ──────────────────────────────────────────────────────

/**
 * Pick the next plateau-breaking strategy, rotating through options
 * to avoid repeating the same approach.
 *
 * ORDER: deload → rep_scheme → technique_focus → variation → back_off_sets → frequency_bump
 *
 * @param lastStrategy - The last strategy used for this exercise (null if first time)
 * @returns The next strategy to try
 */
export function pickNextStrategy(
  lastStrategy: PlateauBreakStrategy | null,
): PlateauBreakStrategy {
  const rotation: PlateauBreakStrategy[] = [
    "deload",
    "rep_scheme",
    "technique_focus",
    "variation",
    "back_off_sets",
    "frequency_bump",
  ];

  if (!lastStrategy) return rotation[0];

  const lastIndex = rotation.indexOf(lastStrategy);
  const nextIndex = (lastIndex + 1) % rotation.length;
  return rotation[nextIndex];
}

// ─── Core Algorithm ─────────────────────────────────────────────────────────

/**
 * Generate a plateau-breaking plan for an exercise.
 *
 * @param exerciseId - The plateaued exercise
 * @param currentWeight - Current working weight
 * @param currentReps - Current rep scheme (e.g., "8-12")
 * @param profile - User profile for exercise substitution
 * @param lastStrategy - Last strategy used (for rotation)
 * @returns PlateauBreakPlan with specific modifications
 */
export function recommendPlateauBreaker(
  exerciseId: string,
  currentWeight: number,
  currentReps: string,
  profile: Profile,
  lastStrategy?: PlateauBreakStrategy | null,
): PlateauBreakPlan {
  const strategy = pickNextStrategy(lastStrategy ?? null);
  const info = STRATEGY_INFO[strategy];

  const plan: PlateauBreakPlan = {
    strategy,
    durationWeeks: info.weeks,
    description: info.description,
    weightModifier: 1.0,
    setModifier: 1.0,
  };

  switch (strategy) {
    case "deload":
      plan.weightModifier = 0.7;
      plan.setModifier = 0.6;
      break;

    case "variation": {
      const current = EXERCISES.find((e) => e.id === exerciseId);
      if (current?.substituteIds?.length) {
        const sub = EXERCISES.find(
          (e) =>
            current.substituteIds!.includes(e.id) &&
            e.equipment.some((eq) => profile.equipment.includes(eq)),
        );
        plan.substituteExerciseId = sub?.id;
      }
      if (!plan.substituteExerciseId) {
        // Fallback to rep_scheme if no substitute available
        plan.strategy = "rep_scheme";
        plan.description = "No suitable substitute found. Changing rep range instead.";
        plan.repOverride = parseRepRange(currentReps)[0] <= 6 ? "8-12" : "5-5";
      }
      break;
    }

    case "rep_scheme": {
      const [minRep] = parseRepRange(currentReps);
      if (minRep >= 8) {
        plan.repOverride = "5-5";
        plan.weightModifier = 1.1; // Heavier for lower reps
      } else {
        plan.repOverride = "10-12";
        plan.weightModifier = 0.85; // Lighter for higher reps
      }
      break;
    }

    case "technique_focus":
      plan.weightModifier = 0.8;
      plan.setModifier = 1.0;
      break;

    case "frequency_bump":
      // Volume stays the same per session, but an extra session is added
      plan.weightModifier = 1.0;
      plan.setModifier = 1.0;
      break;

    case "back_off_sets":
      plan.weightModifier = 1.0;
      plan.setModifier = 1.0;
      break;
  }

  return plan;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseRepRange(str: string): [number, number] {
  const parts = str.split("-").map(Number);
  return [parts[0] ?? 8, parts[1] ?? 12];
}