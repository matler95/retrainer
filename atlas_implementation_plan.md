# Atlas Smart Personal Trainer — Comprehensive Repository Analysis & Implementation Plan

**Date**: 2026-05-27  
**Repository**: retrainer/atlas  
**Branch**: main (commit 1b5438e)

---

# 1. Repository Architecture Summary

## 1.1 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | TanStack Start | v1.167.50 |
| Router | TanStack Router | v1.168.25 |
| UI Library | React | 19.2.0 |
| State Management | Zustand | 5.0.13 |
| Styling | Tailwind CSS v4 | 4.2.1 |
| Component Library | Radix UI (shadcn/ui) | Latest |
| Backend | Supabase | 2.106.2 |
| Charts | Recharts | 2.15.4 |
| Forms | React Hook Form + Zod | 7.71.2 / 3.24.2 |
| Build | Vite 7 + Nitro | 7.3.1 |
| Deployment | Vercel (via TanStack Start) | — |
| Package Manager | Bun (primary), npm (lockfile present) | — |

## 1.2 Directory Structure

```
atlas/
├── public/
│   ├── manifest.json          # PWA manifest (basic)
│   └── sw.js                  # Service worker (minimal)
├── src/
│   ├── components/
│   │   ├── AppShell.tsx        # Layout primitives (AppShell, Card, StatCard, SectionTitle)
│   │   ├── BottomNav.tsx       # 5-tab bottom navigation
│   │   └── ui/                 # 50+ shadcn/ui components (full library)
│   ├── data/
│   │   └── exercises.ts        # Exercise database (~30 exercises)
│   ├── hooks/
│   │   ├── use-mobile.tsx      # Responsive hook
│   │   ├── useAuth.ts          # Supabase auth + sync wrapper
│   │   ├── useProgressionHint.ts  # Progression decisions per exercise
│   │   └── useReadiness.ts     # ACWR + readiness score hook
│   ├── lib/
│   │   ├── achievements.ts     # 15 deterministic achievements
│   │   ├── api/
│   │   │   └── example.functions.ts  # TanStack Start server function example
│   │   ├── bodyTrends.ts       # EMA body weight trend analysis
│   │   ├── calc.ts             # Mifflin-St Jeor BMR, calorie/protein/water targets
│   │   ├── config.server.ts    # Server-only config
│   │   ├── error-capture.ts    # Error capture utility
│   │   ├── error-page.ts       # Error page component
│   │   ├── exerciseScorer.ts   # Multi-factor exercise scoring
│   │   ├── fatigueModel.ts     # ACWR, readiness, CNS demand, deload detection
│   │   ├── loadCalculator.ts   # 1RM estimation, e1RM trends, working weights
│   │   ├── notifications.ts    # Web Notification API helpers
│   │   ├── periodization.ts    # Linear/undulating/block periodization
│   │   ├── progressionEngine.ts # Progression decision tree
│   │   ├── supabase.ts         # Supabase client + auth + sync helpers
│   │   ├── trainer.ts          # Simple progression hints, coach messages
│   │   ├── utils.ts            # cn() utility (clsx + tailwind-merge)
│   │   └── volumeLandmarks.ts  # MEV/MAV/MRV tracking per muscle group
│   ├── routes/
│   │   ├── __root.tsx          # Root layout, PWA registration, theme
│   │   ├── index.tsx           # Dashboard (today, readiness, hydration, supplements)
│   │   ├── library.tsx         # Exercise library search/filter
│   │   ├── library.$exerciseId.tsx  # Exercise detail page
│   │   ├── onboarding.tsx      # 10-step profile onboarding wizard
│   │   ├── plan.tsx            # Plan overview with day cards
│   │   ├── plan.day.$dayId.tsx # Edit individual plan day
│   │   ├── profile.tsx         # Profile, auth, preferences, reset
│   │   ├── progress.tsx        # Body/strength/volume/streak tabs
│   │   └── workout.$dayId.tsx  # Active workout session (set logging, rest timer)
│   ├── router.tsx              # TanStack Router setup
│   ├── routeTree.gen.ts        # Auto-generated route tree
│   ├── server.ts               # Server entry point
│   ├── start.ts                # App entry point
│   └── styles.css              # Global styles + Tailwind
├── package.json
├── tsconfig.json
├── vite.config.ts              # Minimal — uses lovable.dev/vite-tanstack-config
├── components.json             # shadcn/ui config
├── eslint.config.js
├── .prettierrc / .prettierignore
└── bunfig.toml / bun.lock
```

## 1.3 Architecture Observations

1. **Clean algorithmic layer**: All fitness logic lives in `src/lib/` as pure, deterministic functions with no React dependencies. This is excellent and should be preserved.

2. **Single monolithic store**: All application state lives in one Zustand store (`useAppStore.ts`, 561 lines). This includes domain models, plan generation logic, and seed data generation — a scalability bottleneck.

3. **Offline-first by design**: Supabase is optional. The app uses Zustand `persist` middleware (localStorage) as the primary data layer. Supabase is a best-effort cloud sync layer.

4. **shadcn/ui component library**: Full 50+ component library installed. Provides excellent primitives for building new features.

5. **No Supabase schema/migrations**: The `supabase/` directory does not exist. All Supabase interaction uses a single `user_data` JSONB table.

6. **No tests**: Zero test files exist in the repository.

7. **Dual plan generation**: Both `generatePlan()` (naive) and `generateEnhancedPlan()` (scored) exist in the store. The enhanced version is used by `setProfile`, but the naive version remains as dead code.

8. **Mock data in production code**: The progress page uses `Math.random()` for volume and strength data. The dashboard shows random PR values.

---

# 2. Existing Systems Audit

## 2.1 Domain Models (in `src/store/useAppStore.ts`)

### Profile
```typescript
interface Profile {
  age: number;
  gender: Gender;           // "male" | "female" | "other"
  heightCm: number;
  weightKg: number;
  goal: Goal;               // 5 options
  experience: Experience;    // 3 levels
  equipment: Equipment[];    // 7 options
  daysPerWeek: number;
  durationMin: number;
  style: Style;              // 5 options
  priorities: MuscleGroup[];
  avoid: string[];
  injuries: string;
  activity: Activity;        // 4 levels
  supplements: string[];
  waterAuto: boolean;
  waterTargetMl: number;
}
```

**Spec gaps**: Missing `MovementAssessment`, `TrainingHistory`, `RecoveryProfile`.

### PlannedExercise / PlanDay
```typescript
interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: string;          // "8-12" format
  restSec: number;
  lastWeight?: number;   // updated after sessions
}

interface PlanDay {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}
```

### Session / SetLog / SessionExerciseLog
```typescript
interface SetLog {
  reps: number;
  weight: number;
  rpe?: number;
  done: boolean;
}

interface SessionExerciseLog {
  exerciseId: string;
  sets: SetLog[];
  notes?: string;
}

interface Session {
  id: string;
  dayId: string;
  date: string;           // ISO
  exercises: SessionExerciseLog[];
  durationMin?: number;
}
```

**Spec gaps**: Missing `rpeOverall`, `startedAt`, `finishedAt` proper tracking, session tags.

### BodyWeightLog / WaterLog / SupplementLog
```typescript
interface BodyWeightLog { date: string; kg: number }
interface WaterLog { date: string; ml: number }
interface SupplementLog { date: string; name: string; taken: boolean }
```

**Spec gaps**: Missing `BodyMetrics` (body fat %, measurements, photos), `WeeklyCheckin`, `ExercisePR`.

### Exercise (in `src/data/exercises.ts`)
```typescript
interface Exercise {
  id: string;
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  instructions: string[];
  tips: string[];
  mistakes: string[];
  defaultSets: number;
  defaultReps: string;
  restSec: number;
  progression: string;
}
```

**Spec gaps**: Missing `videoUrl`, `cues`, `muscleActivation`, `category`, `unilateral`, `mechanic`, `plane`, `forceType`, `substituteIds`.

## 2.2 Algorithm Systems

