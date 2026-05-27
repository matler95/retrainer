import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, AppHeader, Card } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { EXERCISES, MUSCLE_GROUPS, type MuscleGroup } from "@/data/exercises";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  component: LibraryPage,
});

function LibraryPage() {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");
  const list = EXERCISES.filter(e =>
    (muscle === "all" || e.primary === muscle) &&
    e.name.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <AppShell>
      <AppHeader title="Exercise library" />
      <Input placeholder="Search exercises" value={q} onChange={e => setQ(e.target.value)} />
      <div className="flex gap-2 overflow-x-auto py-3 -mx-4 px-4 no-scrollbar">
        {(["all", ...MUSCLE_GROUPS] as const).map(m => (
          <button key={m} onClick={() => setMuscle(m)}
            className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border capitalize",
              muscle === m ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground")}>
            {m}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map(e => (
          <Link key={e.id} to="/library/$exerciseId" params={{ exerciseId: e.id }}>
            <Card className="flex items-center justify-between hover:border-primary/40 transition-colors">
              <div>
                <div className="font-semibold">{e.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{e.primary} · {e.equipment.join(", ")}</div>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-muted text-muted-foreground">{e.difficulty}</span>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
