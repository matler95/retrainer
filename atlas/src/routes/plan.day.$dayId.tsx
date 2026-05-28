import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAppStore, type PlannedExercise } from "@/store/useAppStore";
import { AppShell, AppHeader, Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXERCISES, type MuscleGroup, type ExerciseCategory, type Mechanic } from "@/data/exercises";
import { ChevronLeft, Plus, Trash2, ArrowLeftRight, Dumbbell, Target, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan/day/$dayId")({
  component: PlanDayPage,
});

/** Get the likely muscle groups for a given day based on its name */
function guessDayMuscles(name: string): MuscleGroup[] {
  const lc = name.toLowerCase();
  if (lc.includes("push")) return ["chest", "shoulders", "triceps"];
  if (lc.includes("pull")) return ["lats", "biceps", "middle_back", "traps"];
  if (lc.includes("leg") || lc.includes("lower")) return ["quads", "hamstrings", "glutes", "calves"];
  if (lc.includes("upper")) return ["chest", "lats", "shoulders", "biceps", "triceps", "middle_back"];
  if (lc.includes("chest")) return ["chest"];
  if (lc.includes("back")) return ["lats", "middle_back", "biceps"];
  if (lc.includes("shoulder")) return ["shoulders"];
  if (lc.includes("arm")) return ["biceps", "triceps"];
  if (lc.includes("squat")) return ["quads", "glutes", "hamstrings", "calves"];
  if (lc.includes("bench")) return ["chest", "shoulders", "triceps"];
  if (lc.includes("deadlift")) return ["lats", "hamstrings", "glutes", "lower_back"];
  if (lc.includes("core") || lc.includes("abs")) return ["abs", "lower_back"];
  if (lc.includes("full body")) return ["quads", "chest", "lats", "shoulders", "abs"];
  return [];
}

/** Tabs for filtering exercises by category */
const CATEGORIES: { key: "all" | ExerciseCategory; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "📋" },
  { key: "compound", label: "Compound", icon: "🏋️" },
  { key: "isolation", label: "Isolation", icon: "🎯" },
  { key: "cardio", label: "Cardio", icon: "🏃" },
  { key: "plyometric", label: "Plyometric", icon: "💥" },
];

const MECHANICS: { key: Mechanic; label: string; icon: string }[] = [
  { key: "push", label: "Push", icon: "👉" },
  { key: "pull", label: "Pull", icon: "👈" },
  { key: "hinge", label: "Hinge", icon: "🔑" },
  { key: "squat", label: "Squat", icon: "⬇️" },
  { key: "rotation", label: "Rotation", icon: "🔄" },
];

