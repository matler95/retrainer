/**
 * Fatigue modeling utilities for training load management.
 *
 * Implements:
 * - Session load calculation (weight × reps × RPE adjustment)
 * - Acute:Chronic Workload Ratio (ACWR) for fatigue monitoring
 * - Readiness score (0-100) combining ACWR, RPE, and CNS demand
 * - Deload detection heuristics
 * - CNS demand weighting for exercise selection
 *
 * All functions are pure and deterministic.
 */

import type { Session, SessionExerciseLog } from "@/store/useAppStore";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * CNS demand weight for each exercise.
 * Heavier compound lifts tax the CNS more than isolation movements.
 * Used to weight fatigue for CNS-intensive sessions.
 */
const CNS_DEMAND: Record<string, number> = {
  squat: 1.0,
  deadlift: 1.0,
  "bench-press": 0.8,
  ohp: 0.8,
  pullup: 0.7,
  "barbell-row": 0.7,
  dips: 0.6,
  "hip-thrust": 0.6,
  "leg-press": 0.5,
  lunge: 0.5,
  rdl: 0.6,
  "lat-pulldown": 0.4,
  "db-row": 0.4,
  "db-bench": 0.5,
  "db-shoulder": 0.5,
  "lateral-raise": 0.2,
  "bb-curl": 0.2,
  "db-curl": 0.2,
  "hammer-curl": 0.2,
  "tricep-pushdown": 0.2,
  skullcrusher: 0.2,
  "goblet-squat": 0.4,
  "calf-raise": 0.1,
  plank: 0.1,
  "hanging-leg-raise": 0.2,
  "ab-wheel": 0.2,
  pushup: 0.3,
  "incline-db": 0.5,
  burpee: 0.6,
  "kb-swing": 0.5,
  "glute-bridge": 0.2,
};

/**
 * Thresholds for readiness and fatigue decisions.
 */
const FATIGUE_THRESHOLDS = {
  /** ACWR below this → potential under-training / deconditioning */
  ACWR_MIN_OPTIMAL: 0.8,
  /** ACWR above this → high injury/fatigue risk */
  ACWR_MAX_OPTIMAL: 1.3,
  /** ACWR above this → danger zone, deload strongly recommended */
  ACWR_DANGER: 1.5,
  /** Readiness score below this → deload recommended */
  READINESS_DELOAD_THRESHOLD: 50,
  /** Readiness score above this → user can push hard */
  READINESS_PUSH_THRESHOLD: 80,
  /** CNS load above this per week → high neural fatigue */
  CNS_LOAD_HIGH_THRESHOLD: 10,
  /** Weight reduction during deload */
  DELOAD_LOAD_REDUCTION: 0.6,
  /** Volume reduction during deload (set multiplier) */
  DELOAD_VOLUME_REDUCTION: 0.5,
} as const;

// ─── Session Load Calculation ────────────────────────────────────────────────

/**
 * Compute the total load for a single session.
 * Load = Σ (weight × reps × (RPE / 10)) for each completed set.
 *
 * RPE adjustment: A set at RPE 8 gets a weight of 0.8, meaning we count
 * 80% of the tonnage. This accounts for effort — harder sets contribute more fatigue.
 *
 * @param session - The completed session with exercises and sets
 * @returns Total session load (arbitrary units)
 */
export function computeSessionLoad(session: Session): number {
  return session.exercises.reduce((sessionTotal, exercise) => {
    const exerciseLoad = exercise.sets.reduce((setTotal, set) => {
      if (!set.done) return setTotal;
      return setTotal + set.weight * Math.max(1, set.reps) * (set.rpe ? set.rpe / 10 : 1);
    }, 0);
    return sessionTotal + exerciseLoad;
  }, 0);
}

// ─── ACWR Calculation ─────────────────────────────────────────────────────────

/**
 * Compute the Acute:Chronic Workload Ratio.
 *
 * ACWR = Acute load (last 7 days) / Chronic load (average weekly load over last 28 days)
 *
 * RATIONALE:
 * - ACWR < 0.8: Under-training risk — not enough stimulus for adaptation
 * - ACWR 0.8 - 1.3: Optimal — good stimulus with manageable fatigue
 * - ACWR 1.3 - 1.5: High risk zone — may need recovery
 * - ACWR > 1.5: Danger zone — deload strongly recommended
 *
 * @param last7 - Total training load in the last 7 days
 * @param last28 - Average weekly training load over the last 28 days
 * @returns ACWR value
 */
export function computeAcwr(last7: number, last28: number): number {
  if (last28 <= 0) return last7 > 0 ? 2 : 1;
  return last7 / last28;
}

// ─── Readiness Score ─────────────────────────────────────────────────────────

