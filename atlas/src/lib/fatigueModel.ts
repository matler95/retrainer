import type { Session } from "@/store/useAppStore";

export function computeSessionLoad(session: Session) {
  return session.exercises.reduce((sessionTotal, exercise) => {
    const exerciseLoad = exercise.sets.reduce((setTotal, set) => {
      if (!set.done) return setTotal;
      return setTotal + set.weight * set.reps * (set.rpe ? (set.rpe / 10) : 1);
    }, 0);
    return sessionTotal + exerciseLoad;
  }, 0);
}

export function computeAcwr(last7: number, last28: number) {
  if (last28 <= 0) return last7 > 0 ? 2 : 1;
  return last7 / last28;
}

export function readinessScore(acwr: number, recentRpe: number) {
  const acwrScore = acwr >= 0.8 && acwr <= 1.3 ? 50 : acwr > 1.5 ? 20 : acwr < 0.8 ? 35 : 40;
  const rpeScore = Math.max(0, 30 - Math.max(0, recentRpe - 7) * 5);
  const score = Math.round(Math.min(100, acwrScore + rpeScore + 20));
  return Math.max(0, Math.min(100, score));
}

export function getRecentLoad(sessions: Session[]) {
  const now = Date.now();
  const last7 = sessions
    .filter(s => Date.now() - new Date(s.date).getTime() <= 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, s) => sum + computeSessionLoad(s), 0);
  const last28 = sessions
    .filter(s => Date.now() - new Date(s.date).getTime() <= 28 * 24 * 60 * 60 * 1000)
    .reduce((sum, s) => sum + computeSessionLoad(s), 0) / 4;
  return { last7, last28 };
}
