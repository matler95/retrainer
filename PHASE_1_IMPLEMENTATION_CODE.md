# Phase 1: Quick Implementation Guide

## Copy-Paste Ready Solutions

This document contains exact code changes for Phase 1 (Critical Bug Fixes). Each task includes line numbers and exact code to replace.

---

## Task 1.1: Fix Duplicate Detection in planGenerator.ts

### Location: `atlas/src/lib/planGenerator.ts` — Push/Pull/Legs Section (~line 214)

### BEFORE (Problem Code):
```typescript
  if (style === "push/pull/legs") {
    const muscleMap = DAY_MUSCLE_MAP["push/pull/legs"];
    const base = muscleMap.map((muscles, i) => {
      const dayNames = ["Push", "Pull", "Legs"];
      const name = dayNames[i] ?? `Day ${i + 1}`;
      return day(
        `d${i + 1}`,
        name,
        muscles.flatMap((m) =>
          scoredPick(m as MuscleGroup, getExerciseCount(m as MuscleGroup, i), [], i),
        ),
      );
    });
    return base.slice(0, Math.max(3, days)).concat(
      days > 3
        ? base.slice(0, days - 3).map((d, i) => ({
            ...d,
            id: `d${4 + i}`,
            name: `${d.name} 2`,
          }))
        : [],
    );
  }
```

### AFTER (Fixed):
```typescript
  if (style === "push/pull/legs") {
    const muscleMap = DAY_MUSCLE_MAP["push/pull/legs"];
    const base = muscleMap.map((muscles, i) => {
      const dayNames = ["Push", "Pull", "Legs"];
      const name = dayNames[i] ?? `Day ${i + 1}`;
      
      // ← FIX: Track picked exercises across the entire day
      const dayPickedExerciseIds: string[] = [];
      const dayExercises: PlannedExercise[] = [];
      
      muscles.forEach((m) => {
        const pickedForMuscle = scoredPick(
          m as MuscleGroup,
          getExerciseCount(m as MuscleGroup, i),
          dayPickedExerciseIds,  // ← Pass accumulated picks
          i,
        );
        dayExercises.push(...pickedForMuscle);
        // ← Update for next muscle group
        dayPickedExerciseIds.push(...pickedForMuscle.map((pe) => pe.exerciseId));
      });
      
      return day(`d${i + 1}`, name, dayExercises);
    });
    return base.slice(0, Math.max(3, days)).concat(
      days > 3
        ? base.slice(0, days - 3).map((d, i) => ({
            ...d,
            id: `d${4 + i}`,
            name: `${d.name} 2`,
          }))
        : [],
    );
  }
```

---

### Same fix for other styles:

#### Upper/Lower (~line 240):
```typescript
  if (style === "upper/lower") {
    const muscleMap = DAY_MUSCLE_MAP["upper/lower"];
    const base = muscleMap.map((muscles, i) => {
      const dayNames = ["Upper", "Lower"];
      const name = dayNames[i] ?? `Day ${i + 1}`;
      
      // ← FIX: Track picks
      const dayPickedExerciseIds: string[] = [];
      const dayExercises: PlannedExercise[] = [];
      
      muscles.forEach((m) => {
        const pickedForMuscle = scoredPick(
          m as MuscleGroup,
          getExerciseCount(m as MuscleGroup, i),
          dayPickedExerciseIds,
          i,
        );
        dayExercises.push(...pickedForMuscle);
        dayPickedExerciseIds.push(...pickedForMuscle.map((pe) => pe.exerciseId));
      });
      
      return day(`d${i + 1}`, name, dayExercises);
    });
    
    const out: PlanDay[] = [];
    for (let i = 0; i < days; i++) {
      const sourceDay = base[i % base.length];
      out.push({
        ...sourceDay,
        id: `d${i + 1}`,
        name: `${sourceDay.name} ${Math.floor(i / base.length) + 1}`,
      });
    }
    return out;
  }
```

#### Bodybuilding Split (~line 260):
```typescript
  if (style === "bodybuilding split") {
    const split: [string, MuscleGroup[]][] = [
      ["Chest & Triceps", ["chest", "triceps"]],
      ["Back & Biceps", ["back", "biceps"]],
      ["Legs", ["legs", "glutes", "calves"]],
      ["Shoulders & Core", ["shoulders", "core"]],
      ["Arms", ["biceps", "triceps"]],
    ];
    
    return split.slice(0, days).map((s, i) => {
      // ← FIX: Track picks
      const dayPickedExerciseIds: string[] = [];
      const dayExercises: PlannedExercise[] = [];
      
      s[1].forEach((m) => {
        const pickedForMuscle = scoredPick(
          m as MuscleGroup,
          getExerciseCount(m as MuscleGroup, i),
          dayPickedExerciseIds,
          i,
        );
        dayExercises.push(...pickedForMuscle);
        dayPickedExerciseIds.push(...pickedForMuscle.map((pe) => pe.exerciseId));
      });
      
      return day(`d${i + 1}`, s[0], dayExercises);
    });
  }
```

