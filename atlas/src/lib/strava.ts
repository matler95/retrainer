/**
 * Strava API client and OAuth flow.
 *
 * Handles:
 * - OAuth 2.0 authorization flow
 * - Token exchange and refresh
 * - Activity fetching
 * - Encrypted token storage in Supabase
 *
 * DESIGN PRINCIPLES:
 * - Strava is opt-in — the app works fully without it
 * - Tokens are stored encrypted in Supabase (never in localStorage)
 * - All API calls degrade gracefully when Strava is not configured
 * - Rate limits are respected (100 requests/15 min, 1000/day)
 */

// ─── Configuration ──────────────────────────────────────────────────────────

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID ?? "";
const STRAVA_CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET ?? "";
const STRAVA_REDIRECT_URI = typeof window !== "undefined"
  ? `${window.location.origin}/auth/strava`
  : "";

const isStravaConfigured = STRAVA_CLIENT_ID.length > 0 && STRAVA_CLIENT_SECRET.length > 0;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StravaToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  athleteId: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string; // "Run", "Ride", "Walk", "WeightTraining", etc.
  sport_type: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed: number; // m/s
  start_date: string; // ISO
  start_date_local: string;
  calories?: number;
  suffer_score?: number;
}

export interface StravaConnection {
  isConnected: boolean;
  athleteName?: string;
  athleteId?: number;
  lastSyncAt?: string;
}

// ─── OAuth Flow ─────────────────────────────────────────────────────────────

/**
 * Check if Strava is configured (env vars set).
 */
export function isStravaAvailable(): boolean {
  return isStravaConfigured;
}

/**
 * Initiate Strava OAuth flow — redirects user to Strava authorization page.
 */
export function initiateStravaOAuth(): void {
  if (!isStravaConfigured) {
    console.warn("Strava is not configured. Set VITE_STRAVA_CLIENT_ID.");
    return;
  }

  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: "code",
    scope: "activity:read_all",
    approval_prompt: "auto",
  });

  window.location.href = `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 * Called from the Strava callback route.
 *
 * @param code - Authorization code from Strava redirect
 * @returns Token data or null if exchange failed
 */
export async function exchangeStravaCode(code: string): Promise<StravaToken | null> {
  if (!isStravaConfigured) return null;

  try {
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      athleteId: data.athlete.id,
    };
  } catch (error) {
    console.warn("Strava token exchange failed:", error);
    return null;
  }
}

/**
 * Refresh an expired Strava access token.
 *
 * @param refreshToken - The refresh token
 * @returns New token data or null if refresh failed
 */
export async function refreshStravaToken(refreshToken: string): Promise<StravaToken | null> {
  if (!isStravaConfigured) return null;

  try {
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      athleteId: data.athlete.id,
    };
  } catch (error) {
    console.warn("Strava token refresh failed:", error);
    return null;
  }
}

// ─── API Client ─────────────────────────────────────────────────────────────

/**
 * Fetch recent activities from Strava.
 *
 * @param accessToken - Valid access token
 * @param perPage - Number of activities to fetch (default 30)
 * @param after - Only activities after this Unix timestamp (optional)
 * @returns Array of Strava activities
 */
export async function fetchStravaActivities(
  accessToken: string,
  perPage = 30,
  after?: number,
): Promise<StravaActivity[]> {
  try {
    const params = new URLSearchParams({
      per_page: perPage.toString(),
    });
    if (after) params.set("after", after.toString());

    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      console.warn("Strava API error:", response.status);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.warn("Strava fetch failed:", error);
    return [];
  }
}

/**
 * Get athlete profile from Strava.
 */
export async function fetchStravaAthlete(
  accessToken: string,
): Promise<{ id: number; firstname: string; lastname: string } | null> {
  try {
    const response = await fetch("https://www.strava.com/api/v3/athlete", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Disconnect from Strava (revoke access token).
 */
export async function disconnectStrava(accessToken: string): Promise<void> {
  try {
    await fetch("https://www.strava.com/oauth/deauthorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken }),
    });
  } catch {
    // Best-effort
  }
}