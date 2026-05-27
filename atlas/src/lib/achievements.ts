/**
 * Achievement definitions and checker.
 *
 * Achievements are deterministic — they check against logged data
 * (sessions, bodyweight streaks, volume milestones) and return
 * newly-unlocked achievements.
 *
 * Each achievement has a unique id, a condition function, and metadata
 * for display.
 */

import type { Session, BodyWeightLog } from "@/store/useAppStore";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  category: "streak" | "volume" | "strength" | "consistency" | "milestone";
  /** Check condition against current data. Returns true if newly unlocked. */
  condition: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  sessions: Session[];
  bodyWeight: BodyWeightLog[];
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  /** Total sets logged across all sessions */
  totalSetsLogged: number;
  /** Total weight lifted across all sessions (kg) */
  totalVolumeKg: number;
}

// ─── Achievement definitions ─────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  // ── Streak ──
  { id: "first-workout", title: "First Step", description: "Complete your first workout.", icon: "🌟", category: "streak", condition: (ctx) => ctx.totalWorkouts >= 1 },
  { id: "week-streak", title: "Week Warrior", description: "Train 3 days in a week.", icon: "🔥", category: "streak", condition: (ctx) => ctx.totalWorkouts >= 3 },
  { id: "two-week-streak", title: "Consistent", description: "Complete 7 workouts total.", icon: "💪", category: "streak", condition: (ctx) => ctx.totalWorkouts >= 7 },
  { id: "month-streak", title: "Monthly Devotion", description: "Complete 15 workouts total.", icon: "⚡", category: "streak", condition: (ctx) => ctx.totalWorkouts >= 15 },
  { id: "hundred-club", title: "Century Club", description: "Complete 100 workouts total.", icon: "🏆", category: "streak", condition: (ctx) => ctx.totalWorkouts >= 100 },
  { id: "50-workouts", title: "Half Century", description: "Complete 50 workouts total.", icon: "🎯", category: "streak", condition: (ctx) => ctx.totalWorkouts >= 50 },
  { id: "200-workouts", title: "Double Century", description: "Complete 200 workouts total.", icon: "👑", category: "streak", condition: (ctx) => ctx.totalWorkouts >= 200 },
  { id: "30-day-streak", title: "30-Day Warrior", description: "Train 30 days in a row.", icon: "🔥", category: "streak", condition: (ctx) => ctx.longestStreak >= 30 },
  { id: "7-day-streak", title: "Week Streak", description: "Train 7 consecutive days.", icon: "🔥", category: "streak", condition: (ctx) => ctx.longestStreak >= 7 },
  { id: "14-day-streak", title: "Two Week Machine", description: "Train 14 consecutive days.", icon: "🔥", category: "streak", condition: (ctx) => ctx.longestStreak >= 14 },

  // ── Volume ──
  { id: "volume-1000", title: "Light Weight", description: "Lift a cumulative 1,000 kg.", icon: "🏋️", category: "volume", condition: (ctx) => ctx.totalVolumeKg >= 1000 },
  { id: "volume-10000", title: "Heavy Lifter", description: "Lift a cumulative 10,000 kg.", icon: "🏋️", category: "volume", condition: (ctx) => ctx.totalVolumeKg >= 10_000 },
  { id: "volume-100000", title: "Legendary Volume", description: "Lift a cumulative 100,000 kg.", icon: "💎", category: "volume", condition: (ctx) => ctx.totalVolumeKg >= 100_000 },
  { id: "volume-500000", title: "Half Million Club", description: "Lift a cumulative 500,000 kg.", icon: "💎", category: "volume", condition: (ctx) => ctx.totalVolumeKg >= 500_000 },
  { id: "volume-1000000", title: "Million Kg Club", description: "Lift a cumulative 1,000,000 kg.", icon: "👑", category: "volume", condition: (ctx) => ctx.totalVolumeKg >= 1_000_000 },
  { id: "ton-session", title: "One Ton Session", description: "Lift 1,000 kg in a single workout.", icon: "⚖️", category: "volume", condition: (ctx) => {
    // Check if any single session exceeded 1000kg
    return ctx.sessions.some(s => {
      const vol = s.exercises.reduce((sum, e) => sum + e.sets.filter(set => set.done).reduce((s2, set) => s2 + set.weight * Math.max(1, set.reps), 0), 0);
      return vol >= 1000;
    });
  }},

  // ── Strength ──
  { id: "sets-100", title: "Set Seeker", description: "Complete 100 sets total.", icon: "📊", category: "strength", condition: (ctx) => ctx.totalSetsLogged >= 100 },
  { id: "sets-1000", title: "Set Master", description: "Complete 1,000 sets total.", icon: "📈", category: "strength", condition: (ctx) => ctx.totalSetsLogged >= 1000 },
  { id: "sets-5000", title: "Set Legend", description: "Complete 5,000 sets total.", icon: "🏅", category: "strength", condition: (ctx) => ctx.totalSetsLogged >= 5000 },
  { id: "first-pr", title: "Personal Record", description: "Achieve your first PR.", icon: "📈", category: "strength", condition: (ctx) => ctx.totalWorkouts >= 2 }, // Simplified — needs PR data
  { id: "10-prs", title: "PR Collector", description: "Achieve 10 personal records.", icon: "🏆", category: "strength", condition: (ctx) => ctx.totalWorkouts >= 10 },

  // ── Consistency ──
  { id: "weigh-in-streak-7", title: "Tracking", description: "Log your body weight 7 times.", icon: "⚖️", category: "consistency", condition: (ctx) => ctx.bodyWeight.length >= 7 },
  { id: "weigh-in-streak-30", title: "Data Driven", description: "Log your body weight 30 times.", icon: "📉", category: "consistency", condition: (ctx) => ctx.bodyWeight.length >= 30 },
  { id: "weigh-in-streak-100", title: "Scale Master", description: "Log your body weight 100 times.", icon: "📊", category: "consistency", condition: (ctx) => ctx.bodyWeight.length >= 100 },
  { id: "4-week-goal", title: "Monthly Champion", description: "Hit your weekly goal 4 weeks in a row.", icon: "🏅", category: "consistency", condition: (ctx) => ctx.totalWorkouts >= 16 }, // ~4 weeks × 4 days

  // ── Milestone ──
  { id: "profile-set", title: "Ready to Go", description: "Set up your profile.", icon: "✅", category: "milestone", condition: () => true },
  { id: "plan-generated", title: "Planned", description: "Generate your first training plan.", icon: "📋", category: "milestone", condition: () => true },
  { id: "early-bird", title: "Early Bird", description: "Complete a workout before 7 AM.", icon: "🌅", category: "milestone", condition: (ctx) => ctx.sessions.some(s => {
    const hour = new Date(s.date).getHours();
    return hour >= 5 && hour < 7;
  })},
  { id: "night-owl", title: "Night Owl", description: "Complete a workout after 10 PM.", icon: "🦉", category: "milestone", condition: (ctx) => ctx.sessions.some(s => {
    const hour = new Date(s.date).getHours();
    return hour >= 22;
  })},
  { id: "weekend-warrior", title: "Weekend Warrior", description: "Complete workouts on both Saturday and Sunday.", icon: "⚔️", category: "milestone", condition: (ctx) => {
    const saturdays = new Set(ctx.sessions.filter(s => new Date(s.date).getDay() === 6).map(s => s.date.slice(0, 10)));
    const sundays = new Set(ctx.sessions.filter(s => new Date(s.date).getDay() === 0).map(s => s.date.slice(0, 10)));
    for (const sat of saturdays) {
      const nextDay = new Date(sat);
      nextDay.setDate(nextDay.getDate() + 1);
      if (sundays.has(nextDay.toISOString().slice(0, 10))) return true;
    }
    return false;
  }},
];

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Build the achievement context from current app data.
 */
