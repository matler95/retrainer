/**
 * Volume landmark tracking for weekly training volume optimization.
 *
 * Tracks and analyzes weekly set volumes per muscle group against
 * established landmarks: MEV (Minimum Effective Volume), MAV (Maximum
 * Adaptive Volume), and MRV (Maximum Recoverable Volume).
 *
 * WHY VOLUME LANDMARKS: Research (Schoenfeld et al., Israetel) shows that
 * weekly sets per muscle group have optimal ranges. Below MEV = no growth
 * stimulus. Above MRV = recovery issues. The sweet spot (MAV) produces
 * the best results.
 */

import type { Session, SessionExerciseLog, SetLog } from "@/store/useAppStore";
import type { MuscleGroup } from "@/data/exercises";
import { EXERCISES } from "@/data/exercises";

import type { Experience } from "@/data/types";

// Re-export for backward compatibility
export type { Experience };

export interface VolumeLandmarks {
  /** Minimum Effective Volume — minimum weekly sets for growth */
  mev: number;
  /** Maximum Adaptive Volume — optimal weekly sets for growth */
  mav: number;
  /** Maximum Recoverable Volume — max sets before recovery issues */
  mrv: number;
}

/**
 * Volume landmark table per muscle group.
 * Based on exercise science research (Israetel, Schoenfeld).
 *
 * These are starting values that can be adjusted based on individual
 * recovery capacity and training experience.
 */
const MUSCLE_VOLUME_TABLE: Record<string, VolumeLandmarks> = {
  // Primary muscle groups
  chest: { mev: 10, mav: 14, mrv: 18 },
  shoulders: { mev: 8, mav: 12, mrv: 16 },
  biceps: { mev: 8, mav: 12, mrv: 16 },
  triceps: { mev: 8, mav: 12, mrv: 16 },
  glutes: { mev: 10, mav: 14, mrv: 18 },
  calves: { mev: 6, mav: 10, mrv: 14 },
  abs: { mev: 8, mav: 12, mrv: 16 },
  forearms: { mev: 4, mav: 8, mrv: 12 },
  neck: { mev: 2, mav: 4, mrv: 6 },
  // Back sub-groups
  lats: { mev: 8, mav: 14, mrv: 18 },
  middle_back: { mev: 6, mav: 10, mrv: 14 },
  lower_back: { mev: 4, mav: 8, mrv: 12 },
  traps: { mev: 4, mav: 8, mrv: 12 },
  // Leg sub-groups
  quads: { mev: 10, mav: 16, mrv: 22 },
  hamstrings: { mev: 8, mav: 12, mrv: 16 },
  // Hip muscles
  abductors: { mev: 4, mav: 8, mrv: 12 },
  adductors: { mev: 4, mav: 8, mrv: 12 },
  // Legacy aliases
  back: { mev: 10, mav: 16, mrv: 20 },
  legs: { mev: 12, mav: 18, mrv: 24 },
  core: { mev: 8, mav: 12, mrv: 16 },
};

/**
 * Get volume landmarks for a muscle group.
 * Falls back to default values if the muscle group is not in the table.
 */
export function getVolumeLandmarks(muscle: string): VolumeLandmarks {
  return MUSCLE_VOLUME_TABLE[muscle] ?? { mev: 8, mav: 12, mrv: 16 };
}

/**
 * Get volume landmarks for a muscle group, adjusted by experience level.
 * Beginners need less volume for growth (lower MEV/MAV/MRV).
 * Advanced lifters need more volume (higher MEV/MAV/MRV).
 */
export function getVolumeLandmarksForExperience(
  muscle: string,
  experience: Experience,
): VolumeLandmarks {
  const base = getVolumeLandmarks(muscle);
  const adjustmentMultiplier =
    experience === "beginner" ? 0.7
    : experience === "advanced" ? 1.15
    : 1.0;

  return {
    mev: Math.round(base.mev * adjustmentMultiplier),
    mav: Math.round(base.mav * adjustmentMultiplier),
    mrv: Math.round(base.mrv * adjustmentMultiplier),
  };
}

// ─── Weekly Volume Tracking ──────────────────────────────────────────────────

/**
 * A log entry for weekly volume per muscle group.
 */
export interface WeeklyVolumeEntry {
  /** ISO week start date (Monday) */
  weekStart: string;
  /** Sets completed per muscle group */
  setsByMuscle: Record<string, number>;
  /** Status per muscle group (below, optimal, high, over) */
  statusByMuscle: Record<string, "below" | "optimal" | "high" | "over">;
  /** Total sets across all muscle groups */
  totalSets: number;
}

