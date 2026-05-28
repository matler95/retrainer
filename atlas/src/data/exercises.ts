/**
 * Exercise database types and helpers.
 *
 * The exercise database is stored in Supabase and cached locally for offline use.
 * This file defines the types and provides utility functions.
 *
 * The actual exercise data is loaded via src/lib/exerciseService.ts.
 */

// ─── Muscle Groups ──────────────────────────────────────────────────────────
// Expanded to match the enriched exercise database (17 groups)

export type MuscleGroup =
  | "abductors" | "abs" | "adductors" | "biceps" | "calves"
  | "chest" | "forearms" | "glutes" | "hamstrings" | "lats"
  | "lower_back" | "middle_back" | "neck" | "quads"
  | "shoulders" | "traps" | "triceps"
  | "back" | "legs" | "core" | "full body"; // legacy aliases

/**
 * All muscle groups for UI display (excluding legacy aliases).
 */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  "abductors", "abs", "adductors", "biceps", "calves",
  "chest", "forearms", "glutes", "hamstrings", "lats",
  "lower_back", "middle_back", "neck", "quads",
  "shoulders", "traps", "triceps",
];

/**
 * Map legacy muscle groups to their new equivalents for backward compatibility.
 */
export const LEGACY_MUSCLE_MAP: Record<string, MuscleGroup[]> = {
  back: ["lats", "middle_back", "lower_back", "traps"],
  legs: ["quads", "hamstrings", "calves", "glutes"],
  core: ["abs"],
  "full body": [],
};

// ─── Equipment ──────────────────────────────────────────────────────────────

export type Equipment =
  | "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight"
  | "resistance_band" | "kettlebell" | "ez_bar" | "exercise_ball"
  | "foam_roller" | "medicine_ball" | "other";

export const EQUIPMENT_OPTIONS: Equipment[] = [
  "barbell", "dumbbell", "machine", "cable", "bodyweight",
  "resistance_band", "kettlebell", "ez_bar", "exercise_ball",
  "foam_roller", "medicine_ball", "other",
];

/**
 * Legacy equipment name mapping for backward compatibility.
 */
export const LEGACY_EQUIPMENT_MAP: Record<string, Equipment> = {
  dumbbells: "dumbbell",
  bands: "resistance_band",
};

// ─── Difficulty ─────────────────────────────────────────────────────────────

export type Difficulty = "beginner" | "intermediate" | "advanced";

// ─── Exercise Category ──────────────────────────────────────────────────────

export type ExerciseCategory = "compound" | "isolation" | "cardio" | "mobility" | "flexibility" | "plyometric";

// ─── Movement Mechanic ──────────────────────────────────────────────────────
// Kept from current approach — more descriptive than the JSON's compound/isolation

export type Mechanic = "push" | "pull" | "hinge" | "squat" | "carry" | "rotation" | "static" | "isolation" | "compound";

// ─── Movement Plane ─────────────────────────────────────────────────────────

export type Plane = "sagittal" | "frontal" | "transverse";

// ─── Force Type ─────────────────────────────────────────────────────────────

export type ForceType = "concentric" | "eccentric" | "isometric";

// ─── Activation Level ───────────────────────────────────────────────────────

export type ActivationLevel = "primary" | "secondary" | "stabilizer";

// ─── Exercise Interface ─────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  instructions: string[];
  tips: string[];
  mistakes: string[];
  defaultSets: number;
  defaultReps: string;
  restSec: number;
  progression: string;
  /** YouTube embed ID or URL for exercise demo video */
  videoUrl?: string;
  /** Movement cues for real-time feedback */
  cues?: string[];
  /** Detailed muscle activation map */
  muscleActivation?: Partial<Record<MuscleGroup, ActivationLevel>>;
  /** Exercise category */
  category?: ExerciseCategory;
  /** Whether this is a unilateral (single-limb) exercise */
  unilateral?: boolean;
  /** Movement mechanic classification */
  mechanic?: Mechanic;
  /** Movement plane */
  plane?: Plane;
  /** Force type */
  forceType?: ForceType;
  /** Exercise IDs that can substitute for this one */
  substituteIds?: string[];
}

// ─── Seed Data (bundled for offline-first) ──────────────────────────────────
// This will be populated from the enriched JSON at build time or fetched from Supabase.

import EXERCISES_SEED_JSON from "./exercises-seed.json";

export const EXERCISES: Exercise[] = EXERCISES_SEED_JSON as Exercise[];

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Get an exercise by ID from a local array.
 */
export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

/**
 * Get exercises by primary muscle group.
 */
export function getExercisesByMuscle(muscle: MuscleGroup): Exercise[] {
  // Include exercises where primary matches directly OR is a legacy alias that maps to this muscle
  return EXERCISES.filter((e) => {
    if (e.primary === muscle) return true;
    // Check if legacy primary maps to this muscle
    const mapped = LEGACY_MUSCLE_MAP[e.primary];
    return mapped?.includes(muscle);
  });
}

/**
 * Get all unique primary muscle groups present in the exercise database.
 */
export function getAvailableMuscleGroups(): MuscleGroup[] {
  const groups = new Set<MuscleGroup>();
  EXERCISES.forEach((e) => groups.add(e.primary));
  return [...groups].sort();
}