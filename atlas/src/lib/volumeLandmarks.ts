export type Experience = "beginner" | "intermediate" | "advanced";
export interface VolumeLandmarks {
  mev: number;
  mav: number;
  mrv: number;
}

const MUSCLE_VOLUME_TABLE: Record<string, VolumeLandmarks> = {
  chest: { mev: 10, mav: 14, mrv: 18 },
  back: { mev: 10, mav: 16, mrv: 20 },
  shoulders: { mev: 8, mav: 12, mrv: 16 },
  legs: { mev: 12, mav: 18, mrv: 24 },
  glutes: { mev: 10, mav: 14, mrv: 18 },
  biceps: { mev: 8, mav: 12, mrv: 16 },
  triceps: { mev: 8, mav: 12, mrv: 16 },
  core: { mev: 8, mav: 12, mrv: 16 },
  calves: { mev: 6, mav: 10, mrv: 14 },
};

export function getVolumeLandmarks(muscle: string): VolumeLandmarks {
  return MUSCLE_VOLUME_TABLE[muscle] ?? { mev: 8, mav: 12, mrv: 16 };
}

export function calculateWeeklyVolume(setsByMuscle: Record<string, number>) {
  return Object.entries(setsByMuscle).reduce((total, [, sets]) => total + sets, 0);
}

export function withinOptimalVolume(muscle: string, weeklySets: number) {
  const { mev, mav, mrv } = getVolumeLandmarks(muscle);
  return {
    mev,
    mav,
    mrv,
    status: weeklySets < mev ? "below" : weeklySets <= mav ? "optimal" : weeklySets <= mrv ? "high" : "over",
  } as const;
}
