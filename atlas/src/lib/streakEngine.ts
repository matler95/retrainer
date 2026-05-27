/**
 * Streak and consistency scoring engine.
 *
 * Tracks:
 * - Current streak (consecutive scheduled days with completed sessions)
 * - Longest streak
 * - Weekly goals met (weeks where daysPerWeek target was hit)
 * - Consistency score (% of planned sessions completed in last 30 days)
 * - Streak at risk (today's planned session not yet done)
 * - Missed sessions this week
 *
 * All functions are pure and deterministic.
 */

import type { Session } from "@/data/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  weeklyGoalsMet: number;
  consistencyScore: number;
  streakAtRisk: boolean;
  missedSessions: number;
  totalSessions: number;
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Compute comprehensive streak and consistency data from session history.
 *
 * @param sessions - All sessions (any order)
 * @param daysPerWeek - User's target sessions per week
 * @returns StreakData with all computed metrics
 */
export function computeStreakData(
  sessions: Session[],
  daysPerWeek: number,
): StreakData {
  if (sessions.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      weeklyGoalsMet: 0,
      consistencyScore: 0,
      streakAtRisk: false,
      missedSessions: 0,
      totalSessions: 0,
    };
  }

  // Get unique session dates sorted newest first
  const sessionDates = [...new Set(sessions.map((s) => s.date.slice(0, 10)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);

  // Current streak: count consecutive days from today (or yesterday) with sessions
  const { currentStreak, longestStreak } = computeStreaks(sessionDates);

  // Weekly goals met: count weeks where sessions >= daysPerWeek
  const weeklyGoalsMet = computeWeeklyGoalsMet(sessions, daysPerWeek);

  // Consistency score: % of target sessions completed in last 30 days
  const consistencyScore = computeConsistencyScore(sessions, daysPerWeek, 30);

  // Missed sessions this week
  const missedSessions = computeMissedSessions(sessions, daysPerWeek);

  // Streak at risk: today is a training day but no session yet
  const streakAtRisk = !sessionDates.includes(today) && currentStreak > 0;

  return {
    currentStreak,
    longestStreak,
    weeklyGoalsMet,
    consistencyScore,
    streakAtRisk,
    missedSessions,
    totalSessions: sessions.length,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compute current and longest streak from sorted session dates.
 */
function computeStreaks(sortedDates: string[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (sortedDates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Current streak: start from today or yesterday
  let currentStreak = 0;
  let expectedDate = today;

  // Check if today or yesterday has a session
  if (!sortedDates.includes(today) && !sortedDates.includes(yesterday)) {
    return { currentStreak: 0, longestStreak: computeLongestStreak(sortedDates) };
  }

  if (!sortedDates.includes(today)) {
    expectedDate = yesterday;
  }

  for (const date of sortedDates) {
    if (date === expectedDate) {
      currentStreak++;
      expectedDate = getPreviousDate(expectedDate);
    } else if (date < expectedDate) {
      break;
    }
  }

  const longestStreak = Math.max(currentStreak, computeLongestStreak(sortedDates));

  return { currentStreak, longestStreak };
}

/**
 * Compute the longest streak from sorted dates (newest first).
 */
function computeLongestStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;

  // Sort oldest first for this computation
  const dates = [...sortedDates].sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const diff = daysBetween(dates[i - 1], dates[i]);
    if (diff === 1) {
      current++;
      longest = Math.max(longest, current);
    } else if (diff > 1) {
      current = 1;
    }
  }

  return longest;
}

/**
 * Count weeks where the user hit their daysPerWeek target.
 */
function computeWeeklyGoalsMet(sessions: Session[], daysPerWeek: number): number {
  const weekMap = new Map<string, Set<string>>();

  for (const session of sessions) {
    const weekStart = getWeekStart(session.date.slice(0, 10));
    if (!weekMap.has(weekStart)) weekMap.set(weekStart, new Set());
    weekMap.get(weekStart)!.add(session.date.slice(0, 10));
  }

  let goalsMet = 0;
  for (const [, dates] of weekMap) {
    if (dates.size >= daysPerWeek) goalsMet++;
  }

  return goalsMet;
}

/**
 * Compute consistency score: % of planned sessions completed in last N days.
 */
function computeConsistencyScore(
  sessions: Session[],
  daysPerWeek: number,
  days: number,
): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const recentSessions = sessions.filter((s) => s.date.slice(0, 10) >= cutoffStr);
  const uniqueDays = new Set(recentSessions.map((s) => s.date.slice(0, 10)));
  const weeks = days / 7;
  const targetSessions = Math.round(weeks * daysPerWeek);

  if (targetSessions === 0) return 100;
  return Math.min(100, Math.round((uniqueDays.size / targetSessions) * 100));
}

/**
 * Compute missed sessions this week.
 */
function computeMissedSessions(sessions: Session[], daysPerWeek: number): number {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const thisWeekSessions = new Set(
    sessions
      .filter((s) => s.date.slice(0, 10) >= weekStartStr)
      .map((s) => s.date.slice(0, 10)),
  );

  // Expected sessions so far this week (proportional to days passed)
  const daysPassed = Math.min(7, Math.max(1, now.getDay() === 0 ? 7 : now.getDay()));
  const expectedSoFar = Math.round((daysPassed / 7) * daysPerWeek);

  return Math.max(0, expectedSoFar - thisWeekSessions.size);
}

// ─── Utility ────────────────────────────────────────────────────────────────

function getPreviousDate(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msDay = 86400000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msDay);
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}