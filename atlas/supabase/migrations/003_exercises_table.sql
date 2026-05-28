-- Atlas — Exercises Table
-- Stores the exercise database in Supabase for centralized management.

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  primary_muscle TEXT NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  instructions TEXT[] DEFAULT '{}',
  tips TEXT[] DEFAULT '{}',
  mistakes TEXT[] DEFAULT '{}',
  default_sets INT NOT NULL DEFAULT 3,
  default_reps TEXT NOT NULL DEFAULT '8-12',
  rest_sec INT NOT NULL DEFAULT 60,
  progression TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  cues TEXT[] DEFAULT '{}',
  muscle_activation JSONB,
  category TEXT,
  unilateral BOOLEAN DEFAULT false,
  mechanic TEXT,
  plane TEXT,
  force_type TEXT,
  substitute_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscle ON exercises(primary_muscle);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises USING GIN(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_select_public" ON exercises FOR SELECT USING (true);
CREATE POLICY "exercises_service_all" ON exercises FOR ALL USING (auth.role() = 'service_role');