| System | File | Status | Notes |
|--------|------|--------|-------|
| 1RM Estimation | loadCalculator.ts | ✅ Complete | Epley, Brzycki, average — well-documented |
| e1RM Trend Analysis | loadCalculator.ts | ✅ Complete | Rate/week, plateau detection, trend classification |
| ACWR | fatigueModel.ts | ✅ Complete | 7-day acute / 28-day chronic ratio |
| Readiness Score | fatigueModel.ts | ✅ Complete | 0-100 composite (ACWR + RPE + base) |
| CNS Demand | fatigueModel.ts | ✅ Complete | Per-exercise CNS weighting |
| Deload Detection | fatigueModel.ts | ✅ Complete | 4 trigger conditions |
| Periodization | periodization.ts | ✅ Complete | Linear, undulating, block — all three types |
| Exercise Scoring | exerciseScorer.ts | ✅ Complete | 6-factor scoring (equipment, injury, preference, target, experience, variety) |
| Volume Landmarks | volumeLandmarks.ts | ✅ Complete | MEV/MAV/MRV per muscle group |
| Progression Engine | progressionEngine.ts | ✅ Complete | 8-node decision tree with e1RM trend integration |
| Body Trends | bodyTrends.ts | ✅ Complete | EMA smoothing, trend detection, calorie suggestions |
| Achievements | achievements.ts | ⚠️ Partial | 15 achievements, no strength-specific or volume-specific PRs |
| BMR/Calories | calc.ts | ⚠️ Partial | Mifflin-St Jeor, goal calories, protein/water — no macros breakdown |
| Trainer | trainer.ts | ⚠️ Minimal | Simple progression hint + random coach messages |

## 2.3 Supabase Integration

**Current state**: Supabase client configured but minimal.

- Client creation with graceful null when env vars missing
- Auth helpers: `getCurrentUser`, `signIn`, `signUp`, `signOut`
- Sync: `syncToSupabase` (push entire state), `loadFromSupabase` (pull entire state)
- Single `user_data` JSONB table for all data
- Generic `upsertRow` and `fetchRows` helpers
- No RLS policies, no migrations, no per-table schema

**Spec target**: Separate tables for `profiles`, `plans`, `sessions`, `body_metrics`, `exercise_prs`, `water_logs` with RLS.

## 2.4 Routes

| Route | File | Description |
|-------|------|-------------|
| `/` | index.tsx | Dashboard: today's workout, stats, body weight chart, readiness, hydration, supplements, mock PRs |
| `/onboarding` | onboarding.tsx | 10-step wizard: goal, experience, body, equipment, schedule, style, priorities, lifestyle, hydration, review |
| `/plan` | plan.tsx | Plan overview: day cards with edit/start buttons |
| `/plan/day/$dayId` | plan.day.$dayId.tsx | Edit plan day: swap/remove/add exercises, adjust sets/reps/rest |
| `/workout/$dayId` | workout.$dayId.tsx | Active session: set logging, rest timer, exercise navigation, progression hint |
| `/library` | library.tsx | Exercise library: search + muscle group filter |
| `/library/$exerciseId` | library.$exerciseId.tsx | Exercise detail: instructions, tips, mistakes, programming |
| `/progress` | progress.tsx | Progress tabs: body weight, strength (mock), volume (mock), consistency heatmap (mock) |
| `/profile` | profile.tsx | Profile: auth, plan editing, preferences (theme/units/reminders), data reset |

---

# 3. Domain Model Analysis

## 3.1 Current vs. Required Entities

| Entity | Current Status | Spec Requirement | Action |
|--------|---------------|------------------|--------|
| Profile | ✅ Exists (13 fields) | Add: movementAssessment, trainingHistory, recoveryProfile | **Extend** |
| Exercise | ✅ Exists (13 fields) | Add: videoUrl, cues, muscleActivation, category, unilateral, mechanic, plane, forceType, substituteIds | **Extend** |
| PlanDay | ✅ Exists | Add: version tracking, weekNumber association | **Extend** |
| PlannedExercise | ✅ Exists | Add: progressionWeight history | **Extend** |
| Session | ✅ Exists | Add: startedAt, finishedAt (proper), rpeOverall, tags | **Extend** |
| SetLog | ✅ Exists | No changes needed | **Keep** |
| BodyWeightLog | ✅ Exists | Merge into BodyMetrics | **Migrate** |
| WaterLog | ✅ Exists | No changes needed | **Keep** |
| BodyMetrics | ❌ Missing | weight, bodyFatPct, measurements, photos, notes | **Create** |
| ExercisePR | ❌ Missing | per-rep PR tracking (1RM, 3RM, 5RM, etc.) | **Create** |
| WeeklyCheckin | ❌ Missing | weekNumber, weight, energy, sleep, soreness, mood, notes | **Create** |
| ReadinessState | ✅ Exists (computed) | Add: historical tracking (7-day chart) | **Extend** |
| PlanScore | ❌ Missing | overall, equipmentCoverage, volumeBalance, recoveryFit, goalAlignment | **Create** |
| SetFeedback | ❌ Missing | quality, cue, nextSetSuggestion, restSuggestion | **Create** |
| SessionSummary | ❌ Missing | duration, totalVolume, prs, avgRpe, progressionDecisions | **Create** |
| NutritionTargets | ❌ Missing | calories, protein, carbs, fat, water, fiberMin | **Create** |
| StreakData | ⚠️ Partial | Extend with consistencyScore, streakAtRisk, missedSessions | **Extend** |
| WeeklyReport | ❌ Missing | volume, sessions, prs, muscleVolumeStatus, insights | **Create** |
| StrengthStandard | ❌ Missing | Population percentile data per exercise/gender/weight | **Create** |
| PlateauBreakPlan | ❌ Missing | strategy, duration, modifications, substitute | **Create** |
| ProgressionPrediction | ❌ Missing | multi-signal readiness prediction | **Create** |
| TrainingHistory | ❌ Missing | yearsTraining, previousPrograms, peakLifts | **Create** |
| MovementAssessment | ❌ Missing | Self-reported mobility screens | **Create** |
| RecoveryProfile | ❌ Missing | sleepHours, stressLevel, jobActivity, cardioFrequency | **Create** |

## 3.2 Schema Conflicts

1. **Type duplication**: `Goal`, `Experience` are defined in both `useAppStore.ts` and `periodization.ts`. These must be unified.

2. **Exercise interface**: The current `Exercise` interface lacks the fields needed for the substitution system (`substituteIds`), muscle activation maps, and movement classification. Adding these is additive (no breaking changes).

3. **BodyWeightLog → BodyMetrics migration**: `BodyWeightLog` will be a subset of `BodyMetrics`. Need a migration path that preserves existing data.

4. **Session → enhanced Session**: Adding `startedAt`, `finishedAt`, `rpeOverall`, `tags` is additive. Existing sessions will have null values for new fields.

## 3.3 Migration Risks

- **Low risk**: Adding new fields to existing interfaces (Profile, Exercise, Session)
- **Medium risk**: Migrating `BodyWeightLog[]` to `BodyMetrics[]` — must preserve existing data
- **Medium risk**: Supabase schema creation — the current single-table approach must evolve to per-table with RLS
- **High risk**: Store structure changes — if the store is split, all routes/hooks must be updated

---

# 4. State Management & Sync Analysis

## 4.1 Current Architecture

```
[Component] → useAppStore(selector) → [Zustand Store] → persist → localStorage
                                           |
                                           ↓ (best-effort)
                                    [Supabase Client] → user_data table (JSONB)
```

**Source of truth**: Zustand store persisted to localStorage.  
**Sync model**: Manual push/pull via `useAuth().syncNow()`.  
**Conflict resolution**: None — last write wins (entire state overwrite).  
**Offline support**: Full — localStorage is always available.

## 4.2 Weaknesses

1. **No sync queue**: Mutations made offline are not queued for later sync. The only sync trigger is manual button press.

2. **No conflict resolution**: `syncToSupabase` overwrites the entire `user_data` row. Multiple devices would lose data.

