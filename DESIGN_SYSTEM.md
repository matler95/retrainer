# Design System & Implementation Guidelines

## Atlas Fitness App - UI/UX Standards

This document codifies the design decisions made for the wizard improvements and serves as a reference for future feature work.

---

## Principles Applied

### 1. Right Input Method for the Context ✅
**Principle:** "Choose the right input method: sliders/scroll wheels for one-time setup, text fields for repeated/precise entry."

**Application:**
- **One-time setup** (Age, Height, Weight during onboarding) → **Sliders**
- **Repeated entry** (updating profile later) → **Text inputs** (future consideration)
- **Precise numeric data** (PR weights, form fields) → **Text with validation**
- **Set selection** (equipment, goals) → **Chips/toggles**

**Future reference:** When adding new numeric inputs, ask: "Will users enter this once or many times?"

### 2. Visual Hierarchy Through Typography ✅
**Principle:** Establish clear hierarchy using size, weight, and opacity — not just bold everything.

**Atlas Pattern:**
```
Primary:   text-2xl, font-bold, 100% opacity     (user's data - the star)
Secondary: text-sm,  font-medium, 100% opacity   (labels/context)
Tertiary:  text-xs,  font-normal, 70% opacity    (units/hints)
Hints:     text-xs,  font-normal, 60% opacity    (ranges/help text)
```

**Never use more than 4 font sizes or 3 font weights** (prevents visual chaos)

### 3. Spacing Grid (8-Point System) ✅
**Principle:** All spacing divisible by 4 or 8 for consistent rhythm.

**Atlas Spacing Scale:**
- **4px:** Micro (icon + text gap, tight spacing)
- **8px:** Compact (gap-1, inline spacing)
- **12px:** Normal (gap-3, between sections)
- **16px:** Standard (p-4, card padding)
- **24px:** Generous (space-y-6, major section breaks)
- **32px:** Large (between major sections)

**Implementation in Tailwind:**
- `gap-1` = 4px, `gap-2` = 8px, `gap-3` = 12px, `gap-4` = 16px
- `p-1` = 4px, `p-2` = 8px, `p-3` = 12px, `p-4` = 16px
- `space-y-3` = 12px gap, `space-y-6` = 24px gap

### 4. Color System (60/30/10 Rule) ✅
**Principle:** 60% neutral, 30% complementary, 10% accent.

**Atlas Implementation:**
- **60%** — `bg-background` / `white` (main content area)
- **30%** — `text-foreground` / `black` (text, structure)
- **10%** — Primary accent color (CTAs, indicators, highlights)

**Secondary backgrounds:**
- `bg-card` — For raised surfaces (cards, containers)
- `bg-muted/30` — For subtle grouping (used in wizard selectors)
- `bg-accent/5` — For informational callouts
- Never `bg-muted/100` for content (too harsh; use 20-30% opacity)

### 5. Slider as Primary Input for "One-Time Setup" ✅
**Principle:** Sliders provide context and prevent errors for bounded numeric input.

**When to use sliders:**
- ✅ Onboarding (done once or few times)
- ✅ Initial configuration (age, height, weight, goals)
- ✅ Quick adjustments (volume, intensity, frequency)

**When NOT to use sliders:**
- ❌ Precise repeated entry (PR weights per set)
- ❌ Open-ended ranges (exercise notes, descriptions)
- ❌ High-precision data (pace to millisecond)

**Best practice slider ranges:**
- Show **realistic min/max** (not 0-999)
- Include **min/max labels** below slider
- Display **current value prominently** (text-2xl)
- Consider **step size** (0.5kg for weight = smooth, 1yr for age = granular)

### 6. Card Pattern for Grouped Content ✅
**Principle:** Visual containers create breathing room and signal relationship.

**Atlas Card Pattern:**
```
<div className="bg-muted/30 rounded-2xl p-4 space-y-3">
  {/* content */}
</div>
```

- **Background:** `bg-muted/30` (subtle, not distracting)
- **Border radius:** `rounded-2xl` (modern, premium feel)
- **Padding:** `p-4` (16px, follows grid)
- **Internal spacing:** `space-y-3` (12px between elements)

