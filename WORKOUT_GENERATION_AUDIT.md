# Workout Generation Algorithm Audit

## Overview

This audit analyzes the workout-planning algorithms in the Retrainer/Atlas app, focusing on the planGenerator, exerciseScorer, and related modules.

**Date:** 2026-05-28
**Auditor:** Senior Fitness Software Architect
**Scope:** Plan generation, exercise scoring, volume planning, periodization

---

## Current Architecture

### Pipeline
1. `generateEnhancedPlan()` receives Profile + TrainingBlocks + weekNumber
2. Filters exercises by equipment compatibility and injury avoidance
3. For each day's muscle group list (from `DAY_MUSCLE_MAP`):
   - Calls `scoredPick()` which calls `pickTopScored()` → `scoreExercisesForMuscle()` → `scoreExercise()`
4. Picks top N exercises by score for each muscle group
5. Calculates sets from volume landmarks
6. Assigns periodization-aware rep ranges

### Scoring Dimensions (with weights)
| Dimension | Raw Score Range | Weight | Weighted Contribution |
|-----------|----------------|--------|----------------------|
| Equipment | 0-3 | 3 | 0-9 |
| Injury | -10 to 2 | 10 | -100 to 20 |
| Preference | -5 to 2 | 3 | -15 to 6 |
| Target Muscle | 0-3 | 5 | 0-15 |
| Experience | 0-2 | 2 | 0-4 |
| Variety | 0-4 | 1 | 0-4 |

---

## Critical Issues Found

### ISSUE 1: No Movement Mechanic Diversity (CRITICAL)
**Problem:** The scorer has access to `exercise.mechanic` (push/pull/hinge/squat/rotation/carry) but does NOT reward selecting different mechanics for the same muscle group. The exercise database has 834 exercises across 6 mechanic types:
- push: 347, pull: 157, squat: 218, hinge: 87, rotation: 23, carry: 2

For a chest day needing 2 exercises, the algorithm will happily select "Barbell Bench Press" (push) and "Barbell Guillotine Bench Press" (push) — both same mechanic. A superior selection would be "Barbell Bench Press" (push) + "Dumbbell Flyes" (also push, but at least different movement).

**Impact:** Users get repetitive exercise selections with poor stimulus variation. No horizontal/vertical/incline press variation enforced.

### ISSUE 2: No Movement Plane Diversity (CRITICAL)
**Problem:** The scorer does not consider `exercise.plane` (sagittal/frontal/transverse). 612 exercises are sagittal, 222 are frontal, 0 transverse. Without plane tracking, a quad day could be all sagittal-plane exercises (squats, lunges, step-ups) missing frontal-plane work (lateral lunges, cossack squats).

**Impact:** Incomplete muscle development due to missing movement plane variety.

### ISSUE 3: Exercise Similarity Blindness (HIGH)
**Problem:** The algorithm only prevents exact duplicate `exerciseId` from being selected. It has no concept of exercise similarity. "Barbell Bench Press - Medium Grip" and "Barbell Guillotine Bench Press" are different exercises despite being nearly identical movements.

**Impact:** Users can end up with 2-3 very similar exercises for the same muscle group when a more diverse selection would be better.

### ISSUE 4: No Compound-First Prioritization (HIGH)
**Problem:** For muscle-building goals, compound exercises should be prioritized before isolations for the same muscle group. The current scoring gives the same `scoreTargetMuscle` bonus (3 for priority muscle, 1 for secondary) regardless of whether the exercise is a compound or isolation.

**Impact:** A user might get "Cable Crossover" (isolation, single-joint) before "Barbell Bench Press" (compound, multi-joint) if the cable crossover happens to score higher on equipment/preference. This subverts proper exercise order.

### ISSUE 5: Variety Weight Too Low (HIGH)
**Problem:** Variety has a weight of 1, while target muscle has weight 5 and equipment has weight 3. Even maximum variety score (4) contributes only 4 points, while a priority muscle match contributes up to 15 points. This means variety is easily overridden by other dimensions.

**Impact:** Diversity is effectively a tiebreaker at best, not a meaningful driver of exercise selection.

### ISSUE 6: PPL Repeat Days Get No Variation (MEDIUM)
**Problem:** When a user trains 6 days/week on PPL, days 4-6 are copies of days 1-3 (re-named "Push 2", "Pull 2", "Legs 2"). The algorithm generates the same exercises for both, meaning the user does the exact same workout twice a week.

**Impact:** No week-to-week or session-to-session variation within the same week for repeated day types.

