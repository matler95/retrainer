import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, AppHeader, Card, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { isStravaAvailable, initiateStravaOAuth } from "@/lib/strava";
import {
  Moon, Sun, Bell, RefreshCw, LogOut, ChevronRight, Mail,
  Cloud, CloudOff, Loader2, Shield, Link as LinkIcon, Trash2,
  Info,
} from "lucide-react";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const profile = useAppStore(s => s.profile);
  const theme = useAppStore(s => s.theme);
  const setTheme = useAppStore(s => s.setTheme);
  const units = useAppStore(s => s.units);
  const setUnits = useAppStore(s => s.setUnits);
  const remindersOn = useAppStore(s => s.remindersOn);
  const setRemindersOn = useAppStore(s => s.setRemindersOn);
  const reset = useAppStore(s => s.reset);
  const setProfile = useAppStore(s => s.setProfile);
  const lastSyncedAt = useAppStore(s => s.lastSyncedAt);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  if (!profile) return (
    <AppShell>
      <AppHeader title="Profile" />
      <Card>
        <p className="mb-3">Set up your profile to get a personalized plan.</p>
        <Button asChild><Link to="/onboarding">Start onboarding</Link></Button>
      </Card>
    </AppShell>
  );

  const { user, status, isConfigured, signIn, signUp, signOut, syncNow, loadFromCloud } = useAuth();
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthMode, setIsAuthMode] = useState<"signin" | "signup">("signin");
  const [syncing, setSyncing] = useState(false);
  const [authSuccess, setAuthSuccess] = useState("");

  // ── Item 1: Auth sync fix — call loadFromCloud after sign-in/sign-up ──
  const handleAuth = async () => {
    setAuthError("");
    setAuthSuccess("");
    try {
      if (isAuthMode === "signin") {
        await signIn(authEmail, authPassword);
      } else {
        await signUp(authEmail, authPassword);
      }
      // Load cloud data after successful auth
      try {
        await loadFromCloud();
        setAuthSuccess("Signed in and synced your data from the cloud.");
      } catch {
        setAuthSuccess("Signed in successfully. Cloud sync will happen on next manual sync.");
      }
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
      setTimeout(() => setSyncing(false), 1000);
    } catch {
      setSyncing(false);
    }
  };

  const formatSyncTime = (ts: string | null) => {
    if (!ts) return null;
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  };

  const syncTimeLabel = formatSyncTime(lastSyncedAt);
  const stravaAvailable = isStravaAvailable();

  return (
    <AppShell>
      <AppHeader title="Profile" />

      {/* ── Profile Summary Card ── */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary grid place-items-center text-primary-foreground font-bold">{profile.gender.slice(0, 1).toUpperCase()}</div>
          <div>
            <div className="font-bold">Athlete</div>
            <div className="text-xs text-muted-foreground capitalize">{profile.goal} · {profile.experience}</div>
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          Section 1: Account / Cloud Sync
          ═══════════════════════════════════════════════════════════════════ */}
      <SectionTitle>Account & Sync</SectionTitle>

      {/* Item 4: Cloud sync status banner */}
      {!isConfigured ? (
        <Card className="border-dashed">
          <div className="flex items-start gap-2">
            <CloudOff className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Offline-only mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your data is saved locally on this device. Sign in to back up your profile and plan to the cloud.
              </p>
            </div>
          </div>
        </Card>
      ) : user ? (
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="size-4 text-muted-foreground" />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Cloud className="size-4 text-green-500" />
            <span>Cloud backup ready</span>
            {syncTimeLabel && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">Last synced {syncTimeLabel}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="size-4 animate-spin" /> : <CloudOff className="size-4" />}
              {syncing ? "Syncing..." : "Sync now"}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-3">
          {/* Item 5: "Why sign in" copy */}
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
            <div className="flex items-start gap-2">
              <Shield className="size-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Back up your progress</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sign in to sync your profile, plan, and workout history to the cloud.
                  Your data stays safe and you can pick up where you left off on any device.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-1 text-xs text-muted-foreground mb-1">
            <button
              onClick={() => { setIsAuthMode("signin"); setAuthError(""); setAuthSuccess(""); }}
              className={`px-2 py-0.5 rounded ${isAuthMode === "signin" ? "bg-primary/10 text-primary" : ""}`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setIsAuthMode("signup"); setAuthError(""); setAuthSuccess(""); }}
              className={`px-2 py-0.5 rounded ${isAuthMode === "signup" ? "bg-primary/10 text-primary" : ""}`}
            >
              Sign up
            </button>
          </div>
          <Input
            type="email"
            placeholder="Email"
            value={authEmail}
            onChange={e => setAuthEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={authPassword}
            onChange={e => setAuthPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAuth()}
          />
          {authError && <p className="text-xs text-destructive">{authError}</p>}
          {authSuccess && <p className="text-xs text-green-500">{authSuccess}</p>}
          <Button size="sm" className="w-full" onClick={handleAuth} disabled={!authEmail || !authPassword}>
            {isAuthMode === "signin" ? "Sign in" : "Sign up"}
          </Button>
        </Card>
      )}

      {/* Item 12: Strava Connect CTA */}
      {stravaAvailable && (
        <Card>
          <button
            onClick={() => initiateStravaOAuth()}
            className="w-full flex items-center gap-3 py-1 tap-scale"
          >
            <div className="size-8 rounded-lg bg-orange-500/10 grid place-items-center">
              <LinkIcon className="size-4 text-orange-500" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">Connect with Strava</div>
              <div className="text-xs text-muted-foreground">
                Import activities to improve readiness scoring and recovery tracking
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Section 2: Profile & Plan
          ═══════════════════════════════════════════════════════════════════ */}
      <SectionTitle>Profile & Plan</SectionTitle>
      <Card className="divide-y divide-border">
        <Row onClick={() => navigate({ to: "/onboarding" })} label="Edit profile & goals" icon={<ChevronRight className="size-4" />} />

        {/* Item 11: Plan overwrite warning modal */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full flex items-center justify-between py-3 text-left">
              <span>Regenerate from current profile</span>
              <RefreshCw className="size-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate workout plan?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a new plan based on your current profile settings.
                Any custom edits you've made to individual workout days (exercise order,
                substitutions, or weight adjustments) will be overwritten.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => setProfile(profile)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Regenerate plan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          Section 3: Preferences
          ═══════════════════════════════════════════════════════════════════ */}
      <SectionTitle>Preferences</SectionTitle>
      <Card className="divide-y divide-border">
        <ToggleRow label="Dark mode" icon={theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          checked={theme === "dark"} onCheckedChange={v => setTheme(v ? "dark" : "light")} />
        <div className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="size-4 inline-grid place-items-center text-xs font-bold">kg</span> Units</div>
          <div className="flex bg-muted rounded-full p-1">
            {(["kg", "lb"] as const).map(u => (
              <button key={u} onClick={() => setUnits(u)} className={`px-3 py-1 rounded-full text-xs ${units === u ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{u}</button>
            ))}
          </div>
        </div>
        <ToggleRow label="Workout reminders" icon={<Bell className="size-4" />}
          checked={remindersOn} onCheckedChange={setRemindersOn} />
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          Section 4: Danger Zone
          ═══════════════════════════════════════════════════════════════════ */}
      <SectionTitle>Danger zone</SectionTitle>
      <Card>
        {/* Item 2: Reset confirmation modal */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full text-destructive">
              <Trash2 className="size-4" /> Reset all data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your profile, workout plan, session history,
                PRs, and all tracking data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { reset(); navigate({ to: "/onboarding" }); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, reset everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      <p className="text-[10px] text-muted-foreground mt-6 text-center px-4">
        This app provides general fitness information, not medical advice. Consult a professional before starting any new training program.
      </p>
    </AppShell>
  );
}

function Row({ label, icon, onClick }: { label: string; icon?: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-3 text-left">
      <span>{label}</span>{icon}
    </button>
  );
}
function ToggleRow({ label, icon, checked, onCheckedChange }: { label: string; icon?: React.ReactNode; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">{icon}<span>{label}</span></div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}