/**
 * Compute a 0-100 readiness score based on ACWR and recent RPE.
 *
 * SCORE COMPONENTS:
 * - ACWR Score (max 50 pts): Optimal ACWR (0.8-1.3) → 50 pts
 * - RPE Score (max 30 pts): Lower recent RPE → higher score
 * - Base Score (20 pts): Always included
 *
 * @param acwr - Current ACWR value
 * @param recentRpe - Average RPE of recent sets (0-10)
 * @returns Readiness score (0-100)
 */
export function readinessScore(acwr: number, recentRpe: number): number {
  // ACWR contribution (0-50 points)
  const acwrScore =
    acwr >= FATIGUE_THRESHOLDS.ACWR_MIN_OPTIMAL &&
    acwr <= FATIGUE_THRESHOLDS.ACWR_MAX_OPTIMAL
      ? 50
      : acwr > FATIGUE_THRESHOLDS.ACWR_DANGER
        ? 20
        : acwr < FATIGUE_THRESHOLDS.ACWR_MIN_OPTIMAL
          ? 35
          : 40;

  // RPE contribution (0-30 points)
  // Higher RPE = more fatigue = lower score
  const rpeScore = Math.max(0, 30 - Math.max(0, recentRpe - 7) * 5);

  const score = Math.round(Math.min(100, acwrScore + rpeScore + 20));
  return Math.max(0, Math.min(100, score));
}

// ─── Load Aggregation ────────────────────────────────────────────────────────

/**
 * Get recent training load metrics from session history.
 * Returns the total load for last 7 days and average weekly load for last 28 days.
 *
 * @param sessions - All logged sessions
 * @returns Object with last7 and last28 loads
 */
export function getRecentLoad(sessions: Session[]) {
  const now = Date.now();
  const msDay = 24 * 60 * 60 * 1000;

  const last7 = sessions
    .filter(
      (s) => now - new Date(s.date).getTime() <= 7 * msDay,
    )
    .reduce((sum, s) => sum + computeSessionLoad(s), 0);

  const last28Sessions = sessions.filter(
    (s) => now - new Date(s.date).getTime() <= 28 * msDay,
  );
  const last28Raw = last28Sessions.reduce(
    (sum, s) => sum + computeSessionLoad(s),
    0,
  );
  const last28 = last28Raw / Math.max(1, 4); // average weekly load

  return { last7, last28 };
}

// ─── CNS Demand ──────────────────────────────────────────────────────────────

/**
 * Get the CNS demand rating for an exercise.
 * Returns a value between 0.1 (low demand) and 1.0 (high demand).
 */
export function getCnsDemand(exerciseId: string): number {
  return CNS_DEMAND[exerciseId] ?? 0.3;
}

/**
 * Compute the total CNS demand for a session.
 * CNS demand = Σ (exerciseCnsDemand × completedSets) for each exercise.
 *
 * @param exercises - The exercises logged in the session
 * @returns Total CNS demand for the session
 */
export function computeSessionCnsDemand(
  exercises: SessionExerciseLog[],
): number {
  let totalDemand = 0;

  for (const log of exercises) {
    const demand = getCnsDemand(log.exerciseId);
    const doneSets = log.sets.filter((s) => s.done).length;
    totalDemand += demand * doneSets;
  }

  return totalDemand;
}

/**
 * Compute average CNS demand per session over a set of sessions.
 * Useful for tracking CNS load trend.
 *
 * @param sessions - Sessions to analyze
 * @returns Average CNS demand per session
 */
export function computeAverageCnsPerSession(
  sessions: Session[],
): number {
  if (sessions.length === 0) return 0;

  const totalCns = sessions.reduce(
    (sum, s) => sum + computeSessionCnsDemand(s.exercises),
    0,
  );
  return totalCns / sessions.length;
}

// ─── Deload Detection ────────────────────────────────────────────────────────

export interface DeloadRecommendation {
  /** Whether the user should deload */
  shouldDeload: boolean;
  /** Reason for the recommendation */
  reason: string;
  /** Suggested load reduction (0-1, where 1 = full load) */
  loadMultiplier: number;
  /** Suggested volume reduction (0-1, where 1 = full volume) */
  volumeMultiplier: number;
}

/**
 * Determine if the user should deload based on current fatigue metrics.
 *
 * DELOAD TRIGGERS (any of these):
 * 1. ACWR > 1.5 (danger zone)
 * 2. Readiness score < 50 for multiple days
 * 3. CNS load > threshold for current week
 * 4. Consecutive sessions with declining e1RM
 *
 * @param acwr - Current ACWR
 * @param readiness - Current readiness score (0-100)
 * @param weekCnsLoad - Total CNS load for the current week
 * @param consecutiveDecliningSessions - Number of sessions with declining performance
 * @returns Deload recommendation with reasoning
 */
