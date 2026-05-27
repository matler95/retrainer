/**
 * Body composition estimation utilities.
 *
 * Provides body fat estimation using the US Navy tape method (validated ±3% vs DEXA)
 * and lean mass calculations.
 *
 * All functions are pure and deterministic.
 */

// ─── US Navy Body Fat Method ─────────────────────────────────────────────────

/**
 * Estimate body fat percentage using the US Navy tape method.
 * Validated within ±3% accuracy compared to DEXA scans.
 *
 * @param params - Body measurements
 * @returns Estimated body fat percentage
 */
export function navyBodyFat(params: {
  gender: "male" | "female" | "other";
  heightCm: number;
  waistCm: number;
  neckCm: number;
  hipCm?: number; // females only
}): number {
  const { gender, heightCm, waistCm, neckCm, hipCm } = params;

  if (gender === "male") {
    return (
      86.010 * Math.log10(waistCm - neckCm) -
      70.041 * Math.log10(heightCm) +
      36.76
    );
  } else {
    return (
      163.205 * Math.log10(waistCm + (hipCm ?? 0) - neckCm) -
      97.684 * Math.log10(heightCm) -
      78.387
    );
  }
}

/**
 * Calculate lean body mass from weight and body fat percentage.
 *
 * @param weightKg - Total body weight in kg
 * @param bodyFatPct - Body fat percentage (0-100)
 * @returns Lean mass in kg
 */
export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg * (1 - bodyFatPct / 100);
}

/**
 * Calculate fat mass from weight and body fat percentage.
 *
 * @param weightKg - Total body weight in kg
 * @param bodyFatPct - Body fat percentage (0-100)
 * @returns Fat mass in kg
 */
export function fatMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg * (bodyFatPct / 100);
}

/**
 * Get a body fat category label based on percentage and gender.
 *
 * @param bodyFatPct - Body fat percentage
 * @param gender - User's gender
 * @returns Category label
 */
export function getBodyFatCategory(
  bodyFatPct: number,
  gender: "male" | "female" | "other",
): string {
  if (gender === "female") {
    if (bodyFatPct < 14) return "Essential fat";
    if (bodyFatPct < 21) return "Athletic";
    if (bodyFatPct < 25) return "Fitness";
    if (bodyFatPct < 32) return "Average";
    return "Above average";
  }

  // Male or other
  if (bodyFatPct < 6) return "Essential fat";
  if (bodyFatPct < 14) return "Athletic";
  if (bodyFatPct < 18) return "Fitness";
  if (bodyFatPct < 25) return "Average";
  return "Above average";
}