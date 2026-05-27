/**
 * Plan quality scoring algorithm.
 *
 * Computes a 0-100 score for a training plan based on:
 * - Equipment coverage: % of exercises matching user's equipment
 * - Volume balance: how well MEV/MAV targets are hit per muscle group
 * - Recovery fit: rest days vs training load prediction
 * - Goal alignment: rep ranges and intensity match stated goal
 * - Variety: exercise diversity across movement patterns
 *
 * All functions are pure and deterministic.
 */

import type { Profile, PlanDay } from "@/data/types";
import { EXERCISES, type MuscleGroup } from "@/data/exercises";
import { getVolumeLandmarks } from "@/lib/volumeLandmarks";

// ─── Plan Score Interface ────────────────────────────────────────────────────

export interface PlanScore {
  /** Overall score 0-100 */
  overall: number;
  /** Equipment coverage (0-100) */
  equipmentCoverage: number;
  /** Volume balance per muscle (0-100) */
  volumeBalance: number;
  /** Recovery fit (0-100) */
  recoveryFit: number;
  /** Goal alignment (0-100) */
  goalAlignment: number;
  /** Human-readable improvement notes */
  notes: string[];
}

// ─── Weights ─────────────────────────────────────────────────────────────────

const WEIGHTS = {
  equipment: 0.2,
  volume: 0.35,
  recovery: 0.2,
  goal: 0.25,
};

// ─── Scoring Functions ───────────────────────────────────────────────────────

/**
 * Compute a comprehensive plan quality score.
 *
 * @param plan - The generated training plan
 * @param profile - User's profile and preferences
 * @returns PlanScore with overall score and breakdown
 */
export function scorePlan(plan: PlanDay[], profile: Profile): PlanScore {
  const notes: string[] = [];

  const equipmentScore = scoreEquipmentCoverage(plan, profile, notes);
  const volumeScore = scoreVolumeBalance(plan, profile, notes);
  const recoveryScore = scoreRecoveryFit(plan, profile, notes);
  const goalScore = scoreGoalAlignment(plan, profile, notes);

  const overall = Math.round(
    equipmentScore * WEIGHTS.equipment +
    volumeScore * WEIGHTS.volume +
    recoveryScore * WEIGHTS.recovery +
    goalScore * WEIGHTS.goal,
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    equipmentCoverage: equipmentScore,
    volumeBalance: volumeScore,
    recoveryFit: recoveryScore,
    goalAlignment: goalScore,
    notes,
  };
}

/**
 * Score equipment coverage: % of exercises using user's available equipment.
 */
function scoreEquipmentCoverage(plan: PlanDay[], profile: Profile, notes: string[]): number {
  const allExerciseIds = plan.flatMap((day) => day.exercises.map((e) => e.exerciseId));
  const uniqueIds = [...new Set(allExerciseIds)];

  if (uniqueIds.length === 0) return 0;

  let matching = 0;
  let missing = 0;

  for (const id of uniqueIds) {
    const exercise = EXERCISES.find((e) => e.id === id);
    if (!exercise) continue;

    const hasEquipment = exercise.equipment.some((eq) =>
      profile.equipment.includes(eq),
    );

    if (hasEquipment) {
      matching++;
    } else {
      missing++;
    }
  }

  const score = Math.round((matching / uniqueIds.length) * 100);

  if (missing > 0) {
    notes.push(`${missing} exercise(s) may require equipment you don't have`);
  }

  return score;
}

/**
 * Score volume balance: how well MEV/MAV targets are hit per muscle group.
 */
