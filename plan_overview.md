Comprehensive Implementation Plan: AI-Like Personal Trainer App
A solid foundation with TanStack Start, Zustand, shadcn/ui, and a good exercise library. Here's a phased plan to transform it into a genuinely intelligent trainer replacement.

Phase 1: Smart Data Foundation (Week 1-2)
1a. Supabase Integration & Auth

Set up Supabase project with auth (email + Apple Sign-In placeholder → real)
Schema: profiles, workout_plans, sessions, set_logs, body_metrics, exercises
Migrate Zustand persist → Supabase sync layer (keep Zustand as local cache, sync on mutation)
Row-level security policies so users only see their own data
Offline-first pattern: queue mutations locally, flush on reconnect

1b. Enhanced User Profiling
Expand the onboarding wizard to capture data that feeds the algorithms:

Movement screening: ask about mobility limitations, past injuries with severity (mild/moderate/severe), recovery time
Training history: longest consistent streak, typical reasons for stopping, preferred training time of day
Recovery factors: average sleep hours, stress level (1-10), job activity level
Anthropometrics: optionally track body fat %, waist/hip/chest measurements
1RM estimation: for key lifts via Epley formula from first session data

1c. Exercise Database Expansion

Expand from ~35 to 200+ exercises with: force type (push/pull/hinge/squat/carry), movement pattern, joint stress level, CNS demand rating
Add exercise relationships (primary movers, synergists, stabilizers)
This data feeds the smart substitution and pairing algorithms


Phase 2: Core Intelligence Algorithms (Week 2-4)
2a. Periodization Engine
The heart of the "smart trainer" experience. Implement these in src/lib/periodization.ts:
Linear Periodization (beginners): straightforward weekly progression
Undulating Periodization (intermediate): vary rep ranges across sessions within same week
Block Periodization (advanced): accumulation → intensification → realization blocks of 3-4 weeks each
TrainingBlock {
  phase: "accumulation" | "intensification" | "realization" | "deload"
  weeks: number
  targetRIR: number          // Reps In Reserve
  volumeModifier: number     // multiplier vs baseline
  intensityRange: [number, number]  // % of 1RM
}
The engine evaluates which phase a user is in based on: weeks trained, fatigue score, recent performance trend, and upcoming schedule gaps.
2b. Adaptive Load Calculator (src/lib/loadCalculator.ts)
Starting weight suggestions using multiple signals:

Beginner: bodyweight-based formulas (e.g., squat start = 0.5× BW, bench = 0.3× BW for males)
After first session: Epley 1RM estimation from completed sets, then work backwards to target rep range at ~RPE 7
Ongoing: track e1RM trend across sessions, flag plateaus (no improvement in 3+ sessions), auto-suggest deload

Key formula stack:
Epley 1RM = weight × (1 + reps/30)
Brzycki 1RM = weight × 36 / (37 - reps)
Working weight = 1RM × intensity_factor[rep_range]
Store e1RM history per exercise per user. This is the "strength timeline" that makes progress visible.
2c. Volume Landmark Tracking (src/lib/volumeLandmarks.ts)
Based on Mike Israetel's volume research — track per muscle group per week:

MEV (Minimum Effective Volume): starting point, 10-12 sets
MAV (Maximum Adaptive Volume): optimal zone, 12-20 sets
MRV (Maximum Recoverable Volume): ceiling before overtraining

The planner stays within MEV→MAV initially, nudges toward MAV as user demonstrates recovery. If session RPEs trend high or user reports fatigue, pull back toward MEV and insert deload.
2d. Fatigue Management System (src/lib/fatigueModel.ts)
A simple but effective model without ML:
Weekly Fatigue Score = Σ(sets × weight × rep_factor × CNS_demand_factor)
Acute:Chronic Workload Ratio = 7-day load / 28-day rolling average
Rules:

ACWR 0.8–1.3 = green (optimal training zone)
ACWR > 1.5 = red (overreaching risk, suggest deload)
ACWR < 0.8 = yellow (detraining risk, suggest increasing load)

Surface this as a "Readiness Score" (0-100) on the dashboard — feels like AI, is just math.
2e. Progression Decision Tree (src/lib/progressionEngine.ts)
This runs after every completed session:
IF all sets completed at target reps AND avg RPE ≤ 7.5
  → suggest +increment next session (2.5kg upper, 5kg lower)
ELSE IF all sets completed but RPE 8-9
  → "Maintain weight, aim for cleaner execution"
ELSE IF failed to hit target reps on 2+ sets
  → "Stay at current weight, focus on technique"
ELSE IF failed for 2 consecutive sessions
  → suggest -10% deload for 1 session
IF same weight used for 3+ sessions
  → flag as plateau, suggest technique video or variation swap
Store this decision as a coaching_note on the session, surfaced as the "Coach's Verdict" card.

Phase 3: Smart Plan Generation (Week 3-5)
3a. Enhanced Plan Generator
Rebuild planGenerator.ts with:
Split optimization based on recovery: minimum 48h between same muscle groups, 72h for CNS-demanding exercises (deadlifts, heavy squats)
Exercise selection scoring: for each muscle group slot, score available exercises on:

Equipment match (0-10)
Difficulty match to experience level (0-10)
Injury compatibility (0 = excluded, 5 = modified, 10 = fine)
Movement pattern balance (penalize if pattern already appears 2× in same session)
User preference (favorites score +3, disliked score -5)

Pick top-scored exercise for each slot. This makes the plan feel curated without any AI.
Volume distribution: spread MEV sets across the week, never exceed MRV for any muscle, ensure each priority muscle gets ≥ MAV sets.
3b. Workout Session Intelligence
During active workout:

Warm-up set calculator: auto-suggest warm-up sets based on working weight (e.g., 2×10 bar, 1×8 50%, 1×5 70%, 1×3 85%)
Rest timer adaptation: if last set RPE ≥ 9, extend rest suggestion by 30s
Alternative on-the-fly: if equipment unavailable, one-tap substitution with biomechanically equivalent exercise
Session RPE tracking: prompt user for overall session difficulty at end, feeds fatigue model

3c. Deload Detection & Scheduling
Automatic deload triggers (reduce volume 40-50%, maintain intensity):

Every 4th week by default (configurable)
When ACWR > 1.5 for 3+ consecutive days
When user reports 3+ consecutive poor sleep nights
When 2+ exercises show plateau simultaneously

Surface as a "Recovery Week" — reframe deloads positively, show why recovery accelerates progress.

Phase 4: Body Composition Intelligence (Week 4-6)
4a. Body Weight Trend Analysis (src/lib/bodyTrends.ts)
Daily weight fluctuates ±2kg due to water, food, hormones. Apply:

7-day rolling average as the "true weight"
Weekly trend direction (losing/gaining/maintaining) with rate calculation
Rate comparison to goal: if goal is fat loss and losing >1%/week, flag as too aggressive (muscle loss risk)
Plateau detection: 14 days with <0.2kg rolling average change = plateau, suggest calorie adjustment

4b. Nutrition Guidance Module
Expand calc.ts:

TDEE recalculation: update as weight changes (lighter = lower TDEE)
Refeed suggestion: for fat loss users, suggest weekly higher-calorie day based on adherence tracking
Protein timing: on workout days, suggest protein distribution across meals
Calorie cycling: slightly higher calories on training days, lower on rest days

4c. Body Measurements Tracker
Add optional measurement tracking (waist, chest, arms, thighs) with trend visualization. Even without body fat testing, waist-to-height ratio and measurement trends give meaningful body composition signals.

Phase 5: PWA & Mobile Excellence (Week 5-7)
5a. Full PWA Setup

Service Worker with Workbox for offline support
Web App Manifest for Add to Home Screen
Background sync for queued mutations when offline
Push notifications via Web Push API (workout reminders, progression suggestions)
App icon + splash screens for iOS

5b. iOS-Specific Optimizations

Viewport fit cover with safe-area insets (already started)
Prevent scroll bounce except in scroll containers
touch-action: manipulation on all interactive elements to eliminate 300ms tap delay
Input zoom prevention (font-size 16px on all inputs)
Haptic feedback via navigator.vibrate() on set completion

5c. Performance

Route-based code splitting (already in TanStack Router)
Lazy load exercise images/videos
Virtualized lists for exercise library (react-virtual)
Optimistic UI updates for all mutations


Phase 6: Engagement & Retention (Week 6-8)
6a. Achievement System (src/lib/achievements.ts)
Rule-based achievements that feel earned:

Strength milestones (first time benching bodyweight, squatting 1.5× BW etc.)
Consistency badges (7-day, 30-day, 90-day streaks)
Volume PRs (most sets in a session, highest weekly volume)
Technique achievements (completing a session with all sets at RPE ≤ 8)

6b. Smart Notifications

Workout reminder at user's preferred training time (learned from session timestamps)
"You haven't logged in X days" re-engagement
"You're ready to hit a new PR" when algorithm predicts peak readiness
Weekly summary: volume vs prior week, weight trend, streak

6c. Coach Messaging System
Expand trainer.ts with context-aware messages:

Post-session: comment on what was notable (new PR, maintained volume, tough session)
Pre-session: prime the user based on what's planned and their current fatigue state
Weekly check-in prompt: 3-question survey (sleep, stress, soreness 1-5) → feeds fatigue model


Phase 7: Advanced Features (Week 8+)
7a. Strava Integration

OAuth flow to connect Strava account
Pull recent activities → classify as cardio, HIIT, endurance
Adjust weekly training load calculation to include cardio fatigue
Suggest reducing lifting volume on heavy cardio weeks

7b. Vercel Deployment

Environment variables for Supabase credentials
Edge functions for any server-side logic (plan generation for heavy computation)
Analytics via Vercel Analytics (privacy-preserving)
Preview deployments for testing

7c. AI Upgrade Path (Future)
When you're ready to add real AI, the architecture already supports it: replace the rules in progressionEngine.ts and planGenerator.ts with Claude API calls — all the data collection infrastructure will already be in place.

Implementation Priority Order
Start with these items for maximum early impact:

Supabase auth + basic sync — enables real data persistence, prerequisite for everything
Epley 1RM tracking + progression decision tree — this is what makes it feel smart immediately
Readiness/Fatigue score on dashboard — visible "intelligence" that users trust
PWA manifest + service worker — makes it feel like a real app on iPhone
Volume landmark tracking — prevents overtraining, justifies program changes to user
Enhanced plan generator with scoring — personalization users will actually notice


Key Files to Create
src/lib/periodization.ts       # block/undulating/linear logic
src/lib/loadCalculator.ts      # starting weights, e1RM, working sets
src/lib/volumeLandmarks.ts     # MEV/MAV/MRV per muscle tracking
src/lib/fatigueModel.ts        # ACWR, readiness score
src/lib/progressionEngine.ts   # post-session decision tree
src/lib/bodyTrends.ts          # rolling averages, plateau detection
src/lib/achievements.ts        # rule-based milestone system
src/lib/notifications.ts       # push notification logic
src/lib/supabase.ts            # client + typed query helpers
src/hooks/useReadiness.ts      # readiness score hook
src/hooks/useProgressionHint.ts
public/sw.js                   # service worker
public/manifest.json           # PWA manifest
The goal throughout is that every piece of "intelligence" is deterministic, fast, and explainable — users should be able to understand why the app is making a suggestion, which builds trust and retention better than opaque AI outputs.