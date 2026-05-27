import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EXERCISES, type Equipment, type MuscleGroup } from "@/data/exercises";
import { buildAchievementContext, checkNewAchievements, ACHIEVEMENTS } from "@/lib/achievements";
import { showAchievementNotification } from "@/lib/notifications";
import { createPeriodizationBlocks, getCurrentBlock, formatRepRange, type TrainingBlock, type UndulatingBlock } from "@/lib/periodization";
import { getVolumeLandmarks } from "@/lib/volumeLandmarks";
import { pickTopScored } from "@/lib/exerciseScorer";
import type { Exercise } from "@/data/exercises";

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Default number of exercises per muscle group per session.
 * Used as baseline for volume calculations.
 */
const DEFAULT_EXERCISES_PER_MUSCLE: Partial<Record<MuscleGroup, number>> = {
  chest: 2,
  back: 2,
  shoulders: 2,
  biceps: 1,
  triceps: 1,
  legs: 3,
  glutes: 1,
  core: 1,
  calves: 1,
};

/**
 * Muscle groups covered by each workout style per day.
 * Used to determine which muscles need coverage when generating a plan.
 */
const DAY_MUSCLE_MAP: Record<string, MuscleGroup[][]> = {
  "push/pull/legs": [
    ["chest", "shoulders", "triceps"],          // Push
    ["back", "biceps"],                         // Pull
    ["legs", "glutes", "calves", "core"],       // Legs
  ],
  "upper/lower": [
    ["chest", "back", "shoulders", "biceps", "triceps"],    // Upper
    ["legs", "glutes", "calves", "core"],                   // Lower
  ],
  "full body": [
    ["legs", "chest", "back", "shoulders", "core"], // single full body template
  ],
};

/**
 * Generate an enhanced training plan using:
 * - Exercise scoring (equipment, injury, preference, experience, variety)
 * - Periodization-aware rep ranges (accumulation = higher reps, etc.)
 * - Volume landmarks (MEV/MAV/MRV) for set counts
 * - Muscle coverage balancing (via DAY_MUSCLE_MAP)
 * - Undulating periodization support (per-session rep ranges)
 * - User preferences (favorites/disliked) for better exercise selection
 *
 * @param profile - User's profile and preferences
 * @param blocks - Periodization training blocks
 * @param weekNumber - Current week (0-indexed) for phase lookup
 * @param options - Optional overrides for favorites, disliked, undulating blocks
 */
