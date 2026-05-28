/**
 * Seed script to upload exercises to Supabase.
 *
 * Run this once to populate the exercises table:
 *   npx tsx src/lib/seedExercises.ts
 *
 * Or call seedExercises() from the app after authenticating as service role.
 */

import { supabase } from "@/lib/supabase";
import exercisesData from "@/data/exercises-seed.json";
import type { Exercise } from "@/data/exercises";

/**
 * Upload all exercises from the seed JSON to Supabase.
 * Uses upsert so it's safe to run multiple times.
 */
export async function seedExercises(): Promise<{ uploaded: number; errors: number }> {
  if (!supabase) {
    console.error("Supabase not configured");
    return { uploaded: 0, errors: 0 };
  }

  let uploaded = 0;
  let errors = 0;

  // Batch in groups of 50 to avoid payload limits
  const batchSize = 50;
  const exercises = exercisesData as Exercise[];

  for (let i = 0; i < exercises.length; i += batchSize) {
    const batch = exercises.slice(i, i + batchSize);
    const rows = batch.map(exerciseToDbRow);

    const { error } = await supabase
      .from("exercises")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
      errors += batch.length;
    } else {
      uploaded += batch.length;
    }
  }

  console.log(`Seeded ${uploaded} exercises (${errors} errors)`);
  return { uploaded, errors };
}

/**
 * Transform an Exercise to a Supabase row.
 */
function exerciseToDbRow(ex: Exercise): Record<string, unknown> {
  return {
    id: ex.id,
    name: ex.name,
    primary_muscle: ex.primary,
    secondary_muscles: ex.secondary,
    equipment: ex.equipment,
    difficulty: ex.difficulty,
    instructions: ex.instructions,
    tips: ex.tips,
    mistakes: ex.mistakes,
    default_sets: ex.defaultSets,
    default_reps: ex.defaultReps,
    rest_sec: ex.restSec,
    progression: ex.progression,
    video_url: ex.videoUrl ?? null,
    cues: ex.cues ?? [],
    muscle_activation: ex.muscleActivation ?? null,
    category: ex.category ?? null,
    unilateral: ex.unilateral ?? false,
    mechanic: ex.mechanic ?? null,
    plane: ex.plane ?? null,
    force_type: ex.forceType ?? null,
    substitute_ids: ex.substituteIds ?? [],
  };
}