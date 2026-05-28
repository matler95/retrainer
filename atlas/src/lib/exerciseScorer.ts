/**
 * Exercise scoring algorithm for plan generation.
 *
 * Scores exercises deterministically based on:
 * - equipment compatibility
 * - injury compatibility (avoid list)
 * - movement balance (even distribution across planes, mechanics)
 * - user preference (favorites / disliked)
 * - primary muscle target match
 * - experience level appropriateness
 * - compound-first prioritization
 * - unilateral/bilateral balance
 * - movement similarity avoidance
 *
 * The scorer replaces the naive `slice(0, n)` pattern in plan generation
 * with a scored ranking, ensuring the most appropriate exercises are selected.
 */

import { EXERCISES, type Exercise, type Equipment, type MuscleGroup, type Difficulty } from "@/data/exercises";
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
    variety: number;
    mechanicDiversity: number;
    planeDiversity: number;
    compoundPriority: number;
    unilateralDiversity: number;
    similarityPenalty: number;
  };
}

// Weight multipliers for each scoring dimension
const WEIGHTS = {
  equipment: 3,
  injury: 10,   // high weight — avoid injuries
  preference: 3,
  target: 5,
  experience: 2,
  variety: 3,   // INCREASED from 1 → 3 to give diversity meaningful influence
  mechanicDiversity: 2, // NEW — reward different movement mechanics
  planeDiversity: 1,    // NEW — reward different movement planes
  compoundPriority: 2,  // NEW — reward compound exercises
  unilateralDiversity: 1, // NEW — reward unilateral/bilateral mix
  similarityPenalty: -3,  // NEW — penalty for movement similarity
};

/**
 * Extended context passed to scoring functions for diversity tracking.
 */
export interface SelectionContext {
  /** Exercises already selected this day (for variety bonus) */
  alreadySelected: string[];
  /** Muscle groups that still need coverage (for balanced picking) */
  neededMuscles: MuscleGroup[];
  /** Mechanics already selected in this muscle group (for mechanic diversity) */
  selectedMechanics: Set<string>;
  /** Planes already selected in this muscle group (for plane diversity) */
  selectedPlanes: Set<string>;
  /** Whether any unilateral exercise has been selected in this muscle group */
  hasUnilateral: boolean;
  /** Whether any bilateral exercise has been selected in this muscle group */
  hasBilateral: boolean;
  /** User's training goal (for compound priority) */
  goal: string;
  /** Number of exercises already picked for this muscle group */
  pickedCount: number;
  /** Full exercise database (for similarity checking) */
  allExercises: Exercise[];
}

/**
 * Score a single exercise against the user's profile.
 * Higher scores = better fit.
 */
