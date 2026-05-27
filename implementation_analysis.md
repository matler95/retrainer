Atlas — Comprehensive Implementation Analysis & Strategy

1. Repository Architecture Summary
Folder Structure (Actual)
atlas/
├── src/
│   ├── components/
│   │   ├── AppShell.tsx          # Layout primitives (AppShell, AppHeader, StatCard, SectionTitle, Card)
│   │   ├── BottomNav.tsx         # Fixed 5-tab mobile nav
│   │   └── ui/                   # 40+ shadcn/ui primitives (verbatim, no custom logic)
│   ├── data/
│   │   └── exercises.ts          # 35 exercises, Exercise interface, enums
│   ├── hooks/
│   │   ├── use-mobile.tsx        # Breakpoint hook
│   │   ├── useAuth.ts            # Supabase auth + sync wrapper
│   │   ├── useProgressionHint.ts # Per-day progression decisions + e1RM trend
│   │   └── useReadiness.ts       # ACWR + readiness score hook
│   ├── lib/
│   │   ├── achievements.ts       # 15 achievements, checker, context builder
│   │   ├── bodyTrends.ts         # EMA smoothing, trend summary, calorie suggestion
│   │   ├── calc.ts               # BMR/TDEE/protein/water targets (thin wrappers)
│   │   ├── config.server.ts      # Server-only env access
│   │   ├── error-capture.ts      # SSR error recovery
│   │   ├── error-page.ts         # Static HTML error fallback
│   │   ├── exerciseScorer.ts     # Scored exercise selection (equipment/injury/preference)
│   │   ├── fatigueModel.ts       # ACWR, readiness score, CNS demand, deload detection
│   │   ├── loadCalculator.ts     # Epley/Brzycki, e1RM tracking, trend analysis
│   │   ├── notifications.ts      # Web Notification API wrappers
│   │   ├── periodization.ts      # Linear/undulating/block periodization
│   │   ├── progressionEngine.ts  # Deterministic progression decision tree
│   │   ├── supabase.ts           # Supabase client, auth helpers, sync utilities
│   │   ├── trainer.ts            # progressionHint (simple), coachOfTheDay
│   │   ├── utils.ts              # cn() only
│   │   └── volumeLandmarks.ts    # MEV/MAV/MRV per muscle, weekly volume tracking
│   ├── routes/
│   │   ├── __root.tsx            # App shell, PWA registration, theme, QueryClient
│   │   ├── index.tsx             # Dashboard
│   │   ├── library.tsx           # Exercise search/filter
│   │   ├── library.$exerciseId.tsx # Exercise detail
│   │   ├── onboarding.tsx        # 10-step profile wizard
│   │   ├── plan.tsx              # Plan overview
│   │   ├── plan.day.$dayId.tsx   # Plan day editor
│   │   ├── profile.tsx           # Settings + auth UI
│   │   ├── progress.tsx          # Progress charts (mostly mock data)
│   │   └── workout.$dayId.tsx    # Active workout session
│   └── store/
│       └── useAppStore.ts        # Single Zustand store + persist middleware
├── public/
│   ├── manifest.json             # PWA manifest
│   └── sw.js                     # Service worker (cache-first strategy)
└── supabase/                     # EMPTY — no migrations exist yet
Stack Confirmation
LayerTechnologyVersionFrameworkTanStack Start~1.167RouterTanStack Router~1.168StateZustand + persist~5.0StylingTailwind v4 + tw-animate~4.2Componentsshadcn/ui (new-york style)LatestBackendSupabase JS~2.106ChartsRecharts~2.15Formsreact-hook-form + zodLatestRuntimeBunLatestDeploy targetCloudflare (nitro)Implied by vite config
Critical Architectural Observation
The app is deployed via @lovable.dev/vite-tanstack-config targeting Cloudflare Workers (nitro), NOT Vercel. The spec says Vercel — this is a conflict requiring resolution before Phase 1.

2. Existing Systems Audit
What Already Exists (Non-Trivial)
SystemFileMaturityQualityExercise DBdata/exercises.ts35 exercisesSolid interface, needs expansionZustand storestore/useAppStore.tsFull app stateMonolithic, needs splittingPlan generationstore/useAppStore.tsTwo generators (basic + enhanced)DUPLICATE — critical debtPeriodizationlib/periodization.tsLinear + undulating + blockWell-structuredLoad calculatorlib/loadCalculator.tsEpley + Brzycki + e1RM trendProduction-qualityProgression enginelib/progressionEngine.ts8-case decision treeWell-structuredFatigue modellib/fatigueModel.tsACWR + CNS + deloadWell-structuredVolume landmarkslib/volumeLandmarks.tsMEV/MAV/MRV + weekly trackingWell-structuredExercise scorerlib/exerciseScorer.tsMulti-dimensional scoringWell-structuredBody trendslib/bodyTrends.tsEMA + trend summarySolidAchievement systemlib/achievements.ts15 achievements + checkerExtensibleAuth hookhooks/useAuth.tsSupabase auth + syncPresent but sync is naiveReadiness hookhooks/useReadiness.tsACWR + recommendationsWell-structuredProgression hookhooks/useProgressionHint.tsPer-day decisions + e1RMWell-structuredSupabase clientlib/supabase.tsAuth + upsert syncSingle-table blob sync — naivePWApublic/sw.js + manifest.jsonBasic cache-first SWNeeds hardeningOnboardingroutes/onboarding.tsx10 stepsMissing movement assessment, historyWorkout sessionroutes/workout.$dayId.tsxFull logger with rest timerMissing set feedback, summaryProgress pageroutes/progress.tsxSkeleton with mock dataNeeds real data wiringSupabase migrationssupabase/EmptyCritical gap
What Is Partially Implemented

Plan generation: Two generators coexist — generatePlan (basic, used nowhere visible) and generateEnhancedPlan (called from setProfile). The basic one is dead code.
Supabase sync: Works as a single JSON blob (user_data table) — not proper relational schema. All data is serialized into one JSONB column.
Progress page: Charts show random/mock data, not real session data.
PRs on dashboard: Math.random() — placeholder.
Strength standards: Referenced in spec but not implemented.
Plan versioning: advanceWeek() action exists in store but does nothing meaningful.
e1RM records: E1RMRecord type exists in loadCalculator.ts, createE1RMRecord() exists, but records are never persisted to the store.

