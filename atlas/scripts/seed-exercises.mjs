/**
 * Standalone seed script for exercises table.
 * Loads .env.local manually (bypasses Vite's import.meta.env).
 *
 * Usage: node scripts/seed-exercises.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  process.env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Load exercise data
const dataPath = resolve(__dirname, "../src/data/exercises-seed.json");
const exercises = JSON.parse(readFileSync(dataPath, "utf-8"));

console.log(`Seeding ${exercises.length} exercises...`);

let uploaded = 0;
let errors = 0;

const batchSize = 50;

for (let i = 0; i < exercises.length; i += batchSize) {
  const batch = exercises.slice(i, i + batchSize);
  const rows = batch.map((ex) => ({
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
  }));

  const { error } = await supabase
    .from("exercises")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
    errors += batch.length;
  } else {
    uploaded += batch.length;
    process.stdout.write(`  Uploaded ${uploaded}/${exercises.length}\r`);
  }
}

console.log(`\nDone: ${uploaded} uploaded, ${errors} errors`);
process.exit(errors > 0 ? 1 : 0);