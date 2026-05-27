/**
 * Strava OAuth callback route.
 *
 * Handles the redirect from Strava after user authorization.
 * Exchanges the authorization code for tokens and stores the connection.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { exchangeStravaCode, fetchStravaAthlete, type StravaConnection } from "@/lib/strava";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/auth/strava")({
  component: StravaCallback,
});

function StravaCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [athleteName, setAthleteName] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (error || !code) {
        setStatus("error");
        return;
      }

      try {
        const token = await exchangeStravaCode(code);
        if (!token) {
          setStatus("error");
          return;
        }

        // Fetch athlete info
        const athlete = await fetchStravaAthlete(token.accessToken);
        if (athlete) {
          setAthleteName(`${athlete.firstname} ${athlete.lastname}`);
        }

        // Store connection info in localStorage (tokens would go to Supabase in production)
        const connection: StravaConnection = {
          isConnected: true,
          athleteName: athlete ? `${athlete.firstname} ${athlete.lastname}` : undefined,
          athleteId: token.athleteId,
          lastSyncAt: new Date().toISOString(),
        };

        // Store connection status (in production, tokens go to encrypted Supabase storage)
        localStorage.setItem("strava-connection", JSON.stringify(connection));
        localStorage.setItem("strava-token", JSON.stringify({
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
        }));

        setStatus("success");
      } catch {
        setStatus("error");
      }
    };

    handleCallback();
  }, []);

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        {status === "loading" && (
          <>
            <Loader2 className="size-12 animate-spin text-primary" />
            <h2 className="text-xl font-bold">Connecting to Strava...</h2>
            <p className="text-sm text-muted-foreground">Please wait while we set up your connection.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="size-12 text-green-500" />
            <h2 className="text-xl font-bold">Connected!</h2>
            <p className="text-sm text-muted-foreground">
              {athleteName ? `Welcome, ${athleteName}!` : "Strava connected successfully."}
            </p>
            <p className="text-xs text-muted-foreground">
              Your cardio activities will now be factored into your recovery score.
            </p>
            <Button onClick={() => navigate({ to: "/" })} className="rounded-full mt-4">
              Go to Dashboard
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="size-12 text-red-400" />
            <h2 className="text-xl font-bold">Connection Failed</h2>
            <p className="text-sm text-muted-foreground">
              We couldn't connect to Strava. Please try again.
            </p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => navigate({ to: "/profile" })} className="rounded-full">
                Back to Profile
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}