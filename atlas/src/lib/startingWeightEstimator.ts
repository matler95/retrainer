/**
 * Starting weight estimation algorithm.
 *
 * Estimates appropriate starting weights for exercises based on:
 * - Body weight ratios from strength standards research (Symmetric Strength, ExRx)
 * - Training history (peak lifts → conservative 75% of estimated 1RM)
 * - Experience level (beginners use lower coefficients)
 *
 * All functions are pure and deterministic.
 */

import type { Profile, Experience, TrainingHistory } from "@/data/types";
import { average1RM, roundWeight } from "@/lib/loadCalculator";

// ─── Strength Standards (bodyweight multipliers) ─────────────────────────────

/**
 * Bodyweight multipliers for estimating starting weights by exercise and experience.
 * Source: Symmetric Strength, ExRx strength standards research.
 *
 * These represent approximate intermediate-level 1RM as a multiple of body weight.
 */
const STRENGTH_COEFFICIENTS: Record<Experience, Record<string, number>> = {
  beginner: {
    squat: 0.75,
    bench: 0.55,
    deadlift: 1.0,
    overhead: 0.35,
    row: 0.5,
    "hip-thrust": 0.6,
    rdl: 0.5,
    "leg-press": 1.2,
    lunge: 0.4,
    "lat-pulldown": 0.45,
    curl: 0.2,
    "tricep-pushdown": 0.2,
  },
  intermediate: {
    squat: 1.25,
    bench: 0.9,
    deadlift: 1.5,
    overhead: 0.6,
    row: 0.85,
    "hip-thrust": 1.0,
    rdl: 0.8,
    "leg-press": 2.0,
    lunge: 0.65,
    "lat-pulldown": 0.7,
    curl: 0.35,
    "tricep-pushdown": 0.35,
  },
  advanced: {
    squat: 1.75,
    bench: 1.25,
    deadlift: 2.0,
    overhead: 0.85,
    row: 1.15,
    "hip-thrust": 1.5,
    rdl: 1.1,
    "leg-press": 2.8,
    lunge: 0.9,
    "lat-pulldown": 0.95,
    curl: 0.5,
    "tricep-pushdown": 0.5,
  },
};

/**
 * Map exercise IDs to their standard key for coefficient lookup.
 * Exercises not in this map will get a generic estimate.
 */
const EXERCISE_TO_STANDARD: Record<string, string> = {
  squat: "squat",
  "front-squat": "squat",
  "goblet-squat": "squat",
  "bench-press": "bench",
  "db-bench": "bench",
  "incline-bb": "bench",
  "incline-db": "bench",
  deadlift: "deadlift",
  rdl: "rdl",
  "sumo-deadlift": "deadlift",
  ohp: "overhead",
  "db-shoulder": "overhead",
  "military-press": "overhead",
  "arnold-press": "overhead",
  "barbell-row": "row",
  "db-row": "row",
  "seated-row": "row",
  "tbar-row": "row",
  "hip-thrust": "hip-thrust",
  "glute-bridge": "hip-thrust",
  "leg-press": "leg-press",
  lunge: "lunge",
  "bulgarian-split": "lunge",
  stepup: "lunge",
  "lat-pulldown": "lat-pulldown",
  "bb-curl": "curl",
  "db-curl": "curl",
  "hammer-curl": "curl",
  "preacher-curl": "curl",
  "cable-curl": "curl",
  "tricep-pushdown": "tricep-pushdown",
  "tricep-ext": "tricep-pushdown",
  "cable-ext": "tricep-pushdown",
  dips: "bench",
  "chest-dip": "bench",
};

// ─── Core Estimation Functions ───────────────────────────────────────────────

/**
 * Estimate starting weights for all exercises in a plan.
 *
 * Uses peak lifts from training history if available (conservative 75% of 1RM),
 * otherwise falls back to bodyweight × experience-level coefficient.
 *
 * @param profile - User profile with body weight and experience
 * @param history - Optional training history with peak lifts
 * @returns Map of exerciseId → recommended starting weight in kg
 */
export function estimateStartingWeights(
  profile: Profile,
  history?: TrainingHistory,
): Record<string, number> {
  const bw = profile.weightKg;
  const coefs = STRENGTH_COEFFICIENTS[profile.experience];
  const results: Record<string, number> = {};

  for (const [exerciseId, standardKey] of Object.entries(EXERCISE_TO_STANDARD)) {
    const coef = coefs[standardKey];
    if (!coef) continue;

    const peakLift = history?.peakLifts?.[standardKey];

    if (peakLift) {
      // Use peak lift to estimate 1RM, then take 75% for working weight
      const estimated1RM = average1RM(peakLift.weight, peakLift.reps);
      results[exerciseId] = roundWeight(estimated1RM * 0.75);
    } else {
      // Derive from bodyweight × coefficient × conservative factor (0.85)
      results[exerciseId] = roundWeight(bw * coef * 0.85);
    }
  }

  return results;
}

/**
 * Estimate starting weight for a single exercise.
 *
 * @param exerciseId - The exercise ID
 * @param profile - User profile
 * @param history - Optional training history
 * @returns Recommended starting weight in kg, or null if no estimate available
 */
export function estimateSingleExerciseWeight(
  exerciseId: string,
  profile: Profile,
  history?: TrainingHistory,
): number | null {
  const bw = profile.weightKg;
  const coefs = STRENGTH_COEFFICIENTS[profile.experience];

  // Check if we have a standard key for this exercise
  const standardKey = EXERCISE_TO_STANDARD[exerciseId];

  if (standardKey) {
    const coef = coefs[standardKey];
    if (!coef) return null;

    const peakLift = history?.peakLifts?.[standardKey];
    if (peakLift) {
      const estimated1RM = average1RM(peakLift.weight, peakLift.reps);
      return roundWeight(estimated1RM * 0.75);
    }

    return roundWeight(bw * coef * 0.85);
  }

  // Fallback: use a generic estimate based on bodyweight
  // Most isolation exercises start at ~15-25% of bodyweight
  return roundWeight(bw * 0.2);
}

/**
 * Get the strength standard level for a given exercise and 1RM.
 * Compares against population percentiles.
 *
 * @param exerciseId - The exercise ID
 * @param estimated1RM - User's estimated 1RM
 * @param bodyWeightKg - User's body weight
 * @param experience - User's experience level
 * @returns Object with level name and coefficient ratio
 */
export function getStrengthLevel(
  exerciseId: string,
  estimated1RM: number,
  bodyWeightKg: number,
): { level: string; ratio: number } {
  const ratio = estimated1RM / bodyWeightKg;

  // Strength level thresholds (approximate percentiles)
  if (ratio >= 2.0) return { level: "Elite", ratio };
  if (ratio >= 1.5) return { level: "Advanced", ratio };
  if (ratio >= 1.0) return { level: "Intermediate", ratio };
  if (ratio >= 0.6) return { level: "Novice", ratio };
  return { level: "Beginner", ratio };
}