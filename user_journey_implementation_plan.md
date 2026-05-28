Implementation plan
1. Streamline onboarding and reduce friction
Create a two-tier onboarding flow:
“Core setup” for goal, experience, schedule, and equipment.
“Advanced preferences” for optional hydration, supplements, movement, recovery, and training history.
Add a “Skip advanced preferences” button and “I’ll fill this later” copy.
Add a summary page with section links so users can edit one area without replaying all steps.
Justification: faster first plan generation increases activation and reduces drop-off.
2. Clarify profile/plan editing and preserve custom changes
Rework src/routes/profile.tsx into clearer sections:
Account / Cloud sync
Personal profile & plan
Preferences
Danger zone
Change Regenerate workout plan to:
explicitly say “Regenerate from current profile”
warn that custom day edits may be overwritten
optionally preserve exercise substitutions or plan day order
Add a modal for Reset all data with a confirmation step.
Justification: reduces accidental data loss and makes the plan/regeneration relationship obvious.

3. Make auth/cloud sync explicit and reliable
After successful sign-in in src/routes/profile.tsx, call loadFromCloud() and surface:
last sync time
whether cloud data was merged or loaded
sync status/errors
Add a tiny status banner in Profile:
“Offline-only mode” when Supabase is not configured
“Cloud backup ready” when signed in
Add a visible “Connect with Strava” action if Strava auth is available.
Justification: users need to trust backup and know why signing in matters.
4. Fix unit consistency across the app
Apply units from useAppStore in workout screens and anywhere weights are displayed.
Convert plan metadata and default weights to the selected unit.
Add unit-aware labels in src/routes/workout.$dayId.tsx and PlanDayPage.
Justification: inconsistent units create frustration and lower trust.

5. Improve day-to-day workout experience
Persist active workout session state in the store or localStorage so the user can resume:
current exercise index
set completion
weights/reps entered
Add a dashboard card for “Resume today’s workout” when a session is open.
Surface the exercise queue in the workout view:
next exercise name
remaining sets
ability to jump directly from the main screen
Add clearer set guidance:
target rep range
whether user is ahead or behind target
suggested next-set weight increment
Justification: smoother session flow reduces cognitive load and increases completion.

6. Improve onboarding / profile discoverability
Add direct feedback on the dashboard when:
plan exists but no workout started
profile exists but plan is invalid or empty
auth is available but not connected
Add help text or tooltips around:
why training history matters
what “priority muscle groups” does
what “auto water target” means
Justification: clearer context helps users understand why each field matters.
7. Make workout review and progress easier to consume
Ensure SessionSummaryScreen includes:
next scheduled workout
progress toward weekly goal
quick action to return to plan or start next day
Consider adding a “Today’s plan” preview to the workout screen header.
Justification: day-to-day use should feel like coaching, not just logging.


Prioritized execution sequence
Quick wins

Fix auth sync bug: call loadFromCloud() after sign in.
Add confirmation modal for “Reset all data”.
Surface unit setting consistently in workout screens.
Add “why sign in / sync” copy in Profile.
Onboarding optimization

Split essential vs advanced onboarding.
Add summary + jump links.
Add “skip optional details” path.
Profile / plan clarity

Reorganize Profile page and plan regeneration behavior.
Add clear plan overwrite warning.
Add Strava connect CTA if supported.
Workout usability

Persist session state.
Show next exercise and queue on main workout screen.
Improve rest/feedback presentation.
Add resume workout shortcut.
Polish

Add cloud sync status and last-synced timestamps.
Improve dashboard cards for first-time and incomplete sessions.
Add small onboarding tooltips and help copy.

Why these changes matter
The current app already has strong core logic, but the first-time path is too heavy and the profile/auth experience is easy to misread.
Making auth/sync explicit builds trust and reduces “did my progress save?” anxiety.
Preserving custom plan edits while still allowing regeneration keeps advanced users happy.
Improving workout session persistence and visibility turns the app into a usable daily coach rather than a one-off generator.
