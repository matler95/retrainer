import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { AppShell, AppHeader, SectionTitle, Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { EXERCISES } from "@/data/exercises";
import { scorePlan } from "@/lib/planScorer";
import { ChevronRight, RefreshCw, Play, Star, Info } from "lucide-react";

export const Route = createFileRoute("/plan")({
  component: PlanPage,
});

function PlanScoreBadge({ score, notes }: { score: number; notes: string[] }) {
  const color = score >= 80 ? "text-green-500 border-green-500/30 bg-green-500/10"
    : score >= 60 ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/10"
    : "text-red-400 border-red-400/30 bg-red-400/10";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs work";

  return (
    <Card className={`border ${color}`}>
      <div className="flex items-center gap-3">
        <Star className={`size-5 ${color.split(" ")[0]}`} />
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Plan quality</span>
            <span className={`text-2xl font-bold font-display ${color.split(" ")[0]}`}>{score}/100</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </div>
      {notes.length > 0 && (
        <div className="mt-3 space-y-1">
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
      <AppHeader title="Your plan" right={
        <Button size="sm" variant="outline" onClick={() => profile && setProfile(profile)}>
          <RefreshCw className="size-4" /> Regenerate
        </Button>
      } />
      {profile && (
        <Card className="border-primary/30 bg-primary/5">
          <div className="text-xs uppercase text-muted-foreground">Why this plan</div>
          <p className="text-sm mt-1">
            A <b>{profile.style}</b> routine built for <b>{profile.goal}</b>, {profile.daysPerWeek}× per week using your {profile.equipment.join(", ")}.
            {profile.priorities.length > 0 && ` Emphasizing ${profile.priorities.join(", ")}.`}
          </p>
        </Card>
      )}

      {planScore && <PlanScoreBadge score={planScore.overall} notes={planScore.notes} />}

      <SectionTitle>This week</SectionTitle>
      <div className="space-y-3">
        {plan.map((day) => (
          <Card key={day.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold font-display text-lg">{day.name}</div>
                <div className="text-xs text-muted-foreground">{day.exercises.length} exercises</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild><Link to="/plan/day/$dayId" params={{ dayId: day.id }}>Edit <ChevronRight className="size-4" /></Link></Button>
                <Button size="sm" asChild><Link to="/workout/$dayId" params={{ dayId: day.id }}><Play className="size-4" /></Link></Button>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {day.exercises.map(pe => {
                const ex = EXERCISES.find(e => e.id === pe.exerciseId);
                if (!ex) return null;
                return (
                  <li key={pe.exerciseId} className="flex justify-between text-sm">
                    <span>{ex.name}</span>
                    <span className="text-muted-foreground tabular-nums">{pe.sets}×{pe.reps}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