3. **No optimistic updates**: No Supabase real-time subscriptions or optimistic mutation patterns.

4. **Monolithic sync payload**: Syncing the entire app state (all sessions, body weight, plan, profile) in a single upsert is inefficient and error-prone at scale.

5. **No E1RM record persistence**: E1RM records are computed on-the-fly from sessions. There's no persistent E1RM history store — the `E1RMRecord` interface exists in `loadCalculator.ts` but records are never persisted.

6. **No session duration tracking**: `Session.durationMin` exists but is never populated. The workout screen doesn't track start/end times.

7. **Seed data pollution**: The `seed()` function generates random body weight data when no data exists. This runs on first profile set, mixing real and synthetic data.

## 4.3 Recommended Evolution

1. **Add sync queue** (Phase 1): Queue mutations when offline, flush when online. Store queue in Zustand persist.

2. **Per-table Supabase schema** (Phase 1): Replace single `user_data` table with dedicated tables (`profiles`, `plans`, `sessions`, `body_metrics`, `exercise_prs`, `water_logs`).

3. **Idempotent upserts** (Phase 1): Use UUIDs and `upsert` with conflict resolution instead of full-state overwrite.

4. **Split store into slices** (Phase 2+): Consider Zustand slice pattern for larger features (body metrics, achievements). Only if the store exceeds ~800 lines.

5. **Persist E1RM records** (Phase 5): Add `e1rmRecords` to store and persist them.

---

# 5. Algorithm Architecture Assessment

## 5.1 Existing Strengths

The algorithmic layer is the **strongest part of the codebase**. Key design principles are already followed:

- **Pure functions**: All `src/lib/` functions are deterministic with no side effects
- **Well-documented**: JSDoc comments explain rationale, formulas, and sources
- **Clear separation**: No React dependencies in algorithm code
- **Transparent thresholds**: Constants are named and documented (e.g., `INCREASE_RPE_MAX: 7.5`)
- **Decision tree clarity**: `progressionEngine.ts` documents its 8-node decision tree explicitly

## 5.2 Algorithm Inventory

| Algorithm | Location | Quality | Reusability |
|-----------|----------|---------|-------------|
| Epley 1RM | loadCalculator.ts | ⭐⭐⭐⭐⭐ | High — already reused |
| Brzycki 1RM | loadCalculator.ts | ⭐⭐⭐⭐⭐ | High |
| e1RM Trend | loadCalculator.ts | ⭐⭐⭐⭐ | High |
| ACWR | fatigueModel.ts | ⭐⭐⭐⭐ | High |
| Readiness Score | fatigueModel.ts | ⭐⭐⭐⭐ | Medium — could include sleep/stress |
| CNS Demand | fatigueModel.ts | ⭐⭐⭐ | Medium — hardcoded per exercise |
| Deload Detection | fatigueModel.ts | ⭐⭐⭐⭐ | High |
| Periodization | periodization.ts | ⭐⭐⭐⭐⭐ | High — 3 strategies |
| Exercise Scoring | exerciseScorer.ts | ⭐⭐⭐⭐ | High |
| Volume Landmarks | volumeLandmarks.ts | ⭐⭐⭐⭐ | High |
| Progression Engine | progressionEngine.ts | ⭐⭐⭐⭐ | High |
| Body Trends (EMA) | bodyTrends.ts | ⭐⭐⭐⭐ | High |
| Mifflin-St Jeor | calc.ts | ⭐⭐⭐⭐⭐ | High |

## 5.3 What's Missing

1. **Starting weight estimator**: Only `suggestStartingWeight()` exists with basic bodyweight ratios. The spec calls for experience-level strength standards and history-based estimation.

2. **Set feedback system**: Only `progressionHint()` in `trainer.ts` exists — a simple 3-branch function. The spec calls for real-time set quality analysis with adaptive rest suggestions.

3. **Per-rep PR database**: No PR tracking exists. The spec calls for tracking 1RM, 3RM, 5RM, 10RM per exercise.

4. **Plateau breaker protocol**: Only basic plateau detection in `loadCalculator.ts`. The spec calls for a strategy rotation system (deload, variation, rep scheme change, technique focus, frequency bump, back-off sets).

5. **Multi-signal progression predictor**: The current engine uses session-level analysis. The spec calls for a pre-workout predictor using e1RM trend, RPE trend, rep quality, consistency, and recovery.

6. **Plan scorer**: No plan quality scoring exists.

7. **Session summary**: No post-workout summary computation exists.

8. **Nutrition engine**: Only basic calorie/protein targets in `calc.ts`. No macro breakdown (carbs/fat), no training-day vs rest-day differentiation.

9. **Body composition estimator**: Not implemented (Navy method, lean mass calculation).

10. **Strength standards**: No population percentile data.

11. **Weekly report generation**: Not implemented.

12. **Plan evolution**: No automatic week-to-week plan updates.

13. **Deload scheduling**: Detection exists but no scheduling logic.

14. **Cardio fatigue model**: Not implemented.

## 5.4 Refactoring Recommendations

1. **Remove duplicate plan generation**: Delete `generatePlan()` from `useAppStore.ts`. Keep only `generateEnhancedPlan()`. Move it to `src/lib/planGenerator.ts`.

2. **Extract plan generation from store**: The `generateEnhancedPlan()` function (140+ lines) should live in `src/lib/`, not inside the store. The store should call it.

3. **Unify type definitions**: Create `src/lib/types.ts` or `src/data/types.ts` for shared domain types (Goal, Experience, Gender, Style, Activity). Currently duplicated in `useAppStore.ts` and `periodization.ts`.

4. **Create `src/lib/` entry points**: Group related algorithms:
   - `src/lib/progression/` — progressionEngine, progressionPredictor, plateauBreaker
   - `src/lib/fatigue/` — fatigueModel, readiness
   - `src/lib/plan/` — planGenerator, planScorer, planEvolution
   - `src/lib/body/` — bodyComposition, bodyTrends, nutrition

---

# 6. UI Architecture Assessment

## 6.1 Component Organization

- **Layout primitives**: `AppShell.tsx` provides `AppShell`, `AppHeader`, `StatCard`, `SectionTitle`, `Card` — clean, reusable
- **Navigation**: `BottomNav.tsx` — 5-tab bottom nav, hidden during onboarding/workout
- **UI library**: Full shadcn/ui installation (50+ components) — excellent foundation
- **No feature-specific components**: All page logic is inline within route files

## 6.2 Design System

- **Fonts**: Inter (body) + Space Grotesk (display/headings) — loaded via Google Fonts
- **Color**: CSS custom properties via Tailwind v4 (`--color-primary`, `--color-muted`, etc.)
- **Dark mode**: Toggled via class on `<html>` element
- **Spacing**: Consistent use of Tailwind utilities
- **Border radius**: `rounded-2xl` / `rounded-full` pattern throughout

## 6.3 Strengths

1. Consistent use of `Card`, `SectionTitle`, `StatCard` primitives
2. Full shadcn/ui component library available
3. Mobile-first responsive design (min-h-dvh, safe-pt/safe-pb, viewport-fit=cover)
4. Clean font pairing (Inter + Space Grotesk)
5. Good use of Lucide icons throughout

## 6.4 Weaknesses

1. **No feature components**: All UI is inline in route files. The workout screen alone is 435 lines. This makes reuse and testing difficult.

2. **No loading states**: No skeleton loaders anywhere. The app has no loading indicators for async operations.

3. **No error boundaries**: Only the root route has an error boundary. Individual routes/pages have no error handling.

4. **No virtualization**: The exercise library renders all items. At 30 exercises this is fine; at 150+ it will need virtualization.

5. **Mock data in UI**: The progress page (`progress.tsx`) uses `Math.random()` for volume and strength data. The dashboard shows random PR values.

6. **No animation system**: No transitions beyond basic CSS transitions. The spec mentions flame animations for streaks, celebration screens, etc.

7. **Accessibility gaps**: No ARIA labels on interactive elements, no focus management in modals/sheets.

