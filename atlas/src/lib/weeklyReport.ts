/**
 * Weekly intelligence report generator.
 *
 * Computes a comprehensive weekly summary including:
 * - Total volume and sessions
 * - PRs achieved
 * - Muscle volume status (below/optimal/high/over per MEV/MAV/MRV)
 * - Top insight (most actionable single sentence)
 * - Progression summary
 * - ACWR trend
 * - Next week recommendation
 *
 * All functions are pure and deterministic.
 */

import type { Session, ExercisePR } from "@/data/types";
import { EXERCISES, type MuscleGroup } from "@/data/exercises";
import { computeSessionLoad, getRecentLoad, computeAcwr } from "@/lib/fatigueModel";
import { getVolumeLandmarks } from "@/lib/volumeLandmarks";
import { getPRSummary } from "@/lib/prDatabase";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WeeklyReport {
  weekNumber: number;
  totalVolume: number;
  sessionsCompleted: number;
  prsAchieved: ExercisePR[];
  muscleVolumeStatus: Record<string, "below" | "optimal" | "high" | "over">;
  topInsight: string;
  progressionSummary: {
    increasing: number;
    maintaining: number;
    declining: number;
  };
  acwrTrend: "rising" | "stable" | "falling";
  nextWeekRecommendation: string;
}

// ─── Core Generator ─────────────────────────────────────────────────────────

/**
 * Generate a weekly intelligence report from session history.
 *
 * @param sessions - All sessions (newest first)
 * @param prs - All PRs
 * @param weekNumber - Current week number
 * @returns WeeklyReport with all computed metrics
 */