export function checkDeloadNeeded(
  acwr: number,
  readiness: number,
  weekCnsLoad: number,
  consecutiveDecliningSessions: number,
): DeloadRecommendation {
  // Check ACWR danger zone
  if (acwr > FATIGUE_THRESHOLDS.ACWR_DANGER) {
    return {
      shouldDeload: true,
      reason: `Your training load has spiked (ACWR: ${acwr.toFixed(2)}). A deload week will help reset fatigue and prevent overtraining.`,
      loadMultiplier: FATIGUE_THRESHOLDS.DELOAD_LOAD_REDUCTION,
      volumeMultiplier: FATIGUE_THRESHOLDS.DELOAD_VOLUME_REDUCTION,
    };
  }

  // Check low readiness
  if (readiness < FATIGUE_THRESHOLDS.READINESS_DELOAD_THRESHOLD) {
    return {
      shouldDeload: true,
      reason: `Your readiness score is low (${readiness}/100). Your body needs a recovery week to come back stronger.`,
      loadMultiplier: FATIGUE_THRESHOLDS.DELOAD_LOAD_REDUCTION,
      volumeMultiplier: FATIGUE_THRESHOLDS.DELOAD_VOLUME_REDUCTION,
    };
  }

  // Check high CNS load
  if (weekCnsLoad > FATIGUE_THRESHOLDS.CNS_LOAD_HIGH_THRESHOLD) {
    return {
      shouldDeload: true,
      reason: `High CNS demand detected this week (${weekCnsLoad.toFixed(1)}). Your nervous system needs a lighter week to recover.`,
      loadMultiplier: 0.7,
      volumeMultiplier: 0.6,
    };
  }

  // Check declining performance
  if (consecutiveDecliningSessions >= 3) {
    return {
      shouldDeload: true,
      reason: `${consecutiveDecliningSessions} consecutive sessions with declining performance. A deload week will help you reset and break through the plateau.`,
      loadMultiplier: FATIGUE_THRESHOLDS.DELOAD_LOAD_REDUCTION,
      volumeMultiplier: FATIGUE_THRESHOLDS.DELOAD_VOLUME_REDUCTION,
    };
  }

  return {
    shouldDeload: false,
    reason: "No deload needed — keep training according to plan.",
    loadMultiplier: 1.0,
    volumeMultiplier: 1.0,
  };
}

// ─── Workload Recommendation ─────────────────────────────────────────────────

export interface WorkloadRecommendation {
  /** Recommended weight multiplier (1.0 = normal, 0.85 = deload, etc.) */
  weightMultiplier: number;
  /** Recommended volume multiplier (1.0 = normal, 0.5 = half, etc.) */
  volumeMultiplier: number;
  /** Human-readable recommendation */
  message: string;
}

/**
 * Get a workout recommendation based on readiness and fatigue.
 * Adjusts working weight and volume based on current state.
 *
 * - Ready to push (readiness >= 80): Full weight, full volume, possibly increase
 * - Moderate readiness (60-79): Full weight, normal volume
 * - Low readiness (50-59): Slightly reduced weight, normal volume
 * - Needs recovery (< 50): Reduced weight and volume
 *
 * @param readiness - Current readiness score (0-100)
 * @param acwr - Current ACWR
 * @returns Workload recommendation with multipliers and message
 */
export function getWorkoutRecommendation(
  readiness: number,
  acwr: number,
): WorkloadRecommendation {
  if (acwr > FATIGUE_THRESHOLDS.ACWR_DANGER) {
    return {
      weightMultiplier: 0.6,
      volumeMultiplier: 0.5,
      message: `ACWR is elevated (${acwr.toFixed(2)}). Consider a deload session with 60% of normal weight and 50% of sets.`,
    };
  }

  if (readiness >= FATIGUE_THRESHOLDS.READINESS_PUSH_THRESHOLD) {
    return {
      weightMultiplier: 1.0,
      volumeMultiplier: 1.0,
      message: "Great readiness! Full training load recommended — you can push for a PR or add volume.",
    };
  }

  if (readiness >= 70) {
    return {
      weightMultiplier: 1.0,
      volumeMultiplier: 1.0,
      message: "Good readiness. Follow your planned training — you're well-recovered.",
    };
  }

  if (readiness >= FATIGUE_THRESHOLDS.READINESS_DELOAD_THRESHOLD) {
    return {
      weightMultiplier: 1.0,
      volumeMultiplier: 0.9,
      message: "Moderate readiness. Train as planned but keep RPE in check (≤7).",
    };
  }

  return {
    weightMultiplier: 0.85,
    volumeMultiplier: 0.75,
    message: `Low readiness (${readiness}/100). Reduce working weight by ~15% and sets by ~25%. Focus on technique and recovery.`,
  };
}