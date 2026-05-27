import type { PlannedExercise, Session } from "@/store/useAppStore";

export interface ProgressionDecision {
  message: string;
  nextWeight: number;
  action: "increase" | "maintain" | "deload" | "technique";
}

export function assessExerciseProgress(
  plan: PlannedExercise,
  log: Pick<PlannedExercise, "lastWeight"> & { sets: { reps: number; weight: number; rpe?: number; done: boolean }[] },
) {
  const maxTarget = parseInt(plan.reps.split("-").pop() || "0");
  const targetMin = parseInt(plan.reps.split("-")[0] || "0");
  const completedSets = log.sets.filter(set => set.done);
  const allHit = completedSets.length > 0 && completedSets.every(set => set.reps >= maxTarget);
  const avgRpe = completedSets.reduce((sum, set) => sum + (set.rpe ?? 7), 0) / Math.max(1, completedSets.length);
  const failedSets = completedSets.filter(set => set.reps < targetMin).length;
  const plateau = completedSets.length >= 3 && completedSets.every(set => set.reps === maxTarget && set.rpe !== undefined && set.rpe >= 8);
  const lastWeight = log.lastWeight ?? 0;

  if (allHit && avgRpe <= 7.5) {
    const increment = lastWeight >= 60 ? 2.5 : 1;
    return { message: `Great work. Add ${increment}kg next session.`, nextWeight: lastWeight + increment, action: "increase" as const };
  }

  if (allHit && avgRpe > 7.5 && avgRpe <= 9) {
    return { message: "Maintain weight and focus on cleaner execution.", nextWeight: lastWeight, action: "maintain" as const };
  }

  if (failedSets >= 2) {
    return { message: "Stay at current weight and sharpen your technique.", nextWeight: lastWeight, action: "technique" as const };
  }

  if (plateau) {
    return { message: "This looks like a plateau. Consider a variation or deload soon.", nextWeight: Math.round(lastWeight * 0.9), action: "deload" as const };
  }

  return { message: "Solid effort — aim for the top of the rep range next time.", nextWeight: lastWeight, action: "maintain" as const };
}

export function progressionDecisionForSession(session: Session, plan: PlannedExercise[]) {
  const decisions = session.exercises.map(log => {
    const planExercise = plan.find(e => e.exerciseId === log.exerciseId);
    if (!planExercise) return null;
    return assessExerciseProgress(planExercise, { ...planExercise, lastWeight: planExercise.lastWeight, sets: log.sets });
  }).filter(Boolean) as ProgressionDecision[];

  return decisions.length > 0 ? decisions[0] : { message: "Nice work — keep building consistency.", nextWeight: 0, action: "maintain" as const };
}
