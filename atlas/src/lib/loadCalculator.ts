export function epley1RM(weight: number, reps: number) {
  return weight * (1 + reps / 30);
}

export function brzycki1RM(weight: number, reps: number) {
  return weight * (36 / (37 - reps));
}

export function average1RM(weight: number, reps: number) {
  if (reps <= 0) return weight;
  const epley = epley1RM(weight, reps);
  const brzycki = brzycki1RM(weight, reps);
  return (epley + brzycki) / 2;
}

export function workingWeightFrom1RM(oneRepMax: number, reps: number) {
  if (reps <= 0) return oneRepMax;
  if (reps <= 4) return oneRepMax * 0.92;
  if (reps <= 6) return oneRepMax * 0.88;
  if (reps <= 8) return oneRepMax * 0.84;
  if (reps <= 10) return oneRepMax * 0.80;
  return oneRepMax * 0.75;
}

export function suggestStartingWeight(exercise: string, bodyWeightKg: number) {
  const lower = Math.round(bodyWeightKg * 0.3);
  const upper = Math.round(bodyWeightKg * 0.6);
  const mapping: Record<string, number> = {
    squat: Math.round(bodyWeightKg * 0.5),
    bench: Math.round(bodyWeightKg * 0.3),
    deadlift: Math.round(bodyWeightKg * 0.6),
    overhead: Math.round(bodyWeightKg * 0.25),
  };
  const best = Object.entries(mapping).find(([key]) => exercise.toLowerCase().includes(key));
  return best ? best[1] : Math.round((lower + upper) / 2);
}