**When to card:**
- ✅ Grouping related settings
- ✅ Making a section "scannable"
- ✅ Creating visual hierarchy

**When NOT to card:**
- ❌ Single element (unnecessary container)
- ❌ Already inside another card (too nested)
- ❌ Full-width content (use border-top/bottom instead)

### 7. Emoji Icons for Recognition ✅
**Principle:** Icons reduce cognitive load; emoji provides personality.

**Atlas emoji conventions:**
- 🎂 Age / Birthday (universal symbol)
- 📏 Height / Measurement
- ⚖️ Weight / Scale
- 🎯 Goal / Target
- 💪 Strength / Power
- 🔥 Intensity / Heat
- 💧 Hydration / Water
- 🌙 Sleep / Night
- 📊 Stats / Data

**Best practices:**
- **One emoji per concept** (consistency)
- **Pair with text label** (not emoji-only for accessibility)
- **Use sparingly** (don't emoji-fy everything)
- **Consistent size** (`text-lg` for headers, `text-sm` inline)

### 8. Real-Time Feedback ✅
**Principle:** Show users what they're doing **as they do it**.

**Atlas patterns:**
- **Sliders:** Value updates live as you drag
- **Chips:** Activate immediately on click
- **Forms:** Show validation state in real-time
- **Never:** Wait for user to blur field or submit

**Implementation:**
```tsx
<Slider 
  value={[age]} 
  onValueChange={([v]) => update("age", v)}  // Update immediately
/>
```

---

## Component Specifications

### Slider Component
**Location:** `atlas/src/components/ui/slider.tsx` (Radix UI)

**Usage:**
```tsx
<Slider 
  min={13} 
  max={100} 
  step={1} 
  value={[p.age]} 
  onValueChange={([v]) => update("age", v)} 
/>
```

**Ranges for Atlas metrics:**
- Age: 13–100 years (covers all users)
- Height: 140–220 cm (covers 99%+ of population)
- Weight: 40–150 kg (covers general fitness population)
- Days/week: 2–6 (realistic training frequency)
- Session duration: 30–120 min (practical session lengths)
- Sleep: 4–10 hours (medical recommendation range)

### Chip Component
**Location:** `atlas/src/routes/onboarding.tsx` (local component)

**Usage:**
```tsx
function Chip({ active, children, onClick }: { 
  active: boolean; 
  children: React.ReactNode; 
  onClick: () => void 
}) {
  // Styled toggle button with active state
}
```

**When to use:**
- Binary or multi-choice selection (goal, experience)
- Limited options (≤8 items)
- All options visible at once

**When NOT to use:**
- Many options (>8) → use select/dropdown
- Single selection with hierarchy → use cards
- Standalone action → use button

---

## Color Palette & Semantic Meaning

| CSS Variable | Hex | Usage | Semantic |
|--------------|-----|-------|----------|
| `--accent` | Primary brand color | CTAs, highlights, focus states | **Action/Primary** |
| `--primary` | Interactive color | Buttons, active states, sliders | **Interactive** |
| `--foreground` | Dark text color | Main text, headings | **Emphasis** |
| `--muted-foreground` | Gray text | Secondary text, hints | **Secondary** |
| `--card` | Light background | Card surfaces | **Container** |
| `--background` | Page background | Main content area | **Base** |

**Never use pure black (#000) or pure white (#FFF)** — use CSS variables for consistency.

---

## Touch Target Sizing

**WCAG 2.1 Level AAA Requirement:** Minimum 44×44 CSS pixels

**Atlas touch targets:**
- Slider handle: implicit 44px hit zone ✅
- Chip button: `min-h-12` (48px) ✅
- Input field: `h-9` (36px) — works for desktop, acceptable for mobile
- Icon button: `size-5` (20px) — only if redundant with text label

**When designing new interactive elements:** Always ensure ≥44×44pt

---

## Typography Scale

**Font:** System font stack (inherited from Tailwind)

**Size scale (based on text-* utilities):**
```
text-xs:   12px  ← Small labels, hints, helper text
text-sm:   14px  ← Secondary information, subheadings
text-base: 16px  ← Body text (default)
text-lg:   18px  ← Emphasis, card titles
text-xl:   20px  ← Section headings
text-2xl:  24px  ← Primary data display (values)
text-3xl:  30px  ← Page titles, major emphasis
```

**Weight scale:**
```
font-normal:   400  ← Body text
font-medium:   500  ← Labels, subtle emphasis
font-semibold: 600  ← Headings, strong emphasis
font-bold:     700  ← Primary data, key emphasis
```

**Atlas specific:**
- Never more than 4 sizes in one screen
- Never more than 3 weights in one screen
- Use opacity variations instead of weight for hierarchy

---

## Animation & Interaction

### Preferred transition timing:
- **Quick feedback:** 150ms (hover, toggle)
- **Smooth motion:** 300ms (drawer slide, modal)
- **Loading state:** 600-1000ms (indicates progress)

**Implementation:**
```css
/* Use Tailwind transition utilities */
className="transition-colors transition-all"
```

### States to design:
1. **Default** — Normal appearance
2. **Hover** — Mouse over (desktop only)
3. **Active** — Clicked/selected (visual feedback)
4. **Disabled** — Can't interact (opacity-50)
5. **Loading** — Processing (spinner, opacity)
6. **Error** — Something wrong (red text, icon)
7. **Success** — Complete (green, check icon)

---

## Accessibility Checklist

Before shipping any UI component:

- [ ] **Color contrast:** Text ≥ 4.5:1 ratio (WCAG AA)
- [ ] **Touch targets:** All interactive elements ≥ 44×44pt
- [ ] **Focus visible:** Tab navigation shows clear focus state
- [ ] **Semantic HTML:** Use proper `<button>`, `<label>`, `<input>`
- [ ] **ARIA labels:** Form inputs have associated labels
- [ ] **Screen reader:** Test with VoiceOver (Mac) or Narrator (Windows)
- [ ] **Keyboard nav:** All functions accessible via keyboard (no mouse required)
- [ ] **Font size:** Body text ≥ 12px without zoom
- [ ] **Color isn't only signal:** Don't rely solely on color to convey meaning

---

## Performance Considerations

### Mobile-first approach:
- Design for 375px width (iPhone SE baseline)
- Test on real devices (not just browser DevTools)
- Minimize JavaScript bundle (prefer CSS solutions)
- Use native form inputs where possible (better mobile UX)

### Asset optimization:
- SVG for icons (scalable, efficient)
- Emoji for decorative icons (built-in font, no HTTP request)
- WebP for images (modern browsers only)
- Always provide JPG fallback

### State management:
- Use local component state for UI-only state (form input, slider)
- Use Zustand store for global state (user profile, app config)
- Avoid prop-drilling deep component trees

---

## Future Features Template

When designing new features, use this template:

```markdown
# [Feature Name] - Design Brief

## User Need
What problem are we solving? (one sentence)

## Core Principle Applied
Which principle from this doc applies? (Section number)

## Input Methods
- [ ] Sliders (one-time setup)
- [ ] Text inputs (repeated entry)
- [ ] Chips (selection)
- [ ] Dropdowns (many options)

## Spacing
Grid units: 8pt system ✅
Padding: p-4 (16px) ✅
Gaps: space-y-3 (12px) ✅

## Typography
Primary text: text-{size}, font-{weight}
Secondary text: text-xs, font-normal, opacity-70
Hierarchy levels: 3 max

## Colors
Background: bg-{semantic}
Text: text-foreground / text-muted-foreground
Accent: Primary color only for CTAs

## Touch Targets
All interactive: ≥44×44pt ✅

## Accessibility Checklist
- [ ] Contrast ratio ≥ 4.5:1
- [ ] Keyboard navigation tested
- [ ] Screen reader tested (one mode)
- [ ] All text has semantic meaning (no emoji-only)
```

---

## References

- **Mobile Design SKILL:** `/skills/mobile-design/SKILL.md` (principles & patterns)
- **Wizard Improvements:** `WIZARD_IMPROVEMENTS.md` (implementation example)
- **Before/After:** `WIZARD_BEFORE_AFTER.md` (visual comparison)
- **Figma Workspace:** [Link to Figma] (shared designs)

---

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-05-28 | Initial design system doc + wizard improvements | Copilot |

---

**Last updated:** May 28, 2026
**Status:** Active — use as reference for all new features
