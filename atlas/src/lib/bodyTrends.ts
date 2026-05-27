/**
 * Body weight trend analysis.
 * Uses a simple exponential moving average (EMA) to smooth daily weigh-ins
 * and detect trends (losing, gaining, maintaining).
 *
 * WHY EMA: Body weight fluctuates daily due to water, food, etc.
 * EMA smooths out noise while remaining responsive to real changes.
 */

export interface BodyTrendPoint {
  date: string; // ISO date
  kg: number;
  ema: number; // exponential moving average at this point
}

export interface BodyTrendSummary {
  currentWeight: number;   // most recent raw weight
  currentEma: number;      // most recent EMA
  trendDirection: "losing" | "gaining" | "maintaining";
  // Estimated rate of change per week (kg/week)
  ratePerWeek: number;
  // Days since last logged weight
  daysSinceLastLog: number;
}

const EMA_ALPHA = 0.3; // smoothing factor — lower = smoother, higher = more responsive

/**
 * Compute the exponential moving average over a series of body weight logs.
 * Returns an array of points with both raw weight and EMA values.
 * Input should be sorted oldest-first.
 */
export function computeEma(logs: { date: string; kg: number }[]): BodyTrendPoint[] {
  if (logs.length === 0) return [];

  const sorted = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  let ema = sorted[0].kg;
  const points: BodyTrendPoint[] = [];

  for (const entry of sorted) {
    ema = ema + EMA_ALPHA * (entry.kg - ema);
    points.push({
      date: entry.date,
      kg: entry.kg,
      ema: Math.round(ema * 100) / 100,
    });
  }

  return points;
}

/**
 * Get a summary of the current body weight trend.
 * Uses the last 14-day slope of the EMA to determine direction.
 */
export function getBodyTrendSummary(
  logs: { date: string; kg: number }[],
): BodyTrendSummary | null {
  if (logs.length === 0) return null;

  const sorted = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const latest = sorted[sorted.length - 1];
  const points = computeEma(sorted);
  const currentEma = points[points.length - 1].ema;

  // Compute slope over last 14 days from EMA
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const recentPoints = points.filter(
    (p) => new Date(p.date) >= fourteenDaysAgo,
  );

  let ratePerWeek = 0;
  if (recentPoints.length >= 2) {
    const first = recentPoints[0];
    const last = recentPoints[recentPoints.length - 1];
    const daysDiff =
      (new Date(last.date).getTime() - new Date(first.date).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysDiff > 0) {
      ratePerWeek = ((last.ema - first.ema) / daysDiff) * 7;
    }
  }

  // Round rate for display
  ratePerWeek = Math.round(ratePerWeek * 100) / 100;

  // Determine trend direction
  const trendDirection: "losing" | "gaining" | "maintaining" =
    ratePerWeek < -0.2 ? "losing" : ratePerWeek > 0.2 ? "gaining" : "maintaining";

  // Days since last log
  const daysSinceLastLog = Math.round(
    (Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    currentWeight: latest.kg,
    currentEma,
    trendDirection,
    ratePerWeek,
    daysSinceLastLog,
  };
}

/**
 * Suggest a daily calorie target based on rate of change and goal.
 * This is a heuristic — real BMR/TDEE calculations need more inputs
 * (age, height, activity, etc.).
 *
 * TODO: Future AI integration point — connect to a BMR estimator or
 * external nutrition API for more accurate targets.
 */
export function suggestCalorieIntake(
  currentWeightKg: number,
  goal: "lose fat" | "build muscle" | "general fitness" | "strength" | "recomposition",
  ratePerWeek: number,
): { message: string; targetCalories: number } {
  // Rough maintenance estimate (25-30 kcal/kg for most people)
  const maintenanceEstimate = Math.round(currentWeightKg * 28);

  let targetCalories: number;
  let message: string;

  switch (goal) {
    case "lose fat":
      // Aim for -0.5kg/week deficit (~500 kcal deficit)
      targetCalories = maintenanceEstimate - 500;
      message = ratePerWeek >= 0
        ? "You're maintaining or gaining. Try a ~500 kcal deficit for fat loss."
        : "Good trend. Keep a moderate deficit to maintain ~0.5kg/week loss.";
      break;
    case "build muscle":
      // Aim for +0.25kg/week surplus (~250 kcal surplus)
      targetCalories = maintenanceEstimate + 250;
      message = ratePerWeek <= 0
        ? "To build muscle, aim for a small calorie surplus (~250 kcal/day)."
        : ratePerWeek > 0.5
          ? "Gaining fast — you may be adding excess fat. Slow the surplus."
          : "Good surplus for muscle gain.";
      break;
    case "recomposition":
      targetCalories = maintenanceEstimate;
      message = ratePerWeek > 0.3
        ? "You're gaining. For recomp, try eating at maintenance."
        : ratePerWeek < -0.3
          ? "You're losing fast. Bump calories to maintenance for recomp."
          : "Right on track — eat at maintenance and focus on progressive overload.";
      break;
    default:
      // strength / general fitness
      targetCalories = maintenanceEstimate;
      message = ratePerWeek < -0.5
        ? "You're losing weight quickly. Consider increasing calories for performance."
        : ratePerWeek > 0.5
          ? "You're gaining quickly. Ensure it's mostly muscle with sufficient protein."
          : "Your weight is stable — great consistency.";
  }

  return { message, targetCalories };
}