User journey analysis
Current flow
User lands on /
src/routes/index.tsx immediately redirects to /onboarding when profile is missing.
Onboarding wizard
src/routes/onboarding.tsx is a long multi-step wizard with 11 steps.
It collects goals, experience, body stats, equipment, schedule, priorities, hydration, movement, recovery and review.
The app generates the workout plan when onboarding finishes via useAppStore().setProfile().
Plan and workout
src/routes/plan.tsx shows the weekly plan, short day cards, and buttons to edit or start workouts.
src/routes/plan.day.$dayId.tsx allows manual day-level editing via swap/search and reps/sets fields.
src/routes/workout.$dayId.tsx runs the session with per-set logging, adaptive rest, and a completion summary.
Profile and auth
src/routes/profile.tsx is the account/settings hub.
useAuth() in src/hooks/useAuth.ts supports optional Supabase auth, cloud sync, and offline-first mode.
Auth/signup is only exposed in Profile when Supabase is configured.

Major gaps and non-intuitive flows
1. Onboarding is too heavy for first-time users
11 steps is a lot before the user ever sees a plan.
There is no “quick start” path for users who want a plan now and can fill details later.
The review step is good, but there is no way to jump directly to a previous section from review.
2. Profile / plan control UI is confusing
ProfilePage mixes account/auth, plan actions, preferences, and dangerous actions in one screen.
The “Regenerate workout plan” button calls setProfile(profile), which rebuilds the plan and likely overwrites any custom exercise edits without warning.
Reset all data is visible and destructive, with no confirmation modal or separation between account and local data.
3. Authorization and sync are under-exposed
useAuth() returns loadFromCloud(), but ProfilePage never calls it after sign in.
That means cloud data may not be loaded automatically, and users can think they’re synced when they are not.
The app only shows auth UI when Supabase is configured; there is no clear onboarding path for cloud backup benefits or status.
The app has a src/routes/auth.strava.tsx route, but Strava auth is not surfaced in profile or onboarding.

4. Unit settings are inconsistent
ProfilePage allows switching units between kg and lb.
Workout screens still show kg everywhere, which is a clear UX mismatch.
5. Workout persistence and day-to-day use
WorkoutSession stores state only in component memory.
If the user leaves the workout or refreshes, the current session is likely lost.
The dashboard does not surface an unfinished workout or help resume an in-progress session.
Important info like “next exercise” is hidden behind the exercise list overlay rather than shown in the main workout flow.