Critical Bugs / Dead Code

Duplicate plan generator — generatePlan (basic) and generateEnhancedPlan (enhanced) both exist in useAppStore.ts. Only the enhanced one is called. The basic one is dead code but the store exports generatePlanFromProfile = generatePlan (the dead version).
e1RM records never stored — createE1RMRecord() is implemented but never called. useProgressionHint.ts builds e1RM records on-the-fly from session history instead of reading persisted records, which is expensive and lossy.
tempStreak declared twice in achievements.ts — let tempStreak = 1 appears at function scope AND inside a nested block, causing a TypeScript shadowing issue (silenced by noUnusedLocals: false).
Progress page uses Math.random() — strength chart data is fake. PRs on dashboard are fake.
trainer.ts — progressionHint() is a simplified duplicate of progressionEngine.ts::assessExerciseProgress(). Used in workout route, should be replaced.
No supabase/migrations/ directory — Supabase schema is described in comments in supabase.ts as "create in Supabase dashboard." No automated migrations exist.


3. Domain Model Analysis
Current Domain Entities
EntityLocationSchema QualitySupabase TableProfilestore/useAppStore.tsGood, missing movementAssessment, recoveryProfile, trainingHistoryBlob in user_dataExercisedata/exercises.tsGood interface, missing videoUrl, cues, muscleActivation, substituteIds, plane, mechanic, category, unilateralStatic filePlanDay + PlannedExercisestore/useAppStore.tsGood, missing lastRpe, plateau historyBlob in user_dataSession + SessionExerciseLog + SetLogstore/useAppStore.tsGood, missing rpeOverall, tags, notes, durationMin (field exists in type but never set)Blob in user_dataBodyWeightLogstore/useAppStore.tsMinimal — only date + kg. Missing bodyFatPct, measurementsBlob in user_dataWaterLogstore/useAppStore.tsMinimalBlob in user_dataSupplementLogstore/useAppStore.tsMinimalBlob in user_dataE1RMRecordlib/loadCalculator.tsWell-defined but never persistedNot persistedAchievementlib/achievements.tsGood, only IDs stored in storeBlob in user_dataTrainingBlocklib/periodization.tsGoodBlob in user_data
Missing Domain Entities (Per Spec)
EntityNeeded ForRisk If MissingPRRecordProgression Phase 5Medium — can derive from sessionsMovementAssessmentOnboarding Phase 2Low — optional enrichmentTrainingHistoryStarting weights Phase 2Low — optionalRecoveryProfileReadiness Phase 2Medium — affects ACWR qualityWeeklyCheckinAdaptive plans Phase 4MediumPlateauHistoryPlateau breaker Phase 5MediumBodyMetrics (extended)Body tracking Phase 4Low — extends BodyWeightLogSyncQueueItemOffline-first Phase 1High — current sync is online-only
Schema Migration Risks
High Risk: The current user_data Supabase table is a single-row-per-user JSON blob. Migrating to proper relational tables requires:

A migration script that reads the blob and inserts into new tables
Updating supabase.ts sync functions to use new tables
Coordinating the migration during a deployment (no downtime window)

Medium Risk: BodyWeightLog → BodyMetrics expansion. The bodyWeight array in Zustand store must become bodyMetrics with backward-compatible migration.
Low Risk: Adding fields to Profile is additive — Zustand persist will fill with undefined, which TypeScript can handle with optional fields.

4. State Management & Sync Analysis
Current State Architecture
useAppStore (single Zustand store)
├── Primitive state: theme, units, remindersOn
├── User data: profile, favorites, disliked
├── Training: plan, sessions, trainingBlocks, currentWeekNumber
├── Health: bodyWeight, water, supplements
├── Meta: achievements
└── Actions: ~20 action functions + 2 plan generators
Persistence: zustand/persist with key "pt-app-v1" → localStorage
Supabase sync: Single syncToSupabase() function that serializes entire store to one user_data table row. Called manually from useAuth.syncNow().
Critical Problems
1. Monolithic Store Anti-Pattern
The single store (useAppStore) will become unmanageable. Currently ~600 lines. With Phase 4-7 additions, it will exceed 1500+ lines. Selectors will cause excessive re-renders because any state change invalidates all subscribers.
Recommendation: Slice into domain stores while keeping the persist strategy. Use Zustand's store composition pattern.
2. Naive Sync Strategy
Current sync:

Serializes everything to one JSON blob
No conflict resolution (last-write-wins globally)
No incremental sync (always replaces everything)
No sync queue for offline mutations
loadFromCloud() only loads if local is empty — profile changes from another device are ignored

This means multi-device use will cause data loss.
3. No Offline Mutation Queue
If a session is saved while offline, there's no guarantee it reaches Supabase. The saveSession() action only writes to Zustand (persisted to localStorage). The sync to Supabase happens only when syncNow() is manually called. Sessions saved offline and then the app is closed will never sync unless the user manually taps "Sync now."
4. e1RM Records Not in Store
E1RMRecord objects are computed on-the-fly in useProgressionHint.ts by scanning all sessions. This is O(sessions × exercises × sets) on every render. Should be persisted and incrementally updated.
5. Derived State in Wrong Place
generateEnhancedPlan() is a massive function inside useAppStore.ts. Pure algorithmic logic doesn't belong in the store file. It belongs in lib/ and should be called from the store, not defined there.
Recommended State Architecture
Store Slices (all composed via zustand/combine or separate stores):
├── useProfileStore       — Profile, preferences, auth state
├── useTrainingStore      — Plan, sessions, trainingBlocks, weekNumber
├── useHealthStore        — bodyMetrics, water, supplements
├── useProgressStore      — PRs, e1RM records, achievements
├── useSyncStore          — syncQueue, syncStatus, lastSyncedAt
└── useUIStore            — theme, units, reminders (no persistence needed for UI)
Migration path: keep useAppStore as an umbrella re-export during transition to avoid breaking all imports.

5. Algorithm Architecture Assessment
Existing Algorithm Quality
Strengths
The algorithm layer in src/lib/ is exceptionally well-structured for a project of this stage:

