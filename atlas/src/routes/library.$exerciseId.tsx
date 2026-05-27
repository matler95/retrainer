import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { EXERCISES } from "@/data/exercises";
import { useAppStore } from "@/store/useAppStore";
import { ChevronLeft, Heart, HeartOff } from "lucide-react";

export const Route = createFileRoute("/library/$exerciseId")({
  component: ExerciseDetail,
});

function ExerciseDetail() {
  const { exerciseId } = Route.useParams();
  const ex = EXERCISES.find(e => e.id === exerciseId);
  const favorites = useAppStore(s => s.favorites);
  const toggleFavorite = useAppStore(s => s.toggleFavorite);
  if (!ex) return <AppShell><p>Not found</p></AppShell>;
  const fav = favorites.includes(ex.id);
  return (
    <AppShell>
      <header className="flex items-center justify-between py-3">
        <Button asChild size="icon" variant="ghost"><Link to="/library"><ChevronLeft className="size-5" /></Link></Button>
        <Button size="icon" variant="ghost" onClick={() => toggleFavorite(ex.id)}>
          {fav ? <Heart className="size-5 fill-primary text-primary" /> : <HeartOff className="size-5" />}
        </Button>
      </header>
      <h1 className="text-3xl font-bold font-display">{ex.name}</h1>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <Tag>{ex.primary}</Tag>
        {ex.secondary.map(s => <Tag key={s} muted>{s}</Tag>)}
        <Tag>{ex.difficulty}</Tag>
      </div>
      <div className="aspect-video rounded-2xl bg-muted mt-4 grid place-items-center text-muted-foreground text-sm">
        Demo video placeholder
      </div>

      <Section title="How to perform">
        <ol className="list-decimal pl-5 space-y-1 text-sm">{ex.instructions.map((i, idx) => <li key={idx}>{i}</li>)}</ol>
      </Section>
      <Section title="Tips">
        <ul className="space-y-1 text-sm">{ex.tips.map((t, idx) => <li key={idx}>• {t}</li>)}</ul>
      </Section>
      <Section title="Common mistakes">
        <ul className="space-y-1 text-sm">{ex.mistakes.map((t, idx) => <li key={idx}>• {t}</li>)}</ul>
      </Section>
      <Section title="Programming">
        <Card>
          <div className="grid grid-cols-3 text-center gap-2">
            <Stat label="Sets" value={ex.defaultSets} />
            <Stat label="Reps" value={ex.defaultReps} />
            <Stat label="Rest" value={`${ex.restSec}s`} />
          </div>
          <p className="text-xs text-muted-foreground mt-3">Progression: {ex.progression}</p>
        </Card>
      </Section>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-5"><h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">{title}</h2>{children}</div>;
}
function Tag({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full capitalize ${muted ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}>{children}</span>;
}
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-bold font-display">{value}</div></div>;
}