export function scoreExercise(
  exercise: Exercise,
  profile: Profile,
  context: SelectionContext,
): ExerciseScore {
  const breakdown = {
    equipment: scoreEquipment(exercise, profile.equipment),
    injury: scoreInjury(exercise, profile.avoid),
    preference: scorePreference(exercise.id, profile as Profile & { favorites: string[]; disliked: string[] }),
    target: scoreTargetMuscle(exercise, profile.priorities),
    experience: scoreExperience(exercise.difficulty, profile.experience),
    variety: scoreVariety(exercise, context.alreadySelected, context.neededMuscles),
    mechanicDiversity: scoreMechanicDiversity(exercise, context.selectedMechanics),
    planeDiversity: scorePlaneDiversity(exercise, context.selectedPlanes),
    compoundPriority: scoreCompoundPriority(exercise, context.goal, context.pickedCount),
    unilateralDiversity: scoreUnilateralDiversity(exercise, context.hasUnilateral, context.hasBilateral),
    similarityPenalty: scoreSimilarity(exercise, context.alreadySelected, context.allExercises ?? EXERCISES),
  };

  const total =
    breakdown.equipment * WEIGHTS.equipment +
    breakdown.injury * WEIGHTS.injury +
    breakdown.preference * WEIGHTS.preference +
    breakdown.target * WEIGHTS.target +
    breakdown.experience * WEIGHTS.experience +
    breakdown.variety * WEIGHTS.variety +
    breakdown.mechanicDiversity * WEIGHTS.mechanicDiversity +
    breakdown.planeDiversity * WEIGHTS.planeDiversity +
    breakdown.compoundPriority * WEIGHTS.compoundPriority +
    breakdown.unilateralDiversity * WEIGHTS.unilateralDiversity +
    breakdown.similarityPenalty * WEIGHTS.similarityPenalty;

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
  context: SelectionContext,
): ExerciseScore[] {
  const scores = exercises
    .filter(
      (e) =>
        e.primary === muscle || e.secondary.includes(muscle),
    )
    .map((e) => scoreExercise(e, profile, context));

  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Pick the top N exercises for a muscle group using diversity-aware selection.
 *
 * Instead of naive greedy top-N (which can pick 2 near-identical exercises),
 * this uses iterative re-ranking: after each pick, the context updates
 * (tracks mechanics, planes, unilateral status), and remaining candidates
 * are re-scored with updated diversity bonuses/penalties.
 *
 * This produces a diverse, well-balanced exercise selection while still
 * respecting the core fitness dimensions (equipment, injury, preference).
 */
export function pickTopScored(
  exercises: Exercise[],
  muscle: MuscleGroup,
  profile: Profile,
  count: number,
  alreadySelected: string[],
  neededMuscles: MuscleGroup[],
): Exercise[] {
  // Build initial selection context
  const context: SelectionContext = {
    alreadySelected,
    neededMuscles,
    selectedMechanics: new Set(),
    selectedPlanes: new Set(),
    hasUnilateral: false,
    hasBilateral: false,
    goal: profile.goal ?? "build muscle",
    pickedCount: 0,
    allExercises: exercises,
  };

  const picked: Exercise[] = [];

  // Iteratively select exercises — after each pick, update context and re-score
  for (let iteration = 0; iteration < count; iteration++) {
    // Score all candidates for this muscle group with current context
    const scored = scoreExercisesForMuscle(
      exercises,
      muscle,
      profile,
      context,
    );

    // Filter out already selected (globally and within this muscle group)
    const filtered = scored.filter(
      (s) =>
        !context.alreadySelected.includes(s.exerciseId) &&
        !picked.some((p) => p.id === s.exerciseId),
    );

    if (filtered.length === 0) break;

    // Pick the highest-scoring candidate
    const best = filtered[0];
    const bestExercise = exercises.find((e) => e.id === best.exerciseId);
    if (!bestExercise) continue;

    picked.push(bestExercise);
    context.pickedCount++;

    // Update context for diversity tracking on next iteration
    if (bestExercise.mechanic) {
      context.selectedMechanics.add(bestExercise.mechanic);
    }
    if (bestExercise.plane) {
      context.selectedPlanes.add(bestExercise.plane);
    }
    if (bestExercise.unilateral) {
      context.hasUnilateral = true;
    } else {
      context.hasBilateral = true;
    }

    // Add to alreadySelected to prevent re-picking across muscle groups
    context.alreadySelected = [...context.alreadySelected, bestExercise.id];
  }

  return picked;
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

  // Kettlebells as substitute for dumbbells
  if (
    userEquipment.includes("kettlebell") &&
    exercise.equipment.includes("dumbbell")
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
 * - Bonus for selecting exercises that target needed muscle groups
 * - Bonus for selecting exercises not already picked this day
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

/**
 * Mechanic diversity scoring (NEW):
 * - Bonus for selecting an exercise with a different mechanic
 *   than what's already been selected for this muscle group
 * - Encourages e.g., push + hinge instead of push + push for chest
 *
 * Mechanics available: push, pull, hinge, squat, rotation, carry, isolation, compound
 */
function scoreMechanicDiversity(
  exercise: Exercise,
  selectedMechanics: Set<string>,
): number {
  // If no mechanics selected yet, no bonus needed (first pick gets whatever)
  if (selectedMechanics.size === 0) return 0;

  const mechanic = exercise.mechanic;
  if (!mechanic) return 0;

  // Bonus for a different mechanic than what's already selected
  if (!selectedMechanics.has(mechanic)) {
    return 3; // Significant bonus for introducing a new movement pattern
  }

  return 0;
}

/**
 * Plane diversity scoring (NEW):
 * - Bonus for selecting exercises in a different movement plane
 *   than what's already been selected
 * - Ensures sagittal + frontal plane mix for well-rounded development
 */
function scorePlaneDiversity(
  exercise: Exercise,
  selectedPlanes: Set<string>,
): number {
  // If no planes selected yet, no bonus needed
  if (selectedPlanes.size === 0) return 0;

  const plane = exercise.plane;
  if (!plane) return 0;

  // Bonus for a different plane than what's already selected
  if (!selectedPlanes.has(plane)) {
    return 2;
  }

  return 0;
}

/**
 * Compound priority scoring (NEW):
 * - For hypertrophy/strength goals, compound exercises get a bonus
 * - The bonus is bigger for the FIRST pick (primary compound movement)
 * - Later picks still get a smaller bonus
 * - This ensures compound lifts are prioritized over isolation
 */
function scoreCompoundPriority(
  exercise: Exercise,
  goal: string,
  pickedCount: number,
): number {
  const isHypertrophyGoal = ["build muscle", "strength", "recomposition"].includes(goal);
  if (!isHypertrophyGoal) return 0;

  const isCompound = exercise.category === "compound" || exercise.mechanic !== "isolation";
  if (!isCompound) return 0;

  // First pick: strong compound bonus (ensures main lift is selected)
  if (pickedCount === 0) return 4;

  // Subsequent picks: smaller compound bonus
  return 2;
}

/**
 * Unilateral diversity scoring (NEW):
 * - Encourages a mix of unilateral and bilateral exercises
 * - If only bilateral has been selected so far, bonus for unilateral
 * - If only unilateral has been selected so far, bonus for bilateral
 * - Balanced programs get 0 bonus (already balanced)
 */
function scoreUnilateralDiversity(
  exercise: Exercise,
  hasUnilateral: boolean,
  hasBilateral: boolean,
): number {
  // If both types already represented, no bonus needed
  if (hasUnilateral && hasBilateral) return 0;

  // If neither selected yet (first pick), no bonus
  if (!hasUnilateral && !hasBilateral) return 0;

  // If only unilateral selected, bonus for bilateral
  if (hasUnilateral && !hasBilateral && !exercise.unilateral) {
    return 2;
  }

  // If only bilateral selected, bonus for unilateral
  if (!hasUnilateral && hasBilateral && exercise.unilateral) {
    return 2;
  }

  return 0;
}

/**
 * Movement similarity penalty (NEW):
 * - Penalizes exercises that are too similar to already-selected ones
 * - Similarity is based on (mechanic + plane) combination
 * - Two exercises with same mechanic AND same plane are "similar"
 * - This prevents selecting e.g., two sagittal-plane push exercises
 *   like Barbell Bench Press + Barbell Guillotine Bench Press
 */
function scoreSimilarity(
  exercise: Exercise,
  alreadySelected: string[],
  allExercises: Exercise[],
): number {
  if (alreadySelected.length === 0) return 0;

  // Check if this exercise has mechanic and plane info
  const mechanic = exercise.mechanic;
  const plane = exercise.plane;
  if (!mechanic || !plane) return 0;

  let penalty = 0;

  for (const selectedId of alreadySelected) {
    const selected = allExercises.find((e: Exercise) => e.id === selectedId);
    if (!selected) continue;

    // Check if both mechanic AND plane match → very similar movement
    if (
      selected.mechanic === mechanic &&
      selected.plane === plane
    ) {
      penalty -= 3; // Strong penalty for same movement pattern
    }
    // Check if just mechanic matches → somewhat similar
    else if (selected.mechanic === mechanic) {
      penalty -= 1; // Light penalty for same mechanic, different plane
    }
  }

  return penalty;
}