loadCalculator.ts: Production-quality — Epley + Brzycki averaging, e1RM trend analysis with plateau detection, working weight from 1RM with RPE adjustment, progression increments. This is the algorithmic backbone and needs minimal changes.
fatigueModel.ts: Solid ACWR implementation with CNS demand weighting. The 4-trigger deload detection is appropriate. CNS demand table covers all 35 exercises.
progressionEngine.ts: Clean decision tree with 8 cases, plateau/variation detection, deload recommendations. The reasoning field provides explainability.
periodization.ts: Three periodization types (linear/undulating/block) with correct rep range assignment per goal. recommendPeriodizationType() is a good factory.
volumeLandmarks.ts: MEV/MAV/MRV implementation is correct. computeWeeklyVolumes() correctly counts secondary muscle involvement at 50%.
exerciseScorer.ts: Multi-dimensional scoring with explicit weight multipliers. Injury scoring (-10 penalty) is appropriately aggressive.

Problems
ProblemFileSeverityDuplicate plan generatorsuseAppStore.tsHighprogressionHint duplicates progressionEnginetrainer.tsMediume1RM records computed not storedMultipleHighCNS demand table will become stale with 150+ exercisesfatigueModel.tsMediumgetNeededMuscles and getExerciseCount are inner functions in plan generator, not exporteduseAppStore.tsMedium — untestableNo validation of profile.equipment against Exercise.equipmentexerciseScorer.tsLowaverage1RM() used for both storage and display — no formula tagloadCalculator.tsLow
Missing Algorithms (Per Spec)
AlgorithmWhereComplexityStarting weight estimatorNew lib/startingWeightEstimator.tsMediumPlan scorerNew lib/planScorer.tsMediumSet feedback (real-time)New lib/setFeedback.tsMediumSession summaryNew lib/sessionSummary.tsLowPlateau breakerNew lib/plateauBreaker.tsMediumProgression predictorNew lib/progressionPredictor.tsHighPR databaseNew lib/prDatabase.tsMediumWeekly reportNew lib/weeklyReport.tsMediumPlan evolutionNew lib/planEvolution.tsHighDeload schedulerNew lib/deloadScheduler.tsLow (wraps existing)Body compositionNew lib/bodyComposition.tsLowNutrition targetsNew lib/nutrition.tsLow (extends calc.ts)Streak engineNew lib/streakEngine.tsMediumSync queueNew lib/syncQueue.tsHigh

6. UI Architecture Assessment
Component Organization
Current Layout Primitives (AppShell.tsx)
AppShell       — max-w content wrapper with bottom padding
AppHeader      — title + optional right slot
StatCard       — metric display (label/value/sub/accent)
SectionTitle   — section label with optional right action
Card           — rounded border container
These are minimal and sufficient. Will need extension but not replacement.
Route-Level Components
Each route is a self-contained file with inline sub-components. This works for current complexity but will cause problems as routes grow (e.g., workout.$dayId.tsx is already 350 lines).
UI Problems

No component barrel exports — imports are @/components/ui/button not @/components/ui. Minor but inconsistent with growing component count.
Progress page is almost entirely mock data — Math.random() in chart data, fake PR display. This is the highest-priority UI debt because it blocks users from seeing real value.
No loading/skeleton states — Supabase calls have no loading UI. The app shows nothing while data loads.
Dashboard PRs are fake — EXERCISES.slice(0, 3).map(e => ... Math.random() * 80). This is misleading.
No empty states — If sessions.length === 0, charts just show empty axes. No "No data yet" states.
Workout session route too long — workout.$dayId.tsx at 350+ lines should extract: RestTimerOverlay, SetInputCard, ExerciseListOverlay, WorkoutHeader, SessionCompleteScreen.
Virtualization missing — Library page renders all 35 exercises as DOM nodes. At 150+, this will lag on low-end phones.
No pull-to-refresh — Required for PWA feel.

Reusable Component Opportunities
ComponentCurrentlyShould BeSet input (weight + reps +/- buttons)Inline in workout route<SetInputCard />Metric progress barMultiple pages<MetricProgress />Rest timer overlayWorkout route<RestTimerOverlay />Exercise list itemLibrary + Plan routes, slightly different<ExerciseListItem />PR badgeDashboard (fake)<PRBadge />Chart wrapperProgress route<TrendChart />Week calendar stripPlan, potentially dashboard<WeekStrip />

7. Technical Debt & Risk Matrix
Risk Matrix
RiskSeverityProbabilityImpactMitigationSingle user_data blob → data corruption on concurrent writesCriticalHigh (multi-device)Data lossMigrate to proper tables with RLSNo offline sync queue → lost sessionsCriticalHigh (mobile users)Session lossImplement SyncQueue in Phase 1Monolithic store → performance degradationHighCertain at scaleUI lagSlice stores incrementallye1RM computed not stored → O(n²) rendersHighAlready manifestingUI lagPersist e1RM records to storeDuplicate plan generators → inconsistencyHighAlready presentWrong plans generatedDelete generatePlan, keep only enhancedMock data on progress page → user confusionHighAlready presentTrust lossWire real data in Sprint 1Deployment platform mismatch (spec says Vercel, code says Cloudflare)MediumPresentBuild failureClarify before migration workNo Supabase migrations → schema driftMediumCertainCannot reproduce DBCreate migration files immediatelytrainer.ts::progressionHint duplicates progression engineMediumAlready presentLogic divergenceDelete trainer.ts progressionHint, use engineNo input sanitization → XSS via notes/injuries fieldsMediumLow (no SSR rendering)SecurityAdd sanitization before Supabase writessw.js caches everything including Supabase URLsLowEdge caseStale auth tokensAdd Supabase hostname exclusion (partially done)tempStreak variable shadowing in achievements.tsLowPresentIncorrect streak calcFix declarationBundle size unknown (no analysis)LowUnknownPerformanceAdd vite-bundle-visualizer

8. Recommended Architectural Changes
Before Any Phase Work
1. Delete Dead Code (Zero Risk, High Benefit)

Remove generatePlan() (basic) from useAppStore.ts — replace export generatePlanFromProfile with generateEnhancedPlan
Remove progressionHint() from trainer.ts — replace all usages in workout.$dayId.tsx with calls to assessExerciseProgress from progressionEngine.ts

