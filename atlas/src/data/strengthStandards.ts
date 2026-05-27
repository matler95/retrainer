/**
 * Strength standards data — population percentile comparisons.
 *
 * Based on crowdsourced data from Symmetric Strength and ExRx.
 * Provides bodyweight-ratio thresholds for each strength level.
 *
 * Used to show users where they stand relative to the population:
 * "Your bench: Intermediate (top 42%)"
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StrengthStandard {
  exerciseId: string;
  gender: "male" | "female";
  /** Bodyweight ratio thresholds (1RM / bodyweight) */
  levels: {
    untrained: number;
    beginner: number;
    novice: number;
    intermediate: number;
    advanced: number;
    elite: number;
  };
}

// ─── Standards Data ─────────────────────────────────────────────────────────

/**
 * Strength standards as bodyweight ratios (1RM / bodyweight).
 * Source: Symmetric Strength, ExRx strength standards.
 */
export const STRENGTH_STANDARDS: StrengthStandard[] = [
  {
    exerciseId: "bench-press",
    gender: "male",
    levels: { untrained: 0.35, beginner: 0.55, novice: 0.75, intermediate: 1.0, advanced: 1.35, elite: 1.75 },
  },
  {
    exerciseId: "bench-press",
    gender: "female",
    levels: { untrained: 0.15, beginner: 0.3, novice: 0.45, intermediate: 0.65, advanced: 0.85, elite: 1.1 },
  },
  {
    exerciseId: "squat",
    gender: "male",
    levels: { untrained: 0.5, beginner: 0.75, novice: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.5 },
  },
  {
    exerciseId: "squat",
    gender: "female",
    levels: { untrained: 0.25, beginner: 0.5, novice: 0.75, intermediate: 1.1, advanced: 1.5, elite: 2.0 },
  },
  {
    exerciseId: "deadlift",
    gender: "male",
    levels: { untrained: 0.6, beginner: 1.0, novice: 1.25, intermediate: 1.75, advanced: 2.25, elite: 3.0 },
  },
  {
    exerciseId: "deadlift",
    gender: "female",
    levels: { untrained: 0.35, beginner: 0.65, novice: 0.95, intermediate: 1.35, advanced: 1.8, elite: 2.4 },
  },
  {
    exerciseId: "ohp",
    gender: "male",
    levels: { untrained: 0.2, beginner: 0.35, novice: 0.5, intermediate: 0.7, advanced: 0.95, elite: 1.2 },
  },
  {
    exerciseId: "ohp",
    gender: "female",
    levels: { untrained: 0.1, beginner: 0.2, novice: 0.3, intermediate: 0.45, advanced: 0.6, elite: 0.8 },
  },
  {
    exerciseId: "barbell-row",
    gender: "male",
    levels: { untrained: 0.3, beginner: 0.5, novice: 0.7, intermediate: 0.9, advanced: 1.15, elite: 1.45 },
  },
  {
    exerciseId: "barbell-row",
    gender: "female",
    levels: { untrained: 0.15, beginner: 0.3, novice: 0.45, intermediate: 0.6, advanced: 0.8, elite: 1.0 },
  },
];

// ─── Query Functions ─────────────────────────────────────────────────────────

/**
 * Map exercise IDs to their standard lookup key.
 */
const EXERCISE_TO_STANDARD: Record<string, string> = {
  "bench-press": "bench-press",
  "db-bench": "bench-press",
  "incline-bb": "bench-press",
  "incline-db": "bench-press",
  squat: "squat",
  "front-squat": "squat",
  "goblet-squat": "squat",
  deadlift: "deadlift",
  rdl: "deadlift",
  "sumo-deadlift": "deadlift",
  ohp: "ohp",
  "db-shoulder": "ohp",
  "military-press": "ohp",
  "arnold-press": "ohp",
  "barbell-row": "barbell-row",
  "db-row": "barbell-row",
  "seated-row": "barbell-row",
  "tbar-row": "barbell-row",
};

/**
 * Get the strength level for a given exercise, 1RM, body weight, and gender.
 *
 * @param exerciseId - Exercise ID
 * @param estimated1RM - User's estimated 1RM in kg
 * @param bodyWeightKg - User's body weight in kg
 * @param gender - User's gender
 * @returns Level name, percentile estimate, and kg to next milestone
 */
export function getStrengthLevel(
  exerciseId: string,
  estimated1RM: number,
  bodyWeightKg: number,
  gender: "male" | "female" | "other",
): {
  level: string;
  percentile: number;
  ratio: number;
  nextMilestone: string;
  kgToNext: number;
} {
  const standardKey = EXERCISE_TO_STANDARD[exerciseId];
  if (!standardKey) {
    return { level: "Unknown", percentile: 50, ratio: 0, nextMilestone: "", kgToNext: 0 };
  }

  const lookupGender = gender === "female" ? "female" : "male";
  const standard = STRENGTH_STANDARDS.find(
    (s) => s.exerciseId === standardKey && s.gender === lookupGender,
  );

  if (!standard) {
    return { level: "Unknown", percentile: 50, ratio: 0, nextMilestone: "", kgToNext: 0 };
  }

  const ratio = estimated1RM / bodyWeightKg;
  const levels = standard.levels;

  let level: string;
  let percentile: number;
  let nextLevel = "";
  let nextRatio = 0;

  if (ratio >= levels.elite) {
    level = "Elite";
    percentile = 99;
    nextLevel = "Beyond elite!";
    nextRatio = ratio + 0.1;
  } else if (ratio >= levels.advanced) {
    level = "Advanced";
    percentile = 90;
    nextLevel = "Elite";
    nextRatio = levels.elite;
  } else if (ratio >= levels.intermediate) {
    level = "Intermediate";
    percentile = 70;
    nextLevel = "Advanced";
    nextRatio = levels.advanced;
  } else if (ratio >= levels.novice) {
    level = "Novice";
    percentile = 45;
    nextLevel = "Intermediate";
    nextRatio = levels.intermediate;
  } else if (ratio >= levels.beginner) {
    level = "Beginner";
    percentile = 25;
    nextLevel = "Novice";
    nextRatio = levels.novice;
  } else {
    level = "Untrained";
    percentile = 10;
    nextLevel = "Beginner";
    nextRatio = levels.beginner;
  }

  const kgToNext = Math.max(0, Math.round((nextRatio * bodyWeightKg - estimated1RM) * 10) / 10);

  return {
    level,
    percentile,
    ratio: Math.round(ratio * 100) / 100,
    nextMilestone: nextLevel,
    kgToNext,
  };
}