## 6.5 Component Reuse Opportunities

| Component | Current Location | Should Be |
|-----------|-----------------|-----------|
| Exercise card | Inline in library.tsx | `src/components/ExerciseCard.tsx` |
| Set logger | Inline in workout.$dayId.tsx | `src/components/SetLogger.tsx` |
| Rest timer | Inline in workout.$dayId.tsx | `src/components/RestTimer.tsx` |
| Weight input with +/- | Inline in workout.$dayId.tsx | `src/components/WeightInput.tsx` |
| Progress chart | Inline in progress.tsx | `src/components/ProgressChart.tsx` |
| Readiness card | Inline in index.tsx | `src/components/ReadinessCard.tsx` |
| Auth form | Inline in profile.tsx | `src/components/AuthForm.tsx` |
| Chip selector | Inline in onboarding.tsx | `src/components/ChipSelector.tsx` |

---

# 7. Technical Debt & Risk Matrix

## 7.1 Risk Matrix

| Issue | Severity | Likelihood | Impact | Priority |
|-------|----------|-----------|--------|----------|
| Monolithic store (561 lines) | High | Certain | Scaling bottleneck | 🔴 High |
| Duplicate plan generation code | Medium | Certain | Confusion, bugs | 🟠 Medium |
| No Supabase schema/migrations | High | Certain | Cannot deploy with auth | 🔴 High |
| Mock/random data in production | Medium | Certain | Misleading users | 🟠 Medium |
| No tests | High | Certain | Regression risk | 🔴 High |
| Exercise DB too small (30 vs 150) | Medium | Certain | Poor exercise variety | 🟠 Medium |
| No E1RM record persistence | Medium | Certain | Progression data loss | 🟠 Medium |
| No sync queue | Medium | Certain | Data loss on offline→online | 🟠 Medium |
| Type duplication | Low | Certain | Maintenance confusion | 🟡 Low |
| Seed data pollution | Low | Certain | Synthetic data mixed with real | 🟡 Low |
| No virtualization | Low | Future (150+ exercises) | Performance at scale | 🟡 Low |
| No bundle optimization | Low | Future | Bundle size growth | 🟡 Low |

## 7.2 Detailed Risk Analysis

### 7.2.1 Monolithic Store (CRITICAL)

The store at 561 lines contains:
- 10 type definitions
- 2 plan generation functions (~300 lines combined)
- 1 seed data function
- 20+ state properties
- 15+ actions

**Risk**: As new features add state (body metrics, PR database, weekly check-ins, streak data, achievements), this file will exceed 1000+ lines, becoming unmaintainable.

**Mitigation**: Extract plan generation to `src/lib/planGenerator.ts`. Consider Zustand slice pattern for new feature domains.

### 7.2.2 No Supabase Schema (CRITICAL)

The current Supabase integration uses a single `user_data` JSONB table. The spec requires 6+ normalized tables with RLS.

**Risk**: Cannot implement proper cloud sync, multi-device support, or data security without a proper schema.

**Mitigation**: Phase 1 priority — create migration files, implement RLS, migrate from single-table to per-table sync.

### 7.2.3 Mock Data (HIGH)

- `progress.tsx` lines 85-86: `Math.random()` for strength data
- `progress.tsx` lines 25-27: `Math.random()` for volume data
- `progress.tsx` lines 126-128: `Math.random()` for consistency heatmap
- `index.tsx` lines 203-208: `Math.random()` for PR display

**Risk**: Users see fabricated data, undermining trust.

**Mitigation**: Replace with real computed data from session history. This is addressed in Phase 6 (Analytics).

---

# 8. Recommended Architectural Changes

## 8.1 Changes Requiring Immediate Action

### A. Extract Plan Generation from Store

**Why**: The store contains ~300 lines of plan generation logic that has no business being there.

**Where**: Move `generatePlan()` and `generateEnhancedPlan()` to `src/lib/planGenerator.ts`.

**Impact**: Reduces store from 561 to ~260 lines. No behavioral change.

### B. Create Shared Type Module

**Why**: `Goal`, `Experience` types are duplicated between `useAppStore.ts` and `periodization.ts`.

**Where**: Create `src/data/types.ts` with all domain types. Re-export from both locations.

**Impact**: Single source of truth for types. No behavioral change.

### C. Remove Dead Code

**Why**: `generatePlan()` (the naive version) is exported as `generatePlanFromProfile` but never called. It's dead code.

**Where**: Remove from `useAppStore.ts`. Keep only `generateEnhancedPlan()`.

**Impact**: Reduces confusion, removes ~100 lines.

### D. Remove Seed Data Function

**Why**: The `seed()` function generates random body weight data on first profile set. This mixes synthetic and real data.

**Where**: Remove `seed()` from `useAppStore.ts`. Let users build their own history.

**Impact**: Clean data from day one.

## 8.2 Changes for Phase 1

### E. Create Supabase Schema

**Why**: The spec requires per-table Supabase with RLS for security and efficient syncing.

**Where**: `supabase/migrations/001_initial_schema.sql` through `004_weekly_checkins.sql`.

**Impact**: New database layer. Existing sync code in `supabase.ts` must be updated.

### F. Implement Sync Queue

**Why**: Offline mutations must be queued and flushed when online.

**Where**: `src/lib/syncQueue.ts` + integration into `useAppStore.ts` persist middleware.

**Impact**: New persistence layer alongside localStorage. No breaking changes.

### G. Expand Exercise Database

**Why**: 30 exercises is insufficient for a personal trainer app.

**Where**: Expand `src/data/exercises.ts` to 150+ entries with new fields.

**Impact**: File size increase (~2000+ lines). May need to split into multiple files.

## 8.3 Changes Requiring Careful Planning

### H. Store Splitting Strategy

If the store grows beyond 800 lines after adding new features, consider the Zustand slice pattern:

```
src/store/
  useAppStore.ts        # Core state (profile, plan, sessions)
  useBodyStore.ts       # Body metrics, measurements, photos
  useAchievementStore.ts # Achievements, streaks, challenges
```

**When**: Only if the store exceeds 800 lines. Do not prematurely split.

**Risk**: Multiple stores mean multiple persist configurations and potential sync ordering issues.

### I. Route-Level Code Splitting

TanStack Router already code-splits routes. Heavy algorithm imports within routes should be lazy-loaded:

```typescript
// Instead of:
import { predictProgression } from "@/lib/progressionPredictor";

// Use:
const { predictProgression } = await import("@/lib/progressionPredictor");
```

**When**: Phase 9 (Performance) — only if bundle size exceeds 250kb.

---

# 9. Phase-by-Phase Implementation Plan

## Phase 1 — Foundation & Data Model

### A. Objectives
- Create Supabase schema with RLS
- Expand exercise database to 150+ exercises with new fields
- Implement offline-first sync queue
- Harden PWA manifest

### B. Existing Systems Affected
- `src/data/exercises.ts` — expand Exercise interface and add exercises
- `src/lib/supabase.ts` — rewrite sync to use per-table approach
- `src/store/useAppStore.ts` — add sync queue integration
- `public/manifest.json` — add share_target, launch_handler, display_override

### C. New Files Required
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `src/lib/syncQueue.ts`
- `src/data/exercises-extended.ts` (or expand existing file)

### D. Existing Files Requiring Modification
- `src/data/exercises.ts` — add new Exercise fields
- `src/lib/supabase.ts` — per-table sync functions
- `src/store/useAppStore.ts` — integrate sync queue, remove seed()
- `public/manifest.json` — PWA hardening
- `public/sw.js` — caching strategy

### E. Schema Changes
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  age INT, gender TEXT, height_cm FLOAT, weight_kg FLOAT,
  goal TEXT, experience TEXT, style TEXT, activity TEXT,
  equipment TEXT[], priorities TEXT[], avoid TEXT[],
  injuries TEXT, days_per_week INT, duration_min INT,
  supplements TEXT[], water_auto BOOL, water_target_ml INT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  days JSONB NOT NULL,
  week_number INT DEFAULT 0,
  blocks JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOL DEFAULT true
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  plan_id UUID REFERENCES plans,
  day_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_min INT,
  exercises JSONB NOT NULL,
  notes TEXT,
  rpe_overall FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg FLOAT,
  body_fat_pct FLOAT,
  notes TEXT,
  UNIQUE(user_id, date)
);