2. Extract Plan Generation to lib/
Move generateEnhancedPlan() out of useAppStore.ts into src/lib/planGenerator.ts. The store calls it but doesn't own it. This also makes it testable.
3. Persist e1RM Records
Add e1rmRecords: E1RMRecord[] to store. On saveSession(), call createE1RMRecord() for each exercise and append. useProgressionHint reads from store instead of recomputing.
4. Create Supabase Migration Files
Even if the schema is partially set up via dashboard, create supabase/migrations/ SQL files to make the schema reproducible and version-controlled.
5. Fix Progress Page
Wire real data from sessions store to charts. Remove all Math.random() calls.
Structural Changes Required Per Phase
Store Slicing Strategy
Do NOT rewrite the store immediately. Instead:

Keep useAppStore as the primary store
Add new domain slices as separate Zustand stores for new entities (PRs, sync queue, body metrics extended)
Once stable, gradually migrate existing slices

Supabase Sync Architecture
Replace single-blob sync with entity-level sync:
New sync functions in supabase.ts:
  syncSession(userId, session)       — called immediately on saveSession
  syncProfile(userId, profile)       — called on setProfile
  syncBodyMetric(userId, metric)     — called on addBodyMetric
  syncPRRecords(userId, prs)         — called after session analysis
  loadAllUserData(userId)            — loads from new relational tables

9. Phase-by-Phase Implementation Plan
Phase 1 — Foundation & Data Model
A. Objectives
Establish proper Supabase schema, offline sync queue, exercise DB expansion, PWA hardening.
B. Existing Systems Affected

lib/supabase.ts — complete rewrite of sync functions
store/useAppStore.ts — add syncQueue state, e1RM records persistence
public/manifest.json — additions for display_override, handle_links
public/sw.js — cache strategy refinement
data/exercises.ts — schema extension + 115+ new exercises

C. New Files Required
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_indexes.sql
src/lib/syncQueue.ts
src/lib/planGenerator.ts   (extracted from useAppStore)
D. Existing Files Requiring Modification
src/data/exercises.ts        — add fields: cues, muscleActivation, category, unilateral, mechanic, plane, forceType, substituteIds
src/lib/supabase.ts          — entity-level sync functions
src/store/useAppStore.ts     — add e1rmRecords[], syncQueue integration, remove dead generatePlan()
src/lib/fatigueModel.ts      — extend CNS_DEMAND table for 150 exercises
E. Schema Changes
sql-- New tables replacing user_data blob:
profiles, plans, sessions, body_metrics, exercise_prs, water_logs, weekly_checkins
-- Migration from user_data:
CREATE TABLE user_data_archive AS SELECT * FROM user_data;
-- Then ETL script reads blob, inserts into new tables
F. Dependency Changes
None — all within existing stack.
G. State Management Impact

Add e1rmRecords: E1RMRecord[] to store
Add syncQueue: SyncQueueItem[] to store
Add syncStatus: 'idle'|'syncing'|'error' to store
saveSession() action: also calls syncSession() + updates e1rmRecords

H. Migration Risks
High: Existing users on the user_data blob schema. Must write a migration that reads existing data and populates new tables. Must NOT delete user_data until migration is confirmed.
I. Performance Considerations
Exercise DB at 150+ entries: filter/sort must remain O(n) max. The scorer already handles this. Verify no O(n²) patterns introduced.
J. Testing Requirements

SQL migration script tested against copy of production schema
SyncQueue.flush() tested with simulated offline → online transitions
Exercise data validated: all required fields present, no duplicate IDs

K. Rollback Considerations
Keep user_data table alive for 30 days post-migration. New sync writes to both. After confirmed stable, deprecate.
L. Estimated Complexity
High — schema migration with live data is always risky. The sync queue requires careful state machine design.
M. Recommended Implementation Order

Write migration SQL (no deploy yet)
Extract planGenerator.ts from store
Persist e1RM records
Expand Exercise interface + add ~50 new exercises (batch)
Implement SyncQueue
Rewrite supabase.ts sync functions
Apply migrations to staging Supabase project
Update manifest.json + sw.js
Deploy and verify


Phase 2 — Smart Onboarding & Plan Generation
A. Objectives
Add movement assessment, training history, starting weight algorithm, plan score display.
B. Existing Systems Affected

routes/onboarding.tsx — add 3 new steps, extend Profile type
store/useAppStore.ts — extend Profile interface
lib/planGenerator.ts — use starting weights from estimator

C. New Files Required
src/lib/startingWeightEstimator.ts
src/lib/planScorer.ts
src/components/PlanScoreCard.tsx
D. Existing Files Requiring Modification
src/store/useAppStore.ts   — extend Profile with MovementAssessment, TrainingHistory, RecoveryProfile
src/routes/onboarding.tsx  — add steps 11-13 (movement, history, recovery)
src/routes/plan.tsx        — show PlanScoreCard after generation
E. Schema Changes
sql-- Add columns to profiles table:
ALTER TABLE profiles ADD COLUMN movement_assessment JSONB;
ALTER TABLE profiles ADD COLUMN training_history JSONB;
ALTER TABLE profiles ADD COLUMN recovery_profile JSONB;
F. Dependency Changes
None.
G. State Management Impact
Profile interface grows by 3 optional fields. Zustand persist handles this transparently (undefined for existing users).
H. Migration Risks
Low — additive only. Existing profiles get undefined for new fields; all callers must handle.
I. Performance Considerations
startingWeightEstimator.ts runs once at profile creation — no performance concern.
J. Testing Requirements

Starting weight estimates validated against known strength standards
Plan score 0-100 validated across edge cases (minimal equipment, no priorities)
Onboarding navigation tested: back/forward through all 13 steps

K. Rollback Considerations
New profile fields are optional. Rollback simply ignores them.
L. Estimated Complexity
Medium.
M. Recommended Implementation Order

Extend Profile types + Zustand store
startingWeightEstimator.ts
Onboarding new steps (movement, history, recovery)
planScorer.ts
Wire plan score to plan page
Integration test full onboarding flow


Phase 3 — Intelligent Workout Session
A. Objectives
Real-time set feedback, adaptive rest timer, session summary screen, session tags.
B. Existing Systems Affected

