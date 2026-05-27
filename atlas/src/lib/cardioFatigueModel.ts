/**
 * Cardio fatigue model for hybrid athletes.
 *
 * Integrates Strava cardio activities into the ACWR calculation
 * so that runners/cyclists get accurate recovery modeling.
 *
 * Cardio load formulas:
 * - Easy run (Z1/Z2): load = distance_km × 0.5
 * - Threshold run (Z3/Z4): load = distance_km × 1.5
 * - HIIT (Z5): load = duration_min × 2.0
 * - Cycling: load = distance_km × 0.3 (lower impact)
 * - Walking: load = distance_km × 0.2
 *
 * Combined ACWR uses strength + cardio load for accurate recovery picture.
 *
 * All functions are pure and deterministic.
 */

import type { StravaActivity } from "@/lib/strava";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CardioLoadEntry {
  date: string; // ISO date
  activityType: string;
  load: number;
  duration: number; // minutes
  distance: number; // km
}

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Load multipliers by activity type.
 * Higher multiplier = more fatigue contribution.
 */
const LOAD_MULTIPLIERS: Record<string, number> = {
  Run: 0.5,        // per km
  TrailRun: 0.6,   // per km (more demanding terrain)
  Ride: 0.3,       // per km (lower impact)
  VirtualRide: 0.25,
  Walk: 0.2,       // per km
  Hike: 0.35,      // per km
  Swim: 0.8,       // per km (very demanding)
  WeightTraining: 0, // excluded — already counted in strength load
};

/**
 * Intensity multipliers based on heart rate zones.
 * If average HR is available, adjust load by intensity.
 */
function getIntensityMultiplier(avgHr?: number, maxHr?: number): number {
  if (!avgHr || !maxHr || maxHr === 0) return 1.0;

  const hrRatio = avgHr / maxHr;

  if (hrRatio >= 0.9) return 2.0; // Zone 5 (HIIT)
  if (hrRatio >= 0.8) return 1.5; // Zone 4 (Threshold)
  if (hrRatio >= 0.7) return 1.2; // Zone 3 (Tempo)
  if (hrRatio >= 0.6) return 1.0; // Zone 2 (Easy)
  return 0.8; // Zone 1 (Recovery)
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Compute the fatigue load for a single Strava activity.
 *
 * @param activity - Strava activity data
 * @returns CardioLoadEntry with computed load
 */
export function computeActivityLoad(activity: StravaActivity): CardioLoadEntry {
  const distanceKm = activity.distance / 1000;
  const durationMin = activity.moving_time / 60;
  const baseMultiplier = LOAD_MULTIPLIERS[activity.type] ?? 0.3;
  const intensityMultiplier = getIntensityMultiplier(
    activity.average_heartrate,
    190, // assumed max HR when not available
  );

  let load: number;

  if (activity.type === "WeightTraining") {
    // Weight training is already counted in strength load
    load = 0;
  } else if (baseMultiplier > 0.4) {
    // High-impact activities: load based on distance
    load = distanceKm * baseMultiplier * intensityMultiplier;
  } else {
    // Low-impact activities: load based on duration
    load = durationMin * baseMultiplier * intensityMultiplier;
  }

  return {
    date: activity.start_date_local.slice(0, 10),
    activityType: activity.type,
    load: Math.round(load * 100) / 100,
    duration: Math.round(durationMin),
    distance: Math.round(distanceKm * 10) / 10,
  };
}

/**
 * Compute total cardio load from a set of Strava activities.
 *
 * @param activities - Array of Strava activities
 * @returns Total cardio load
 */
export function computeCardioBurden(activities: StravaActivity[]): number {
  return activities.reduce(
    (sum, activity) => sum + computeActivityLoad(activity).load,
    0,
  );
}

/**
 * Compute cardio load for the last 7 days and last 28 days.
 * Used for combined ACWR calculation.
 *
 * @param activities - Strava activities (any order)
 * @returns Object with last7 and last28 cardio loads
 */
export function getRecentCardioLoad(activities: StravaActivity[]): {
  last7: number;
  last28: number;
} {
  const now = Date.now();
  const msDay = 24 * 60 * 60 * 1000;

  let last7 = 0;
  let last28 = 0;

  for (const activity of activities) {
    const activityTime = new Date(activity.start_date).getTime();
    const age = now - activityTime;
    const load = computeActivityLoad(activity).load;

    if (age <= 7 * msDay) {
      last7 += load;
    }
    if (age <= 28 * msDay) {
      last28 += load;
    }
  }

  return { last7, last28 };
}

/**
 * Compute combined ACWR including both strength and cardio load.
 *
 * @param strengthLast7 - Strength load in last 7 days
 * @param strengthLast28 - Average weekly strength load over 28 days
 * @param cardioLast7 - Cardio load in last 7 days
 * @param cardioLast28 - Average weekly cardio load over 28 days
 * @returns Combined ACWR
 */
export function computeCombinedACWR(
  strengthLast7: number,
  strengthLast28: number,
  cardioLast7: number,
  cardioLast28: number,
): number {
  const combinedLast7 = strengthLast7 + cardioLast7;
  const combinedLast28 = strengthLast28 + cardioLast28;

  if (combinedLast28 <= 0) return combinedLast7 > 0 ? 2 : 1;
  return combinedLast7 / combinedLast28;
}

/**
 * Get a human-readable summary of Strava's impact on recovery.
 *
 * @param cardioLoad - Cardio load for the last 7 days
 * @param combinedACWR - Combined strength + cardio ACWR
 * @returns Human-readable impact description
 */
export function getCardioImpactSummary(
  cardioLoad: number,
  combinedACWR: number,
): string {
  if (cardioLoad === 0) return "No cardio activities detected.";

  if (combinedACWR > 1.5) {
    return `High combined load (ACWR: ${combinedACWR.toFixed(2)}). Cardio is contributing significantly to fatigue. Consider reducing cardio volume.`;
  }

  if (combinedACWR > 1.3) {
    return `Moderate-high combined load. Cardio is adding meaningful fatigue. Monitor recovery closely.`;
  }

  if (cardioLoad > 20) {
    return `Significant cardio volume (${Math.round(cardioLoad)} load units). Ensure adequate nutrition and sleep.`;
  }

  return `Cardio load is manageable. Good balance between strength and cardio training.`;
}