CREATE TABLE exercise_prs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  weight_kg FLOAT NOT NULL,
  reps INT NOT NULL,
  estimated_1rm FLOAT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL,
  session_id UUID REFERENCES sessions
);

CREATE TABLE water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  date DATE NOT NULL,
  ml INT NOT NULL,
  UNIQUE(user_id, date)
);
```

### F. Dependency Changes
- None expected for Phase 1

### G. State Management Impact
- Add `syncQueue` to store state
- Add `lastSyncedAt` timestamp
- Modify `saveSession`, `addWeight`, `addWater` to enqueue sync items

### H. Migration Risks
- Existing localStorage data must be preserved during Supabase migration
- Exercise ID changes would break existing sessions — must preserve IDs

### I. Performance Considerations
- Exercise database at 150+ exercises: ~50-80kb JSON. Lazy-load if not needed immediately.
- Sync queue must be debounced to avoid excessive Supabase calls

### J. Testing Requirements
- Sync queue: test enqueue, flush, retry, conflict resolution
- Exercise database: validate all IDs, ensure no duplicates
- Supabase schema: test RLS policies

### K. Rollback Considerations
- Supabase schema is additive — no existing data affected
- Sync queue is optional — app works without it
- Exercise expansion is additive — no IDs removed

### L. Estimated Complexity: **HIGH**

### M. Recommended Implementation Order
1. Extract plan generation from store (cleanup)
2. Create shared type module (cleanup)
3. Supabase schema + RLS
4. Expand Exercise interface
5. Expand exercise database to 150+
6. Sync queue implementation
7. PWA hardening

---

## Phase 2 — Smart Onboarding & Plan Generation

### A. Objectives
- Add movement assessment, training history, recovery profile to onboarding
- Implement starting weight estimation from strength standards
- Add plan quality scoring
- Display plan score in plan summary

### B. Existing Systems Affected
- `src/routes/onboarding.tsx` — add 3 new steps
- `src/store/useAppStore.ts` — extend Profile type
- `src/lib/planGenerator.ts` (new) — use enhanced plan generation with starting weights

### C. New Files Required
- `src/lib/startingWeightEstimator.ts`
- `src/lib/planScorer.ts`
- `src/data/strengthStandards.ts`

### D. Existing Files Requiring Modification
- `src/routes/onboarding.tsx` — add movement assessment, training history, recovery profile steps
- `src/store/useAppStore.ts` — extend Profile interface
- `src/routes/plan.tsx` — display plan score badge

### E. Schema Changes
- `profiles` table: add `movement_assessment JSONB`, `training_history JSONB`, `recovery_profile JSONB`

### F. Dependency Changes
- None

### G. State Management Impact
- Profile type extended with 3 new optional fields
- Plan generation now uses starting weight estimator

### H. Migration Risks
- Existing profiles will have null new fields — must handle gracefully
- Plan regeneration may change exercises if new data influences scoring

### I. Performance Considerations
- Starting weight estimation is O(1) per exercise — negligible
- Plan scoring is O(n) where n = exercises in plan — negligible

### J. Testing Requirements
- Starting weight estimator: test with various experience levels and peak lifts
- Plan scorer: test with various profiles

### K. Rollback Considerations
- All new Profile fields are optional — backward compatible
- Plan score is display-only — no behavioral change

### L. Estimated Complexity: **MEDIUM**

### M. Recommended Implementation Order
1. Extend Profile type with new interfaces
2. Implement starting weight estimator
3. Implement plan scorer
4. Add onboarding steps
5. Update plan generation to use starting weights
6. Display plan score on plan page

---

## Phase 3 — Intelligent Workout Session

### A. Objectives
- Real-time set feedback after each set
- Adaptive rest timer (RPE-aware)
- Session completion summary screen
- Session tags/journal

### B. Existing Systems Affected
- `src/routes/workout.$dayId.tsx` — major enhancement
- `src/store/useAppStore.ts` — Session type extension

### C. New Files Required
- `src/lib/setFeedback.ts`
- `src/lib/sessionSummary.ts`
- `src/components/RestTimer.tsx`
- `src/components/SetLogger.tsx`
- `src/components/SessionSummaryScreen.tsx`

### D. Existing Files Requiring Modification
- `src/routes/workout.$dayId.tsx` — integrate set feedback, adaptive rest, summary screen
- `src/store/useAppStore.ts` — add session tags, proper duration tracking

### E. Schema Changes
- `sessions` table: add `tags TEXT[]`, ensure `started_at`/`finished_at` populated

### F. Dependency Changes
- None

### G. State Management Impact
- Session type extended with tags, proper timing
- New computed state for set feedback and session summary

### H. Migration Risks
- Existing sessions will have null tags — handle gracefully
- Workout screen refactor is significant — must preserve existing functionality

### I. Performance Considerations
- Set feedback computation is O(1) per set — negligible
- Session summary is O(n) where n = total sets — negligible

### J. Testing Requirements
- Set feedback: test all quality levels (easy/good/hard/failed)
- Adaptive rest: test RPE-based adjustments
- Session summary: test PR detection, volume calculation

### K. Rollback Considerations
- Workout screen changes are contained to one route
- Session type extension is additive

### L. Estimated Complexity: **HIGH**

### M. Recommended Implementation Order
1. Extract RestTimer and SetLogger components from workout screen
2. Implement set feedback algorithm
3. Implement adaptive rest timer
4. Implement session summary computation
5. Build SessionSummaryScreen component
6. Add session tags to workout screen
7. Integrate everything into workout route

---

## Phase 4 — Body & Health Tracking

### A. Objectives
- Enhanced body metrics (measurements, body fat, photos)
- Body composition estimation (Navy method)
- Nutrition targets engine (full macros)
- Weekly check-in system

### B. Existing Systems Affected
- `src/store/useAppStore.ts` — add BodyMetrics, WeeklyCheckin types
- `src/routes/progress.tsx` — add body metrics tab

### C. New Files Required
- `src/lib/bodyComposition.ts`
- `src/lib/nutrition.ts`
- `src/lib/weeklyCheckin.ts`
- `src/components/ProgressPhoto.tsx`

### D. Existing Files Requiring Modification
- `src/store/useAppStore.ts` — add body metrics state, weekly check-in state
- `src/routes/progress.tsx` — replace mock data with real body metrics
- `src/routes/index.tsx` — add nutrition targets display, weekly check-in prompt
- `src/lib/calc.ts` — enhance with full macro calculation

### E. Schema Changes
- `body_metrics` table already defined in Phase 1
- Add `weekly_checkins` table

### F. Dependency Changes
- Supabase Storage for progress photos (if implementing photo upload)

### G. State Management Impact
- New state slices: bodyMetrics[], weeklyCheckins[]
- Nutrition targets computed from profile + body metrics

### H. Migration Risks
- BodyWeightLog → BodyMetrics migration: existing weight data must be preserved
- Photo storage requires Supabase Storage bucket setup

### I. Performance Considerations
- Photo upload/storage: resize to 800px before upload
- Body composition calculation: O(1) — negligible

### J. Testing Requirements
- Navy body fat formula: validate against known values
- Nutrition targets: validate against Mifflin-St Jeor + macro ratios

### K. Rollback Considerations
- Body metrics is additive — existing body weight data preserved
- Nutrition targets are computed, not stored — no data migration

### L. Estimated Complexity: **MEDIUM**

### M. Recommended Implementation Order
1. Extend BodyMetrics type and store state
2. Implement body composition estimator
3. Implement nutrition targets engine
4. Build body metrics entry UI
5. Add measurements tracking
6. Add progress photo feature
7. Implement weekly check-in
8. Replace mock data on progress page

---

## Phase 5 — Advanced Progression System

### A. Objectives
- Multi-signal progression predictor (pre-workout card)
- Per-rep PR database and timeline
- Plateau breaker protocol
- Plan update diff view

### B. Existing Systems Affected
- `src/lib/progressionEngine.ts` — extend with predictor
- `src/store/useAppStore.ts` — add PR database, E1RM records

### C. New Files Required
- `src/lib/progressionPredictor.ts`
- `src/lib/prDatabase.ts`
- `src/lib/plateauBreaker.ts`
- `src/lib/planEvolution.ts`
- `src/components/PlanUpdateDiff.tsx`

### D. Existing Files Requiring Modification
- `src/store/useAppStore.ts` — add PR state, E1RM record persistence
- `src/routes/workout.$dayId.tsx` — add pre-workout prediction card
- `src/routes/index.tsx` — replace random PRs with real PR data

### E. Schema Changes
- `exercise_prs` table already defined in Phase 1

### F. Dependency Changes
- None

### G. State Management Impact
- New state: exercisePRs[], e1rmRecords[]
- Pre-workout prediction computed from session history

### H. Migration Risks
- E1RM records can be back-computed from existing sessions
- PR detection runs after each session save

### I. Performance Considerations
- Progression prediction: O(n) where n = recent sessions for exercise — negligible
- PR detection: O(n × m) where n = exercises, m = sets — negligible

### J. Testing Requirements
- Progression predictor: test all signal combinations
- PR database: test detection accuracy, edge cases
- Plateau breaker: test strategy rotation

### K. Rollback Considerations
- PR database is additive — no existing data affected
- Progression predictor enhances, doesn't replace, existing engine

### L. Estimated Complexity: **HIGH**

### M. Recommended Implementation Order
1. Implement PR database and detection
2. Implement progression predictor
3. Implement plateau breaker protocol
4. Add pre-workout prediction card to workout screen
5. Replace mock PRs on dashboard
6. Implement plan evolution (week-to-week updates)
7. Build plan update diff view

---

## Phase 6 — Smart Dashboard & Analytics

### A. Objectives
- Weekly intelligence report
- Strength standards comparison
- Muscle activation heatmap
- Per-exercise trend charts
- Readiness trend chart

### B. Existing Systems Affected
- `src/routes/index.tsx` — add weekly report card
- `src/routes/progress.tsx` — replace all mock data with real analytics

### C. New Files Required
- `src/lib/weeklyReport.ts`
- `src/data/strengthStandards.ts` (if not created in Phase 2)
- `src/components/MuscleHeatmap.tsx`
- `src/components/WeeklyReport.tsx`
- `src/components/StrengthStandards.tsx`

### D. Existing Files Requiring Modification
- `src/routes/index.tsx` — add weekly report card, replace random PRs
- `src/routes/progress.tsx` — replace all mock data with real computed data

### E. Schema Changes
- None (all computed from existing data)

### F. Dependency Changes
- None (Recharts already installed)

### G. State Management Impact
- All analytics are computed from existing state — no new state needed

### H. Migration Risks
- None — purely additive UI changes

### I. Performance Considerations
- Muscle heatmap SVG: render once, memoize
- Trend charts: limit to last 12 weeks of data
- Weekly report: compute on demand, cache in useMemo

### J. Testing Requirements
- Weekly report: validate volume calculations, PR counts
- Strength standards: validate percentile interpolation

### K. Rollback Considerations
- All changes are UI-level — no data model changes
- Revert by restoring previous route files

### L. Estimated Complexity: **MEDIUM**

### M. Recommended Implementation Order
1. Implement weekly report generator
2. Build WeeklyReport component
3. Add strength standards data and comparison logic
4. Build StrengthStandards visualization
5. Implement muscle heatmap SVG component
6. Replace all mock data on progress page
7. Add exercise trend charts
8. Add readiness trend chart

---

## Phase 7 — Adaptive Plan Management

### A. Objectives
- Automatic plan versioning
- Auto-deload detection and scheduling
- Goal shift detection
- Plan templates library

### B. Existing Systems Affected
- `src/lib/periodization.ts` — extend with auto-deload
- `src/store/useAppStore.ts` — add plan versioning

### C. New Files Required
- `src/lib/deloadScheduler.ts`
- `src/lib/goalShiftDetector.ts`
- `src/data/planTemplates.ts`

### D. Existing Files Requiring Modification
- `src/store/useAppStore.ts` — add plan history, version tracking
- `src/routes/plan.tsx` — add template import, version history

### E. Schema Changes
- `plans` table: add `version INT`, `previous_plan_id UUID`

### F. Dependency Changes
- None

### G. State Management Impact
- New state: planHistory[] for version tracking
- Auto-deload scheduling may modify plan automatically

### H. Migration Risks
- Plan versioning is additive — existing plans get version 1
- Auto-deload is opt-in — user can reject

### I. Performance Considerations
- Goal shift detection: O(n) over session history — negligible
- Plan template import: O(1) — lookup + generation

### J. Testing Requirements
- Deload scheduler: test all 5 trigger conditions
- Goal shift detector: test with various divergence scenarios
- Plan templates: validate each template generates correct plan

### K. Rollback Considerations
- Plan versioning is additive
- Templates are importable, not auto-applied

### L. Estimated Complexity: **HIGH**

### M. Recommended Implementation Order
1. Implement deload scheduler
2. Implement goal shift detector
3. Create plan templates library (5+ templates)
4. Add template import UI to plan page
5. Implement plan versioning
6. Add plan diff view for week-to-week changes

---

## Phase 8 — Social & Gamification

### A. Objectives
- Expanded achievements system (20+ new)
- Streak and consistency engine
- Challenge system

### B. Existing Systems Affected
- `src/lib/achievements.ts` — expand

### C. New Files Required
- `src/lib/streakEngine.ts`
- `src/lib/challenges.ts`

### D. Existing Files Requiring Modification
- `src/lib/achievements.ts` — add 20+ new achievements
- `src/store/useAppStore.ts` — add streak data, challenge state
- `src/routes/index.tsx` — add streak widget, challenge card

### E. Schema Changes
- None (achievements stored in localStorage/Zustand)

### F. Dependency Changes
- None

### G. State Management Impact
- New state: streakData, activeChallenges[]

### H. Migration Risks
- None — purely additive

### I. Performance Considerations
- Achievement checking runs after session save — O(n) where n = achievements
- Streak computation: O(n) where n = sessions — negligible

### J. Testing Requirements
- Achievement conditions: test each new achievement
- Streak engine: test edge cases (timezone, missed days)

### K. Rollback Considerations
- All additive — no existing functionality affected

### L. Estimated Complexity: **LOW**

### M. Recommended Implementation Order
1. Implement streak engine
2. Add 20+ new achievements
3. Build streak visualization widget
4. Implement challenge system
5. Add challenge UI

---

## Phase 9 — Performance & Security

### A. Objectives
- Security hardening (input sanitization, WebAuthn)
- Performance optimizations (virtualization, memoization, bundle analysis)
- Data export (GDPR compliance)

### B. Existing Systems Affected
- All routes (security hardening)
- Exercise library (virtualization)

### C. New Files Required
- `src/lib/sanitize.ts`
- `src/lib/webauthn.ts`
- `src/lib/dataExport.ts`

### D. Existing Files Requiring Modification
- `src/routes/library.tsx` — add virtualization
- All form inputs — add sanitization
- `src/routes/profile.tsx` — add data export, biometric auth

### E. Schema Changes
- None

### F. Dependency Changes
- `react-virtual` or `@tanstack/react-virtual` for list virtualization
- `vite-bundle-visualizer` (devDependency)

### G. State Management Impact
- None

### H. Migration Risks
- Virtualization changes library rendering — test thoroughly
- Bundle analysis is dev-only — no production impact

### I. Performance Considerations
- Virtualized list: exercise library renders only visible items
- Bundle target: < 250kb initial JS
- Service worker: cache exercise DB + UI assets aggressively

### J. Testing Requirements
- Input sanitization: test XSS vectors
- WebAuthn: test on iOS Safari, Android Chrome
- Data export: verify all data included

### K. Rollback Considerations
- Virtualization is contained to library route
- WebAuthn is opt-in — doesn't affect existing auth

### L. Estimated Complexity: **MEDIUM**

### M. Recommended Implementation Order
1. Add input sanitization
2. Add virtualization to exercise library
3. Run bundle analysis and optimize
4. Implement WebAuthn biometrics
5. Implement data export
6. Optimize service worker caching

---

## Phase 10 — Strava Integration (Post-MVP)

### A. Objectives
- Strava OAuth flow
- Cardio load integration into ACWR
- Strava dashboard widget

### B. Existing Systems Affected
- `src/lib/fatigueModel.ts` — integrate cardio load

### C. New Files Required
- `src/lib/strava.ts`
- `src/lib/cardioFatigueModel.ts`
- `src/routes/auth.strava.tsx`

### D. Existing Files Requiring Modification
- `src/lib/fatigueModel.ts` — include cardio in ACWR calculation
- `src/routes/index.tsx` — add Strava widget

### E. Schema Changes
- Add `strava_tokens` table (encrypted tokens)

### F. Dependency Changes
- None (Strava API is REST, no SDK needed)

### G. State Management Impact
- New state: stravaActivities[], stravaConnected: boolean

### H. Migration Risks
- Strava is opt-in — no impact on existing users
- OAuth flow requires server-side token exchange (TanStack Start server functions)

### I. Performance Considerations
- Strava API rate limits: cache activities, poll infrequently
- Cardio load calculation: O(n) where n = activities — negligible

### J. Testing Requirements
- OAuth flow: test token exchange, refresh
- Cardio load: validate load calculations for different activity types

### K. Rollback Considerations
- Entirely opt-in — can be disabled without affecting core app

### L. Estimated Complexity: **LOW**

### M. Recommended Implementation Order
1. Implement Strava OAuth flow
2. Fetch and store activities
3. Integrate cardio load into ACWR
4. Build Strava dashboard widget

---

# 10. File-Level Modification Plan

## 10.1 Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `src/lib/planGenerator.ts` | 1 | Extract plan generation from store |
| `src/data/types.ts` | 1 | Shared domain types |
| `src/lib/syncQueue.ts` | 1 | Offline mutation queue |
| `supabase/migrations/001_initial_schema.sql` | 1 | Database schema |
| `supabase/migrations/002_rls_policies.sql` | 1 | Row Level Security |
| `src/lib/startingWeightEstimator.ts` | 2 | Bodyweight ratio + history-based estimation |
| `src/lib/planScorer.ts` | 2 | Plan quality 0-100 score |
| `src/lib/setFeedback.ts` | 3 | Real-time set quality analysis |
| `src/lib/sessionSummary.ts` | 3 | Post-workout summary computation |
| `src/components/RestTimer.tsx` | 3 | Extracted rest timer component |
| `src/components/SetLogger.tsx` | 3 | Extracted set logging component |
| `src/components/SessionSummaryScreen.tsx` | 3 | Post-workout celebration + PRs |
| `src/lib/bodyComposition.ts` | 4 | Navy method, lean mass calc |
| `src/lib/nutrition.ts` | 4 | Training/rest day macro targets |
| `src/lib/weeklyCheckin.ts` | 4 | Weekly check-in system |
| `src/components/ProgressPhoto.tsx` | 4 | Before/after comparison |
| `src/lib/progressionPredictor.ts` | 5 | Multi-signal readiness-to-progress |
| `src/lib/prDatabase.ts` | 5 | Per-rep PR detection |
| `src/lib/plateauBreaker.ts` | 5 | Plateau break strategy selector |
| `src/lib/planEvolution.ts` | 5 | Week-to-week plan updates |
| `src/components/PlanUpdateDiff.tsx` | 5 | Accept/reject plan changes |
| `src/lib/weeklyReport.ts` | 6 | Weekly intelligence generation |
| `src/data/strengthStandards.ts` | 6 | Population percentile data |
| `src/components/MuscleHeatmap.tsx` | 6 | SVG body + color-coded activation |
| `src/components/WeeklyReport.tsx` | 6 | Dashboard report card |
| `src/components/StrengthStandards.tsx` | 6 | Percentile bar visualization |
| `src/lib/deloadScheduler.ts` | 7 | Automated deload triggers |
| `src/lib/goalShiftDetector.ts` | 7 | Goal divergence alerts |
| `src/data/planTemplates.ts` | 7 | 5+ proven program templates |
| `src/lib/streakEngine.ts` | 8 | Streak + consistency scoring |
| `src/lib/challenges.ts` | 8 | Monthly challenge system |
| `src/lib/sanitize.ts` | 9 | Input sanitization |
| `src/lib/webauthn.ts` | 9 | Biometric auth |
| `src/lib/dataExport.ts` | 9 | GDPR data download |
| `src/lib/strava.ts` | 10 | Strava OAuth + API client |
| `src/lib/cardioFatigueModel.ts` | 10 | Strava load integration |
| `src/routes/auth.strava.tsx` | 10 | Strava OAuth callback |

## 10.2 Files to Modify

| File | Phase(s) | Changes |
|------|----------|---------|
| `src/store/useAppStore.ts` | 1-8 | Extract plan gen, add sync queue, extend Profile, add BodyMetrics/PR/Checkin state, add streak data |
| `src/data/exercises.ts` | 1 | Add new fields to Exercise, expand to 150+ exercises |
| `src/lib/supabase.ts` | 1 | Per-table sync functions, replace single-table approach |
| `src/routes/onboarding.tsx` | 2 | Add 3 new steps (movement, history, recovery) |
| `src/routes/plan.tsx` | 2, 7 | Add plan score badge, template import, version history |
| `src/routes/workout.$dayId.tsx` | 3, 5 | Integrate set feedback, adaptive rest, summary screen, pre-workout predictions |
| `src/routes/index.tsx` | 4, 5, 6 | Replace mock PRs, add nutrition targets, weekly report, streak widget |
| `src/routes/progress.tsx` | 4, 6 | Replace ALL mock data with real analytics |
| `src/routes/profile.tsx` | 9 | Add data export, biometric auth options |
| `src/routes/library.tsx` | 9 | Add virtualization for 150+ exercises |
| `public/manifest.json` | 1 | Add share_target, launch_handler, display_override |
| `public/sw.js` | 1, 9 | Caching strategy for offline-first |

## 10.3 Files to Delete/Deprecate

| File | Action | Reason |
|------|--------|--------|
| `useAppStore.ts` → `generatePlan()` | Remove | Dead code — only `generateEnhancedPlan()` is used |
| `useAppStore.ts` → `seed()` | Remove | Generates random synthetic data |
| `useAppStore.ts` → `generatePlanFromProfile` export | Remove | Unused export of dead function |
| `src/lib/trainer.ts` → `progressionHint()` | Deprecate | Superseded by `setFeedback.ts` |
| `src/lib/trainer.ts` → `coachOfTheDay()` | Keep | Simple, useful, no replacement needed |

---

# 11. Migration Strategy

## 11.1 Data Migration Path

### Step 1: Preserve localStorage
All existing data in localStorage key `pt-app-v1` must be preserved. The Zustand persist middleware handles this automatically.

### Step 2: Supabase Schema (Phase 1)
Create new tables. Existing Supabase users (if any) have data in the `user_data` JSONB table. Migration script:
1. Read from `user_data` table
2. Parse JSONB fields
3. Insert into new per-table structure
4. Verify data integrity
5. Drop `user_data` table (after backup)

### Step 3: Exercise Database Expansion (Phase 1)
- Preserve all existing exercise IDs
- Add new exercises with new IDs
- New Exercise fields are optional — existing data unaffected

### Step 4: Profile Extension (Phase 2)
- New Profile fields (movementAssessment, trainingHistory, recoveryProfile) are optional
- Existing profiles work without them
- Onboarding re-run prompts for new data

### Step 5: Body Metrics Migration (Phase 4)
- `BodyWeightLog[]` entries become `BodyMetrics` entries with only `weightKg` populated
- Preserve original dates
- New fields (bodyFatPct, measurements) start as null

## 11.2 Breaking Change Protocol

1. **Never remove existing exercise IDs** — sessions reference them
2. **Never change Zustand persist key** — would lose all local data
3. **Always make new Profile fields optional** — existing profiles must work
4. **Always make new Session fields optional** — existing sessions must work
5. **Test with existing localStorage data** before each release

## 11.3 Supabase Migration Order

```
001_initial_schema.sql    — Create all tables
002_rls_policies.sql      — Enable RLS, create policies
003_exercise_prs.sql      — PR tracking table (if separate)
004_weekly_checkins.sql   — Weekly check-in table (Phase 4)
```

---

# 12. Testing Strategy

## 12.1 Current State
**Zero tests exist.** This is the highest-risk technical debt.

## 12.2 Recommended Testing Stack
- **Unit tests**: Vitest (already compatible with Vite)
- **Component tests**: React Testing Library + Vitest
- **E2E tests**: Playwright (for PWA testing on mobile)
- **Type checking**: TypeScript strict mode (already enabled)

## 12.3 Priority Test Coverage

### Tier 1 — Must Have (Phase 1)
- `src/lib/loadCalculator.ts` — 1RM formulas, rounding, trend analysis
- `src/lib/fatigueModel.ts` — ACWR, readiness, deload detection
- `src/lib/periodization.ts` — block creation, week lookup
- `src/lib/progressionEngine.ts` — all decision tree branches
- `src/lib/exerciseScorer.ts` — scoring dimensions
- `src/lib/volumeLandmarks.ts` — volume status computation

### Tier 2 — Should Have (Phase 2-3)
- `src/lib/startingWeightEstimator.ts` — estimation accuracy
- `src/lib/planScorer.ts` — score computation
- `src/lib/setFeedback.ts` — feedback for all quality levels
- `src/lib/sessionSummary.ts` — summary computation
- `src/lib/syncQueue.ts` — enqueue, flush, retry

### Tier 3 — Nice to Have (Phase 4+)
- `src/lib/nutrition.ts` — macro calculation
- `src/lib/bodyComposition.ts` — Navy formula
- `src/lib/progressionPredictor.ts` — prediction accuracy
- `src/lib/prDatabase.ts` — PR detection
- `src/lib/streakEngine.ts` — streak computation

## 12.4 Test Configuration

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test"
  }
}
```