routes/workout.$dayId.tsx — major refactor/extraction
store/useAppStore.ts — Session type gets tags, rpeOverall, notes, durationMin (already in type but never set)
lib/fatigueModel.ts — adaptiveRestSecs() helper already partially there

C. New Files Required
src/lib/setFeedback.ts
src/lib/sessionSummary.ts
src/components/SessionSummaryScreen.tsx
src/components/SetInputCard.tsx          (extracted from workout route)
src/components/RestTimerOverlay.tsx      (extracted from workout route)
src/components/ExerciseListOverlay.tsx   (extracted from workout route)
D. Existing Files Requiring Modification
src/routes/workout.$dayId.tsx    — extract sub-components, wire setFeedback, wire sessionSummary
src/lib/trainer.ts               — delete progressionHint(), keep coachOfTheDay()
src/store/useAppStore.ts         — saveSession() detects PRs, updates e1rmRecords
E. Schema Changes
sql-- sessions table already has notes, duration_min, rpe_overall
-- Add tags column:
ALTER TABLE sessions ADD COLUMN tags TEXT[];
F. Dependency Changes
None.
G. State Management Impact

saveSession() action extended: compute sessionSummary, detect new PRs, update e1rmRecords, push to sync queue
Add prRecords: PRRecord[] to store (new)

H. Migration Risks
Low for new features. The workout route refactor is high risk for regressions — must test all flows (complete set, undo, skip, rest timer, finish).
I. Performance Considerations
sessionSummary.ts computations run once on session complete — no concern. The workout UI must remain 60fps — avoid heavy computations during active logging.
J. Testing Requirements

Set feedback logic tested for all 6 branches
Session summary tested with edge cases (no RPE, bodyweight exercises, partial completion)
PR detection tested against known edge cases (same weight, higher reps)
Rest timer countdown accuracy tested

K. Rollback Considerations
Session summary screen is additive — if it breaks, old finish() flow can be restored.
L. Estimated Complexity
High — workout route is the most critical path in the app.
M. Recommended Implementation Order

Extract sub-components from workout route (no behavior change)
Implement setFeedback.ts
Wire feedback to workout UI
Implement adaptive rest timer
Implement sessionSummary.ts
Add PR record detection to saveSession()
Build SessionSummaryScreen component
Wire summary screen after workout completion
Add session tags UI


Phase 4 — Body & Health Tracking
A. Objectives
Extended body metrics, body composition estimation, nutrition targets, weekly check-in system.
B. Existing Systems Affected

store/useAppStore.ts — replace BodyWeightLog[] with BodyMetrics[]
routes/progress.tsx — body tab needs real data + new fields
lib/calc.ts — goalCalories, proteinTargetG to be superseded by nutrition.ts

C. New Files Required
src/lib/bodyComposition.ts       (Navy method, lean mass)
src/lib/nutrition.ts             (extends calc.ts, training/rest day macros)
src/lib/weeklyCheckin.ts         (checkin type + readiness integration)
src/components/BodyMetricsForm.tsx
src/components/NutritionTargetsCard.tsx
src/components/CheckinSheet.tsx
D. Existing Files Requiring Modification
src/store/useAppStore.ts    — BodyWeightLog → BodyMetrics migration
src/routes/progress.tsx     — wire real body data
src/routes/index.tsx        — replace mock calorie display with nutrition.ts targets
src/lib/calc.ts             — deprecate in favor of nutrition.ts (keep for backward compat)
E. Schema Changes
sql-- body_metrics already in spec schema; water_logs already specified
ALTER TABLE body_metrics ADD COLUMN measurements JSONB;
ALTER TABLE body_metrics ADD COLUMN photo_url TEXT;
CREATE TABLE weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  week_number INT NOT NULL,
  weight_kg FLOAT,
  energy_level SMALLINT,
  sleep_quality SMALLINT,
  muscle_soreness SMALLINT,
  overall_mood SMALLINT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_number)
);
F. Dependency Changes
None.
G. State Management Impact
BodyWeightLog → BodyMetrics is a breaking change for Zustand persist. Requires a migration function in the store's persist config using the migrate option:
typescriptpersist(..., {
  version: 2,
  migrate: (persistedState, version) => {
    if (version === 1) {
      return { ...persistedState,
        bodyMetrics: persistedState.bodyWeight?.map(bw => ({ ...bw, weightKg: bw.kg })) ?? []
      };
    }
  }
})
H. Migration Risks
Medium — bodyWeight → bodyMetrics key rename in localStorage. Must use Zustand persist migrate option to avoid losing existing data. Field rename kg → weightKg must be handled.
I. Performance Considerations
Body composition calculations are pure math — negligible. Photo storage in Supabase Storage requires presigned URL handling.
J. Testing Requirements

Navy body fat formula validated against published results
Persist migration tested with v1 localStorage data
Nutrition targets validated: calories balance (protein × 4 + carbs × 4 + fat × 9 ≈ total calories)

K. Rollback Considerations
If migration fails, v1 body weight data could be lost. Keep backup key bodyWeight_v1 during transition.
L. Estimated Complexity
Medium.
M. Recommended Implementation Order

Write persist migration function for bodyWeight → bodyMetrics
Implement bodyComposition.ts
Implement nutrition.ts
Build BodyMetricsForm
Wire progress page body tab with real data
Add NutritionTargetsCard to dashboard
Implement weeklyCheckin.ts + CheckinSheet


Phase 5 — Advanced Progression System
A. Objectives
Predictive load progression, plateau breaker, per-rep PR database.
B. Existing Systems Affected

lib/progressionEngine.ts — extended with predictor signals
lib/loadCalculator.ts — used by predictor
store/useAppStore.ts — add prRecords, plateauHistory to state
routes/workout.$dayId.tsx — pre-workout prediction card

