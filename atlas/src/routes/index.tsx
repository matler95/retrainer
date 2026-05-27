import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { AppShell, AppHeader, StatCard, SectionTitle, Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { EXERCISES } from "@/data/exercises";
import { goalCalories, proteinTargetG, waterTargetMl } from "@/lib/calc";
import { coachOfTheDay } from "@/lib/trainer";
import { useReadiness } from "@/hooks/useReadiness";
import { getBestPR } from "@/lib/prDatabase";
import { Droplet, Pill, Flame, Plus, ChevronRight, Sparkles, Activity, Trophy } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Coach — Your personal trainer" },
      { name: "description", content: "Personalized workouts, progress tracking and coaching." },
    ],
  }),
  component: Dashboard,
});

function ReadinessCard() {
  const readiness = useReadiness();

  const color =
    readiness.score >= 80
      ? "text-green-500"
      : readiness.score >= 60
        ? "text-yellow-500"
        : "text-red-400";
  const label =
    readiness.score >= 80
      ? "Ready to push"
      : readiness.score >= 60
        ? "Moderate"
        : "Recover";

  return (
    <Card>
      <div className="flex items-start gap-3">
        <Activity className={`size-5 mt-0.5 ${color}`} />
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">{label}</span>
            <span className={`text-2xl font-bold font-display ${color}`}>
              {readiness.score}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {readiness.recommendation}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                readiness.score >= 80
                  ? "bg-green-500"
                  : readiness.score >= 60
                    ? "bg-yellow-500"
                    : "bg-red-400"
              }`}
              style={{ width: `${readiness.score}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const navigate = Route.useNavigate();
  const profile = useAppStore(s => s.profile);
  const plan = useAppStore(s => s.plan);
  const sessions = useAppStore(s => s.sessions);
  const bodyWeight = useAppStore(s => s.bodyWeight);
  const water = useAppStore(s => s.water);
  const supplements = useAppStore(s => s.supplements);
  const addWater = useAppStore(s => s.addWater);
  const toggleSupplement = useAppStore(s => s.toggleSupplement);

  useEffect(() => {
    if (!profile) navigate({ to: "/onboarding" });
  }, [profile, navigate]);

  if (!profile) return null;

  const today = new Date().toISOString().slice(0, 10);
  const todayWater = water.find(w => w.date === today)?.ml ?? 0;
  const waterGoal = profile.waterAuto ? waterTargetMl(profile) : profile.waterTargetMl;
  const dayIndex = new Date().getDay() % Math.max(1, plan.length);
  const todayDay = plan[dayIndex];
  const calGoal = goalCalories(profile);
  const protein = proteinTargetG(profile);

  const weekDone = sessions.filter(s => {
    const d = new Date(s.date);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff < 7;
  }).length;

  const exercisePRs = useAppStore(s => s.exercisePRs);

  // Get recent PRs (last 5, sorted by date)
  const recentPRs = useMemo(() => {
    if (exercisePRs.length === 0) return [];
    return [...exercisePRs]
      .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime())
      .slice(0, 5);
  }, [exercisePRs]);

  return (
    <AppShell>
      <AppHeader title={`Hi${profile.gender === "female" ? "" : ""} 👋`} />
      <Card className="bg-gradient-to-br from-primary/15 to-card border-primary/30">
        <div className="flex items-start gap-2">
          <Sparkles className="size-4 text-primary mt-0.5" />
          <p className="text-sm">{coachOfTheDay(profile, weekDone)}</p>
        </div>
      </Card>

      <SectionTitle>Today</SectionTitle>
      {todayDay ? (
        <Card className="bg-primary text-primary-foreground border-primary">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider opacity-80">Today's workout</div>
              <div className="text-xl font-bold font-display mt-1">{todayDay.name}</div>
              <div className="text-xs opacity-80 mt-1">{todayDay.exercises.length} exercises · ~{profile.durationMin} min</div>
            </div>
            <Button asChild variant="secondary" size="lg" className="rounded-full">
              <Link to="/workout/$dayId" params={{ dayId: todayDay.id }}>Start</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card>Rest day — recover and hydrate.</Card>
      )}

      <div className="grid grid-cols-2 gap-3 mt-3">
        <StatCard label="This week" value={`${weekDone}/${profile.daysPerWeek}`} sub="workouts done" />
        <StatCard label="Streak" value={`${Math.min(weekDone, 7)}🔥`} sub="days" />
        <StatCard label="Calories" value={calGoal} sub={`${profile.goal}`} />
        <StatCard label="Protein" value={`${protein}g`} sub="daily target" />
      </div>

      <SectionTitle>Body weight</SectionTitle>
      <Card>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-bold font-display">{bodyWeight.at(-1)?.kg.toFixed(1) ?? profile.weightKg} kg</div>
            <div className="text-xs text-muted-foreground">last 30 days</div>
          </div>
          <Button size="sm" variant="ghost" asChild><Link to="/progress">View <ChevronRight className="size-4" /></Link></Button>
        </div>
        <div className="h-16 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bodyWeight}>
              <Line dataKey="kg" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <SectionTitle>Readiness</SectionTitle>
      <ReadinessCard />

      <SectionTitle>Hydration</SectionTitle>
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplet className="size-5 text-primary" />
            <div>
              <div className="font-semibold">{todayWater} ml</div>
              <div className="text-xs text-muted-foreground">of {waterGoal} ml</div>
            </div>
          </div>
          <Button size="sm" onClick={() => addWater(250)}><Plus className="size-4" /> 250 ml</Button>
        </div>
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (todayWater / waterGoal) * 100)}%` }} />
        </div>
      </Card>

      {profile.supplements.length > 0 && (
        <>
          <SectionTitle>Supplements</SectionTitle>
          <Card>
            <ul className="divide-y divide-border -my-2">
              {profile.supplements.map(s => {
                const taken = supplements.find(x => x.date === today && x.name === s)?.taken;
                return (
                  <li key={s} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <Pill className="size-4 text-primary" />
                      <span className="capitalize">{s}</span>
                    </div>
                    <Button size="sm" variant={taken ? "default" : "outline"} onClick={() => toggleSupplement(s)}>
                      {taken ? "Taken" : "Mark taken"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      <SectionTitle>Recent PRs</SectionTitle>
      <Card>
        {recentPRs.length > 0 ? (
          <ul className="space-y-2">
            {recentPRs.map((pr, i) => {
              const ex = EXERCISES.find(e => e.id === pr.exerciseId);
              return (
                <li key={`${pr.exerciseId}-${pr.repCount}-${i}`} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm">{ex?.name ?? pr.exerciseId}</span>
                    <span className="text-xs text-muted-foreground ml-1">({pr.repCount}RM)</span>
                  </div>
                  <span className="text-sm font-semibold flex items-center gap-1 text-primary">
                    <Trophy className="size-4" /> {pr.weightKg} kg
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Complete workouts to start tracking PRs 🏋️</p>
        )}
      </Card>
      <p className="text-[10px] text-muted-foreground mt-6 text-center px-4">
        Coaching, calorie and supplement guidance is general fitness information, not medical advice.
      </p>
    </AppShell>
  );
}