function scoreVolumeBalance(plan: PlanDay[], profile: Profile, notes: string[]): number {
  // Count total sets per muscle group across the plan
  const setsByMuscle: Record<string, number> = {};

  for (const day of plan) {
    for (const pe of day.exercises) {
      const exercise = EXERCISES.find((e) => e.id === pe.exerciseId);
      if (!exercise) continue;

      setsByMuscle[exercise.primary] = (setsByMuscle[exercise.primary] ?? 0) + pe.sets;

      // Count half sets for secondary muscles
      for (const sec of exercise.secondary) {
        if (sec !== exercise.primary) {
          setsByMuscle[sec] = (setsByMuscle[sec] ?? 0) + Math.round(pe.sets * 0.5);
        }
      }
    }
  }

  // Score each muscle group against its landmarks
  const musclesToScore: MuscleGroup[] = ["chest", "back", "shoulders", "legs", "biceps", "triceps"];
  let totalScore = 0;
  let musclesScored = 0;

  for (const muscle of musclesToScore) {
    const sets = setsByMuscle[muscle] ?? 0;
    const landmarks = getVolumeLandmarks(muscle);

    if (sets === 0) {
      // No volume at all for this muscle — big penalty
      totalScore += 0;
      notes.push(`No sets targeting ${muscle} — consider adding exercises`);
    } else if (sets < landmarks.mev) {
      // Below MEV — insufficient stimulus
      totalScore += 30;
      notes.push(`${muscle}: ${sets} sets (below MEV of ${landmarks.mev})`);
    } else if (sets <= landmarks.mav) {
      // Between MEV and MAV — optimal range
      totalScore += 100;
    } else if (sets <= landmarks.mrv) {
      // Between MAV and MRV — high but recoverable
      totalScore += 70;
    } else {
      // Above MRV — overtraining risk
      totalScore += 40;
      notes.push(`${muscle}: ${sets} sets (above MRV of ${landmarks.mrv}) — recovery risk`);
    }

    musclesScored++;
  }

  return Math.round(totalScore / musclesScored);
}

/**
 * Score recovery fit: rest days vs training frequency.
 */
function scoreRecoveryFit(plan: PlanDay[], profile: Profile, notes: string[]): number {
  const trainingDays = plan.length;
  const restDays = 7 - trainingDays;

  // Ideal rest days based on experience
  const idealRestDays: Record<string, number> = {
    beginner: 3, // 4 days training, 3 rest
    intermediate: 2, // 5 days training, 2 rest
    advanced: 1, // 6 days training, 1 rest
  };

  const ideal = idealRestDays[profile.experience] ?? 2;
  const diff = Math.abs(restDays - ideal);

  let score: number;
  if (diff === 0) {
    score = 100;
  } else if (diff === 1) {
    score = 80;
  } else if (diff === 2) {
    score = 60;
  } else {
    score = 40;
  }

  // Penalty for too many training days (under-recovery)
  if (restDays < ideal) {
    notes.push(`${restDays} rest days may be too few for ${profile.experience} level`);
  }

  // Penalty for too few training days (under-stimulating)
  if (restDays > ideal + 1) {
    notes.push(`${restDays} rest days — consider adding a training day for faster progress`);
  }

  return score;
}

/**
 * Score goal alignment: rep ranges and intensity match stated goal.
 */
function scoreGoalAlignment(plan: PlanDay[], profile: Profile, notes: string[]): number {
  // Expected rep ranges per goal
  const goalRepRanges: Record<string, { min: number; max: number }> = {
    strength: { min: 1, max: 6 },
    "build muscle": { min: 6, max: 15 },
    "lose fat": { min: 8, max: 20 },
    "general fitness": { min: 8, max: 15 },
    recomposition: { min: 6, max: 15 },
  };

  const target = goalRepRanges[profile.goal] ?? { min: 6, max: 15 };

  // Parse rep ranges from plan exercises
  let matchingExercises = 0;
  let totalExercises = 0;

  for (const day of plan) {
    for (const pe of day.exercises) {
      const reps = pe.reps.split("-").map(Number);
      const minRep = reps[0] ?? 8;
      const maxRep = reps[1] ?? 12;

      totalExercises++;

      // Check if the rep range overlaps with the goal range
      if (minRep >= target.min - 2 && maxRep <= target.max + 2) {
        matchingExercises++;
      }
    }
  }

  if (totalExercises === 0) return 50;

  const score = Math.round((matchingExercises / totalExercises) * 100);

  if (score < 70) {
    notes.push(`Rep ranges may not fully align with your "${profile.goal}" goal`);
  }

  return score;
}