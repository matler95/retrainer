/**
 * Exercise database service.
 *
 * Provides a unified interface for accessing exercises:
 * 1. Tries Supabase first (for latest data)
 * 2. Falls back to localStorage cache
 * 3. Falls back to bundled seed JSON
 *
 * All functions are pure where possible. The service handles
 * caching and sync internally.
 */

import type { Exercise, MuscleGroup } from "@/data/exercises";
import { supabase } from "@/lib/supabase";

// ─── Constants ──────────────────────────────────────────────────────────────

const CACHE_KEY = "atlas-exercises-cache";
const CACHE_TIMESTAMP_KEY = "atlas-exercises-cache-ts";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── State ──────────────────────────────────────────────────────────────────

let exercisesCache: Exercise[] | null = null;
let loadPromise: Promise<Exercise[]> | null = null;

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Load exercises from the best available source.
 * Returns cached data immediately if available, then refreshes in background.
 */
export async function loadExercises(): Promise<Exercise[]> {
  // Return in-memory cache if available
  if (exercisesCache) return exercisesCache;

  // Return existing load promise if in flight
  if (loadPromise) return loadPromise;

  loadPromise = loadExercisesInternal();
  const result = await loadPromise;
  loadPromise = null;
  return result;
}

/**
 * Get exercises synchronously from cache or seed.
 * Returns empty array if nothing is loaded yet.
 */
export function getExercisesSync(): Exercise[] {
  if (exercisesCache) return exercisesCache;
  return loadFromLocalStorage();
}

/**
 * Get a single exercise by ID.
 */
export function getExerciseByIdFromCache(id: string): Exercise | undefined {
  const exercises = getExercisesSync();
  return exercises.find((e) => e.id === id);
}

/**
 * Get exercises by primary muscle group.
 */
export function getExercisesByMuscleFromCache(muscle: MuscleGroup): Exercise[] {
  const exercises = getExercisesSync();
  return exercises.filter((e) => e.primary === muscle);
}

/**
 * Search exercises by name.
 */
export function searchExercises(query: string): Exercise[] {
  const exercises = getExercisesSync();
  const lower = query.toLowerCase();
  return exercises.filter(
    (e) =>
      e.name.toLowerCase().includes(lower) ||
      e.primary.toLowerCase().includes(lower) ||
      e.equipment.some((eq) => eq.toLowerCase().includes(lower)),
  );
}

/**
 * Force refresh from Supabase.
 */
export async function refreshExercises(): Promise<Exercise[]> {
  exercisesCache = null;
  loadPromise = null;
  return loadExercises();
}

// ─── Internal ───────────────────────────────────────────────────────────────

async function loadExercisesInternal(): Promise<Exercise[]> {
  // 1. Try Supabase
  const fromDb = await loadFromSupabase();
  if (fromDb && fromDb.length > 0) {
    exercisesCache = fromDb;
    saveToLocalStorage(fromDb);
    return fromDb;
  }

  // 2. Try localStorage cache
  const fromCache = loadFromLocalStorage();
  if (fromCache.length > 0) {
    exercisesCache = fromCache;
    return fromCache;
  }

  // 3. Fall back to bundled seed
  const { EXERCISES } = await import("@/data/exercises");
  exercisesCache = EXERCISES;
  saveToLocalStorage(EXERCISES);
  return EXERCISES;
}

async function loadFromSupabase(): Promise<Exercise[] | null> {
  if (!supabase) return null;

  // Check cache timestamp
  const ts = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (ts && Date.now() - Number(ts) < CACHE_TTL_MS) {
    return null; // Cache is still fresh
  }

  try {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .order("name");

    if (error || !data) return null;

    // Transform from DB format to Exercise interface
    return data.map(dbRowToExercise);
  } catch {
    return null;
  }
}

function loadFromLocalStorage(): Exercise[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return [];
    return JSON.parse(cached) as Exercise[];
  } catch {
    return [];
  }
}

function saveToLocalStorage(exercises: Exercise[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(exercises));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
  } catch {
    // localStorage full — silently fail
  }
}

/**
 * Transform a Supabase row to the Exercise interface.
 */
function dbRowToExercise(row: Record<string, unknown>): Exercise {
  return {
    id: row.id as string,
    name: row.name as string,
    primary: row.primary_muscle as MuscleGroup,
    secondary: (row.secondary_muscles as MuscleGroup[]) ?? [],
    equipment: (row.equipment as Exercise["equipment"]) ?? [],
    difficulty: (row.difficulty as Exercise["difficulty"]) ?? "beginner",
    instructions: (row.instructions as string[]) ?? [],
    tips: (row.tips as string[]) ?? [],
    mistakes: (row.mistakes as string[]) ?? [],
    defaultSets: (row.default_sets as number) ?? 3,
    defaultReps: (row.default_reps as string) ?? "8-12",
    restSec: (row.rest_sec as number) ?? 60,
    progression: (row.progression as string) ?? "",
    videoUrl: row.video_url as string | undefined,
    cues: (row.cues as string[]) ?? [],
    muscleActivation: row.muscle_activation as Exercise["muscleActivation"],
    category: row.category as Exercise["category"],
    unilateral: (row.unilateral as boolean) ?? false,
    mechanic: row.mechanic as Exercise["mechanic"],
    plane: row.plane as Exercise["plane"],
    forceType: row.force_type as Exercise["forceType"],
    substituteIds: (row.substitute_ids as string[]) ?? [],
  };
}