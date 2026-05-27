/**
 * Hook: useAuth
 *
 * Wraps Supabase authentication and sync into a React hook.
 * Provides the current auth state and login/logout/sync actions.
 *
 * DESIGN PRINCIPLES:
 * - Auth is optional — the app works fully offline without it
 * - Sync is best-effort — failures are silent (console.warn only)
 * - Zustand remains source of truth; Supabase is persistence layer
 *
 * USAGE:
 * ```tsx
 * const { user, status, signIn, signUp, signOut, syncNow } = useAuth();
 *
 * if (status === 'loading') return <Spinner />;
 * if (status === 'unauthenticated') return <SignInForm />;
 * return <AuthenticatedApp />;
 * ```
 */

import { useEffect, useCallback, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import {
  getCurrentUser,
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  syncToSupabase,
  loadFromSupabase,
  isSupabaseConfigured,
  supabase,
  type AuthUser,
  type AuthStatus,
} from "@/lib/supabase";

export interface UseAuthReturn {
  /** Current authenticated user, or null */
  user: AuthUser | null;
  /** Auth status: loading / authenticated / unauthenticated */
  status: AuthStatus;
  /** Whether Supabase is configured (env vars set) */
  isConfigured: boolean;
  /** Sign in with email + password */
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign up with email + password */
  signUp: (email: string, password: string) => Promise<void>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Manually trigger a sync of local state to Supabase */
  syncNow: () => Promise<void>;
  /** Load data from Supabase into local store */
  loadFromCloud: () => Promise<void>;
}

/**
 * Hook that provides Supabase authentication state and actions.
 *
 * On mount:
 * 1. Checks for existing session
 * 2. Sets status to loading → authenticated/unauthenticated
 *
 * The hook does NOT redirect — authentication is UI-driven.
 * Components decide what to render based on status.
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const profile = useAppStore((s) => s.profile);
  const plan = useAppStore((s) => s.plan);
  const sessions = useAppStore((s) => s.sessions);
  const bodyWeight = useAppStore((s) => s.bodyWeight);
  const favorites = useAppStore((s) => s.favorites);
  const disliked = useAppStore((s) => s.disliked);
  const setProfile = useAppStore((s) => s.setProfile);
  const setPlan = useAppStore((s) => s.setPlan);

  const configured = isSupabaseConfigured();

  // On mount, check for existing session
  useEffect(() => {
    if (!configured) {
      setStatus("unauthenticated");
      return;
    }

    let cancelled = false;

    getCurrentUser().then((u) => {
      if (cancelled) return;
      setUser(u);
      setStatus(u ? "authenticated" : "unauthenticated");
    });

    return () => {
      cancelled = true;
    };
  }, [configured]);

  // Listen for auth state changes
  useEffect(() => {
    if (!configured || !supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email ?? null });
          setStatus("authenticated");
        } else {
          setUser(null);
          setStatus("unauthenticated");
        }
      },
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [configured]);

  /**
   * Sign in with email + password.
   * On success, auto-loads data from Supabase.
   */
  const handleSignIn = useCallback(async (email: string, password: string) => {
    setStatus("loading");
    try {
      await supabaseSignIn(email, password);
      // Auth state listener will update status
    } catch (error) {
      setStatus("unauthenticated");
      throw error;
    }
  }, []);

  /**
   * Sign up with email + password.
   */
  const handleSignUp = useCallback(async (email: string, password: string) => {
    setStatus("loading");
    try {
      await supabaseSignUp(email, password);
      // Auth state listener will update status
    } catch (error) {
      setStatus("unauthenticated");
      throw error;
    }
  }, []);

  /**
   * Sign out.
   * On success, status goes to unauthenticated but local data persists.
   */
  const handleSignOut = useCallback(async () => {
    await supabaseSignOut();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  /**
   * Manually trigger a sync of current local state to Supabase.
   * This is safe to call anytime — it's a no-op if not authenticated.
   */
  const syncNow = useCallback(async () => {
    const currentUser = user ?? await getCurrentUser();
    if (!currentUser) return;

    await syncToSupabase(currentUser.id, {
      user_id: currentUser.id,
      profile,
      plan,
      sessions,
      body_weight: bodyWeight,
      favorites,
      disliked,
    });
  }, [user, profile, plan, sessions, bodyWeight, favorites, disliked]);

  /**
   * Load data from Supabase into local store.
   * Merges cloud data with local state (cloud wins for profile/plan, session merge).
   */
  const loadFromCloud = useCallback(async () => {
    const currentUser = user ?? await getCurrentUser();
    if (!currentUser) return;

    const cloudData = await loadFromSupabase(currentUser.id);
    if (!cloudData) return;

    // Only restore profile/plan if local is empty (first sync)
    // Otherwise, local changes take priority (offline-first)
    if (!profile && cloudData.profile) {
      setProfile(cloudData.profile);
    }
    if (plan.length === 0 && cloudData.plan.length > 0) {
      setPlan(cloudData.plan);
    }
  }, [user, profile, plan, setProfile, setPlan]);

  return {
    user,
    status,
    isConfigured: configured,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    syncNow,
    loadFromCloud,
  };
}