### ISSUE 7: No Unilateral/Bilateral Balance (MEDIUM)
**Problem:** 56 unilateral exercises exist in the database (6.7%), but the scorer doesn't consider whether bilateral or unilateral work has been selected. Balanced programs should include unilateral work for stability and imbalance correction.

**Impact:** Users may never be recommended unilateral exercises, missing important stability and corrective benefits.

### ISSUE 8: Fixed Exercise Count Per Muscle (MEDIUM)
**Problem:** `DEFAULT_EXERCISES_PER_MUSCLE` is a flat lookup (e.g., chest: 2, triceps: 1). It doesn't scale with user preferences, total training volume, or session duration. A user with 60min sessions gets the same number of exercises as one with 30min sessions.

**Impact:** Session duration and user capacity not properly reflected in exercise quantity.

### ISSUE 9: Top-N Selection Is Greedy (LOW)
**Problem:** `pickTopScored` sorts by score descending and takes the top N. This greedy approach doesn't consider the diversity of the selected set. The 1st and 2nd best exercises might be very similar, while the 3rd best (different mechanic) is excluded.

**Impact:** Greedy selection misses opportunities for diverse but slightly lower-scored combinations.

### ISSUE 10: No Antagonist/Synergist Awareness (LOW)
**Problem:** The selection for each muscle group happens independently. If triceps is already getting work from a close-grip bench press (chest day), the triceps isolation selection doesn't account for this indirect volume.

**Impact:** Potential for excessive volume on synergist muscles that are already adequately stimulated by compound work.

---

## Recommended Improvements

### 1. Add Mechanic Tracking to Variety Scoring
- Track `Set<string>` of mechanics already selected per muscle group
- Bonus for selecting a different mechanic than already chosen
- Ensures push/pull/hinge/squat diversity within the same muscle group

### 2. Add Plane Tracking to Variety Scoring  
- Track `Set<string>` of planes selected per muscle group
- Bonus for selecting exercises in different planes
- Ensures sagittal + frontal mix where applicable

### 3. Add Movement Similarity Detection
- Create similarity clusters based on (mechanic + plane + equipment_type)
- Penalize selecting exercises from the same cluster as already-selected ones
- Configurable penalty strength

### 4. Add Compound Priority Scoring
- For hypertrophy/strength goals: score compound exercises 2x for the primary pick
- For isolation fills: prefer compounds first, then isolations

### 5. Increase Variety Weight
- Change variety weight from 1 to 2 or 3
- This gives variety meaningful influence without overwhelming critical safety dimensions

### 6. Improve Week Repeat Variation
- For PPL/Upper-Lower repeats, generate slightly different exercise selections
- Use week parity (even/odd) as a seed for selection variation
- Rotate between 2-3 exercise variants per muscle group

### 7. Add Unilateral Awareness
- Track bilateral/unilateral selection ratio
- Bonus for selecting unilateral after a bilateral exercise for the same muscle group

### 8. Dynamic Exercise Count from Session Duration
- Scale exercise count based on profile.durationMin
- More time = more exercises, less time = fewer but more focused

### 9. Implement Beam Search for Exercise Selection
- Instead of greedy top-N, consider top-K candidates and evaluate combinations
- Score combinations on total diversity + individual score
- Select the combination with best aggregate score

### 10. Synergist Volume Awareness
- Track compound work that hits secondary muscles
- Reduce isolation volume for muscles that are already getting indirect work
- Use muscleActivation data if available

---

## Implementation Priority

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | Mechanic diversity | Small | High |
| P0 | Plane diversity | Small | High |
| P0 | Variety weight increase | Trivial | Medium |
| P1 | Compound priority | Small | High |
| P1 | Movement similarity | Medium | High |
| P2 | PPL repeat variation | Medium | Medium |
| P2 | Unilateral balance | Small | Low-Medium |
| P3 | Dynamic exercise count | Medium | Medium |
| P3 | Beam search selection | Large | Medium |
| P4 | Synergist awareness | Large | Low |

---

## Test Cases for Verification

1. **Push Day**: Should select 1 horizontal press + 1 incline/decline variation + 1 fly variation (different mechanics/planes)
2. **Quad Day**: Should select 1 squat pattern + 1 lunge pattern + 1 extension (different mechanics)
3. **PPL 6-day**: Week 1 Push should differ from Week 1 Push 2
4. **Equipment constraint**: User with only dumbbells should get dumbbell-appropriate alternatives
5. **High/low duration**: 30min session vs 60min session should produce different exercise counts