function PlanDayPage() {
  const { dayId } = Route.useParams();
  const navigate = useNavigate();
  const day = useAppStore(s => s.plan.find(d => d.id === dayId));
  const updatePlanDay = useAppStore(s => s.updatePlanDay);
  const profile = useAppStore(s => s.profile);
  const [items, setItems] = useState<PlannedExercise[]>(day?.exercises ?? []);

  // Derive the day's likely muscle groups from its name for recommendations
  const dayMuscles = useMemo(() => guessDayMuscles(day?.name ?? ""), [day?.name]);
  // Get the muscle groups actually present in the current exercises
  const presentMuscles = useMemo(() => {
    const muscles = new Set<MuscleGroup>();
    items.forEach(it => {
      const ex = EXERCISES.find(e => e.id === it.exerciseId);
      if (ex) muscles.add(ex.primary);
    });
    return [...muscles];
  }, [items]);

  if (!day) return <AppShell><p>Day not found.</p></AppShell>;

  const save = () => { updatePlanDay(dayId, items); navigate({ to: "/plan" }); };
  const updateAt = (i: number, patch: Partial<PlannedExercise>) =>
    setItems(items.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const removeAt = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const add = (id: string) => {
    const e = EXERCISES.find(x => x.id === id)!;
    setItems([...items, { exerciseId: id, sets: e.defaultSets, reps: e.defaultReps, restSec: e.restSec }]);
  };

  return (
    <AppShell>
      <header className="flex items-center gap-3 py-4">
        <Button asChild size="icon" variant="ghost"><Link to="/plan"><ChevronLeft className="size-5" /></Link></Button>
        <h1 className="text-2xl font-bold">{day.name}</h1>
      </header>

      {/* Muscle coverage summary */}
      {dayMuscles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {dayMuscles.map(m => (
            <span key={m} className={cn(
              "text-[11px] px-2 py-1 rounded-full capitalize",
              presentMuscles.includes(m)
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              {presentMuscles.includes(m) ? "✅" : "⬜"} {m.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {items.map((it, i) => {
          const ex = EXERCISES.find(e => e.id === it.exerciseId);
          if (!ex) return null;
          return (
            <Card key={i}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-semibold">{ex.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {ex.primary.replace(/_/g, " ")} · {ex.equipment.join(", ")}
                    {ex.category && <span> · {ex.category}</span>}
                  </div>
                </div>
                <SwapSheet onPick={id => updateAt(i, { exerciseId: id })} dayMuscles={dayMuscles} />
                <Button size="icon" variant="ghost" onClick={() => removeAt(i)}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <NumField label="Sets" value={it.sets} onChange={v => updateAt(i, { sets: v })} />
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground">Reps</label>
                  <Input value={it.reps} onChange={e => updateAt(i, { reps: e.target.value })} />
                </div>
                <NumField label="Rest (s)" value={it.restSec} onChange={v => updateAt(i, { restSec: v })} />
              </div>
            </Card>
          );
        })}
      </div>

      <AddSheet onPick={add} dayMuscles={dayMuscles} />

      <div className="fixed bottom-0 inset-x-0 bg-background border-t border-border safe-pb">
        <div className="app-shell px-4 py-3">
          <Button size="lg" className="w-full rounded-full" onClick={save}>Save changes</Button>
        </div>
      </div>
    </AppShell>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="text-[10px] uppercase text-muted-foreground">{label}</label>
      <Input type="number" inputMode="numeric" value={value} onChange={e => onChange(+e.target.value)} />
    </div>
  );
}

function ExercisePicker({ onPick, dayMuscles }: { onPick: (id: string) => void; dayMuscles: MuscleGroup[] }) {
  const [q, setQ] = useState("");
  const [filterMuscle, setFilterMuscle] = useState<MuscleGroup | "all">("all");
  const [filterCategory, setFilterCategory] = useState<"all" | ExerciseCategory>("all");

  // Build list of relevant muscle groups for this day
  const relevantMuscles = dayMuscles.length > 0 ? dayMuscles : [];

  const list = EXERCISES.filter(e => {
    // Text search
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;

    // Muscle filter
    if (filterMuscle !== "all" && e.primary !== filterMuscle) return false;

    // Category filter
    if (filterCategory !== "all" && e.category !== filterCategory) return false;

    return true;
  }).slice(0, 40); // Show top 40 results to keep UI responsive

  return (
    <div>
      {/* Search */}
      <Input
        placeholder="Search exercises..."
        value={q}
        onChange={e => setQ(e.target.value)}
        className="mt-3"
        autoFocus
      />

      {/* Muscle group filter chips (derived from day's expected muscles) */}
      {relevantMuscles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          <button
            onClick={() => setFilterMuscle("all")}
            className={cn("text-xs px-2.5 py-1 rounded-full capitalize transition-colors",
              filterMuscle === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            All
          </button>
          {relevantMuscles.map(m => (
            <button
              key={m}
              onClick={() => setFilterMuscle(m)}
              className={cn("text-xs px-2.5 py-1 rounded-full capitalize transition-colors",
                filterMuscle === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {m.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      {/* Category filter tabs */}
      <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setFilterCategory(c.key as "all" | ExerciseCategory)}
            className={cn("text-xs whitespace-nowrap px-2.5 py-1 rounded-full transition-colors",
              filterCategory === c.key ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
            )}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="mt-3 overflow-y-auto -mx-6 px-6 pb-8 space-y-1 max-h-[50vh]">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No exercises match your filters.</p>
        ) : (
          list.map(e => (
            <button
              key={e.id}
              onClick={() => { onPick(e.id); }}
              className="w-full text-left p-3 rounded-xl hover:bg-muted border border-transparent hover:border-border transition-colors"
            >
              <div className="font-medium">{e.name}</div>
              <div className="text-xs text-muted-foreground capitalize flex gap-2 mt-0.5">
                <span>{e.primary.replace(/_/g, " ")}</span>
                {e.category && <span>· {e.category}</span>}
                <span>· {e.equipment.slice(0, 2).join(", ")}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function AddSheet({ onPick, dayMuscles }: { onPick: (id: string) => void; dayMuscles: MuscleGroup[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full mt-4"><Plus className="size-4" /> Add exercise</Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader><SheetTitle>Add exercise</SheetTitle></SheetHeader>
        <ExercisePicker onPick={(id) => { onPick(id); setOpen(false); }} dayMuscles={dayMuscles} />
      </SheetContent>
    </Sheet>
  );
}

function SwapSheet({ onPick, dayMuscles }: { onPick: (id: string) => void; dayMuscles: MuscleGroup[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="icon" variant="ghost"><ArrowLeftRight className="size-4" /></Button></SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader><SheetTitle>Swap exercise</SheetTitle></SheetHeader>
        <ExercisePicker onPick={(id) => { onPick(id); setOpen(false); }} dayMuscles={dayMuscles} />
      </SheetContent>
    </Sheet>
  );
}
