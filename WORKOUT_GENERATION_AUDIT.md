# Workout Generation System Audit & Implementation Plan

## Executive Summary

This audit identifies critical gaps in the current workout generation system that allow:
- **Duplicate exercises** within single workouts
- **Non-hypertrophy exercises** (stretching, foam rolling, mobility) in muscle-building plans
- **Inadequate metadata** for proper exercise filtering

The current system uses a deterministic scorer but **lacks explicit filtering** for recovery/mobility exercises and has **no duplicate detection within a single workout day**. 

This plan provides a phased, manageable approach to fix these issues while maintaining existing functionality.

---

## 1. Current Architecture

### Data Model (src/data/exercises.ts)

**Exercise Type** includes:
```typescript
interface Exercise {
  id: string;
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  category?: ExerciseCategory;  // ← KEY: "compound" | "isolation" | "cardio" | "mobility" | "flexibility" | "plyometric"
  mechanic?: Mechanic;
  plane?: Plane;
  forceType?: ForceType;
  // NO excludeFromAutoPlanning flag!
}
```

**Critical Gap:** No `excludeFromAutoPlanning` field. Recovery/mobility exercises are tagged via `category` but are NOT filtered out.

### Exercise Scoring (src/lib/exerciseScorer.ts)

**Current Scoring Dimensions:**
- Equipment compatibility (3x weight)
- Injury avoidance (10x weight) — **only keyword matching on exercise name**
- User preference (3x weight)
- Target muscle alignment (5x weight)
- Experience level (2x weight)
- Variety bonus (1x weight)

**Current Filtering (in planGenerator.ts, line 123):**
```typescript
const usable = EXERCISES.filter((e) =>
  e.equipment.some((eq) => profile.equipment.includes(eq)) &&
  !profile.avoid.some((a) =>
    e.name.toLowerCase().includes(a.toLowerCase().trim()),
  ),
);
```

**Problems:**
1. Only filters by equipment availability and `avoid` list (keyword matching)
2. No categorical exclusion of recovery/mobility exercises
3. No check for `category === "flexibility"` or `category === "mobility"`
4. No check for `equipment.includes("foam_roller")`

### Plan Generation (src/lib/planGenerator.ts)

**Current Flow:**
```
generateEnhancedPlan()
  ├─ Filter usable exercises (equipment + avoid keyword)
  ├─ For each day:
  │   ├─ For each needed muscle group:
  │   │   ├─ scoredPick(muscle, count)
  │   │   │   ├─ pickTopScored() — returns top N exercises
  │   │   │   └─ Converts to PlannedExercise[] with sets/reps
```

**Critical Issues:**
1. **No duplicate detection**: `alreadySelected` only passed as empty `[]` at start of day (line 226)
   ```typescript
   return split.slice(0, days).map((s, i) =>
     day(`d${i + 1}`, s[0], 
       s[1].flatMap((m) => scoredPick(m, getExerciseCount(m, i), [], i))  // ← [] !!!
     ),
   );
   ```
2. **Only variety bonus prevents dupes**: `scoreVariety()` gives bonus for exercises not in `alreadySelected`, but `alreadySelected` is never updated with picked exercises
3. **Duplicate exercises can appear**:
   - Same exercise across different muscle group slots (e.g., Barbell Bench Press for both chest AND shoulders)
   - Same exercise multiple times if multiple muscle groups use it as secondary

---

## 2. DETECTED PROBLEMS

### Problem 1: Recovery Exercises in Hypertrophy Plans ❌

**Scenario:** User with goal "build muscle" gets plan with:
- Barbell Bench Press (compound)
- Incline Dumbbell Press (compound)
- **IT Band Stretch** (recovery!)
- **Foam Rolling Quads** (recovery!)

**Root Cause:** 
- Filter in `planGenerator.ts` line 123 only checks equipment & avoid keyword
- No category-based exclusion
- Stretching exercises tagged as `category: "flexibility"` but scorer doesn't penalize them

### Problem 2: Duplicate Exercises Within Single Workout ❌

**Scenario:** Push day generates:
- Barbell Bench Press (chest)
- Barbell Bench Press (chest again) — **DUPLICATE**
- Dumbbell Incline Press (chest + shoulders)
- Shoulder Press (shoulders)

**Root Cause:**
```typescript
// scoredPick() is called for EACH muscle group independently
scoredPick("chest", 2, [], 0),      // picks top 2 for chest
scoredPick("shoulders", 2, [], 0),  // picks top 2 for shoulders independently
scoredPick("triceps", 1, [], 0),    // picks top 1 for triceps independently
```

Each call to `pickTopScored()` operates independently with empty `alreadySelected` array.

---

## 3. ROOT CAUSES

| Problem | Root Cause | Location |
|---------|-----------|----------|
| Recovery exercises in plans | No category-based exclusion in filter | `planGenerator.ts:123` |
| Duplicate exercises | `alreadySelected` never updated between muscle group picks | `planGenerator.ts:174-230` |
| Missing metadata | Exercise interface incomplete | `exercises.ts:88-108` |

---

## 4. HIGH-IMPACT FIXES

### Fix 1: Filter Recovery Exercises in Plan Generator

**In planGenerator.ts, replace line 123:**
```typescript
// BEFORE:
const usable = EXERCISES.filter((e) =>
  e.equipment.some((eq) => profile.equipment.includes(eq)) &&
  !profile.avoid.some((a) =>
    e.name.toLowerCase().includes(a.toLowerCase().trim()),
  ),
);

// AFTER:
const usable = EXERCISES.filter((e) => {
  // 1. Equipment check
  if (!e.equipment.some((eq) => profile.equipment.includes(eq))) return false;
  
  // 2. Avoid keyword check (injury compatibility)
  if (profile.avoid.some((a) =>
    e.name.toLowerCase().includes(a.toLowerCase().trim())
  )) return false;
  
  // 3. CRITICAL: Exclude recovery/mobility for hypertrophy goals
  if (["build muscle", "strength", "recomposition"].includes(profile.goal)) {
    // Exclude flexibility/mobility/recovery exercises
    if (e.category === "flexibility" || e.category === "mobility") return false;
    if (e.equipment.includes("foam_roller")) return false;
  }
  
  return true;
});
```

