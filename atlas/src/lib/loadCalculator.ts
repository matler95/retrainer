/**
 * Load calculation utilities for 1RM estimation and working weight recommendations.
 *
 * SUPPORTED FORMULAS:
 * - Epley: weight × (1 + reps / 30) — accurate for reps ≤ 10
 * - Brzycki: weight × (36 / (37 - reps)) — accurate for reps ≤ 15
 * - Average: (Epley + Brzycki) / 2 — best general-purpose estimate
 *
 * Each function is a pure, deterministic calculation with no side effects.
 */

import type { PeriodizationPhase } from "@/lib/periodization";

// ─── 1RM Estimation Formulas ──────────────────────────────────────────────────

/**
 * Epley formula: 1RM = weight × (1 + reps / 30)
 * Most accurate for reps ≤ 10. Tends to overestimate at higher reps.
 */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Brzycki formula: 1RM = weight × (36 / (37 - reps))
 * Most accurate for reps ≤ 15. Tends to underestimate at very low reps.
 */
export function brzycki1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  if (reps >= 37) return weight; // safety guard — formula breaks at reps >= 37
  return weight * (36 / (37 - reps));
}

/**
 * Average of Epley and Brzycki — best general-purpose 1RM estimate.
 * Balances the strengths of both formulas.
 */
export function average1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  const epley = epley1RM(weight, reps);
  const brzycki = brzycki1RM(weight, reps);
  return (epley + brzycki) / 2;
}

/**
 * Estimate 1RM from the best set in a session (highest weight × reps combination).
 * Uses average1RM for the estimate.
 */
export function estimate1RMFromSession(
  sets: { weight: number; reps: number; done: boolean }[],
): number {
  const doneSets = sets.filter((s) => s.done && s.reps > 0 && s.weight > 0);
  if (doneSets.length === 0) return 0;

  const bestSet = doneSets.reduce((best, set) => {
    const est = average1RM(set.weight, set.reps);
    const bestEst = average1RM(best.weight, best.reps);
    return est > bestEst ? set : best;
  }, doneSets[0]);

  return average1RM(bestSet.weight, Math.max(1, bestSet.reps));
}

// ─── Working Weight Recommendations ─────────────────────────────────────────

/**
 * Recommended RPE (rate of perceived exertion) targets per periodization phase.
 * Used to guide intensity for working sets.
 */
const RPE_TARGETS: Record<PeriodizationPhase, number> = {
  accumulation: 7,     // RPE 7 — leaves 3 reps in reserve
  intensification: 8,  // RPE 8 — leaves 2 reps in reserve
  realization: 9,      // RPE 9 — leaves 1 rep in reserve
  deload: 5,           // RPE 5 — very light
};

/**
 * Get the recommended RPE target for a given periodization phase.
 */
export function getRpeTarget(phase: PeriodizationPhase): number {
  return RPE_TARGETS[phase];
}

/**
 * Calculate working weight from estimated 1RM, target reps, and RPE.
 *
 * This uses the Epley formula in reverse:
 *   Working Weight = 1RM / (1 + reps / 30)
 * Then applies an RPE adjustment (higher RPE = higher intensity).
 *
 * @param oneRepMax - Estimated 1RM
 * @param targetReps - Number of reps for the working set
 * @param targetRpe - Target RPE (1-10, typically 7-9 for working sets)
 * @returns Recommended working weight, rounded to nearest 0.5 kg
 */
export function workingWeightFrom1RM(
  oneRepMax: number,
  targetReps: number,
  targetRpe?: number,
): number {
  if (oneRepMax <= 0) return 0;
  if (targetReps <= 0) return oneRepMax;

  // Base weight from Epley formula
  const baseWeight = oneRepMax / (1 + targetReps / 30);

  // RPE adjustment: RPE 10 = 100% intensity, RPE 1 = ~60% intensity
  const rpe = targetRpe ?? 7;
  const rpeMultiplier = 0.5 + rpe * 0.05; // RPE 7 → 0.85, RPE 10 → 1.0
  const adjustedWeight = baseWeight * rpeMultiplier;

  // Round to nearest 0.5 kg or 1 lb
  return roundWeight(adjustedWeight);
}

