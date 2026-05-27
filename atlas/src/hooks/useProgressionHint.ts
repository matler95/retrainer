/**
 * Hook: useProgressionHint
 *
 * Wraps the progression engine into a hook that provides
 * per-exercise progression decisions based on the last completed session.
 *
 * WHY: Separating progression logic from UI makes the workout view cleaner
 * and allows reusing progression decisions in plan review and dashboard.
 */

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  assessExerciseProgress,
  type ProgressionDecision,
} from "@/lib/progressionEngine";
import { average1RM, epley1RM } from "@/lib/loadCalculator";
import type { PlannedExercise } from "@/store/useAppStore";

export interface ExerciseProgression {
  exerciseId: string;
  decision: ProgressionDecision;
  estimated1RM: number;
}

/**
 * Returns progression decisions for all exercises in the most recent session
 * for a given dayId.
 *
 * If there is no session data for the dayId, returns an empty array.
 */
export function useProgressionForDay(dayId: string): ExerciseProgression[] {
  const sessions = useAppStore((s) => s.sessions);
  const plan = useAppStore((s) => s.plan);
  const profile = useAppStore((s) => s.profile);

  return useMemo(() => {
    const dayPlan = plan.find((d) => d.id === dayId);
    if (!dayPlan) return [];

    // Find the most recent session for this day
    const daySessions = sessions
      .filter((s) => s.dayId === dayId)
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

    if (daySessions.length === 0) return [];

    const latestSession = daySessions[0];

    return latestSession.exercises.map((log) => {
      const planExercise = dayPlan.exercises.find(
        (pe) => pe.exerciseId === log.exerciseId,
      );

      if (!planExercise) {
        return {
          exerciseId: log.exerciseId,
          decision: {
            message: "Nice work — keep building consistency.",
            nextWeight: 0,
            action: "maintain",
          },
          estimated1RM: 0,
        };
      }

      // Estimate 1RM from the logged sets
      const doneSets = log.sets.filter((s) => s.done);
      let estimated1RM = 0;

      if (doneSets.length > 0) {
        // Use the set with the best combination of weight × reps for 1RM estimation
        const bestSet = doneSets.reduce((best, set) => {
          const est = epley1RM(set.weight, Math.max(1, set.reps));
          const bestEst = epley1RM(best.weight, Math.max(1, best.reps));
          return est > bestEst ? set : best;
        }, doneSets[0]);

        estimated1RM = average1RM(
          bestSet.weight,
          Math.max(1, bestSet.reps),
        );
      }

      const decision = assessExerciseProgress(planExercise, {
        lastWeight: planExercise.lastWeight,
        sets: log.sets,
      });

      return {
        exerciseId: log.exerciseId,
        decision,
        estimated1RM: Math.round(estimated1RM * 100) / 100,
      };
    });
  }, [sessions, plan, dayId]);
}

/**
 * Returns a summary of progression status across all exercises.
 * Useful for the dashboard / progress page.
 */
export function useProgressionSummary(): {
  totalExercises: number;
  increasing: number;
  maintaining: number;
  deloading: number;
  technique: number;
} {
  const plan = useAppStore((s) => s.plan);
  const sessions = useAppStore((s) => s.sessions);

  return useMemo(() => {
    const results = {
      totalExercises: 0,
      increasing: 0,
      maintaining: 0,
      deloading: 0,
      technique: 0,
    };

    for (const day of plan) {
      const daySessions = sessions
        .filter((s) => s.dayId === day.id)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

      if (daySessions.length === 0) continue;

      const latestSession = daySessions[0];

      for (const log of latestSession.exercises) {
        const planExercise = day.exercises.find(
          (pe) => pe.exerciseId === log.exerciseId,
        );
        if (!planExercise) continue;

        results.totalExercises++;
        const decision = assessExerciseProgress(planExercise, {
          lastWeight: planExercise.lastWeight,
          sets: log.sets,
        });

        if (decision.action === "increase") results.increasing++;
        else if (decision.action === "maintain") results.maintaining++;
        else if (decision.action === "deload") results.deloading++;
        else if (decision.action === "technique") results.technique++;
      }
    }

    return results;
  }, [sessions, plan]);
}