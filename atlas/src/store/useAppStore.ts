import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildAchievementContext, checkNewAchievements } from "@/lib/achievements";
import { showAchievementNotification } from "@/lib/notifications";
import { createPeriodizationBlocks, type TrainingBlock, type UndulatingBlock } from "@/lib/periodization";
import { generateEnhancedPlan } from "@/lib/planGenerator";
import { estimateStartingWeights } from "@/lib/startingWeightEstimator";
import type {
  Profile,
  PlanDay,
  PlannedExercise,
  SetLog,
  Session,
  SessionExerciseLog,
  SessionTag,
  BodyWeightLog,
  WaterLog,
  SupplementLog,
  BodyMetrics,
  ExercisePR,
  WeeklyCheckin,
} from "@/data/types";

// Re-export types for backward compatibility with existing imports
export type {
  Goal,
  Experience,
  Style,
  Activity,
  Gender,
  Profile,
  PlanDay,
  PlannedExercise,
  SetLog,
  Session,
  SessionExerciseLog,
  SessionTag,
  BodyWeightLog,
  WaterLog,
  SupplementLog,
  BodyMetrics,
  ExercisePR,
  WeeklyCheckin,
} from "@/data/types";

// ─── App State Interface ────────────────────────────────────────────────────

interface AppState {
  // ── Core ──
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

  // ── Achievements ──
  /** IDs of unlocked achievements */
  achievements: string[];

  // ── Periodization ──
  /** Current week number for periodization tracking (0-indexed, increments weekly) */
  currentWeekNumber: number;
  /** Periodization blocks generated for current profile */
  trainingBlocks: TrainingBlock[];

  // ── Extended tracking (Phase 4-5, optional) ──
  /** Enhanced body metrics with measurements and body fat */
  bodyMetrics: BodyMetrics[];
  /** Exercise PRs per rep count */
  exercisePRs: ExercisePR[];
  /** Weekly check-in history */
  weeklyCheckins: WeeklyCheckin[];

  // ── Sync ──
  /** Timestamp of last successful Supabase sync */
  lastSyncedAt: string | null;

  // ── Actions ──
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
  /** Set last synced timestamp */
  setLastSyncedAt: (ts: string) => void;
  /** Add body metrics entry */
  addBodyMetrics: (m: BodyMetrics) => void;
  /** Add exercise PR */
  addExercisePR: (pr: ExercisePR) => void;
  /** Add weekly check-in */
  addWeeklyCheckin: (c: WeeklyCheckin) => void;
  reset: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Core state ──
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

      // ── Achievements ──
      achievements: [],

      // ── Periodization ──
      currentWeekNumber: 0,
      trainingBlocks: [],

      // ── Extended tracking ──
      bodyMetrics: [],
      exercisePRs: [],
      weeklyCheckins: [],

      // ── Sync ──
      lastSyncedAt: null,

      // ── Actions ──
      unlockAchievement: (id) =>
        set({ achievements: [...new Set([...get().achievements, id])] }),

      advanceWeek: () =>
        set({ currentWeekNumber: get().currentWeekNumber + 1 }),

      setTheme: (theme) => set({ theme }),
      setUnits: (units) => set({ units }),

      setProfile: (profile) => {
        const blocks = createPeriodizationBlocks(profile.experience, 0, profile.goal);
        const state = get();
        const plan = generateEnhancedPlan(profile, blocks, 0, {
          favorites: state.favorites,
          disliked: state.disliked,
        });
        // Apply starting weights from estimation algorithm
        const startingWeights = estimateStartingWeights(profile, profile.trainingHistory);
        const planWithWeights = plan.map((day) => ({
          ...day,
          exercises: day.exercises.map((ex) => ({
            ...ex,
            lastWeight: startingWeights[ex.exerciseId] ?? ex.lastWeight,
          })),
        }));
        set({
          profile,
          plan: planWithWeights,
          trainingBlocks: blocks,
          currentWeekNumber: 0,
        });
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

      addWeight: (kg) =>
        set({
          bodyWeight: [
            ...get().bodyWeight,
            { date: new Date().toISOString().slice(0, 10), kg },
          ],
        }),

      addWater: (ml) => {
        const today = new Date().toISOString().slice(0, 10);
        const w = get().water;
        const idx = w.findIndex((x) => x.date === today);
        if (idx >= 0) {
          const copy = [...w];
          copy[idx] = { ...copy[idx], ml: copy[idx].ml + ml };
          set({ water: copy });
        } else {
          set({ water: [...w, { date: today, ml }] });
        }
      },

      toggleSupplement: (name) => {
        const today = new Date().toISOString().slice(0, 10);
        const s = get().supplements;
        const idx = s.findIndex((x) => x.date === today && x.name === name);
        if (idx >= 0) {
          const copy = [...s];
          copy[idx] = { ...copy[idx], taken: !copy[idx].taken };
          set({ supplements: copy });
        } else {
          set({ supplements: [...s, { date: today, name, taken: true }] });
        }
      },

      toggleFavorite: (id) => {
        const f = get().favorites;
        set({
          favorites: f.includes(id)
            ? f.filter((x) => x !== id)
            : [...f, id],
        });
      },

      toggleDisliked: (id) => {
        const d = get().disliked;
        set({
          disliked: d.includes(id)
            ? d.filter((x) => x !== id)
            : [...d, id],
        });
      },

      setRemindersOn: (remindersOn) => set({ remindersOn }),

      updatePlanDay: (dayId, exercises) =>
        set({
          plan: get().plan.map((d) =>
            d.id === dayId ? { ...d, exercises } : d,
          ),
        }),

      setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),

      addBodyMetrics: (m) =>
        set({ bodyMetrics: [...get().bodyMetrics, m] }),

      addExercisePR: (pr) =>
        set({ exercisePRs: [...get().exercisePRs, pr] }),

      addWeeklyCheckin: (c) =>
        set({ weeklyCheckins: [...get().weeklyCheckins, c] }),

      reset: () =>
        set({
          profile: null,
          plan: [],
          sessions: [],
          bodyWeight: [],
          water: [],
          supplements: [],
          bodyMetrics: [],
          exercisePRs: [],
          weeklyCheckins: [],
          achievements: [],
          currentWeekNumber: 0,
          trainingBlocks: [],
          lastSyncedAt: null,
        }),
    }),
    { name: "pt-app-v1" },
  ),
);