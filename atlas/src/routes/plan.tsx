import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { AppShell, AppHeader, SectionTitle, Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { EXERCISES } from "@/data/exercises";
import { ChevronRight, RefreshCw, Play } from "lucide-react";

export const Route = createFileRoute("/plan")({
  component: PlanPage,
});

function PlanPage() {
  const plan = useAppStore(s => s.plan);
  const profile = useAppStore(s => s.profile);
  const setProfile = useAppStore(s => s.setProfile);

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