/**
 * Round weight to nearest practical increment.
 * - Weights ≥ 60 kg: round to nearest 2.5 kg
 * - Weights < 60 kg: round to nearest 1 kg
 * - Weights < 20 kg: round to nearest 0.5 kg
 */
export function roundWeight(weight: number): number {
  if (weight < 20) return Math.round(weight * 2) / 2;
  if (weight < 60) return Math.round(weight);
  return Math.round(weight / 2.5) * 2.5;
}

/**
 * Suggest a starting weight for a new exercise based on body weight.
 * Returns a conservative estimate.
 */
export function suggestStartingWeight(
  exercise: string,
  bodyWeightKg: number,
): number {
  const lower = Math.round(bodyWeightKg * 0.3);
  const upper = Math.round(bodyWeightKg * 0.6);
  const mapping: Record<string, number> = {
    squat: Math.round(bodyWeightKg * 0.5),
    bench: Math.round(bodyWeightKg * 0.3),
    deadlift: Math.round(bodyWeightKg * 0.6),
    overhead: Math.round(bodyWeightKg * 0.25),
  };
  const best = Object.entries(mapping).find(([key]) =>
    exercise.toLowerCase().includes(key),
  );
  return best ? best[1] : Math.round((lower + upper) / 2);
}

/**
 * Get the recommended weight progression increment based on current load.
 * - ≥ 60 kg: 2.5 kg jumps (standard plate progression)
 * - 20-60 kg: 1 kg jumps
 * - < 20 kg: 0.5 kg jumps
 */
export function getProgressionIncrement(currentWeight: number): number {
  if (currentWeight >= 60) return 2.5;
  if (currentWeight >= 20) return 1;
  return 0.5;
}

// ─── e1RM Historical Tracking ──────────────────────────────────────────────

/**
 * A single e1RM estimate data point.
 * Stored in the app store for trend analysis.
 */
export interface E1RMRecord {
  exerciseId: string;
  date: string; // ISO date
  estimated1RM: number;
  /** The formula used (average by default) */
  formula: "epley" | "brzycki" | "average";
  /** The set that produced this estimate */
  sourceSet: {
    weight: number;
    reps: number;
  };
}

/**
 * Trend direction for an exercise's e1RM over time.
 */
export type E1RMTrend = "increasing" | "stable" | "declining" | "insufficient_data";

export interface E1RMTrendResult {
  trend: E1RMTrend;
  /** Rate of change per week (kg/week) */
  ratePerWeek: number;
  /** Most recent e1RM estimate */
  current: number;
  /** Best ever e1RM estimate */
  best: number;
  /** Number of data points used */
  dataPoints: number;
  /** Whether the trend is considered a plateau (3+ sessions with no progress) */
  isPlateau: boolean;
  /** Consecutive sessions without improvement */
  plateauLength: number;
}

/**
 * Minimum number of data points needed for trend analysis.
 */
const MIN_TREND_POINTS = 2;

/**
 * Threshold for considering e1RM "stable" (kg/week change is negligible).
 */
const STABLE_THRESHOLD_KG_PER_WEEK = 1;

/**
 * Number of consecutive sessions without improvement to declare a plateau.
 */
const PLATEAU_SESSION_THRESHOLD = 3;

/**
 * Analyze the trend of e1RM estimates for a specific exercise.
 *
 * TREND DETECTION ALGORITHM:
 * 1. Sort records by date (oldest first)
 * 2. Compute linear rate of change over time (kg/week)
 * 3. Classify as increasing/stable/declining based on rate
 * 4. Check for plateau: 3+ consecutive sessions with no improvement
 *
 * @param records - Historical e1RM records for a single exercise, sorted oldest-first
 * @returns Trend analysis result
 */
