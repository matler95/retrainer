/**
 * Hook: useReadiness
 *
 * Wraps the fatigue model (ACWR, readiness score, CNS demand) into a
 * convenient React hook that any component can use to surface training
 * readiness to the user.
 *
 * WHY: Keeping this logic in a hook keeps components clean and makes
 * the readiness signal testable.
 */

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  computeAcwr,
  computeSessionLoad,
  readinessScore,
} from "@/lib/fatigueModel";
import { EXERCISES } from "@/data/exercises";
import type { Exercise } from "@/data/exercises";

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
}

/**
 * CNS demand rating for exercises.
 * Heavier compound lifts tax the CNS more than isolation.
 * This is used to weight fatigue more heavily for CNS-intensive sessions.
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
 * Get the CNS demand weight for a session.
 * Higher values = more CNS fatigue.
 */
export function computeSessionCnsDemand(
  exercises: { exerciseId: string; sets: { done: boolean }[] }[],
  exercisesDb: Exercise[],
): number {
  let totalDemand = 0;

  for (const log of exercises) {
    const ex = exercisesDb.find((e) => e.id === log.exerciseId);
    if (!ex) continue;

    const demand = CNS_DEMAND[log.exerciseId] ?? 0.3;
    const doneSets = log.sets.filter((s) => s.done).length;
    totalDemand += demand * doneSets;
  }

  return totalDemand;
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
    const cnsLoad = last7Sessions.reduce(
      (sum, s) =>
        sum + computeSessionCnsDemand(s.exercises, EXERCISES),
      0,
    );

    // Adjust ACWR threshold for high CNS demand
    const adjustedAcwr = acwr + cnsLoad * 0.05; // CNS adds a small penalty
    const finalScore = readinessScore(adjustedAcwr, avgRpe);

    // Generate recommendation
    let recommendation: string;
    const needsDeload = finalScore < 50 || adjustedAcwr > 1.5;
    const canPush = finalScore >= 80 && adjustedAcwr < 1.0;

    if (needsDeload) {
      if (adjustedAcwr > 1.5) {
        recommendation =
          "Your training load has spiked recently. Consider a deload week to reset fatigue.";
      } else if (cnsLoad > 10) {
        recommendation =
          "High CNS demand detected. Your nervous system needs recovery — try a lighter session.";
      } else {
        recommendation =
          "Readiness is low. Take an extra rest day or do light activity.";
      }
    } else if (canPush) {
      recommendation =
        "You're well-recovered. Now's a great time to push for a PR or add volume.";
    } else if (finalScore >= 70) {
      recommendation =
        "You're ready to train. Follow your plan and listen to your body.";
    } else {
      recommendation =
        "Moderate readiness. You can train, but keep RPE in check (≤7).";
    }

    return {
      score: finalScore,
      acwr: Math.round(acwr * 100) / 100,
      last7: Math.round(last7 * 100) / 100,
      last28: Math.round(last28 * 100) / 100,
      recommendation,
      needsDeload,
      canPush,
    };
  }, [sessions]);
}