function generateEnhancedPlan(
  profile: Profile,
  blocks: TrainingBlock[],
  weekNumber: number,
  options?: {
    favorites?: string[];
    disliked?: string[];
    undulatingBlocks?: UndulatingBlock[];
    sessionIndex?: number; // Which session within the week (0-indexed)
  },
): PlanDay[] {
  const currentBlock = getCurrentBlock(blocks, weekNumber);
  const setModifier = currentBlock.setCountModifier;

  // Determine rep range — use undulating per-session range if available
  const repRange: [number, number] = (() => {
    if (
      options?.undulatingBlocks &&
      options.sessionIndex !== undefined &&
      options.sessionIndex >= 0
    ) {
      const undBlock = options.undulatingBlocks.find(
        (b) => b.phase === currentBlock.phase,
      );
      if (undBlock && options.sessionIndex < undBlock.sessionRepRanges.length) {
        return undBlock.sessionRepRanges[options.sessionIndex];
      }
    }
    return currentBlock.repRange;
  })();
  const repStr = formatRepRange(repRange);

  // Filter usable exercises once
  const usable = EXERCISES.filter((e) =>
    e.equipment.some((eq) => profile.equipment.includes(eq)) &&
    !profile.avoid.some((a) =>
      e.name.toLowerCase().includes(a.toLowerCase().trim()),
    ),
  );

  // Build a profile with favorites/disliked for the scorer
  // Uses a safe spread copy — never mutates the original profile
  const scoreProfile = {
    ...profile,
    favorites: options?.favorites ?? [],
    disliked: options?.disliked ?? [],
  } as Profile & { favorites: string[]; disliked: string[] };

  const day = (id: string, name: string, exs: PlannedExercise[]): PlanDay => ({
    id,
    name,
    exercises: exs,
  });

  /**
   * Get the muscle groups that still need coverage for a given day.
   * Uses DAY_MUSCLE_MAP to determine which muscle groups are primary
   * for the current workout style and day index.
   */
  const getNeededMuscles = (style: Style, dayIndex: number): MuscleGroup[] => {
    const template = DAY_MUSCLE_MAP[style];
    if (!template || dayIndex >= template.length) return [];
    return template[dayIndex];
  };

  /**
   * Get the default exercise count for a muscle group.
   * Uses DEFAULT_EXERCISES_PER_MUSCLE as baseline.
   */
  const getExerciseCount = (muscle: MuscleGroup, dayIndex: number): number => {
    return DEFAULT_EXERCISES_PER_MUSCLE[muscle] ?? 1;
  };

  /**
   * Scored pick: picks top N scored exercises for a muscle group,
   * respecting already-selected exercises for variety AND muscle coverage needs.
   */
  const scoredPick = (
    muscle: MuscleGroup,
    count: number,
    alreadySelected: string[],
    dayIndex: number,
  ): PlannedExercise[] => {
    const neededMuscles = getNeededMuscles(profile.style, dayIndex);

    const picked = pickTopScored(
      usable,
      muscle,
      scoreProfile,
      count,
      alreadySelected,
      neededMuscles,
    );

    // Calculate target sets based on volume landmarks
    const landmarks = getVolumeLandmarks(muscle);
    // Target is between MEV and MAV, adjusted by setCountModifier
    const targetSets = Math.max(
      2,
      Math.round((landmarks.mev + (landmarks.mav - landmarks.mev) * 0.5) * setModifier),
    );

    return picked.map((e) => ({
      exerciseId: e.id,
      sets: targetSets,
      reps: repStr,
      restSec: e.restSec,
    }));
  };

  const days = profile.daysPerWeek;
  const style = profile.style;

  if (style === "push/pull/legs") {
    const muscleMap = DAY_MUSCLE_MAP["push/pull/legs"];
    const base = muscleMap.map((muscles, i) => {
      const dayNames = ["Push", "Pull", "Legs"];
      const name = dayNames[i] ?? `Day ${i + 1}`;
      return day(
        `d${i + 1}`,
        name,
        muscles.flatMap((m) =>
          scoredPick(m as MuscleGroup, getExerciseCount(m as MuscleGroup, i), [], i),
        ),
      );
    });
    return base.slice(0, Math.max(3, days)).concat(
      days > 3
        ? base.slice(0, days - 3).map((d, i) => ({
            ...d,
            id: `d${4 + i}`,
            name: `${d.name} 2`,
          }))
        : [],
    );
  }

  if (style === "upper/lower") {
    const muscleMap = DAY_MUSCLE_MAP["upper/lower"];
    const base = muscleMap.map((muscles, i) => {
      const dayNames = ["Upper", "Lower"];
      const name = dayNames[i] ?? `Day ${i + 1}`;
      return day(
        `d${i + 1}`,
        name,
        muscles.flatMap((m) =>
          scoredPick(m as MuscleGroup, getExerciseCount(m as MuscleGroup, i), [], i),
        ),
      );
    });
    const out: PlanDay[] = [];
    for (let i = 0; i < days; i++) {
      const sourceDay = base[i % base.length];
      out.push({
        ...sourceDay,
        id: `d${i + 1}`,
        name: `${sourceDay.name} ${Math.floor(i / base.length) + 1}`,
      });
    }
    return out;
  }

  if (style === "bodybuilding split") {
    const split: [string, MuscleGroup[]][] = [
      ["Chest & Triceps", ["chest", "triceps"]],
      ["Back & Biceps", ["back", "biceps"]],
      ["Legs", ["legs", "glutes", "calves"]],
      ["Shoulders & Core", ["shoulders", "core"]],
      ["Arms", ["biceps", "triceps"]],
    ];
    return split.slice(0, days).map((s, i) =>
      day(
        `d${i + 1}`,
        s[0],
        s[1].flatMap((m) => scoredPick(m, getExerciseCount(m, i), [], i)),
      ),
    );
  }

  if (style === "strength focused") {
    const base = [
      day("d1", "Squat Focus", scoredPick("legs", 2, [], 0)),
      day("d2", "Bench Focus", scoredPick("chest", 2, [], 1)),
      day("d3", "Deadlift Focus", scoredPick("back", 2, [], 2)),
      day("d4", "Press Focus", scoredPick("shoulders", 2, [], 3)),
    ];
    return base.slice(0, days);
  }

  // full body — default fallback
  const fbMuscles: MuscleGroup[] = [
    "legs",
    "chest",
    "back",
    "shoulders",
    "core",
  ];
  return Array.from({ length: days }).map((_, i) =>
    day(
      `d${i + 1}`,
      `Full Body ${i + 1}`,
      fbMuscles.flatMap((m) => scoredPick(m, 1, [], i)),
    ),
  );
}

