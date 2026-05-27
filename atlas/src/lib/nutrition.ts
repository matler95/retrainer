/**
 * Nutrition targets engine.
 *
 * Computes daily macro targets based on:
 * - Mifflin-St Jeor BMR
 * - Activity level (TDEE multiplier)
 * - Goal (deficit / surplus / maintenance)
 * - Training day vs rest day (different calorie targets)
 * - Body composition (protein based on lean mass)
 *
 * All functions are pure and deterministic.
 */

import type { Profile, NutritionTargets } from "@/data/types";
import { leanMassKg } from "@/lib/bodyComposition";

// ─── Activity Multipliers ───────────────────────────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Compute Basal Metabolic Rate using Mifflin-St Jeor equation.
 *
 * @param weightKg - Body weight in kg
 * @param heightCm - Height in cm
 * @param age - Age in years
 * @param gender - "male" | "female" | "other"
 * @returns BMR in kcal/day
 */
export function computeBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: "male" | "female" | "other",
): number {
  const s = gender === "female" ? -161 : 5;
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + s);
}

/**
 * Compute Total Daily Energy Expenditure.
 *
 * @param bmr - Basal metabolic rate
 * @param activity - Activity level
 * @returns TDEE in kcal/day
 */
export function computeTDEE(bmr: number, activity: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activity] ?? 1.55;
  return Math.round(bmr * multiplier);
}

/**
 * Compute daily calorie target based on goal.
 *
 * @param tdee - Total daily energy expenditure
 * @param goal - User's fitness goal
 * @param isTrainingDay - Whether today is a training day
 * @returns Daily calorie target
 */
export function goalCaloriesAdvanced(
  tdee: number,
  goal: string,
  isTrainingDay: boolean,
): number {
  const trainingBonus = isTrainingDay ? 150 : 0;

  switch (goal) {
    case "lose fat":
      return Math.round(tdee - 400 + trainingBonus);
    case "build muscle":
      return Math.round(tdee + 250 + trainingBonus);
    case "strength":
      return Math.round(tdee + 150 + trainingBonus);
    case "recomposition":
      return Math.round(tdee + trainingBonus);
    default:
      return Math.round(tdee + trainingBonus);
  }
}

/**
 * Compute comprehensive nutrition targets for a given day.
 *
 * PROTEIN: 2.2g/kg lean mass (training) or 1.8g/kg (rest)
 * FAT: 25% of calories / 9 cal per gram
 * CARBS: Remaining calories / 4 cal per gram
 * WATER: 35ml per kg body weight
 * FIBER: Minimum 25g
 *
 * @param profile - User profile
 * @param bodyFatPct - Body fat percentage (optional, uses estimate if not provided)
 * @param isTrainingDay - Whether today is a training day
 * @returns Complete NutritionTargets
 */
export function computeNutritionTargets(
  profile: Profile,
  bodyFatPct?: number,
  isTrainingDay = true,
): NutritionTargets {
  const bmr = computeBMR(profile.weightKg, profile.heightCm, profile.age, profile.gender);
  const tdee = computeTDEE(bmr, profile.activity);
  const calories = goalCaloriesAdvanced(tdee, profile.goal, isTrainingDay);

  // Protein based on lean mass
  const estimatedBfPct = bodyFatPct ?? estimateBodyFat(profile);
  const leanMass = leanMassKg(profile.weightKg, estimatedBfPct);
  const proteinPerKg = isTrainingDay ? 2.2 : 1.8;
  const protein = Math.round(leanMass * proteinPerKg);

  // Fat: 25% of total calories
  const fat = Math.round((calories * 0.25) / 9);

  // Carbs: remaining calories
  const remainingCalories = calories - protein * 4 - fat * 9;
  const carbs = Math.max(0, Math.round(remainingCalories / 4));

  // Water
  const water = Math.round(profile.weightKg * 35);

  return {
    calories,
    protein,
    carbs,
    fat,
    water,
    fiberMin: 25,
  };
}

/**
 * Get a simple calorie target (backward compatible with existing calc.ts).
 */
export function getSimpleCalorieTarget(profile: Profile): number {
  const bmr = computeBMR(profile.weightKg, profile.heightCm, profile.age, profile.gender);
  const tdee = computeTDEE(bmr, profile.activity);
  return goalCaloriesAdvanced(tdee, profile.goal, false);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Estimate body fat percentage from profile data when no measurement is available.
 * Uses a rough heuristic based on BMI and gender.
 */
function estimateBodyFat(profile: Profile): number {
  const bmi = profile.weightKg / (profile.heightCm / 100) ** 2;

  // Very rough estimate — better than nothing
  if (profile.gender === "female") {
    return Math.round(bmi * 1.2 + 4);
  }
  return Math.round(bmi * 1.0 + 2);
}