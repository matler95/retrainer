import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppStore, type PlannedExercise } from "@/store/useAppStore";
import { AppShell, AppHeader, Card } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXERCISES } from "@/data/exercises";
import { ChevronLeft, Plus, Trash2, ArrowLeftRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/plan/day/$dayId")({
  component: PlanDayPage,
});

function PlanDayPage() {
  const { dayId } = Route.useParams();
  const navigate = useNavigate();
  const day = useAppStore(s => s.plan.find(d => d.id === dayId));
  const updatePlanDay = useAppStore(s => s.updatePlanDay);
  const [items, setItems] = useState<PlannedExercise[]>(day?.exercises ?? []);

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

      <div className="space-y-3">
        {items.map((it, i) => {
          const ex = EXERCISES.find(e => e.id === it.exerciseId);
          if (!ex) return null;
          return (
            <Card key={i}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-semibold">{ex.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{ex.primary} · {ex.equipment.join(", ")}</div>
                </div>
                <SwapSheet onPick={id => updateAt(i, { exerciseId: id })} />
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

      <AddSheet onPick={add} />

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

function AddSheet({ onPick }: { onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = EXERCISES.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full mt-4"><Plus className="size-4" /> Add exercise</Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader><SheetTitle>Add exercise</SheetTitle></SheetHeader>
        <Input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} className="mt-3" />
        <div className="mt-3 overflow-y-auto -mx-6 px-6 pb-8 space-y-1">
          {list.map(e => (
            <button key={e.id} onClick={() => { onPick(e.id); setOpen(false); }}
              className="w-full text-left p-3 rounded-xl hover:bg-muted border border-transparent hover:border-border">
              <div className="font-medium">{e.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{e.primary}</div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SwapSheet({ onPick }: { onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = EXERCISES.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button size="icon" variant="ghost"><ArrowLeftRight className="size-4" /></Button></SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader><SheetTitle>Swap exercise</SheetTitle></SheetHeader>
        <Input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} className="mt-3" />
        <div className="mt-3 overflow-y-auto -mx-6 px-6 pb-8 space-y-1">
          {list.map(e => (
            <button key={e.id} onClick={() => { onPick(e.id); setOpen(false); }}
              className="w-full text-left p-3 rounded-xl hover:bg-muted border border-transparent hover:border-border">
              <div className="font-medium">{e.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{e.primary}</div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
