import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell, AppHeader, Card, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store/useAppStore";
import { Moon, Sun, Bell, RefreshCw, LogOut, ChevronRight, Apple, Mail } from "lucide-react";

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

  return (
    <AppShell>
      <AppHeader title="Profile" />
      <Card>
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary grid place-items-center text-primary-foreground font-bold">{profile.gender.slice(0, 1).toUpperCase()}</div>
          <div>
            <div className="font-bold">Athlete</div>
            <div className="text-xs text-muted-foreground capitalize">{profile.goal} · {profile.experience}</div>
          </div>
        </div>
      </Card>

      <SectionTitle>Account</SectionTitle>
      <Card>
        <Button variant="outline" className="w-full justify-start" disabled><Mail className="size-4" /> Sign in with email <span className="ml-auto text-xs text-muted-foreground">Coming soon</span></Button>
        <Button variant="outline" className="w-full justify-start mt-2" disabled><Apple className="size-4" /> Sign in with Apple <span className="ml-auto text-xs text-muted-foreground">Coming soon</span></Button>
      </Card>

      <SectionTitle>Plan</SectionTitle>
      <Card className="divide-y divide-border">
        <Row onClick={() => navigate({ to: "/onboarding" })} label="Edit profile & goals" icon={<ChevronRight className="size-4" />} />
        <Row onClick={() => setProfile(profile)} label="Regenerate workout plan" icon={<RefreshCw className="size-4" />} />
      </Card>

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

      <SectionTitle>Danger zone</SectionTitle>
      <Card>
        <Button variant="outline" className="w-full text-destructive" onClick={() => { reset(); navigate({ to: "/onboarding" }); }}>
          <LogOut className="size-4" /> Reset all data
        </Button>
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
