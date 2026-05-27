import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppStore, type Profile, type Goal, type Experience, type Style, type Activity, type Gender } from "@/store/useAppStore";
import { EQUIPMENT_OPTIONS, MUSCLE_GROUPS, type Equipment, type MuscleGroup } from "@/data/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const GOALS: Goal[] = ["lose fat", "build muscle", "strength", "general fitness", "recomposition"];
const EXPERIENCES: Experience[] = ["beginner", "intermediate", "advanced"];
const STYLES: Style[] = ["full body", "upper/lower", "push/pull/legs", "bodybuilding split", "strength focused"];
const ACTIVITIES: Activity[] = ["sedentary", "light", "moderate", "high"];
const SUPPS = ["protein", "creatine", "pre-workout", "multivitamin", "omega-3"];

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-12 px-4 rounded-full border text-sm font-medium capitalize transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:border-primary/50"
      )}
    >
      {children}
    </button>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const setProfile = useAppStore(s => s.setProfile);
  const existing = useAppStore(s => s.profile);

  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(existing ?? {
    age: 28, gender: "male", heightCm: 178, weightKg: 78,
    goal: "build muscle", experience: "intermediate",
    equipment: ["dumbbells", "barbell", "machine", "cable"],
    daysPerWeek: 4, durationMin: 60, style: "push/pull/legs",
    priorities: [], avoid: [], injuries: "",
    activity: "moderate", supplements: ["protein", "creatine"],
    waterAuto: true, waterTargetMl: 3000,
  });

  const update = <K extends keyof Profile>(k: K, v: Profile[K]) => setP(prev => ({ ...prev, [k]: v }));
  const toggleArr = <T,>(arr: T[], v: T): T[] => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const steps: { title: string; subtitle: string; body: React.ReactNode }[] = [
    {
      title: "What's your goal?", subtitle: "We'll tailor your plan around it.",
      body: <div className="flex flex-wrap gap-2">{GOALS.map(g => <Chip key={g} active={p.goal === g} onClick={() => update("goal", g)}>{g}</Chip>)}</div>,
    },
    {
      title: "Your experience", subtitle: "How long have you trained consistently?",
      body: <div className="flex flex-wrap gap-2">{EXPERIENCES.map(e => <Chip key={e} active={p.experience === e} onClick={() => update("experience", e)}>{e}</Chip>)}</div>,
    },
    {
      title: "About you", subtitle: "We use this for calorie & water targets.",
      body: <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground">Gender</label>
          <div className="flex gap-2 mt-1">
            {(["male", "female", "other"] as Gender[]).map(g => <Chip key={g} active={p.gender === g} onClick={() => update("gender", g)}>{g}</Chip>)}
          </div>
        </div>
        <Field label="Age" suffix="yrs"><Input type="number" inputMode="numeric" value={p.age} onChange={e => update("age", +e.target.value)} /></Field>
        <Field label="Height" suffix="cm"><Input type="number" inputMode="numeric" value={p.heightCm} onChange={e => update("heightCm", +e.target.value)} /></Field>
        <Field label="Weight" suffix="kg"><Input type="number" inputMode="decimal" value={p.weightKg} onChange={e => update("weightKg", +e.target.value)} /></Field>
      </div>,
    },
    {
      title: "Available equipment", subtitle: "Pick everything you have access to.",
      body: <div className="flex flex-wrap gap-2">{EQUIPMENT_OPTIONS.map(eq => <Chip key={eq} active={p.equipment.includes(eq)} onClick={() => update("equipment", toggleArr(p.equipment, eq))}>{eq}</Chip>)}</div>,
    },
    {
      title: "Your schedule", subtitle: "How often and how long?",
      body: <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2"><span>Days per week</span><span className="font-semibold">{p.daysPerWeek}</span></div>
          <Slider min={2} max={6} step={1} value={[p.daysPerWeek]} onValueChange={([v]) => update("daysPerWeek", v)} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-2"><span>Session length</span><span className="font-semibold">{p.durationMin} min</span></div>
          <Slider min={30} max={120} step={15} value={[p.durationMin]} onValueChange={([v]) => update("durationMin", v)} />
        </div>
      </div>,
    },
    {
      title: "Workout style", subtitle: "Choose a structure you like.",
      body: <div className="flex flex-wrap gap-2">{STYLES.map(s => <Chip key={s} active={p.style === s} onClick={() => update("style", s)}>{s}</Chip>)}</div>,
    },
    {
      title: "Prioritize & avoid", subtitle: "Optional.",
      body: <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground">Prioritized muscle groups</label>
          <div className="flex flex-wrap gap-2 mt-1">{MUSCLE_GROUPS.map(m => <Chip key={m} active={p.priorities.includes(m)} onClick={() => update("priorities", toggleArr(p.priorities, m))}>{m}</Chip>)}</div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Exercises to avoid (comma separated)</label>
          <Input placeholder="deadlift, overhead press" value={p.avoid.join(", ")} onChange={e => update("avoid", e.target.value.split(",").map(x => x.trim()).filter(Boolean))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Injuries / limitations</label>
          <Textarea placeholder="Anything we should work around?" value={p.injuries} onChange={e => update("injuries", e.target.value)} />
        </div>
      </div>,
    },
    {
      title: "Lifestyle", subtitle: "For calorie estimate.",
      body: <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground">Activity level outside training</label>
          <div className="flex flex-wrap gap-2 mt-1">{ACTIVITIES.map(a => <Chip key={a} active={p.activity === a} onClick={() => update("activity", a)}>{a}</Chip>)}</div>
        </div>
      </div>,
    },
    {
      title: "Hydration & supplements", subtitle: "We'll remind you on the dashboard.",
      body: <div className="space-y-5">
        <div>
          <label className="text-xs text-muted-foreground">Supplements you take</label>
          <div className="flex flex-wrap gap-2 mt-1">{SUPPS.map(s => <Chip key={s} active={p.supplements.includes(s)} onClick={() => update("supplements", toggleArr(p.supplements, s))}>{s}</Chip>)}</div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Auto water target</div>
            <div className="text-xs text-muted-foreground">Based on body weight (35 ml/kg)</div>
          </div>
          <Switch checked={p.waterAuto} onCheckedChange={v => update("waterAuto", v)} />
        </div>
        {!p.waterAuto && <Field label="Water goal" suffix="ml"><Input type="number" value={p.waterTargetMl} onChange={e => update("waterTargetMl", +e.target.value)} /></Field>}
      </div>,
    },
    {
      title: "Review", subtitle: "We'll build your plan now.",
      body: <div className="space-y-2 text-sm">
        <Row k="Goal" v={p.goal} /><Row k="Experience" v={p.experience} />
        <Row k="Schedule" v={`${p.daysPerWeek}× / week · ${p.durationMin} min`} />
        <Row k="Style" v={p.style} />
        <Row k="Equipment" v={p.equipment.join(", ")} />
        {p.priorities.length > 0 && <Row k="Priority" v={p.priorities.join(", ")} />}
        {p.avoid.length > 0 && <Row k="Avoid" v={p.avoid.join(", ")} />}
        <Row k="Supplements" v={p.supplements.join(", ") || "none"} />
      </div>,
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  const finish = () => {
    setProfile(p);
    navigate({ to: "/plan" });
  };

  return (
    <div className="app-shell min-h-dvh px-4 safe-pt pb-32 flex flex-col">
      <header className="flex items-center gap-3 py-3">
        {step > 0 ? (
          <button onClick={() => setStep(s => s - 1)} className="size-10 grid place-items-center rounded-full bg-card border border-border"><ChevronLeft className="size-5" /></button>
        ) : <div className="size-10" />}
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
        <div className="text-xs tabular-nums text-muted-foreground">{step + 1}/{steps.length}</div>
      </header>

      <div className="mt-4 flex-1">
        <h1 className="text-3xl font-bold tracking-tight">{current.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{current.subtitle}</p>
        <div className="mt-6">{current.body}</div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-background border-t border-border safe-pb">
        <div className="app-shell px-4 py-3">
          <Button size="lg" className="w-full rounded-full text-base" onClick={() => isLast ? finish() : setStep(s => s + 1)}>
            {isLast ? "Generate my plan" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, suffix, children }: { label: string; suffix?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="relative">
        {children}
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 py-2 border-b border-border last:border-0"><span className="text-muted-foreground capitalize">{k}</span><span className="font-medium text-right capitalize">{v}</span></div>;
}
