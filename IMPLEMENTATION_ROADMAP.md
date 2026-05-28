# Workout Generation - Implementation Roadmap

## Quick Summary

**Problem:** The workout generator allows duplicate exercises and includes recovery/stretching exercises in hypertrophy plans.

**Root Cause:**
1. No deduplication tracking across muscle groups within a single day
2. No recovery exercise filtering based on category/equipment
3. Missing metadata fields to classify exercises

**Solution:** 4-phase implementation plan (1 week total)

---

## Phase 1: Critical Bug Fixes (1-2 Days) 🔥 **START HERE**

### Task 1.1: Fix Duplicate Exercise Detection

**File:** `atlas/src/lib/planGenerator.ts`

**Current problem:** Each muscle group gets independent `[]` in `scoredPick()`, so Bench Press can appear twice

**Fix:** Track `dayPickedExerciseIds` accumulator and pass it to each muscle group pick

**Time:** 30 min | **Risk:** Low

---

### Task 1.2: Filter Recovery Exercises

**File:** `atlas/src/lib/planGenerator.ts` line 123

**Add after equipment/avoid checks:**
```typescript
// Exclude recovery exercises for hypertrophy goals
const isHypertrophyGoal = ["build muscle", "strength", "recomposition"].includes(profile.goal);
if (isHypertrophyGoal) {
  if (e.category === "flexibility" || e.equipment.includes("foam_roller")) return false;
}
```

**Time:** 15 min | **Risk:** Low

---

### Task 1.3: Add Plan Validator

**File:** NEW `atlas/src/lib/planValidator.ts`

**What it does:**
- Checks for duplicate exercises in each day
- Verifies no recovery exercises in hypertrophy plans
- Validates sets/reps/rest ranges

**Time:** 30 min | **Risk:** Low

---

### Task 1.4: Wire Up Validator

**File:** `atlas/src/store/useAppStore.ts`

**After plan generation, call:**
```typescript
const validationErrors = validateGeneratedPlan(plan, profile);
if (validationErrors.length > 0) throw new Error("Plan invalid");
```

**Time:** 15 min | **Risk:** Low

---

## Phase 2: Extend Exercise Metadata (2-3 Days)

### Task 2.1: Update Exercise Interface

**File:** `atlas/src/data/exercises.ts`

Add to `Exercise` interface:
- `excludeFromAutoPlanning?: boolean`
- `recoveryClassification?: "main_lift" | "auxiliary" | "warmup" | "cooldown" | "recovery"`

**Time:** 15 min | **Risk:** Very Low

---

### Task 2.2: Tag Recovery Exercises

**File:** `atlas/src/data/exercises-seed.json`

For all `category: "flexibility"` exercises, add:
```json
"excludeFromAutoPlanning": true,
"recoveryClassification": "cooldown"
```

**Quantity:** ~50-70 exercises | **Time:** 2-3 hours | **Risk:** Medium

---

### Task 2.3: Create Supabase Migration

**File:** NEW `atlas/supabase/migrations/004_exercise_metadata.sql`

```sql
ALTER TABLE exercises ADD COLUMN exclude_from_autoplanning BOOLEAN DEFAULT FALSE;
ALTER TABLE exercises ADD COLUMN recovery_classification TEXT;
CREATE INDEX idx_exclude_autoplanning ON exercises(exclude_from_autoplanning);
```

**Time:** 15 min | **Risk:** Medium

---

## Phase 3: Improve Scoring (2-3 Days)

### Task 3.1: Hard-Block Duplicates

**File:** `atlas/src/lib/exerciseScorer.ts`

In `scoreVariety()`, hard-block duplicates:
```typescript
if (alreadySelected.includes(exercise.id)) return -1000;  // HARD BLOCK
```

**Time:** 10 min | **Risk:** Low

---

### Task 3.2: Increase Variety Weight

**File:** `atlas/src/lib/exerciseScorer.ts`

Update `WEIGHTS`:
```typescript
variety: 3,  // ← Increase from 1
```

**Time:** 5 min | **Risk:** Very Low

---

## Phase 4: Testing & Documentation (2-3 Days)

### Task 4.1: Add Unit Tests

**File:** NEW `atlas/src/lib/__tests__/planGenerator.test.ts`

Test cases:
- ✅ No duplicate exercises in same day
- ✅ No flexibility exercises in hypertrophy plans
- ✅ No foam rolling exercises in strength plans
- ✅ Valid equipment matching

**Time:** 2-3 hours | **Risk:** Low

---

## Timeline Summary

| Phase | Tasks | Duration | Priority |
|-------|-------|----------|----------|
| 1 | Fix dupes + filter recovery | 1-2 days | 🔥 CRITICAL |
| 2 | Extend metadata | 2-3 days | ⚠️ HIGH |
| 3 | Improve scoring | 2-3 days | 📌 MEDIUM |
| 4 | Testing + docs | 2-3 days | 📝 FOLLOW-UP |

**Total:** ~1 week

---

## Success Criteria

✅ No duplicate exercises in any generated plan
✅ No flexibility/recovery exercises in hypertrophy/strength plans
✅ All tests pass
✅ User stories: "I get pure muscle-building plans"

---

## Deployment Order

1. Complete Phase 1 (critical bugs)
2. Test on staging
3. Deploy Phase 1
4. Complete Phases 2-4
5. Full testing cycle
6. Deploy to production

---

**Ready to start? Go to PHASE_1_IMPLEMENTATION_CODE.md for exact code changes.**
