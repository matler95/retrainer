import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { AppShell, AppHeader, StatCard, SectionTitle, Card, HeroCard, HighlightBadge, EmptyState, ProgressChip } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { EXERCISES } from "@/data/exercises";
import { goalCalories, proteinTargetG, waterTargetMl } from "@/lib/calc";
import { coachOfTheDay } from "@/lib/trainer";
import { useReadiness } from "@/hooks/useReadiness";
import { Droplet, Pill, Plus, ChevronRight, Sparkles, Activity, Trophy, Flame, CalendarDays, Zap } from "lucide-react";
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

/* ── Readiness mini-card ────────────────────────────────────────── */
function ReadinessCard() {
  const readiness = useReadiness();

  const color =
    readiness.score >= 80
      ? "text-green-500"
      : readiness.score >= 60
        ? "text-yellow-500"
        : "text-red-400";
  const barColor =
    readiness.score >= 80
      ? "bg-green-500"
      : readiness.score >= 60
        ? "bg-yellow-500"
        : "bg-red-400";
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
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${readiness.score}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ── Weekly Momentum Strip ──────────────────────────────────────── */
function WeeklyMomentum({ done, goal }: { done: number; goal: number }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date().getDay();
  // Mon=0 .. Sun=6 mapping (JS: Sun=0)
  const todayIdx = today === 0 ? 6 : today - 1;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">This week</span>
        <ProgressChip current={done} total={goal} label="done" />
      </div>
      <div className="flex items-center justify-between gap-1">
        {days.map((d, i) => {
          const isPast = i <= todayIdx;
          const isDone = i < done;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`size-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  isDone
                    ? "bg-accent text-accent-foreground"
                    : isPast
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted/50 text-muted-foreground/50"
                }`}
              >
                {isDone ? "✓" : d}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── Dashboard ──────────────────────────────────────────────────── */
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
  const recentPRs = useMemo(() => {
    if (exercisePRs.length === 0) return [];
    return [...exercisePRs]
      .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime())
      .slice(0, 5);
  }, [exercisePRs]);

  const isFirstTime = sessions.length === 0 && plan.length > 0;

  return (
    <AppShell>
      <AppHeader title={`Hi 👋`} subtitle={new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} />

      {/* Coach guidance */}
      <Card className="bg-gradient-to-br from-primary/10 to-card border-primary/15">
        <div className="flex items-start gap-2">
          <Sparkles className="size-4 text-accent mt-0.5 shrink-0" />
          <p className="text-sm leading-relaxed">{coachOfTheDay(profile, weekDone)}</p>
        </div>
      </Card>

      {/* First-time dashboard experience */}
      {isFirstTime ? (
        <EmptyState
          icon={<Zap className="size-8 text-accent" />}
          title="Your plan is ready!"
          description="Start your first workout to see your progress here. Consistency is everything."
          action={
            todayDay ? (
              <Button size="lg" className="rounded-full tap-scale" asChild>
                <Link to="/workout/$dayId" params={{ dayId: todayDay.id }}>
                  Start first workout
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Hero: Today's workout */}
          {todayDay ? (
            <HeroCard>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <HighlightBadge>
                    <Flame className="size-3" /> Today
                  </HighlightBadge>
                  <h2 className="text-xl font-bold font-display mt-2">{todayDay.name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {todayDay.exercises.length} exercises · ~{profile.durationMin} min
                  </p>
                </div>
                <Button
                  size="lg"
                  className="rounded-full shrink-0 tap-scale bg-accent hover:bg-accent/90 text-accent-foreground"
                  asChild
                >
                  <Link to="/workout/$dayId" params={{ dayId: todayDay.id }}>
                    Start
                  </Link>
                </Button>
              </div>
            </HeroCard>
          ) : (
            <Card className="text-center py-6">
              <CalendarDays className="size-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Rest day</p>
              <p className="text-xs text-muted-foreground mt-0.5">Recover and hydrate — you earned it.</p>
            </Card>
          )}

          {/* Weekly momentum */}
          <WeeklyMomentum done={weekDone} goal={profile.daysPerWeek} />
        </>
      )}

      {/* Readiness & Hydration — surfaced early */}
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
          <Button size="sm" className="tap-scale" onClick={() => addWater(250)}>
            <Plus className="size-4" /> 250 ml
          </Button>
        </div>
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (todayWater / waterGoal) * 100)}%` }}
          />
        </div>
      </Card>

      {/* Stats grid */}
      <SectionTitle>At a glance</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Weekly" value={`${weekDone}/${profile.daysPerWeek}`} sub="workouts" accent={weekDone >= profile.daysPerWeek} />
        <StatCard label="Calories" value={calGoal} sub={profile.goal} />
        <StatCard label="Protein" value={`${protein}g`} sub="daily target" />
        <StatCard
          label="Weight"
          value={`${bodyWeight.at(-1)?.kg.toFixed(1) ?? profile.weightKg} kg`}
          sub="latest"
        />
      </div>

      {/* Body weight trend */}
      <SectionTitle right={<Button size="sm" variant="ghost" asChild><Link to="/progress">View <ChevronRight className="size-4" /></Link></Button>}>
        Body weight
      </SectionTitle>
      <Card>
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bodyWeight}>
              <Line dataKey="kg" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Supplements */}
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
                    <Button
                      size="sm"
                      variant={taken ? "default" : "outline"}
                      className="tap-scale"
                      onClick={() => toggleSupplement(s)}
                    >
                      {taken ? "Taken" : "Mark taken"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      {/* Recent PRs */}
      <SectionTitle>Recent PRs</SectionTitle>
      <Card>
        {recentPRs.length > 0 ? (
          <ul className="space-y-2.5">
            {recentPRs.map((pr, i) => {
              const ex = EXERCISES.find(e => e.id === pr.exerciseId);
              return (
                <li key={`${pr.exerciseId}-${pr.repCount}-${i}`} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{ex?.name ?? pr.exerciseId}</span>
                    <span className="text-xs text-muted-foreground ml-1">({pr.repCount}RM)</span>
                  </div>
                  <span className="text-sm font-bold flex items-center gap-1 text-accent">
                    <Trophy className="size-4" /> {pr.weightKg} kg
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-4">
            <Trophy className="size-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Complete workouts to start tracking PRs 🏋️</p>
          </div>
        )}
      </Card>

      <p className="text-[10px] text-muted-foreground mt-8 mb-4 text-center px-4">
        Coaching, calorie and supplement guidance is general fitness information, not medical advice.
      </p>
    </AppShell>
  );
}