export function buildAchievementContext(
  sessions: Session[],
  bodyWeight: BodyWeightLog[],
  /** Pass the current week's plan days count to determine totalWorkouts */
  totalWorkouts?: number,
): AchievementContext {
  const totals = computeTotals(sessions);
  const streak = computeCurrentStreak(sessions);

  return {
    sessions,
    bodyWeight,
    totalWorkouts: totalWorkouts ?? sessions.length,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalSetsLogged: totals.totalSets,
    totalVolumeKg: totals.totalVolumeKg,
  };
}

/**
 * Check which achievements are not yet unlocked.
 * This is a pure function — pass currently-unlocked IDs and get newly-unlocked ones back.
 */
export function checkNewAchievements(
  ctx: AchievementContext,
  unlockedIds: string[],
): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) => !unlockedIds.includes(a.id) && a.condition(ctx),
  );
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function computeTotals(sessions: Session[]) {
  let totalSets = 0;
  let totalVolumeKg = 0;

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (!set.done) continue;
        totalSets++;
        totalVolumeKg += set.weight * set.reps;
      }
    }
  }

  return { totalSets, totalVolumeKg };
}

function computeCurrentStreak(sessions: Session[]) {
  if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Sort sessions by date descending (newest first)
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Track unique dates
  const uniqueDates = new Set(sorted.map((s) => s.date.slice(0, 10)));
  const dates = [...uniqueDates].sort().reverse(); // newest first

  let currentStreak = 0;
  let longestStreak = 1;
  let tempStreak = 1;

  // Calculate current streak (consecutive days from today)
  const today = new Date().toISOString().slice(0, 10);
  let expectedDate = today;

  for (const date of dates) {
    const diff =
      (new Date(expectedDate).getTime() - new Date(date).getTime()) /
      (1000 * 60 * 60 * 24);

    if (diff === 0) {
      currentStreak++;
      expectedDate = getPreviousDate(expectedDate);
    } else if (diff === 1) {
      currentStreak++;
      expectedDate = getPreviousDate(date);
    } else {
      break;
    }
  }

  // Calculate longest streak
  if (dates.length > 1) {
    let tempStreak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const diff =
        (new Date(dates[i]).getTime() - new Date(dates[i + 1]).getTime()) /
        (1000 * 60 * 60 * 24);

      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
  }

  longestStreak = Math.max(longestStreak, dates.length > 0 ? 1 : 0);

  return { currentStreak, longestStreak };
}

function getPreviousDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}