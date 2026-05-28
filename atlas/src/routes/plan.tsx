import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { AppShell, AppHeader, SectionTitle, Card, HighlightBadge } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { EXERCISES } from "@/data/exercises";
import { scorePlan } from "@/lib/planScorer";
import { ChevronRight, RefreshCw, Play, Star, Info, Target, Calendar, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan")({
  component: PlanPage,
});

/* ── Day focus colors ───────────────────────────────────────────── */
const DAY_COLORS = [
  { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-500" },
  { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-500" },
  { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-500" },
  { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-500" },
  { bg: "bg-teal-500/10", border: "border-teal-500/20", text: "text-teal-500" },
  { bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-500" },
  { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-500" },
];

/* ── PlanScoreBadge ─────────────────────────────────────────────── */
function PlanScoreBadge({ score, notes }: { score: number; notes: string[] }) {
  const color = score >= 80 ? "text-green-500 border-green-500/30 bg-green-500/5"
    : score >= 60 ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/5"
    : "text-red-400 border-red-400/30 bg-red-400/5";
  const label = score >= 80 ? "Excellent plan" : score >= 60 ? "Good plan" : "Could be improved";
  const emoji = score >= 80 ? "✨" : score >= 60 ? "👍" : "⚠️";

  return (
    <Card className={cn("border", color.split(" ").slice(1).join(" "), color.split(" ")[0])}>
      <div className="flex items-center gap-3">
        <Star className={cn("size-5", color.split(" ")[0])} />
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">{emoji} {label}</span>
            <span className={cn("text-2xl font-bold font-display", color.split(" ")[0])}>{score}</span>
          </div>
        </div>
      </div>
      {notes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {notes.slice(0, 3).map((note, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="size-3 mt-0.5 shrink-0" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── PlanPage ───────────────────────────────────────────────────── */
function PlanPage() {
  const plan = useAppStore(s => s.plan);
  const profile = useAppStore(s => s.profile);
  const setProfile = useAppStore(s => s.setProfile);

  const planScore = useMemo(() => {
    if (!profile || plan.length === 0) return null;
    return scorePlan(plan, profile);
  }, [plan, profile]);

  return (
    <AppShell>
      <AppHeader
        title="Your plan"
        right={
          <Button size="sm" variant="ghost" onClick={() => profile && setProfile(profile)}>
            <RefreshCw className="size-4" />
          </Button>
        }
      />

      {/* Plan rationale */}
      {profile && (
        <Card className="border-primary/15 bg-primary/5">
          <div className="flex items-start gap-2.5">
            <Target className="size-4 text-accent mt-0.5 shrink-0" />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Why this plan</div>
              <p className="text-sm leading-relaxed">
                A <strong>{profile.style}</strong> routine built for <strong>{profile.goal}</strong>,{" "}
                {profile.daysPerWeek}× per week using your {profile.equipment.join(", ")}.
                {profile.priorities.length > 0 && ` Emphasizing ${profile.priorities.join(", ")}.`}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Plan score */}
      {planScore && <PlanScoreBadge score={planScore.overall} notes={planScore.notes} />}

      {/* Weekly summary */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Weekly overview</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total sessions</span>
          <span className="font-semibold">{plan.length} days</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-muted-foreground">Total exercises</span>
          <span className="font-semibold">{plan.reduce((a, d) => a + d.exercises.length, 0)}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-muted-foreground">Est. session time</span>
          <span className="font-semibold">~{profile?.durationMin ?? 60} min</span>
        </div>
      </Card>

      {/* Day cards */}
      <SectionTitle>This week</SectionTitle>
      <div className="space-y-3">
        {plan.map((day, idx) => {
          const colors = DAY_COLORS[idx % DAY_COLORS.length];
          // Detect focus from first exercise primary muscle
          const firstEx = EXERCISES.find(e => e.id === day.exercises[0]?.exerciseId);
          const focus = firstEx?.primary ?? "mixed";

          return (
            <Card
              key={day.id}
              className={cn("transition-all tap-scale", colors.border)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn("size-9 rounded-xl flex items-center justify-center text-sm font-bold", colors.bg, colors.text)}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold font-display text-lg leading-tight">{day.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{day.exercises.length} exercises</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <HighlightBadge className="text-[10px] py-0">
                        <Dumbbell className="size-2.5" /> {focus}
                      </HighlightBadge>
                    </div>
                  </div>
                </div>
              </div>

              <ul className="space-y-1.5 mb-3">
                {day.exercises.slice(0, 4).map(pe => {
                  const ex = EXERCISES.find(e => e.id === pe.exerciseId);
                  if (!ex) return null;
                  return (
                    <li key={pe.exerciseId} className="flex justify-between text-sm">
                      <span className="text-foreground">{ex.name}</span>
                      <span className="text-muted-foreground tabular-nums font-medium">{pe.sets}×{pe.reps}</span>
                    </li>
                  );
                })}
                {day.exercises.length > 4 && (
                  <li className="text-xs text-muted-foreground">
                    +{day.exercises.length - 4} more exercises
                  </li>
                )}
              </ul>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 rounded-xl tap-scale" asChild>
                  <Link to="/plan/day/$dayId" params={{ dayId: day.id }}>
                    Edit <ChevronRight className="size-4" />
                  </Link>
                </Button>
                <Button size="sm" className="flex-1 rounded-xl tap-scale bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
                  <Link to="/workout/$dayId" params={{ dayId: day.id }}>
                    <Play className="size-4" /> Start
                  </Link>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}