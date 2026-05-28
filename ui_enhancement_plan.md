# UI/UX Enhancement Plan

## Summary
This plan outlines a phased implementation to improve the mobile user experience for the `retrainer/atlas` fitness app.
The focus is on strengthening core flows, establishing a refined visual system, polishing emotional feedback, and validating mobile accessibility.

---

## Phase 1: UX foundation & flow optimization

### Goals
- Reduce friction in core user journeys
- Improve first-time onboarding guidance
- Clarify the daily workout path
- Surface the most meaningful metrics first

### Actions
1. Audit the primary user journeys:
   - Onboarding → plan generation
   - Dashboard → start workout
   - Workout session → completion summary
   - Plan review → edit/regenerate routine

2. Improve onboarding (`atlas/src/routes/onboarding.tsx`):
   - Combine related questions into fewer, meaningful steps
   - Add clearer progress context and guidance copy
   - Add a final review block showing why each answer matters

3. Strengthen the dashboard (`atlas/src/routes/index.tsx`):
   - Promote the next workout with one strong hero CTA
   - Surface readiness and hydration earlier
   - Include a first-time dashboard experience for new users

4. Refine plan review (`atlas/src/routes/plan.tsx`):
   - Highlight weekly structure and day focus
   - Make regenerate secondary and start workout more prominent
   - Add a clear plan summary block with the rationale

5. Simplify the workout flow (`atlas/src/routes/workout.$dayId.tsx`):
   - Keep the main action thumb-friendly and obvious
   - Show the current set objective, rest state, and progress clearly
   - Improve exercise list navigation and reorder affordance

---

## Phase 2: Visual system & component polish

### Goals
- Create consistent spacing and hierarchy
- Establish a calm, premium palette with a strong accent
- Standardize cards, headers, and navigation styling

### Actions
1. Refine theme styling in `atlas/src/styles.css`:
   - Use 8-point grid spacing consistently
   - Soften harsh black borders
   - Reserve accent color for CTAs and important highlights

2. Improve shared components (`atlas/src/components/AppShell.tsx`):
   - Add consistent `Card`, `SectionTitle`, and `StatCard` variants
   - Ensure spacing and elevation are uniform across screens

3. Enhance bottom navigation (`atlas/src/components/BottomNav.tsx`):
   - Increase tap area and label readability
   - Add a subtle active pill or highlight style

4. Add smaller UI primitives for consistency:
   - `HighlightBadge`
   - `EmptyState`
   - `ProgressChip`
   - `SectionDivider`

---

## Phase 3: Screen-level redesign & emotional polish

### Goals
- Make each screen look intentional and feel rewarding
- Create memorable peak moments at workout completion
- Add better closure and next-step cues

### Actions
1. Dashboard
   - Use a stronger hero card for today’s workout and coach guidance
   - Add a weekly momentum indicator or progress strip

2. Workout screen
   - Upgrade the exercise detail card with large title and objective
   - Improve rest timer clarity, countdown, and feedback
   - Make weight/reps controls more accessible and easier to use

3. Session summary
   - Amplify the celebration header in `atlas/src/components/SessionSummaryScreen.tsx`
   - Add an end-of-session next-step block: next workout, recovery, plan review
   - Introduce a more polished PR highlight treatment

4. Onboarding
   - Add a warm welcome screen and explain why each step matters
   - Use coaching language and positive microcopy throughout

5. Plan page
   - Add weekly rhythm or color-coded day cards
   - Make the plan score a meaningful signal, not just a number

---

## Phase 4: Interaction, accessibility, and validation

### Goals
- Add polished motion and micro-interactions
- Ensure mobile accessibility and safe-area support
- Validate the app at small widths and with assistive use

### Actions
1. Add motion and transitions for state changes:
   - Tap feedback
   - progress updates
   - overlays and summary reveals

2. Accessibility checks:
   - Ensure text contrast in light/dark themes
   - Guarantee all tap targets meet minimum size
   - Add aria labels for overlays and interactive controls

3. Mobile validation:
   - Test at 375px width
   - Remove horizontal scroll issues
   - Verify fixed bottom footer and nav layouts

4. UX polish:
   - Refine copy tone across the app
   - Add fallback empty states and helpful first-use messaging
   - Document design decisions where helpful

---

## Implementation sequence
1. Update `styles.css`, `AppShell.tsx`, `BottomNav.tsx`
2. Improve onboarding
3. Refine dashboard
4. Improve plan page
5. Polish workout flow
6. Enhance session summary
7. Perform accessibility and motion pass

---

## Key focus areas
- Thumb-zone primary actions
- Clear next step on every screen
- Consistent 8-point spacing and visual hierarchy
- Emotional workout completion feedback
- Guided onboarding and calm premium visuals
- Mobile accessibility and safe area support
