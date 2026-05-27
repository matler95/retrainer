/**
 * Hook: useReadiness
 *
 * Wraps the fatigue model (ACWR, readiness score, CNS demand, deload detection)
 * into a convenient React hook that any component can use to surface training
 * readiness to the user.
 *
 * WHY: Keeping this logic in a hook keeps components clean and makes
 * the readiness signal testable. The hook recomputes automatically whenever
 * sessions change (via useMemo dependency on sessions).
 */

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  computeAcwr,
  computeSessionLoad,
  computeSessionCnsDemand,
  readinessScore,
  checkDeloadNeeded,
  getWorkoutRecommendation,
  type WorkloadRecommendation,
  type DeloadRecommendation,
} from "@/lib/fatigueModel";
export interface ReadinessState {
  /** 0–100 readiness score */
  score: number;
  /** ACWR value */
  acwr: number;
  /** 7-day total load */
  last7: number;
  /** 28-day average weekly load */
  last28: number;
  /** Human-readable recommendation */
  recommendation: string;
  /** Whether the user should consider a deload */
  needsDeload: boolean;
  /** Whether the user can push harder */
  canPush: boolean;
  /** CNS load for the current week */
  weekCnsLoad: number;
  /** Deload-specific recommendation (if applicable) */
  deloadRecommendation: DeloadRecommendation | null;
  /** Workload adjustment recommendation */
  workloadRecommendation: WorkloadRecommendation;
}

/**
 * React hook that computes readiness from the user's session history.
 * Updates whenever sessions change.
 */
export function useReadiness(): ReadinessState {
  const sessions = useAppStore((s) => s.sessions);

  return useMemo(() => {
    const now = Date.now();
    const msDay = 24 * 60 * 60 * 1000;

    // Compute loads for ACWR
    const last7Sessions = sessions.filter(
      (s) => now - new Date(s.date).getTime() <= 7 * msDay,
    );
    const last28Sessions = sessions.filter(
      (s) => now - new Date(s.date).getTime() <= 28 * msDay,
    );

    const last7 = last7Sessions.reduce(
      (sum, s) => sum + computeSessionLoad(s),
      0,
    );
    const last28Raw = last28Sessions.reduce(
      (sum, s) => sum + computeSessionLoad(s),
      0,
    );
    const last28 = last28Raw / Math.max(1, 4); // average weekly load over 4 weeks

    const acwr = computeAcwr(last7, last28);

    // Compute average RPE from last 7-day sessions
    const recentRpes = last7Sessions.flatMap((s) =>
      s.exercises.flatMap((e) =>
        e.sets.filter((set) => set.rpe !== undefined).map((set) => set.rpe!),
      ),
    );
    const avgRpe =
      recentRpes.length > 0
        ? recentRpes.reduce((sum, rpe) => sum + rpe, 0) / recentRpes.length
        : 0;

    // Compute CNS demand from last 7 days
    const weekCnsLoad = last7Sessions.reduce(
      (sum, s) => sum + computeSessionCnsDemand(s.exercises),
      0,
    );

    // Adjust ACWR threshold for high CNS demand
    const adjustedAcwr = acwr + weekCnsLoad * 0.05; // CNS adds a small penalty
    const finalScore = readinessScore(adjustedAcwr, avgRpe);

    // Check deload need
    const deloadRecommendation = checkDeloadNeeded(
      adjustedAcwr,
      finalScore,
      weekCnsLoad,
      0, // consecutiveDecliningSessions — would need e1RM trend data
    );

    // Get workload recommendation
    const workloadRecommendation = getWorkoutRecommendation(
      finalScore,
      adjustedAcwr,
    );

    // Generate recommendation
    let recommendation: string;
    const needsDeload = deloadRecommendation.shouldDeload;
    const canPush = finalScore >= 80 && adjustedAcwr < 1.0;

    if (needsDeload) {
      recommendation = deloadRecommendation.reason;
    } else if (canPush) {
      recommendation =
        "You're well-recovered. Now's a great time to push for a PR or add volume.";
    } else if (finalScore >= 70) {
      recommendation =
        "You're ready to train. Follow your plan and listen to your body.";
    } else {
      recommendation = workloadRecommendation.message;
    }

    return {
      score: finalScore,
      acwr: Math.round(acwr * 100) / 100,
      last7: Math.round(last7 * 100) / 100,
      last28: Math.round(last28 * 100) / 100,
      recommendation,
      needsDeload,
      canPush,
      weekCnsLoad: Math.round(weekCnsLoad * 100) / 100,
      deloadRecommendation: needsDeload ? deloadRecommendation : null,
      workloadRecommendation,
    };
  }, [sessions]);
}