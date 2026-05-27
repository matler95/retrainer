/**
 * Offline-first sync queue for the Atlas app.
 *
 * Queues mutations when offline and flushes them to Supabase when reconnected.
 * The queue is persisted in Zustand (localStorage) so it survives page reloads.
 *
 * DESIGN PRINCIPLES:
 * - Queue is stored in Zustand persist alongside app state
 * - Each item has a unique ID, type, payload, timestamp, and retry count
 * - Flush is triggered by `online` event or manual call
 * - Uses Supabase upsert with conflict resolution for idempotency
 * - Failed items are retried up to MAX_RETRIES before being dropped with a warning
 */

import type { Session, BodyWeightLog, Profile, PlanDay, WaterLog, BodyMetrics, ExercisePR, WeeklyCheckin } from "@/data/types";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const DEBOUNCE_MS = 2000;

// ─── Types ──────────────────────────────────────────────────────────────────

export type SyncItemType =
  | "session"
  | "body_weight"
  | "water"
  | "profile"
  | "plan"
  | "body_metrics"
  | "exercise_pr"
  | "weekly_checkin";

export interface SyncItem {
  id: string;
  type: SyncItemType;
  payload: unknown;
  timestamp: number;
  retries: number;
}

export interface SyncQueueState {
  items: SyncItem[];
  isSyncing: boolean;
  lastError: string | null;
}

// ─── Queue Operations ───────────────────────────────────────────────────────

/**
 * Generate a unique ID for a sync item.
 */