C. New Files Required
src/lib/progressionPredictor.ts
src/lib/plateauBreaker.ts
src/lib/prDatabase.ts
src/components/PreWorkoutPredictions.tsx
src/components/PlateauBreakerCard.tsx
src/components/PRTimeline.tsx
D. Existing Files Requiring Modification
src/lib/progressionEngine.ts     — import predictor signals, add `readyToProgress` output
src/store/useAppStore.ts         — prRecords[], plateauHistory, saveSession() calls detectNewPRs()
src/routes/plan.tsx              — show plateau alerts + breaker suggestions
src/routes/workout.$dayId.tsx    — show pre-workout prediction card
src/routes/progress.tsx          — strength tab uses real PR data
E. Schema Changes
sql-- exercise_prs already in spec schema
-- Add plateau_history to plans or as separate table:
ALTER TABLE plans ADD COLUMN plateau_history JSONB DEFAULT '{}';
F. Dependency Changes
None.
G. State Management Impact

Add prRecords: PRRecord[] — synced to exercise_prs Supabase table
Add plateauHistory: Record<string, PlateauBreakStrategy[]> — per exercise
saveSession() calls detectNewPRs() and updates prRecords

H. Migration Risks
Low — new entities only. Existing users get empty arrays; PRs will populate as sessions are logged going forward. Historic PRs can be retroactively computed from existing sessions in a one-time migration.
I. Performance Considerations
predictProgression() scans last 4 sessions per exercise. At 150 exercises × 4 sessions, this is manageable but must be memoized in useProgressionForDay hook.
J. Testing Requirements

PR detection tested: same weight higher reps should NOT create a higher-weight PR
Progression predictor tested: scores correctly for each of 5 signals
Plateau breaker rotation tested: doesn't repeat same strategy consecutively

K. Rollback Considerations
Additive — rollback removes prediction card from UI, keeps data intact.
L. Estimated Complexity
High — predictor logic has many edge cases (insufficient data, bodyweight exercises, unilateral).
M. Recommended Implementation Order

prDatabase.ts + wire to saveSession()
Add prRecords to store
Wire progress page strength tab to real PR data
progressionPredictor.ts (build incrementally, signal by signal)
plateauBreaker.ts
PreWorkoutPredictions component
PlateauBreakerCard in plan page


Phase 6 — Smart Dashboard & Analytics
A. Objectives
Weekly intelligence report, strength standards comparison, muscle heatmap, exercise trend charts.
B. Existing Systems Affected

routes/progress.tsx — full rewrite with real data
routes/index.tsx — add weekly report card, remove mock PRs

C. New Files Required
src/lib/weeklyReport.ts
src/data/strengthStandards.ts
src/components/MuscleHeatmap.tsx      (SVG body outline)
src/components/WeeklyReportCard.tsx
src/components/StrengthStandardsBar.tsx
src/components/ExerciseTrendChart.tsx
D. Existing Files Requiring Modification
src/routes/progress.tsx    — wire all tabs to real data
src/routes/index.tsx       — replace mock PRs, add weekly report
E. Schema Changes
None — reads from existing tables.
F. Dependency Changes
The muscle heatmap SVG requires either an SVG asset or inline SVG paths for each muscle group. Consider a lightweight SVG library or hand-crafted paths. No npm dependency needed.
G. State Management Impact
Weekly report is purely derived state — computed from sessions, plan, prRecords. No new stored state required.
H. Migration Risks
Low — display only.
I. Performance Considerations
weeklyReport.ts aggregates across sessions — memoize with useMemo keyed to sessions.length. Muscle heatmap SVG rendering must be efficient — avoid re-renders on unrelated state changes.
J. Testing Requirements

Weekly report tested with 0, 1, 5, 50 sessions
Strength standards interpolation tested at boundary body weights
Heatmap color mapping tested for all 4 states (below/optimal/high/over)

K. Rollback Considerations
Display only — rollback is safe.
L. Estimated Complexity
Medium — strength standards data compilation is labor-intensive, code is straightforward.
M. Recommended Implementation Order

Fix progress page (remove mock data, wire real sessions)
weeklyReport.ts + WeeklyReportCard
strengthStandards.ts data + StrengthStandardsBar
ExerciseTrendChart component
MuscleHeatmap SVG component
Wire all to dashboard and progress routes


Phase 7 — Adaptive Plan Management
A. Objectives
Plan versioning with diff view, auto-deload detection, goal divergence detection, plan templates.
B. Existing Systems Affected

store/useAppStore.ts — advanceWeek() action gets real implementation
lib/fatigueModel.ts — checkDeloadNeeded() already exists, wire to scheduler
routes/plan.tsx — plan update diff view

C. New Files Required
src/lib/planEvolution.ts
src/lib/deloadScheduler.ts
src/data/planTemplates.ts
src/components/PlanUpdateDiff.tsx
src/components/PlanTemplateSelector.tsx
D. Existing Files Requiring Modification
src/store/useAppStore.ts   — advanceWeek() calls computeWeeklyPlanUpdates()
src/routes/plan.tsx        — show PlanUpdateDiff, template selector
src/lib/fatigueModel.ts    — checkDeloadNeeded() already exists, just needs wiring
E. Schema Changes
sql-- plans table already has week_number, blocks
-- Add plan_updates log:
CREATE TABLE plan_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  plan_id UUID REFERENCES plans,
  week_number INT,
  updates JSONB,   -- PlanUpdate[]
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
F. Dependency Changes
None.
G. State Management Impact

Add pendingPlanUpdates: PlanUpdate[] to store — updates shown to user before applying
advanceWeek() populates pendingPlanUpdates
New action applyPlanUpdates() accepts/rejects each update

H. Migration Risks
Medium — plan mutation logic is complex. Wrong progression decisions could damage users' plans.
I. Performance Considerations
computeWeeklyPlanUpdates() should run lazily (on advanceWeek() call), not reactively.
J. Testing Requirements

Plan update computation tested for all update types
Deload scheduler tested against all 5 trigger conditions
Goal divergence detection tested with simulated behavioral patterns

K. Rollback Considerations
Keep pendingPlanUpdates with explicit user acceptance — never auto-apply without confirmation.
L. Estimated Complexity
High — plan mutation is the highest-stakes algorithmic work.
M. Recommended Implementation Order

deloadScheduler.ts (wraps existing checkDeloadNeeded)
planEvolution.ts
Wire advanceWeek() in store
PlanUpdateDiff component
planTemplates.ts data
PlanTemplateSelector component


Phase 8 — Gamification
A. Objectives
Expanded achievements (20+), streak visualization, monthly challenges.
B. Existing Systems Affected