export type Goal = "lose fat" | "build muscle" | "strength" | "general fitness" | "recomposition";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Style = "full body" | "upper/lower" | "push/pull/legs" | "bodybuilding split" | "strength focused";
export type Activity = "sedentary" | "light" | "moderate" | "high";
export type Gender = "male" | "female" | "other";

export interface Profile {
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  experience: Experience;
  equipment: Equipment[];
  daysPerWeek: number;
  durationMin: number;
  style: Style;
  priorities: MuscleGroup[];
  avoid: string[];
  injuries: string;
  activity: Activity;
  supplements: string[];
  waterAuto: boolean;
  waterTargetMl: number;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: string;
  restSec: number;
  lastWeight?: number;
}

export interface PlanDay {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}

export interface SetLog {
  reps: number;
  weight: number;
  rpe?: number;
  done: boolean;
}

export interface SessionExerciseLog {
  exerciseId: string;
  sets: SetLog[];
  notes?: string;
}

export interface Session {
  id: string;
  dayId: string;
  date: string; // ISO
  exercises: SessionExerciseLog[];
  durationMin?: number;
}

export interface BodyWeightLog { date: string; kg: number }
export interface WaterLog { date: string; ml: number }
export interface SupplementLog { date: string; name: string; taken: boolean }

interface AppState {
  theme: "dark" | "light";
  units: "kg" | "lb";
  profile: Profile | null;
  plan: PlanDay[];
  sessions: Session[];
  bodyWeight: BodyWeightLog[];
  water: WaterLog[];
  supplements: SupplementLog[];
  favorites: string[];
  disliked: string[];
  remindersOn: boolean;
  /** IDs of unlocked achievements */
  achievements: string[];
  /** Current week number for periodization tracking (0-indexed, increments weekly) */
  currentWeekNumber: number;
  /** Periodization blocks generated for current profile */
  trainingBlocks: TrainingBlock[];
  setTheme: (t: "dark" | "light") => void;
  setUnits: (u: "kg" | "lb") => void;
  setProfile: (p: Profile) => void;
  setPlan: (p: PlanDay[]) => void;
  saveSession: (s: Session) => void;
  addWeight: (kg: number) => void;
  addWater: (ml: number) => void;
  toggleSupplement: (name: string) => void;
  toggleFavorite: (id: string) => void;
  toggleDisliked: (id: string) => void;
  setRemindersOn: (on: boolean) => void;
  updatePlanDay: (dayId: string, exercises: PlannedExercise[]) => void;
  /** Unlock an achievement by ID */
  unlockAchievement: (id: string) => void;
  /** Advance to next periodization week */
  advanceWeek: () => void;
  reset: () => void;
}