export function analyzeE1RMTrend(records: E1RMRecord[]): E1RMTrendResult {
  if (records.length === 0) {
    return {
      trend: "insufficient_data",
      ratePerWeek: 0,
      current: 0,
      best: 0,
      dataPoints: 0,
      isPlateau: false,
      plateauLength: 0,
    };
  }

  const sorted = [...records].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const current = sorted[sorted.length - 1].estimated1RM;
  const best = Math.max(...sorted.map((r) => r.estimated1RM));

  // Compute rate of change (kg/week) if we have enough data points
  let ratePerWeek = 0;
  let isPlateau = false;
  let plateauLength = 0;

  if (sorted.length >= MIN_TREND_POINTS) {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const daysDiff =
      (new Date(last.date).getTime() - new Date(first.date).getTime()) /
      (1000 * 60 * 60 * 24);

    if (daysDiff > 0) {
      ratePerWeek = ((last.estimated1RM - first.estimated1RM) / daysDiff) * 7;
    }

    // Plateau detection: consecutive sessions where e1RM didn't increase
    let currentStreak = 0;
    for (let i = 1; i < sorted.length; i++) {
      const improvement = sorted[i].estimated1RM - sorted[i - 1].estimated1RM;
      if (improvement <= 0) {
        currentStreak++;
      } else {
        currentStreak = 0;
      }
    }
    plateauLength = currentStreak;
    isPlateau = plateauLength >= PLATEAU_SESSION_THRESHOLD;
  }

  // Determine trend direction
  let trend: E1RMTrend;
  if (ratePerWeek > STABLE_THRESHOLD_KG_PER_WEEK) {
    trend = "increasing";
  } else if (ratePerWeek < -STABLE_THRESHOLD_KG_PER_WEEK) {
    trend = "declining";
  } else if (sorted.length >= MIN_TREND_POINTS) {
    trend = "stable";
  } else {
    trend = "insufficient_data";
  }

  return {
    trend,
    ratePerWeek: Math.round(ratePerWeek * 100) / 100,
    current: Math.round(current * 100) / 100,
    best: Math.round(best * 100) / 100,
    dataPoints: sorted.length,
    isPlateau,
    plateauLength,
  };
}

/**
 * Create an e1RM record from a completed set.
 * This is the primary way records are created — call this after saving a session.
 */
export function createE1RMRecord(
  exerciseId: string,
  sets: { weight: number; reps: number; done: boolean }[],
  date: string,
  formula: "epley" | "brzycki" | "average" = "average",
): E1RMRecord | null {
  const doneSets = sets.filter((s) => s.done && s.reps > 0 && s.weight > 0);
  if (doneSets.length === 0) return null;

  const bestSet = doneSets.reduce((best, set) => {
    const est =
      formula === "epley"
        ? epley1RM(set.weight, set.reps)
        : formula === "brzycki"
          ? brzycki1RM(set.weight, set.reps)
          : average1RM(set.weight, set.reps);
    const bestEst =
      formula === "epley"
        ? epley1RM(best.weight, best.reps)
        : formula === "brzycki"
          ? brzycki1RM(best.weight, best.reps)
          : average1RM(best.weight, best.reps);
    return est > bestEst ? set : best;
  }, doneSets[0]);

  const estimated1RM =
    formula === "epley"
      ? epley1RM(bestSet.weight, bestSet.reps)
      : formula === "brzycki"
        ? brzycki1RM(bestSet.weight, bestSet.reps)
        : average1RM(bestSet.weight, bestSet.reps);

  return {
    exerciseId,
    date,
    estimated1RM: Math.round(estimated1RM * 100) / 100,
    formula,
    sourceSet: { weight: bestSet.weight, reps: bestSet.reps },
  };
}