/**
 * Get the ISO week start date (Monday) for a given date string.
 */
export function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  // Monday is 1, Sunday is 0 — we want Monday as start
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

/**
 * Compute weekly volume from session history.
 * Aggregates completed sets per muscle group per week.
 *
 * @param sessions - All logged sessions
 * @returns Array of weekly volume entries, sorted by week start descending
 */
export function computeWeeklyVolumes(
  sessions: Session[],
): WeeklyVolumeEntry[] {
  const weekMap = new Map<string, Record<string, number>>();

  for (const session of sessions) {
    const weekStart = getWeekStart(session.date);
    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, {});
    }

    const setsByMuscle = weekMap.get(weekStart)!;

    for (const exerciseLog of session.exercises) {
      const ex = EXERCISES.find((e) => e.id === exerciseLog.exerciseId);
      if (!ex) continue;

      const doneSets = exerciseLog.sets.filter((s) => s.done).length;
      if (doneSets === 0) continue;

      // Count sets for primary muscle
      setsByMuscle[ex.primary] = (setsByMuscle[ex.primary] ?? 0) + doneSets;

      // Count half sets for secondary muscles (they get less direct work)
      for (const secondary of ex.secondary) {
        // Only count secondary if not already counting as primary
        if (secondary !== ex.primary) {
          setsByMuscle[secondary] = (setsByMuscle[secondary] ?? 0) + Math.round(doneSets * 0.5);
        }
      }
    }
  }

  // Convert map to sorted array
  const entries: WeeklyVolumeEntry[] = [];
  for (const [weekStart, setsByMuscle] of weekMap) {
    const statusByMuscle: Record<string, "below" | "optimal" | "high" | "over"> = {};
    let totalSets = 0;

    for (const [muscle, sets] of Object.entries(setsByMuscle)) {
      const { mev, mav, mrv } = getVolumeLandmarks(muscle);
      totalSets += sets;

      statusByMuscle[muscle] =
        sets < mev ? "below"
        : sets <= mav ? "optimal"
        : sets <= mrv ? "high"
        : "over";
    }

    entries.push({
      weekStart,
      setsByMuscle,
      statusByMuscle,
      totalSets,
    });
  }

  // Sort by week start descending (newest first)
  entries.sort(
    (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime(),
  );

  return entries;
}

/**
 * Get the current week's volume status.
 * Returns null if no sessions were logged this week.
 */
export function getCurrentWeekVolume(
  sessions: Session[],
): WeeklyVolumeEntry | null {
  const today = new Date().toISOString().slice(0, 10);
  const currentWeekStart = getWeekStart(today);
  const volumes = computeWeeklyVolumes(sessions);
  return volumes.find((v) => v.weekStart === currentWeekStart) ?? null;
}

/**
 * Get volume status for a specific muscle group in the current week.
 */
export function getMuscleVolumeStatus(
  sessions: Session[],
  muscle: string,
): { sets: number; status: "below" | "optimal" | "high" | "over"; landmarks: VolumeLandmarks } | null {
  const currentWeek = getCurrentWeekVolume(sessions);
  if (!currentWeek) return null;

  const sets = currentWeek.setsByMuscle[muscle] ?? 0;
  const landmarks = getVolumeLandmarks(muscle);
  const status = currentWeek.statusByMuscle[muscle] ?? "below";

  return { sets, status, landmarks };
}

// ─── Compatibility Exports ───────────────────────────────────────────────────

/**
 * Calculate total weekly volume from a sets-by-muscle map.
 * @deprecated Use computeWeeklyVolumes for context-rich analysis
 */
export function calculateWeeklyVolume(
  setsByMuscle: Record<string, number>,
): number {
  return Object.entries(setsByMuscle).reduce(
    (total, [, sets]) => total + sets,
    0,
  );
}

/**
 * Check if a muscle group's volume is within optimal range.
 * @deprecated Use getMuscleVolumeStatus instead
 */
export function withinOptimalVolume(
  muscle: string,
  weeklySets: number,
): {
  mev: number;
  mav: number;
  mrv: number;
  status: "below" | "optimal" | "high" | "over";
} {
  const { mev, mav, mrv } = getVolumeLandmarks(muscle);
  const status =
    weeklySets < mev
      ? "below"
      : weeklySets <= mav
        ? "optimal"
        : weeklySets <= mrv
          ? "high"
          : "over";
  return { mev, mav, mrv, status };
}