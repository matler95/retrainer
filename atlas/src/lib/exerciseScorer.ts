/**
 * Exercise scoring algorithm for plan generation.
 *
 * Scores exercises deterministically based on:
 * - equipment compatibility
 * - injury compatibility (avoid list)
 * - movement balance (even distribution across planes)
 * - user preference (favorites / disliked)
 * - primary muscle target match
 * - experience level appropriateness
 *
 * The scorer replaces the naive `slice(0, n)` pattern in plan generation
 * with a scored ranking, ensuring the most appropriate exercises are selected.
 */

import type { Exercise, Equipment, MuscleGroup, Difficulty } from "@/data/exercises";
import type { Profile } from "@/store/useAppStore";

export interface ExerciseScore {
  exerciseId: string;
  score: number;
  breakdown: {
    equipment: number;
    injury: number;
    preference: number;
    target: number;
    experience: number;
    variety: number; // movement balance bonus
  };
}

// Weight multipliers for each scoring dimension
const WEIGHTS = {
  equipment: 3,
  injury: 10,   // high weight — avoid injuries
  preference: 3,
  target: 5,
  experience: 2,
  variety: 1,
};

/**
 * Score a single exercise against the user's profile.
 * Higher scores = better fit.
 */
export function scoreExercise(
  exercise: Exercise,
  profile: Profile,
  /** Exercises already selected this week (for variety bonus) */
  alreadySelected: string[],
  /** Muscle groups that still need coverage (for balanced picking) */
  neededMuscles: MuscleGroup[],
): ExerciseScore {
  const breakdown = {
    equipment: scoreEquipment(exercise, profile.equipment),
    injury: scoreInjury(exercise, profile.avoid),
    preference: scorePreference(exercise.id, profile as Profile & { favorites: string[]; disliked: string[] }),
    target: scoreTargetMuscle(exercise, profile.priorities),
    experience: scoreExperience(exercise.difficulty, profile.experience),
    variety: scoreVariety(exercise, alreadySelected, neededMuscles),
  };

  const total =
    breakdown.equipment * WEIGHTS.equipment +
    breakdown.injury * WEIGHTS.injury +
    breakdown.preference * WEIGHTS.preference +
    breakdown.target * WEIGHTS.target +
    breakdown.experience * WEIGHTS.experience +
    breakdown.variety * WEIGHTS.variety;

  return {
    exerciseId: exercise.id,
    score: total,
    breakdown,
  };
}

/**
 * Score all exercises in a filtered list for a given muscle group.
 * Returns sorted results (highest score first).
 */
export function scoreExercisesForMuscle(
  exercises: Exercise[],
  muscle: MuscleGroup,
  profile: Profile,
  alreadySelected: string[],
  neededMuscles: MuscleGroup[],
): ExerciseScore[] {
  const scores = exercises
    .filter(
      (e) =>
        e.primary === muscle || e.secondary.includes(muscle),
    )
    .map((e) => scoreExercise(e, profile, alreadySelected, neededMuscles));

  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Pick the top N scored exercises for a muscle group.
 * Returns the exercise IDs (or full exercise objects via callback).
 * Maintains minimum variety: avoids picking the same exercise twice.
 */
export function pickTopScored(
  exercises: Exercise[],
  muscle: MuscleGroup,
  profile: Profile,
  count: number,
  alreadySelected: string[],
  neededMuscles: MuscleGroup[],
): Exercise[] {
  const scored = scoreExercisesForMuscle(
    exercises,
    muscle,
    profile,
    alreadySelected,
    neededMuscles,
  );

  // Filter out already selected exercises
  const filtered = scored.filter(
    (s) => !alreadySelected.includes(s.exerciseId),
  );

  return filtered
    .slice(0, count)
    .map((s) => exercises.find((e) => e.id === s.exerciseId)!)
    .filter(Boolean);
}

// ─── Individual scoring dimensions ───────────────────────────────────────────

/**
 * Equipment match scoring:
 * - 3 if user has the exact equipment
 * - 1 if they have an alternative (e.g., dumbbells for barbell)
 * - 0 if no match
 */
function scoreEquipment(exercise: Exercise, userEquipment: Equipment[]): number {
  // Direct match
  const exactMatch = exercise.equipment.some((eq) => userEquipment.includes(eq));
  if (exactMatch) return 3;

  // Alternative match — bodyweight alternatives for most exercises
  const hasBodyweight = userEquipment.includes("bodyweight");

  // If user has bodyweight, they can do bodyweight exercises
  if (hasBodyweight && exercise.equipment.includes("bodyweight")) return 2;

  // Dumbbells are a reasonable substitute for many barbell movements
  if (
    userEquipment.includes("dumbbell") &&
    exercise.equipment.includes("barbell")
  ) {
    return 1;
  }

  // Bands are a partial substitute for cable
  if (
    userEquipment.includes("resistance_band") &&
    exercise.equipment.includes("cable")
  ) {
    return 1;
  }

  return 0;
}

/**
 * Injury avoidance scoring:
 * - 2 if exercise doesn't match any avoid keyword
 * - -10 if matches (strong penalty)
 */
function scoreInjury(exercise: Exercise, avoid: string[]): number {
  const matchesAvoid = avoid.some((keyword) =>
    exercise.name.toLowerCase().includes(keyword.toLowerCase().trim()),
  );
  return matchesAvoid ? -10 : 2;
}

/**
 * User preference scoring:
 * - 2 if favorited
 * - -5 if disliked
 * - 1 otherwise
 */
function scorePreference(
  exerciseId: string,
  profile: Profile & { favorites: string[]; disliked: string[] },
): number {
  if (profile.favorites?.includes(exerciseId)) return 2;
  if (profile.disliked?.includes(exerciseId)) return -5;
  return 1;
}

/**
 * Target muscle alignment:
 * - 3 if the exercise targets a priority muscle group
 * - 0 otherwise
 */
function scoreTargetMuscle(
  exercise: Exercise,
  priorities: MuscleGroup[],
): number {
  if (priorities.includes(exercise.primary)) return 3;
  if (exercise.secondary.some((m) => priorities.includes(m as MuscleGroup))) return 1;
  return 0;
}

/**
 * Experience match:
 * - 2 if exercise difficulty matches user's experience
 * - 1 if within one level
 * - 0 if mismatched
 */
function scoreExperience(
  exerciseDifficulty: Difficulty,
  userExperience: Profile["experience"],
): number {
  const diffMap: Record<Difficulty, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
  };
  const expMap: Record<string, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
  };

  const diff = diffMap[exerciseDifficulty];
  const exp = expMap[userExperience] ?? 2;
  const delta = Math.abs(diff - exp);

  if (delta === 0) return 2;
  if (delta === 1) return 1;
  return 0;
}

/**
 * Variety scoring:
 * - Bonus for selecting exercises with different primary muscles
 * - Bonus for selecting exercises that target needed muscle groups
 * - Small bonus for selecting exercises not already picked this week
 */
function scoreVariety(
  exercise: Exercise,
  alreadySelected: string[],
  neededMuscles: MuscleGroup[],
): number {
  let score = 0;

  // Bonus for targeting needed muscles
  if (neededMuscles.includes(exercise.primary as MuscleGroup)) {
    score += 3;
  }

  // Bonus for not being already selected
  if (!alreadySelected.includes(exercise.id)) {
    score += 1;
  }

  return score;
}