function generateId(): string {
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new sync queue state (empty).
 */
export function createEmptyQueue(): SyncQueueState {
  return {
    items: [],
    isSyncing: false,
    lastError: null,
  };
}

/**
 * Add an item to the sync queue.
 * Returns a new queue state — does not mutate.
 */
export function enqueue(
  queue: SyncQueueState,
  type: SyncItemType,
  payload: unknown,
): SyncQueueState {
  const item: SyncItem = {
    id: generateId(),
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  };
  return {
    ...queue,
    items: [...queue.items, item],
    lastError: null,
  };
}

/**
 * Remove an item from the queue by ID (after successful sync).
 * Returns a new queue state — does not mutate.
 */
export function dequeue(
  queue: SyncQueueState,
  itemId: string,
): SyncQueueState {
  return {
    ...queue,
    items: queue.items.filter((item) => item.id !== itemId),
  };
}

/**
 * Increment retry count for an item.
 * If retries exceed MAX_RETRIES, remove the item.
 * Returns a new queue state — does not mutate.
 */
export function markRetry(
  queue: SyncQueueState,
  itemId: string,
  error: string,
): SyncQueueState {
  const items = queue.items.map((item) => {
    if (item.id !== itemId) return item;
    return { ...item, retries: item.retries + 1 };
  });

  // Drop items that exceeded max retries
  const filtered = items.filter((item) => item.retries <= MAX_RETRIES);
  const dropped = items.length - filtered.length;

  if (dropped > 0) {
    console.warn(`Sync queue: dropped ${dropped} items after ${MAX_RETRIES} retries`);
  }

  return {
    ...queue,
    items: filtered,
    lastError: error,
  };
}

/**
 * Get the number of pending items in the queue.
 */
export function pendingCount(queue: SyncQueueState): number {
  return queue.items.length;
}

/**
 * Check if the queue has items to sync.
 */
 export function hasItems(queue: SyncQueueState): boolean {
  return queue.items.length > 0;
}

// ─── Network Detection ──────────────────────────────────────────────────────

/**
 * Check if the browser is currently online.
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/**
 * Register online/offline event listeners.
 * Returns a cleanup function to remove the listeners.
 */
export function registerNetworkListeners(
  onOnline: () => void,
  onOffline: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

// ─── Debounce Helper ────────────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced flush — prevents rapid-fire sync attempts.
 * Call this whenever the queue changes or the app comes online.
 */
export function debouncedFlush(callback: () => void): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(callback, DEBOUNCE_MS);
}

// ─── Supabase Sync Execution ────────────────────────────────────────────────

/**
 * Sync a single queue item to Supabase.
 * This function maps queue item types to Supabase table operations.
 *
 * @param item - The sync item to process
 * @param userId - The authenticated user's ID
 * @param supabaseUpsert - The Supabase upsert function (injected for testability)
 * @returns true if sync succeeded, false otherwise
 */
export async function syncItem(
  item: SyncItem,
  userId: string,
  supabaseUpsert: (table: string, row: Record<string, unknown>, conflictColumn: string) => Promise<void>,
): Promise<boolean> {
  try {
    switch (item.type) {
      case "session": {
        const session = item.payload as Session;
        await supabaseUpsert("sessions", {
          id: session.id,
          user_id: userId,
          day_id: session.dayId,
          started_at: session.startedAt ?? session.date,
          finished_at: session.finishedAt,
          duration_min: session.durationMin,
          exercises: session.exercises,
          notes: null,
          rpe_overall: session.rpeOverall,
          tags: session.tags,
        }, "id");
        break;
      }

      case "body_weight": {
        const bw = item.payload as BodyWeightLog;
        await supabaseUpsert("body_metrics", {
          user_id: userId,
          date: bw.date,
          weight_kg: bw.kg,
        }, "user_id,date");
        break;
      }

      case "water": {
        const water = item.payload as WaterLog;
        await supabaseUpsert("water_logs", {
          user_id: userId,
          date: water.date,
          ml: water.ml,
        }, "user_id,date");
        break;
      }

      case "profile": {
        const profile = item.payload as Profile;
        await supabaseUpsert("profiles", {
          id: userId,
          age: profile.age,
          gender: profile.gender,
          height_cm: profile.heightCm,
          weight_kg: profile.weightKg,
          goal: profile.goal,
          experience: profile.experience,
          style: profile.style,
          activity: profile.activity,
          equipment: profile.equipment,
          priorities: profile.priorities,
          avoid: profile.avoid,
          injuries: profile.injuries,
          days_per_week: profile.daysPerWeek,
          duration_min: profile.durationMin,
          supplements: profile.supplements,
          water_auto: profile.waterAuto,
          water_target_ml: profile.waterTargetMl,
          movement_assessment: profile.movementAssessment ?? null,
          training_history: profile.trainingHistory ?? null,
          recovery_profile: profile.recoveryProfile ?? null,
        }, "id");
        break;
      }

      case "plan": {
        const planData = item.payload as { planId: string; days: PlanDay[]; weekNumber: number; blocks: unknown };
        await supabaseUpsert("plans", {
          id: planData.planId,
          user_id: userId,
          days: planData.days,
          week_number: planData.weekNumber,
          blocks: planData.blocks,
          is_active: true,
        }, "id");
        break;
      }

      case "body_metrics": {
        const bm = item.payload as BodyMetrics;
        await supabaseUpsert("body_metrics", {
          user_id: userId,
          date: bm.date,
          weight_kg: bm.weightKg,
          body_fat_pct: bm.bodyFatPct,
          measurements: bm.measurements ?? null,
          photo_url: bm.photoUrl ?? null,
          notes: bm.notes ?? null,
        }, "user_id,date");
        break;
      }

      case "exercise_pr": {
        const pr = item.payload as ExercisePR;
        await supabaseUpsert("exercise_prs", {
          id: `${pr.exerciseId}-${pr.repCount}-${pr.achievedAt}`,
          user_id: userId,
          exercise_id: pr.exerciseId,
          rep_count: pr.repCount,
          weight_kg: pr.weightKg,
          reps: pr.repCount,
          estimated_1rm: pr.estimated1RM,
          achieved_at: pr.achievedAt,
          session_id: pr.sessionId,
        }, "id");
        break;
      }

      case "weekly_checkin": {
        const ci = item.payload as WeeklyCheckin;
        await supabaseUpsert("weekly_checkins", {
          user_id: userId,
          week_number: ci.weekNumber,
          weight_kg: ci.weightKg,
          energy_level: ci.energyLevel,
          sleep_quality: ci.sleepQuality,
          muscle_soreness: ci.muscleSoreness,
          overall_mood: ci.overallMood,
          notes: ci.notes ?? null,
          date: ci.date,
        }, "user_id,week_number");
        break;
      }

      default:
        console.warn(`Sync queue: unknown item type "${item.type}"`);
        return false;
    }

    return true;
  } catch (error) {
    console.warn(`Sync queue: failed to sync ${item.type}:`, error);
    return false;
  }
}

/**
 * Flush all pending items from the queue.
 * Processes items sequentially to avoid overwhelming Supabase.
 *
 * @param queue - Current queue state
 * @param userId - Authenticated user's ID
 * @param supabaseUpsert - Supabase upsert function
 * @returns Updated queue state after processing
 */
export async function flushQueue(
  queue: SyncQueueState,
  userId: string,
  supabaseUpsert: (table: string, row: Record<string, unknown>, conflictColumn: string) => Promise<void>,
): Promise<SyncQueueState> {
  if (queue.items.length === 0) return queue;
  if (!isOnline()) return queue;

  let currentQueue: SyncQueueState = { ...queue, isSyncing: true };

  for (const item of [...currentQueue.items]) {
    const success = await syncItem(item, userId, supabaseUpsert);

    if (success) {
      currentQueue = dequeue(currentQueue, item.id);
    } else {
      currentQueue = markRetry(currentQueue, item.id, `Failed to sync ${item.type}`);
    }
  }

  return { ...currentQueue, isSyncing: false };
}