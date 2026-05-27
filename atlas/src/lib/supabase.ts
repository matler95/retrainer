import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client singleton.
 * Uses Vite environment variables for configuration.
 * In offline mode (no env vars), returns a no-op client that gracefully degrades.
 */

// These would be set in .env / .env.local
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

const isConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/**
 * Supabase client — or a mock that throws helpful messages when used without env vars.
 * Check `isSupabaseConfigured()` before making API calls so the app degrades gracefully
 * when Supabase is not set up (local-first mode).
 */
export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Returns true when the Supabase environment variables have been set.
 * Use this to conditionally show auth UI or cloud-sync features.
 */
export function isSupabaseConfigured(): boolean {
  return isConfigured;
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email: string | null;
};

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
 * Throws a user-friendly message if Supabase is not configured.
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

// ─── Sync helpers ────────────────────────────────────────────────────────────

/**
 * Upsert a row into a table.
 * Uses the user_id column for RLS — ensure your Supabase tables have a `user_id` column.
 * This is a generic helper; specific sync operations should use typed queries.
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
 * Fetch rows for the current user.
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

// ─── TODO: Future AI integration point ───────────────────────────────────────
// When adding AI-powered features (e.g. chat, form suggestions),
// create a supabase.functions.invoke wrapper here.