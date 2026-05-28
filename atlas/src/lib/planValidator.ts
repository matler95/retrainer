/**
 * Plan validation module.
 *
 * Validates generated training plans for:
 * - Duplicate exercises within days
 * - Recovery exercises in hypertrophy plans
 * - Volume bounds (sets, reps, rest)
 *
 * Called after plan generation to catch errors before returning to UI.
 */

import type { PlanDay, Profile } from "@/data/types";
import { EXERCISES } from "@/data/exercises";

/**
 * Validate a generated training plan against user profile and rules.
 *
 * @param plan - Generated training plan
 * @param profile - User profile that drove the generation
 * @returns Array of validation error messages (empty if all valid)
 */
export function validateGeneratedPlan(
  plan: PlanDay[],
  profile: Profile,
): string[] {
  const errors: string[] = [];

  plan.forEach((day) => {
    const exerciseIds = day.exercises.map((e) => e.exerciseId);

    // ─── Check 1: No duplicates within day ─────────────────────────────────
    const uniqueIds = new Set(exerciseIds);
    if (uniqueIds.size !== exerciseIds.length) {
      const dupeIds = exerciseIds.filter(
        (id, idx) => exerciseIds.indexOf(id) !== idx,
      );
      errors.push(
        `Day ${day.id}: Duplicate exercises found: ${[...new Set(dupeIds)].join(", ")}`,
      );
    }

    // ─── Check 2: No recovery exercises for hypertrophy ────────────────────
    if (
      ["build muscle", "strength", "recomposition"].includes(profile.goal)
    ) {
      day.exercises.forEach((plannedEx) => {
        const exercise = EXERCISES.find((e) => e.id === plannedEx.exerciseId);
        if (!exercise) {
          errors.push(
            `Day ${day.id}: Exercise ${plannedEx.exerciseId} not found in database`,
          );
          return;
        }

        const isRecovery =
          exercise.category === "flexibility" ||
          exercise.category === "mobility" ||
          exercise.equipment.includes("foam_roller");

        if (isRecovery) {
          errors.push(
            `Day ${day.id}: Recovery exercise not allowed for goal "${profile.goal}": ${exercise.name}`,
          );
        }
      });
    }

    // ─── Check 3: Sets in valid range ────────────────────────────────────
    day.exercises.forEach((plannedEx) => {
      if (plannedEx.sets < 2 || plannedEx.sets > 5) {
        const exercise = EXERCISES.find((e) => e.id === plannedEx.exerciseId);
        errors.push(
          `Day ${day.id}: ${exercise?.name ?? plannedEx.exerciseId} has invalid set count: ${plannedEx.sets}`,
        );
      }
    });

    // ─── Check 4: Rep range valid ────────────────────────────────────────
    day.exercises.forEach((plannedEx) => {
      if (!/^\d+-\d+$/.test(plannedEx.reps)) {
        const exercise = EXERCISES.find((e) => e.id === plannedEx.exerciseId);
        errors.push(
          `Day ${day.id}: ${exercise?.name ?? plannedEx.exerciseId} has invalid rep range: ${plannedEx.reps}`,
        );
      }
    });

    // ─── Check 5: Rest seconds reasonable ────────────────────────────────
    day.exercises.forEach((plannedEx) => {
      if (plannedEx.restSec < 30 || plannedEx.restSec > 300) {
        const exercise = EXERCISES.find((e) => e.id === plannedEx.exerciseId);
        errors.push(
          `Day ${day.id}: ${exercise?.name ?? plannedEx.exerciseId} has invalid rest: ${plannedEx.restSec}s`,
        );
      }
    });
  });

  return errors;
}

/**
 * Assert plan is valid, throw on errors.
 */
export function assertPlanValid(
  plan: PlanDay[],
  profile: Profile,
): void {
  const errors = validateGeneratedPlan(plan, profile);
  if (errors.length > 0) {
    throw new Error(
      `Plan validation failed:\n${errors.join("\n")}`,
    );
  }
}