export function generateWeeklyReport(
  sessions: Session[],
  prs: ExercisePR[],
  weekNumber: number,
): WeeklyReport {
  const now = Date.now();
  const msDay = 24 * 60 * 60 * 1000;

  // This week's sessions
  const weekSessions = sessions.filter(
    (s) => now - new Date(s.date).getTime() <= 7 * msDay,
  );

  // Total volume this week
  const totalVolume = weekSessions.reduce(
    (sum, s) => {
      return sum + s.exercises.reduce((exSum, ex) => {
        return exSum + ex.sets
          .filter((set) => set.done)
          .reduce((setSum, set) => setSum + set.weight * Math.max(1, set.reps), 0);
      }, 0);
    },
    0,
  );

  // PRs this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString();
  const prSummary = getPRSummary(prs, weekStartStr);

  // Muscle volume status
  const muscleVolumeStatus = computeMuscleVolumeStatus(weekSessions);

  // ACWR trend
  const acwrTrend = computeACWRTrend(sessions);

  // Progression summary (simplified — based on volume trend)
  const lastWeekSessions = sessions.filter(
    (s) => {
      const age = now - new Date(s.date).getTime();
      return age > 7 * msDay && age <= 14 * msDay;
    },
  );
  const lastWeekVolume = lastWeekSessions.reduce(
    (sum, s) => sum + computeSessionLoad(s),
    0,
  );
  const thisWeekLoad = weekSessions.reduce(
    (sum, s) => sum + computeSessionLoad(s),
    0,
  );

  const progressionSummary = {
    increasing: thisWeekLoad > lastWeekVolume * 1.05 ? 1 : 0,
    maintaining: thisWeekLoad >= lastWeekVolume * 0.95 && thisWeekLoad <= lastWeekVolume * 1.05 ? 1 : 0,
    declining: thisWeekLoad < lastWeekVolume * 0.95 ? 1 : 0,
  };

  // Top insight
  const topInsight = generateTopInsight(
    weekSessions.length,
    muscleVolumeStatus,
    prSummary.totalPRs,
    acwrTrend,
  );

  // Next week recommendation
  const nextWeekRecommendation = generateNextWeekRecommendation(
    muscleVolumeStatus,
    acwrTrend,
    weekSessions.length,
  );

  return {
    weekNumber,
    totalVolume: Math.round(totalVolume),
    sessionsCompleted: weekSessions.length,
    prsAchieved: prs.filter((pr) => pr.achievedAt >= weekStartStr),
    muscleVolumeStatus,
    topInsight,
    progressionSummary,
    acwrTrend,
    nextWeekRecommendation,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compute muscle volume status for the current week.
 */
function computeMuscleVolumeStatus(
  weekSessions: Session[],
): Record<string, "below" | "optimal" | "high" | "over"> {
  const setsByMuscle: Record<string, number> = {};

  for (const session of weekSessions) {
    for (const exerciseLog of session.exercises) {
      const exercise = EXERCISES.find((e) => e.id === exerciseLog.exerciseId);
      if (!exercise) continue;

      const doneSets = exerciseLog.sets.filter((s) => s.done).length;
      setsByMuscle[exercise.primary] = (setsByMuscle[exercise.primary] ?? 0) + doneSets;

      for (const sec of exercise.secondary) {
        if (sec !== exercise.primary) {
          setsByMuscle[sec] = (setsByMuscle[sec] ?? 0) + Math.round(doneSets * 0.5);
        }
      }
    }
  }

  const status: Record<string, "below" | "optimal" | "high" | "over"> = {};
  const muscles: MuscleGroup[] = ["chest", "back", "shoulders", "legs", "biceps", "triceps", "glutes", "core"];

  for (const muscle of muscles) {
    const sets = setsByMuscle[muscle] ?? 0;
    const landmarks = getVolumeLandmarks(muscle);

    if (sets < landmarks.mev) status[muscle] = "below";
    else if (sets <= landmarks.mav) status[muscle] = "optimal";
    else if (sets <= landmarks.mrv) status[muscle] = "high";
    else status[muscle] = "over";
  }

  return status;
}

/**
 * Compute ACWR trend over recent weeks.
 */
function computeACWRTrend(sessions: Session[]): "rising" | "stable" | "falling" {
  const { last7, last28 } = getRecentLoad(sessions);
  const acwr = computeAcwr(last7, last28);

  if (acwr > 1.3) return "rising";
  if (acwr < 0.8) return "falling";
  return "stable";
}

/**
 * Generate the most actionable insight for the week.
 */
function generateTopInsight(
  sessionsCompleted: number,
  volumeStatus: Record<string, string>,
  prsAchieved: number,
  acwrTrend: string,
): string {
  if (prsAchieved > 0) {
    return `You hit ${prsAchieved} PR${prsAchieved > 1 ? "s" : ""} this week! Keep the momentum.`;
  }

  const belowMuscles = Object.entries(volumeStatus)
    .filter(([, status]) => status === "below")
    .map(([muscle]) => muscle);

  if (belowMuscles.length > 0) {
    return `${belowMuscles.join(", ")} ${belowMuscles.length === 1 ? "is" : "are"} below MEV — consider adding exercises next week.`;
  }

  if (acwrTrend === "rising") {
    return "Your training load is rising fast. Consider a lighter session to stay in the optimal zone.";
  }

  if (sessionsCompleted === 0) {
    return "No sessions this week. Consistency is the #1 factor for progress.";
  }

  return "Solid week of training. Keep hitting your targets.";
}

/**
 * Generate next week recommendation.
 */
function generateNextWeekRecommendation(
  volumeStatus: Record<string, string>,
  acwrTrend: string,
  sessionsCompleted: number,
): string {
  const overMuscles = Object.entries(volumeStatus)
    .filter(([, status]) => status === "over")
    .map(([muscle]) => muscle);

  if (overMuscles.length > 0) {
    return `Reduce volume for ${overMuscles.join(", ")} — you're above MRV. Drop 1-2 sets per exercise.`;
  }

  if (acwrTrend === "rising") {
    return "Consider a deload or lighter session to let your body recover.";
  }

  const belowMuscles = Object.entries(volumeStatus)
    .filter(([, status]) => status === "below")
    .map(([muscle]) => muscle);

  if (belowMuscles.length > 2) {
    return `Add 1-2 exercises targeting ${belowMuscles.slice(0, 3).join(", ")}.`;
  }

  return "Follow your plan as-is. Progressive overload is working.";
}