lib/achievements.ts — add 20+ new achievement definitions
store/useAppStore.ts — add challenges: Challenge[], streakData: StreakData

C. New Files Required
src/lib/streakEngine.ts
src/data/challenges.ts
src/components/AchievementsGrid.tsx
src/components/ChallengeCard.tsx
src/components/StreakWidget.tsx
D. Existing Files Requiring Modification
src/lib/achievements.ts          — add strength milestone achievements
src/store/useAppStore.ts         — add challenges, active achievements display
src/routes/progress.tsx          — add achievements tab
src/routes/index.tsx             — add StreakWidget
E. Schema Changes
sqlCREATE TABLE user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  progress JSONB
);
F. Dependency Changes
None.
G. State Management Impact
Low — achievements already in store. Add activeChallenges.
H. Migration Risks
Low — additive.
I. Performance Considerations
Achievement checking runs on saveSession(). With 35+ achievements, this is O(35) — negligible.
J. Estimated Complexity
Low-Medium.
M. Recommended Implementation Order

streakEngine.ts
Expand achievements.ts with strength milestones
StreakWidget
AchievementsGrid
challenges.ts + ChallengeCard


Phase 9 — Performance & Security
A. Objectives
Bundle optimization, WebAuthn biometrics, input sanitization, data export, list virtualization.
B. New Files Required
src/lib/sanitize.ts
src/lib/webauthn.ts
src/lib/dataExport.ts
C. Existing Files Requiring Modification
src/routes/onboarding.tsx    — sanitize all text inputs before save
src/routes/workout.$dayId.tsx — sanitize notes
src/lib/supabase.ts           — sanitize before all writes
src/routes/library.tsx        — virtualize exercise list (at 150+ entries)
src/routes/profile.tsx        — add biometric auth UI
D. Dependency Changes
Virtualization: evaluate @tanstack/react-virtual (already in the TanStack ecosystem — low bundle risk). Data export: native Blob + URL.createObjectURL — no dependencies.
E. Estimated Complexity
Medium.
M. Recommended Implementation Order

sanitize.ts + apply everywhere
Virtualize library exercise list
webauthn.ts + biometric UI in profile
dataExport.ts
Bundle analysis + optimization
SW cache strategy refinement


Phase 10 — Strava Integration
A. Objectives
OAuth flow, cardio load integration into ACWR, Strava dashboard widget.
B. New Files Required
src/lib/strava.ts
src/lib/cardioFatigueModel.ts
src/routes/auth.strava.tsx
src/components/StravaWidget.tsx
C. Existing Files Requiring Modification
src/lib/fatigueModel.ts      — accept cardio burden in ACWR calculation
src/hooks/useReadiness.ts    — include cardio load from Strava
src/routes/profile.tsx       — Strava connect button
D. Schema Changes
sqlCREATE TABLE strava_tokens (
  user_id UUID PRIMARY KEY REFERENCES profiles ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ
);
E. Estimated Complexity
Medium — OAuth is standard; the interesting part is the cardio ACWR integration.

10. File-Level Modification Plan
Files to Delete or Deprecate
FileActionReasonsrc/lib/trainer.ts::progressionHintDelete functionDuplicate of progressionEnginegeneratePlan in useAppStore.tsDelete functionReplaced by enhanced version
Files to Extract (Refactor Without Behavior Change)
SourceDestinationWhat MovesuseAppStore.ts::generateEnhancedPlanlib/planGenerator.tsEntire plan generation functionworkout.$dayId.tsx::RestTimerOverlaycomponents/RestTimerOverlay.tsxRest timer DOM + logicworkout.$dayId.tsx::SetInputCardcomponents/SetInputCard.tsxWeight/reps input with bumpersworkout.$dayId.tsx::ExerciseListOverlaycomponents/ExerciseListOverlay.tsxExercise list overlay
Files to Fix (Bugs/Mock Data)
FileFixroutes/progress.tsxRemove all Math.random(), wire real sessions dataroutes/index.tsxRemove fake PRs, wire prRecordslib/achievements.tsFix tempStreak double-declaration
Files to Extend (Additive Only)
FileExtensiondata/exercises.tsAdd 115 exercises, extend Exercise interfacelib/achievements.tsAdd 20+ achievement definitionslib/fatigueModel.tsExtend CNS_DEMAND table, add adaptiveRestSecs()store/useAppStore.tsAdd prRecords, e1rmRecords, syncQueue, bodyMetrics migrationlib/supabase.tsAdd entity-level sync functionsroutes/onboarding.tsxAdd 3 new stepsroutes/profile.tsxAdd biometric authpublic/manifest.jsonAdd display_override, handle_linkspublic/sw.jsAdd cache strategy refinements

11. Migration Strategy
Supabase Schema Migration
Step 1: Non-Breaking Phase (Run in Parallel)
sql-- Keep user_data table alive, create new tables
-- New writes go to BOTH user_data AND new tables
-- This allows rollback for 30 days
Step 2: ETL Migration Script
sql-- For each user in user_data:
-- 1. INSERT INTO profiles SELECT (blob->>'profile')
-- 2. INSERT INTO sessions SELECT EACH FROM jsonb_array_elements(blob->'sessions')
-- 3. INSERT INTO body_metrics SELECT EACH FROM jsonb_array_elements(blob->'bodyWeight')
-- etc.
Step 3: Switch Primary Read Path

Update loadFromSupabase() to read from new tables
Keep write to both for 1 more week

Step 4: Deprecate user_data

Remove writes to user_data
Archive table after 30 days

Zustand Store Migration
Version Management
typescriptpersist(..., {
  name: 'pt-app-v2',  // bump version key
  version: 2,
  migrate: (state, version) => {
    if (version === 1) {
      return {
        ...state,
        // bodyWeight (BodyWeightLog[]) → bodyMetrics (BodyMetrics[])
        bodyMetrics: state.bodyWeight?.map(bw => ({
          date: bw.date,
          weightKg: bw.kg,
        })) ?? [],
        bodyWeight: undefined,  // remove old key
        e1rmRecords: [],        // new field
        prRecords: [],          // new field
        syncQueue: [],          // new field
      };
    }
    return state;
  }
})
Exercise Interface Migration
The Exercise interface extension is backward-compatible. Existing exercises get undefined for new optional fields. Plan generation and scoring must handle undefined gracefully (already do via optional chaining patterns).

