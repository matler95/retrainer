-- ============================================================
-- Atlas Personal Trainer — Row Level Security Policies
-- ============================================================
-- Enables RLS on all tables and creates policies ensuring
-- users can only access their own data.
-- ============================================================

-- ─── Enable RLS on all tables ────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_prs ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ────────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ─── Plans ───────────────────────────────────────────────────
CREATE POLICY "Users can view own plans"
  ON plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
  ON plans FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Sessions ────────────────────────────────────────────────
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Body Metrics ────────────────────────────────────────────
CREATE POLICY "Users can view own body metrics"
  ON body_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own body metrics"
  ON body_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own body metrics"
  ON body_metrics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own body metrics"
  ON body_metrics FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Exercise PRs ────────────────────────────────────────────
CREATE POLICY "Users can view own exercise prs"
  ON exercise_prs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise prs"
  ON exercise_prs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise prs"
  ON exercise_prs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise prs"
  ON exercise_prs FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Water Logs ──────────────────────────────────────────────
CREATE POLICY "Users can view own water logs"
  ON water_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own water logs"
  ON water_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own water logs"
  ON water_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own water logs"
  ON water_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Weekly Check-Ins ────────────────────────────────────────
CREATE POLICY "Users can view own weekly checkins"
  ON weekly_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly checkins"
  ON weekly_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly checkins"
  ON weekly_checkins FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly checkins"
  ON weekly_checkins FOR DELETE
  USING (auth.uid() = user_id);