-- ============================================================
-- Atlas Personal Trainer — Initial Schema
-- ============================================================
-- Creates core tables for the Atlas app.
-- All tables use UUID primary keys and reference auth.users.
-- ============================================================

-- ─── Profiles ────────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  age INT,
  gender TEXT,
  height_cm FLOAT,
  weight_kg FLOAT,
  goal TEXT,
  experience TEXT,
  style TEXT,
  activity TEXT,
  equipment TEXT[],
  priorities TEXT[],
  avoid TEXT[],
  injuries TEXT,
  days_per_week INT,
  duration_min INT,
  supplements TEXT[],
  water_auto BOOL DEFAULT true,
  water_target_ml INT DEFAULT 2500,
  movement_assessment JSONB,
  training_history JSONB,
  recovery_profile JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Plans ───────────────────────────────────────────────────
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  days JSONB NOT NULL,
  week_number INT DEFAULT 0,
  blocks JSONB,
  is_active BOOL DEFAULT true,
  version INT DEFAULT 1,
  previous_plan_id UUID REFERENCES plans(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plans_user_active ON plans(user_id, is_active);

-- ─── Sessions ────────────────────────────────────────────────
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id),
  day_id TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_min INT,
  exercises JSONB NOT NULL,
  notes TEXT,
  rpe_overall FLOAT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_user_date ON sessions(user_id, created_at DESC);
CREATE INDEX idx_sessions_day ON sessions(user_id, day_id);

-- ─── Body Metrics ────────────────────────────────────────────
CREATE TABLE body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg FLOAT,
  body_fat_pct FLOAT,
  measurements JSONB,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_body_metrics_user_date ON body_metrics(user_id, date DESC);

-- ─── Exercise PRs ────────────────────────────────────────────
CREATE TABLE exercise_prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  rep_count INT NOT NULL,
  weight_kg FLOAT NOT NULL,
  reps INT NOT NULL,
  estimated_1rm FLOAT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL,
  session_id UUID REFERENCES sessions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exercise_prs_user_exercise ON exercise_prs(user_id, exercise_id);
CREATE INDEX idx_exercise_prs_user_date ON exercise_prs(user_id, achieved_at DESC);

-- ─── Water Logs ──────────────────────────────────────────────
CREATE TABLE water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  date DATE NOT NULL,
  ml INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_water_logs_user_date ON water_logs(user_id, date DESC);

-- ─── Weekly Check-Ins ────────────────────────────────────────
CREATE TABLE weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles ON DELETE CASCADE,
  week_number INT NOT NULL,
  weight_kg FLOAT,
  energy_level INT,
  sleep_quality INT,
  muscle_soreness INT,
  overall_mood INT,
  notes TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_weekly_checkins_user ON weekly_checkins(user_id, week_number);