// --- Plan generation ---
function generatePlan(p: Profile): PlanDay[] {
  const usable = EXERCISES.filter(e =>
    e.equipment.some(eq => p.equipment.includes(eq)) &&
    !p.avoid.some(a => e.name.toLowerCase().includes(a.toLowerCase().trim()))
  );
  const byMuscle = (m: MuscleGroup) => usable.filter(e => e.primary === m || e.secondary.includes(m));

  const pick = (m: MuscleGroup, n: number) => {
    const list = byMuscle(m);
    const prioritized = p.priorities.includes(m) ? list : list;
    return prioritized.slice(0, n).map(e => ({
      exerciseId: e.id,
      sets: e.defaultSets,
      reps: e.defaultReps,
      restSec: e.restSec,
    }));
  };

  const day = (id: string, name: string, exs: PlannedExercise[]): PlanDay =>
    ({ id, name, exercises: exs });

  const days = p.daysPerWeek;
  const style = p.style;

  if (style === "push/pull/legs") {
    const base = [
      day("d1", "Push", [...pick("chest", 2), ...pick("shoulders", 2), ...pick("triceps", 2)]),
      day("d2", "Pull", [...pick("back", 3), ...pick("biceps", 2)]),
      day("d3", "Legs", [...pick("legs", 3), ...pick("glutes", 1), ...pick("calves", 1), ...pick("core", 1)]),
    ];
    return base.slice(0, Math.max(3, days)).concat(days > 3
      ? base.slice(0, days - 3).map((d, i) => ({ ...d, id: `d${4 + i}`, name: `${d.name} 2` })) : []);
  }

  if (style === "upper/lower") {
    const base = [
      day("d1", "Upper", [...pick("chest", 2), ...pick("back", 2), ...pick("shoulders", 1), ...pick("biceps", 1), ...pick("triceps", 1)]),
      day("d2", "Lower", [...pick("legs", 3), ...pick("glutes", 1), ...pick("calves", 1), ...pick("core", 1)]),
    ];
    const out: PlanDay[] = [];
    for (let i = 0; i < days; i++) out.push({ ...base[i % 2], id: `d${i + 1}`, name: `${base[i % 2].name} ${Math.floor(i / 2) + 1}` });
    return out;
  }

  if (style === "bodybuilding split") {
    const split: [string, MuscleGroup[]][] = [
      ["Chest & Triceps", ["chest", "triceps"]],
      ["Back & Biceps", ["back", "biceps"]],
      ["Legs", ["legs", "glutes", "calves"]],
      ["Shoulders & Core", ["shoulders", "core"]],
      ["Arms", ["biceps", "triceps"]],
    ];
    return split.slice(0, days).map((s, i) =>
      day(`d${i + 1}`, s[0], s[1].flatMap(m => pick(m, 2))));
  }

  if (style === "strength focused") {
    const base = [
      day("d1", "Squat Focus", [...pick("legs", 2), ...pick("back", 1), ...pick("core", 1)]),
      day("d2", "Bench Focus", [...pick("chest", 2), ...pick("triceps", 1), ...pick("shoulders", 1)]),
      day("d3", "Deadlift Focus", [...pick("back", 2), ...pick("legs", 1), ...pick("core", 1)]),
      day("d4", "Press Focus", [...pick("shoulders", 2), ...pick("triceps", 1), ...pick("chest", 1)]),
    ];
    return base.slice(0, days);
  }

  // full body
  return Array.from({ length: days }).map((_, i) => day(`d${i + 1}`, `Full Body ${i + 1}`,
    [...pick("legs", 1), ...pick("chest", 1), ...pick("back", 1), ...pick("shoulders", 1), ...pick("core", 1)]
  ));
}

export const generatePlanFromProfile = generatePlan;