#### Full Body (~line 290):
```typescript
  // full body — default fallback
  const fbMuscles: MuscleGroup[] = ["legs", "chest", "back", "shoulders", "core"];
  
  return Array.from({ length: days }).map((_, i) => {
    // ← FIX: Track picks
    const dayPickedExerciseIds: string[] = [];
    const dayExercises: PlannedExercise[] = [];
    
    fbMuscles.forEach((m) => {
      const pickedForMuscle = scoredPick(
        m as MuscleGroup,
        1,  // 1 exercise per muscle
        dayPickedExerciseIds,
        i,
      );
      dayExercises.push(...pickedForMuscle);
      dayPickedExerciseIds.push(...pickedForMuscle.map((pe) => pe.exerciseId));
    });
    
    return day(`d${i + 1}`, `Full Body ${i + 1}`, dayExercises);
  });
```

---

## Task 1.2: Filter Recovery Exercises in planGenerator.ts

### Location: `atlas/src/lib/planGenerator.ts` — Line 123

### BEFORE:
```typescript
  // Filter usable exercises once
  const usable = EXERCISES.filter((e) =>
    e.equipment.some((eq) => profile.equipment.includes(eq)) &&
    !profile.avoid.some((a) =>
      e.name.toLowerCase().includes(a.toLowerCase().trim()),
    ),
  );
```

### AFTER:
```typescript
  // Filter usable exercises once
  const usable = EXERCISES.filter((e) => {
    // 1. Equipment compatibility
    if (!e.equipment.some((eq) => profile.equipment.includes(eq))) {
      return false;
    }

    // 2. Injury/avoid keyword matching
    if (profile.avoid.some((a) =>
      e.name.toLowerCase().includes(a.toLowerCase().trim()),
    )) {
      return false;
    }

    // 3. ← NEW: Exclude recovery exercises for hypertrophy goals
    const isHypertrophyGoal = [
      "build muscle",
      "strength",
      "recomposition",
    ].includes(profile.goal);

    if (isHypertrophyGoal) {
      // Exclude flexibility and mobility exercises
      if (e.category === "flexibility" || e.category === "mobility") {
        return false;
      }

      // Exclude foam roller exercises (self-myofascial release)
      if (e.equipment.includes("foam_roller")) {
        return false;
      }
    }

    return true;
  });
```

---

## Task 1.3: Create New File `planValidator.ts`

### Location: NEW FILE `atlas/src/lib/planValidator.ts`

```typescript
/**
 * Plan validation module.
 *
 * Validates generated training plans for:
 * - Duplicate exercises within days
 * - Recovery exercises in hypertrophy plans
 * - Volume bounds
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

  plan.forEach((day, dayIndex) => {
    const exerciseIds = day.exercises.map((e) => e.exerciseId);

    // ─── Check 1: No duplicates within day ─────────────────────────────────
    const uniqueIds = new Set(exerciseIds);
    if (uniqueIds.size !== exerciseIds.length) {
      const dupeIds = exerciseIds.filter(
        (id, idx) => exerciseIds.indexOf(id) !== idx,
      );
      errors.push(
        `Day ${day.id}: Duplicate exercises found: ${dupeIds.join(", ")}`,
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
      // Rep range should match pattern like "8-12", "1-5", etc.
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
```

---

## Task 1.4: Wire Up Validator in Store

### Location: `atlas/src/store/useAppStore.ts`

### STEP 1: Add import at top of file:
```typescript
import { validateGeneratedPlan } from "@/lib/planValidator";
```

### STEP 2: Find where `generateEnhancedPlan()` is called and add validation

### BEFORE:
```typescript
const newPlan = generateEnhancedPlan(
  profile,
  trainingBlocks,
  currentWeekNumber,
  options,
);
set({ plan: newPlan });
```

### AFTER:
```typescript
const newPlan = generateEnhancedPlan(
  profile,
  trainingBlocks,
  currentWeekNumber,
  options,
);

// Validate before storing
const validationErrors = validateGeneratedPlan(newPlan, profile);
if (validationErrors.length > 0) {
  console.error("Plan validation errors:", validationErrors);
  throw new Error(
    `Generated plan is invalid: ${validationErrors.slice(0, 3).join("; ")}`,
  );
}

set({ plan: newPlan });
```

---

## Testing Your Changes

### Quick Manual Test

After making all changes:

```bash
cd atlas

# Build to check for TypeScript errors
npm run build

# If build succeeds, you're good!
```

### Visual Verification

1. Go to http://localhost:5173/onboarding
2. Complete onboarding with goal = "build muscle"
3. Generate plan
4. Open DevTools → check console for validation errors
5. Inspect generated exercises → verify no duplicates, no stretches

---

## Rollback Plan

If anything breaks:

```bash
# Revert last 4 commits
git revert HEAD~3..HEAD
```

---

**That's it! Phase 1 implementation is 4 copy-paste tasks. Estimated time: 1-2 hours.**