### Fix 2: Implement Cross-Muscle-Group Deduplication

**In planGenerator.ts, refactor the day builder:**

**BEFORE (problematic):**
```typescript
return split.slice(0, days).map((s, i) =>
  day(
    `d${i + 1}`,
    s[0],
    s[1].flatMap((m) => 
      scoredPick(m, getExerciseCount(m, i), [], i)  // ← empty array!
    ),
  ),
);
```

**AFTER (fixed):**
```typescript
return split.slice(0, days).map((s, i) => {
  const dayExercises: PlannedExercise[] = [];
  const dayPickedExerciseIds: string[] = [];
  
  // Accumulate exercises across all muscles in day
  s[1].forEach((m) => {
    const pickedForMuscle = scoredPick(
      m as MuscleGroup, 
      getExerciseCount(m as MuscleGroup, i),
      dayPickedExerciseIds,  // ← Pass accumulated picks!
      i
    );
    dayExercises.push(...pickedForMuscle);
    dayPickedExerciseIds.push(...pickedForMuscle.map(pe => pe.exerciseId));
  });
  
  return day(`d${i + 1}`, s[0], dayExercises);
});
```

### Fix 3: Add Plan Validator

**New file: src/lib/planValidator.ts**
```typescript
export function validateGeneratedPlan(plan: PlanDay[], profile: Profile): string[] {
  const errors: string[] = [];
  
  plan.forEach((day) => {
    const exerciseIds = day.exercises.map(e => e.exerciseId);
    
    // 1. No duplicates within day
    const uniqueIds = new Set(exerciseIds);
    if (uniqueIds.size !== exerciseIds.length) {
      errors.push(`Day ${day.id}: Duplicate exercises detected`);
    }
    
    // 2. No recovery exercises for hypertrophy goals
    if (["build muscle", "strength"].includes(profile.goal)) {
      const recoveryExercises = day.exercises.filter(pe => {
        const ex = EXERCISES.find(e => e.id === pe.exerciseId);
        return ex?.category === "flexibility" || ex?.equipment.includes("foam_roller");
      });
      if (recoveryExercises.length > 0) {
        errors.push(`Day ${day.id}: Contains recovery exercises`);
      }
    }
  });
  
  return errors;
}
```

---

## 5. RECOMMENDED REFACTOR ORDER

### Phase 1: Fix Critical Bugs (1-2 days) ⚡

1. **Add cross-muscle deduplication** → `planGenerator.ts` lines 174-230
2. **Add recovery exercise filtering** → `planGenerator.ts` line 123
3. **Add validation** → New file `src/lib/planValidator.ts`

### Phase 2: Extend Metadata (2-3 days)

4. **Add Exercise interface fields** → `src/data/exercises.ts`
   - `excludeFromAutoPlanning?: boolean`
   - `recoveryClassification?: string`

5. **Update exercises-seed.json** → Tag 50+ recovery exercises

### Phase 3: Improve Scoring (2-3 days)

6. **Enhance injury avoidance** → `exerciseScorer.ts`
7. **Increase variety penalty** → `exerciseScorer.ts`

### Phase 4: Testing (2-3 days)

8. **Add comprehensive tests** → `src/lib/__tests__/planGenerator.test.ts`

---

## 6. TESTING STRATEGY

### Unit Tests

```typescript
describe("generateEnhancedPlan", () => {
  it("should not generate duplicate exercises within a single day", () => {
    const plan = generateEnhancedPlan(profileUpperLower, blocks, 0);
    
    plan.forEach(day => {
      const exerciseIds = day.exercises.map(e => e.exerciseId);
      const uniqueIds = new Set(exerciseIds);
      expect(uniqueIds.size).toBe(exerciseIds.length);
    });
  });

  it("should exclude flexibility exercises for hypertrophy goals", () => {
    const profile = { ...baseProfile, goal: "build muscle" };
    const plan = generateEnhancedPlan(profile, blocks, 0);
    
    plan.forEach(day => {
      day.exercises.forEach(pe => {
        const ex = EXERCISES.find(e => e.id === pe.exerciseId);
        expect(ex?.category).not.toBe("flexibility");
        expect(ex?.equipment.includes("foam_roller")).toBe(false);
      });
    });
  });
});
```

---

## 7. SUCCESS METRICS

After implementation, verify:

✅ **No duplicate exercises** within any generated workout (100% of tests)
✅ **No recovery exercises** in hypertrophy plans (100% of tests)
✅ **Valid difficulty match** for user experience level (95%+)

---

## 8. IMPLEMENTATION CHECKLIST

### Phase 1: Critical Fixes
- [ ] Update `planGenerator.ts` to track `dayPickedExerciseIds`
- [ ] Add recovery exercise filtering in `planGenerator.ts` line 123
- [ ] Create `src/lib/planValidator.ts` with duplicate/recovery checks

### Phase 2: Metadata
- [ ] Add fields to `Exercise` interface
- [ ] Tag recovery exercises in `exercises-seed.json`

### Phase 3: Scoring
- [ ] Enhance `scoreInjury()` with muscle-based filtering
- [ ] Increase `variety` weight in scorer

### Phase 4: Tests
- [ ] Duplicate prevention tests
- [ ] Recovery exclusion tests
- [ ] E2E validation tests

---

**Status:** Ready for Implementation
