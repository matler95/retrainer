/**
 * Supabase client singleton with auth helpers and sync utilities.
 *
 * DESIGN PRINCIPLES:
 * - Offline-first: The app works without Supabase. Auth is optional.
 * - Zustand is source of truth. Supabase is persistence/sync layer.
 * - When online + authenticated, local data syncs to Supabase.
 * - When offline, app works normally with Zustand persist.
 * - All functions degrade gracefully when Supabase is not configured.
 * - Per-table sync with RLS for security and efficiency.
 */

import { createClient } from "@supabase/supabase-js";
import type { Session, BodyWeightLog, Profile, PlanDay } from "@/data/types";

// ─── Supabase Client ─────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

const isConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/**
 * Supabase client — or null when not configured.
 * Check `isSupabaseConfigured()` before making API calls.
 */
export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Returns true when Supabase environment variables are set.
 * Use this to conditionally show auth UI or cloud-sync features.
 */
export function isSupabaseConfigured(): boolean {
  return isConfigured;
}

// ─── Auth Types ──────────────────────────────────────────────────────────────

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthUser {
  id: string;
  email: string | null;
}

// ─── Auth Helpers ────────────────────────────────────────────────────────────

/**
 * Get the current authenticated user (if any).
 * Returns null when Supabase is not configured or user is not logged in.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Get the current auth session.
 * Returns null when Supabase is not configured or no session exists.
 */
export async function getCurrentSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Sign in with email + password.
 * Throws a user-friendly message if Supabase is not configured.
 */
export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Sign up with email + password.
 */
export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ─── Per-Table Sync Types ────────────────────────────────────────────────────

/**
 * Shape of the user_data table (legacy — for migration from old schema).
 * New code should use per-table sync functions below.
 *
 * @deprecated Use per-table sync instead.
 */
export interface UserDataRow {
  user_id: string;
  profile: Profile | null;
  plan: PlanDay[];
  sessions: Session[];
  body_weight: BodyWeightLog[];
  favorites: string[];
  disliked: string[];
}

// ─── Generic Table Helpers ───────────────────────────────────────────────────

/**
 * Upsert a row into any table.
 * Uses Supabase's upsert with conflict resolution for idempotency.
 */
export async function upsertRow<T extends Record<string, unknown>>(
  table: string,
  row: T,
  conflictColumn = "id",
) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from(table).upsert(row, {
    onConflict: conflictColumn,
    ignoreDuplicates: false,
  });
  if (error) throw error;
}

/**
 * Fetch rows for the current user from any table.
 */
export async function fetchRows<T = Record<string, unknown>>(
  table: string,
  userId: string,
): Promise<T[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as T[];
}

/**
 * Fetch a single row by user_id.
 */
export async function fetchSingle<T = Record<string, unknown>>(
  table: string,
  userId: string,
): Promise<T | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }
  return data as T;
}

// ─── Legacy Sync (backward compatibility) ────────────────────────────────────

/**
 * Push the current user's app state to Supabase (legacy single-table approach).
 *
 * @deprecated Use per-table sync via syncQueue.ts instead.
 * Kept for backward compatibility during migration.
 */
export async function syncToSupabase(
  userId: string,
  data: UserDataRow,
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("user_data").upsert(
    {
      user_id: userId,
      profile: data.profile,
      plan: data.plan,
      sessions: data.sessions,
      body_weight: data.body_weight,
      favorites: data.favorites,
      disliked: data.disliked,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.warn("Supabase sync failed:", error.message);
    // Don't throw — sync is best-effort
  }
}

/**
 * Load the user's app state from Supabase (legacy single-table approach).
 *
 * @deprecated Use per-table fetch via fetchRows/fetchSingle instead.
 * Kept for backward compatibility during migration.
 */
export async function loadFromSupabase(
  userId: string,
): Promise<UserDataRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_data")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.warn("Supabase load failed:", error.message);
    return null;
  }

  return data as unknown as UserDataRow;
}