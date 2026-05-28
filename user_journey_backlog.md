Scoped implementation backlog
1. Auth / Cloud sync improvements
Add automatic cloud load after sign in

Change src/routes/profile.tsx to call loadFromCloud() after signIn() / signUp()
Surface cloud sync status and last-synced timestamp
Justification: ensures users actually restore backed-up profile/plan data after auth
Clarify offline vs cloud mode

Show a banner in ProfilePage:
“Offline-only mode” when Supabase is not configured
“Cloud backup ready” when signed in
Add copy explaining benefit of signing in
Justification: reduces confusion around optional auth and backup
Add Strava connect CTA

Surface a Connect with Strava action in ProfilePage if auth.strava is enabled
Explain what Strava data contributes to readiness/recovery
Justification: unlocks an important integration and improves discoverability
2. Onboarding / first-time experience
Split onboarding into essential + optional flows

Keep core onboarding steps:
goal
experience
basic body stats
equipment
schedule/style
Move advanced fields into an optional “Finish setup later” or “Advanced preferences” path:
movement assessment
training history
recovery profile
supplements/hydration details
Justification: lowers activation friction and gets users to a plan faster
Add skip / later path

Provide a “Skip optional details” option on advanced screens
Allow plan generation with partial profile data
Justification: keeps momentum for first-time users who want to start immediately
Add summary with direct jump links

Add a review/summary page with editable section links
Let users edit one area without replaying entire onboarding
Justification: improves control and reduces onboarding friction
3. Profile / plan UX clarity
Reorganize ProfilePage sections
Separate into:
Account / sync
Profile & plan
Preferences
Data actions
Hide destructive actions behind clearer affordances
Justification: prevents accidental resets and makes status easier to scan
Improve “regenerate workout plan” behavior

Rename to “Regenerate from current profile”
Add warning modal if plan edits exist
Consider preserving:
exercise substitutions
day-level custom order
Justification: prevents plan overwrites and makes behavior predictable
Add confirmation for reset

Add a modal before reset()
Possibly require a second tap or typed confirmation for destructive reset
Justification: reduces accidental data loss

4. Day-to-day workout usability
Persist workout session state

Store current workout progress in useAppStore or localStorage
Include:
active day / exercise index
set completions
entered weights/reps
rest timer state
Justification: avoids lost progress when closing or refreshing
Add resume workout CTA

Add a dashboard card when an in-progress session exists
Optionally add “Resume workout” in bottom navigation or home screen
Justification: makes daily use smoother and prevents restarting sessions
Improve workout exercise queue visibility

Surface next exercise / remaining sets in main workout UI
Keep the “exercise list” accessible but not the only navigation path
Justification: reduces cognitive load during sessions
Align units consistently

Use units from store in workout screens, plan editor, and plan overview
Convert displayed weights and labels according to kg/lb
Justification: prevents confusion and trust issues
5. Dashboard & progress experience
Improve first-time dashboard guidance

Add explicit messages when plan is ready but no workout completed
Add quick action to start today’s workout
Justification: more effective first use
Surface plan issues and next actions

Show warning if plan array is empty despite having a profile
Indicate when profile data exists but plan generation has not occurred
Justification: reduces “blank dashboard” confusion
Enhance session summary

Ensure SessionSummaryScreen shows:
next workout
weekly progress
next recommended action
Justification: reinforces daily coaching and motivation
Priority + estimated effort
High priority / small effort

automatic cloud load after sign in
auth sync status copy
reset confirmation modal
unit consistency fixes
first-time dashboard guidance
Medium priority / medium effort

onboarding split into essential vs optional
summary page with jump links
profile page reorganization
workout persistence
resume workout CTA
Lower priority / larger effort

preserve custom plan edits during regenerate
Strava integration CTA and explanation
richer workout queue / next-exercise UX
improved session summary guidance