// --- Seed demo data ---
function todayMinus(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function seed(): Partial<AppState> {
  const bw: BodyWeightLog[] = [];
  for (let i = 30; i >= 0; i -= 3) bw.push({ date: todayMinus(i), kg: 78 - i * 0.05 + (Math.random() - 0.5) * 0.3 });
  const water: WaterLog[] = [];
  for (let i = 7; i >= 0; i--) water.push({ date: todayMinus(i), ml: 1500 + Math.floor(Math.random() * 1500) });
  return { bodyWeight: bw, water, supplements: [], sessions: [] };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "light",
      units: "kg",
      profile: null,
      plan: [],
      sessions: [],
      bodyWeight: [],
      water: [],
      supplements: [],
      favorites: [],
      disliked: [],
      remindersOn: true,
      achievements: [],
      currentWeekNumber: 0,
      trainingBlocks: [],
      unlockAchievement: (id) => set({ achievements: [...new Set([...get().achievements, id])] }),
      advanceWeek: () => set({ currentWeekNumber: get().currentWeekNumber + 1 }),
      setTheme: (theme) => set({ theme }),
      setUnits: (units) => set({ units }),
      setProfile: (profile) => {
        const blocks = createPeriodizationBlocks(profile.experience, 0, profile.goal);
        const state = get();
        const plan = generateEnhancedPlan(profile, blocks, 0, {
          favorites: state.favorites,
          disliked: state.disliked,
        });
        const seeded = state.bodyWeight.length === 0 ? seed() : {};
        set({ profile, plan, trainingBlocks: blocks, currentWeekNumber: 0, ...seeded });
        // Check achievements unlocked by setting profile + plan
        const ctx = buildAchievementContext(state.sessions, state.bodyWeight, plan.length);
        const newAchs = checkNewAchievements(ctx, state.achievements);
        for (const a of newAchs) {
          get().unlockAchievement(a.id);
          showAchievementNotification(a.title, a.description);
        }
      },
      setPlan: (plan) => set({ plan }),
      saveSession: (s) => {
        set({ sessions: [s, ...get().sessions] });
        // Update lastWeight on plan from completed sets
        const updatedPlan = get().plan.map((day) => {
          if (day.id !== s.dayId) return day;
          return {
            ...day,
            exercises: day.exercises.map((ex) => {
              const sessionEx = s.exercises.find((se) => se.exerciseId === ex.exerciseId);
              if (!sessionEx) return ex;

              // Find the last completed set's weight
              const doneSets = sessionEx.sets.filter((set) => set.done);
              if (doneSets.length === 0) return ex;

              const lastWeight = doneSets[doneSets.length - 1].weight;
              return { ...ex, lastWeight };
            }),
          };
        });
        set({ plan: updatedPlan });

        // Check achievements after logging a session
        const ctx = buildAchievementContext(get().sessions, get().bodyWeight, get().plan.length);
        const newAchs = checkNewAchievements(ctx, get().achievements);
        for (const a of newAchs) {
          get().unlockAchievement(a.id);
          showAchievementNotification(a.title, a.description);
        }
      },
      addWeight: (kg) => set({ bodyWeight: [...get().bodyWeight, { date: new Date().toISOString().slice(0, 10), kg }] }),
      addWater: (ml) => {
        const today = new Date().toISOString().slice(0, 10);
        const w = get().water;
        const idx = w.findIndex(x => x.date === today);
        if (idx >= 0) {
          const copy = [...w]; copy[idx] = { ...copy[idx], ml: copy[idx].ml + ml }; set({ water: copy });
        } else set({ water: [...w, { date: today, ml }] });
      },
      toggleSupplement: (name) => {
        const today = new Date().toISOString().slice(0, 10);
        const s = get().supplements;
        const idx = s.findIndex(x => x.date === today && x.name === name);
        if (idx >= 0) { const copy = [...s]; copy[idx] = { ...copy[idx], taken: !copy[idx].taken }; set({ supplements: copy }); }
        else set({ supplements: [...s, { date: today, name, taken: true }] });
      },
      toggleFavorite: (id) => {
        const f = get().favorites;
        set({ favorites: f.includes(id) ? f.filter(x => x !== id) : [...f, id] });
      },
      toggleDisliked: (id) => {
        const d = get().disliked;
        set({ disliked: d.includes(id) ? d.filter(x => x !== id) : [...d, id] });
      },
      setRemindersOn: (remindersOn) => set({ remindersOn }),
      updatePlanDay: (dayId, exercises) => set({
        plan: get().plan.map(d => d.id === dayId ? { ...d, exercises } : d),
      }),
      reset: () => set({ profile: null, plan: [], sessions: [], bodyWeight: [], water: [], supplements: [] }),
    }),
    { name: "pt-app-v1" }
  )
);