New devDependencies:
- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@playwright/test`

---

# 13. Performance & Scalability Considerations

## 13.1 Current Performance Profile

- **Bundle size**: Unknown (no bundle analysis configured)
- **Initial load**: TanStack Router code-splits routes — good
- **Runtime**: All algorithm computations are O(n) with small n — negligible
- **Rendering**: No virtualization, no lazy loading of heavy components
- **Storage**: localStorage limit is ~5-10MB — sufficient for years of session data

## 13.2 Scaling Concerns

### Exercise Database (30 → 150+)
- **Current**: 274 lines, ~5kb
- **Projected**: ~2000 lines, ~40kb
- **Impact**: Minimal — loaded once, cached in memory
- **Mitigation**: Split into category files if needed (`exercises-chest.ts`, etc.)

### Session History Growth
- **Current**: All sessions loaded into memory on app start
- **At 500 sessions**: ~500kb of JSON in Zustand
- **At 1000+ sessions**: May need pagination or lazy loading
- **Mitigation**: Keep only last 100 sessions in Zustand, archive older ones to Supabase

### Chart Rendering
- **Recharts**: Renders all data points — no built-in virtualization
- **At 52+ weeks of data**: Charts may lag on low-end mobile
- **Mitigation**: Limit chart data to last 12 weeks, aggregate older data

### List Virtualization
- **Exercise library at 150+**: Needs virtualization for smooth scroll
- **Solution**: `@tanstack/react-virtual` — add in Phase 9

## 13.3 Bundle Size Target

**Target**: < 250kb initial JS bundle (gzipped)

**Current estimated breakdown**:
- React + ReactDOM: ~45kb
- TanStack Router + Start: ~30kb
- Zustand: ~3kb
- Recharts: ~50kb
- Radix UI (tree-shaken): ~30kb
- Tailwind CSS: ~15kb
- Supabase client: ~25kb
- Application code: ~50kb
- **Estimated total**: ~250kb (borderline)

**Optimization opportunities**:
- Lazy-load Recharts (only on progress/dashboard pages)
- Lazy-load Supabase client (only when auth is used)
- Tree-shake unused Radix components
- Dynamic import heavy algorithm modules

## 13.4 Service Worker Strategy

```
Cache Strategy:
├── Static assets (JS, CSS, fonts) → Cache-first
├── Exercise database → Cache-first (rarely changes)
├── UI component library → Cache-first
├── Supabase API calls → Network-first with cache fallback
├── Profile/plan data → Stale-while-revalidate
└── Images (progress photos) → Cache-first with size limit
```

---

# 14. Final Recommendations

## 14.1 Immediate Actions (Before Any Feature Work)

1. **Extract plan generation from store** — reduces store from 561 to ~260 lines
2. **Create shared type module** — eliminates type duplication
3. **Remove dead code** — `generatePlan()`, `seed()`, unused export
4. **Set up Vitest** — write tests for existing algorithm layer before adding new features
5. **Run bundle analysis** — establish baseline before adding code

## 14.2 Architecture Principles to Maintain

1. **Pure functions in `src/lib/`** — no React dependencies in algorithm code
2. **Zustand as source of truth** — Supabase is persistence, not authority
3. **Offline-first** — every feature must work without network
4. **Deterministic algorithms** — no randomness in fitness logic
5. **Thin React layers** — hooks wrap lib functions, components display data
6. **Type safety** — strict TypeScript, no `any` types
7. **Mobile-first** — test on real iPhone/Android at each phase

## 14.3 Risk Mitigations

1. **Test algorithms before UI**: Write unit tests for each `src/lib/` function before building UI that depends on it
2. **Preserve exercise IDs**: Never change existing exercise IDs — they're referenced in session history
3. **Incremental Supabase migration**: Don't switch from localStorage to Supabase in one step — add Supabase alongside, verify, then make it primary
4. **Feature flags**: Consider feature flags for major changes (new workout screen, new progression system) to enable rollback
5. **Real device testing**: PWA behavior differs significantly between iOS Safari and Android Chrome — test both

## 14.4 What NOT to Do

1. **Don't rewrite the store from scratch** — extend it incrementally
2. **Don't introduce a state management library other than Zustand** — it's working well
3. **Don't add server-side rendering for algorithm pages** — all computation should be client-side
4. **Don't introduce AI/ML** — the spec explicitly says "without AI/ML models"
5. **Don't over-engineer the sync system** — start simple (upsert), add conflict resolution only if needed
6. **Don't split the exercise database into a backend API** — keep it as a static data file for offline-first
7. **Don't add animation libraries** — use CSS transitions and Tailwind's animation utilities

## 14.5 Build Order Summary

| Sprint | Weeks | Focus | Complexity |
|--------|-------|-------|------------|
| Sprint 1 | 1-2 | Cleanup + Schema + Exercise DB + Sync Queue + PWA | High |
| Sprint 2 | 3-4 | Smart Onboarding + Starting Weights + Plan Score | Medium |
| Sprint 3 | 5-6 | Set Feedback + Adaptive Rest + Session Summary + Tags | High |
| Sprint 4 | 7-8 | Progression Predictor + PR Database + Plateau Breaker | High |
| Sprint 5 | 9-10 | Analytics + Body Tracking + Nutrition + Weekly Check-in | Medium |
| Sprint 6 | 11-12 | Plan Templates + Auto-Deload + Gamification + Performance | Medium |

---

*This analysis is based on a thorough reading of every source file in the repository as of commit 1b5438e. All recommendations preserve existing architectural patterns and prefer incremental evolution over disruptive rewriting.*