12. Testing Strategy
Current Testing Gaps
There is zero test infrastructure in this repository. No test runner, no test files, no CI pipeline.
Recommended Testing Approach
Layer 1: Pure Algorithm Tests (Highest Priority)
All src/lib/ functions are pure — they're ideal for unit testing. Priority order:

loadCalculator.ts — 1RM formulas, trend analysis
progressionEngine.ts — decision tree branches
planGenerator.ts (after extraction) — plan structure validity
fatigueModel.ts — ACWR calculation correctness
prDatabase.ts — PR detection edge cases
startingWeightEstimator.ts — known strength standards
bodyComposition.ts — Navy method against published values

Tool: Vitest (zero config with Vite, already in dependency graph via vite). Add:
"vitest": "^2.0.0" (devDependency)
Layer 2: Store Tests
Test Zustand actions in isolation:

saveSession() — verifies e1RM update, PR detection, sync queue push
setProfile() — verifies plan generation called, achievements checked
Persist migration — verifies v1 data correctly migrated to v2

Layer 3: Component Tests (Lower Priority)
Critical paths only:

workout.$dayId.tsx — set completion flow, rest timer, finish
onboarding.tsx — navigation, data persistence between steps

Tool: React Testing Library + Vitest.
Layer 4: E2E (Post-MVP)

Full onboarding → first workout → session summary flow
Offline → online sync verification

Tool: Playwright (works with TanStack Start).

13. Performance & Scalability Considerations
Current Performance Risks
Render Performance
ComponentRiskFixLibrary page (150+ exercises)Long list = DOM thrashVirtualize with @tanstack/react-virtualuseProgressionHintRecomputes e1RM from all sessions on every renderStore e1RM records, memoizeuseReadinessuseMemo already appliedOKProgress page chartsMath.random() removed, real data with useMemoOK after fix
Bundle Size
No bundle analysis has been run. Estimated concerns:

Recharts: ~150kb. Consider replacing with a lighter charting lib for simple line/bar charts. d3 is already in package.json — could build custom micro-charts.
shadcn/ui primitives: All 40+ components are imported. Tree-shaking should handle this but needs verification.
@radix-ui packages: 30+ separate packages. This is by design but adds up.

Target: < 250kb initial JS. Run vite-bundle-visualizer before optimization decisions.
Offline Performance
The current sw.js is cache-first for everything except Supabase hostnames. At 150+ exercises, the exercise DB JSON could be ~100kb — should be pre-cached in service worker install.
Algorithmic Scalability
AlgorithmCurrent O()At Scale (1 year of data)FixWeekly volume computeO(sessions × exercises × sets)Slow at 200+ sessionsIncremental weekly cachee1RM trend analysis (per hook call)O(sessions × exercises)Already slowStore persisted recordsAchievement checkingO(achievements)OKNone neededPlan scoringO(exercises × muscles)OKNone needed
Data Volume Projections
1 year of training (4× week, 5 exercises, 4 sets each):

Sessions: ~200
SetLogs: ~16,000
e1RM records: ~4,000

Zustand persist serializes this to localStorage. At ~200 bytes per set log: ~3.2MB. localStorage limit is 5-10MB per origin. This will hit limits within 18 months of serious use.
Mitigation: Sync to Supabase (which handles it fine) and potentially prune localStorage to last 90 days of sessions, reading historical from Supabase on demand.

14. Final Recommendations
Immediate Actions (Before Any Feature Work)

Clarify deployment platform — Cloudflare Workers (current config) vs Vercel (spec says). This affects server function patterns, environment variable handling, and edge runtime constraints.
Fix mock data — Remove all Math.random() from progress page and dashboard PRs. This is misleading to users and testers.
Delete dead code — Remove generatePlan() (basic, unused) and progressionHint() from trainer.ts. These create confusion and maintenance burden.
Extract plan generator — Move generateEnhancedPlan() out of useAppStore.ts to lib/planGenerator.ts. The store should call algorithms, not contain them.
Persist e1RM records — Add e1rmRecords: E1RMRecord[] to store and populate in saveSession(). This removes the O(n²) recomputation on every render.
Create Supabase migration files — Even if the schema exists in the dashboard, version-control it in supabase/migrations/.

Strategic Recommendations
Don't Rewrite, Extend
The algorithm layer (lib/) is of surprisingly high quality. Phases 1-7 should extend it, not replace it. The main architectural work is in the data layer (Supabase schema) and the sync layer (queue + entity sync).
Prioritize Sync Reliability Over Features
The #1 user trust issue in any fitness app is losing workout data. The sync queue (Phase 1) and proper Supabase schema should be the first sprint deliverables, even before UI features.
Migrate Store Incrementally
Don't attempt to slice the Zustand store in one refactor. Add new slices for new domains (PRs, sync queue, body metrics) and migrate existing slices only when touching them for feature work.
The Progress Page Is The Product's Proof Point
Users commit to a fitness app when they see their progress. The current progress page showing random data is a critical trust failure. Wiring real data to the existing chart components should happen in Sprint 1, not after Phase 6.
Vitest Before Features
Add Vitest with a handful of tests for the progression engine and load calculator before writing any new algorithms. The existing algorithmic code is excellent — having tests will make Phase 5 (predictive progression) much safer to build.
Implementation Sequence (Optimized for User Value)
Week 1:  Fix mock data + dead code + extract planGenerator
Week 2:  Supabase migration files + entity-level sync functions
Week 3:  SyncQueue + offline-first architecture
Week 4:  Persist e1RM records + PR detection in saveSession()
Week 5:  Onboarding extensions + starting weight estimator
Week 6:  Set feedback + session summary screen
Week 7:  Progression predictor + pre-workout card
Week 8:  Weekly report + wire progress page with real data
Week 9:  Body metrics extension + nutrition targets
Week 10: Muscle heatmap + strength standards
Week 11: Plan evolution + auto-deload
Week 12: Achievements expansion + streak widget
Week 13: Bundle optimization + virtualization + WebAuthn
Week 14: Testing + PWA hardening + data export
This sequence delivers real user value (real data in the progress page, better sessions) early rather than building infrastructure that users don't see until week 8+.