import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { Profile, Goal, Experience, Style, Activity, Gender } from "@/data/types";
import { EQUIPMENT_OPTIONS, MUSCLE_GROUPS } from "@/data/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, Sparkles, Heart, Target, Dumbbell, Calendar, Flame,
  Droplet, Activity as ActivityIcon, History, Moon, CheckCircle2, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const GOALS: Goal[] = ["lose fat", "build muscle", "strength", "general fitness", "recomposition"];
const EXPERIENCES: Experience[] = ["beginner", "intermediate", "advanced"];
const STYLES: Style[] = ["full body", "upper/lower", "push/pull/legs", "bodybuilding split", "strength focused"];
const ACTIVITIES: Activity[] = ["sedentary", "light", "moderate", "high"];
const SUPPS = ["protein", "creatine", "pre-workout", "multivitamin", "omega-3"];

const GOAL_HINTS: Record<Goal, string> = {
  "lose fat": "We'll optimize calorie burn and keep intensity high.",
  "build muscle": "Progressive overload with moderate volume and recovery focus.",
  "strength": "Heavy compound lifts, lower rep ranges, longer rest.",
  "general fitness": "Balanced mix of strength, endurance, and mobility.",
  "recomposition": "Build muscle while losing fat — the best of both worlds.",
};

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-12 px-4 rounded-full border text-sm font-medium capitalize transition-all tap-scale",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-card border-border text-foreground hover:border-primary/40"
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [p, setP] = useState<Profile>(existing ?? {
    age: 28, gender: "male", heightCm: 178, weightKg: 78,
    goal: "build muscle", experience: "intermediate",
    equipment: ["dumbbell", "barbell", "machine", "cable"],
    daysPerWeek: 4, durationMin: 60, style: "push/pull/legs",
    priorities: [], avoid: [], injuries: "",
    activity: "moderate", supplements: ["protein", "creatine"],
    waterAuto: true, waterTargetMl: 3000,
  });

  const update = <K extends keyof Profile>(k: K, v: Profile[K]) => setP(prev => ({ ...prev, [k]: v }));
  const toggleArr = <T,>(arr: T[], v: T): T[] => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  // ── Essential steps (core setup) ───────────────────────────────────
  const essentialSteps: { title: string; subtitle: string; icon: React.ReactNode; why: string; body: React.ReactNode }[] = [
    /* ── 0  Welcome ─────────────────────────────────────────────── */
    {
      title: "Welcome to Coach",
      subtitle: "Your AI-powered personal trainer.",
      icon: <Sparkles className="size-6 text-accent" />,
      why: "",
      body: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            We'll ask you a few questions to build a training plan tailored to your body,
            goals, and schedule. It only takes a couple of minutes.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: <Target className="size-4 text-accent" />, text: "Personalized to your exact goals" },
              { icon: <Dumbbell className="size-4 text-accent" />, text: "Uses equipment you already have" },
              { icon: <ActivityIcon className="size-4 text-accent" />, text: "Adapts as you progress" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {item.icon}
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    /* ── 1  Goal ────────────────────────────────────────────────── */
    {
      title: "What's your goal?",
      subtitle: "We'll tailor your plan around it.",
      icon: <Target className="size-5 text-accent" />,
      why: "Your goal determines exercise selection, rep ranges, rest periods, and weekly volume.",
      body: (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => <Chip key={g} active={p.goal === g} onClick={() => update("goal", g)}>{g}</Chip>)}
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
            {GOAL_HINTS[p.goal]}
          </p>
        </div>
      ),
    },
    /* ── 2  Experience ──────────────────────────────────────────── */
    {
      title: "Your experience",
      subtitle: "How long have you trained consistently?",
      icon: <History className="size-5 text-accent" />,
      why: "Experience level affects starting weights, exercise complexity, and weekly volume recommendations.",
      body: (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {EXPERIENCES.map(e => <Chip key={e} active={p.experience === e} onClick={() => update("experience", e)}>{e}</Chip>)}
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
            {p.experience === "beginner" && "We'll focus on form, progressive overload basics, and manageable volume."}
            {p.experience === "intermediate" && "We'll introduce periodization, varied rep ranges, and targeted volume."}
            {p.experience === "advanced" && "We'll use advanced techniques, higher volume, and fine-tuned progression."}
          </p>
        </div>
      ),
    },
    /* ── 3  About you ───────────────────────────────────────────── */
    {
      title: "About you",
      subtitle: "We use this for calorie & water targets.",
      icon: <Heart className="size-5 text-accent" />,
      why: "Body stats help us calculate accurate calorie needs, hydration targets, and starting weights.",
      body: (
        <div className="space-y-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gender</label>
            <div className="flex gap-2 mt-2">
              {(["male", "female", "other"] as Gender[]).map(g => <Chip key={g} active={p.gender === g} onClick={() => update("gender", g)}>{g}</Chip>)}
            </div>
          </div>

          {/* Age Slider */}
          <div className="space-y-3 bg-muted/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎂</span>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Age</label>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{p.age}</div>
                <div className="text-xs text-muted-foreground">years</div>
              </div>
            </div>
            <Slider min={13} max={100} step={1} value={[p.age]} onValueChange={([v]) => update("age", v)} />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>13</span>
              <span>100</span>
            </div>
          </div>

          {/* Height Slider */}
          <div className="space-y-3 bg-muted/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📏</span>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Height</label>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{p.heightCm}</div>
                <div className="text-xs text-muted-foreground">cm</div>
              </div>
            </div>
            <Slider min={140} max={220} step={1} value={[p.heightCm]} onValueChange={([v]) => update("heightCm", v)} />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>140 cm</span>
              <span>220 cm</span>
            </div>
          </div>

          {/* Weight Slider */}
          <div className="space-y-3 bg-muted/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Weight</label>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{p.weightKg}</div>
                <div className="text-xs text-muted-foreground">kg</div>
              </div>
            </div>
            <Slider min={40} max={150} step={1} value={[p.weightKg]} onValueChange={([v]) => update("weightKg", v)} />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>40 kg</span>
              <span>150 kg</span>
            </div>
          </div>
        </div>
      ),
    },
    /* ── 4  Equipment ───────────────────────────────────────────── */
    {
      title: "Available equipment",
      subtitle: "Pick everything you have access to.",
      icon: <Dumbbell className="size-5 text-accent" />,
      why: "We'll only program exercises you can actually perform with your available equipment.",
      body: <div className="flex flex-wrap gap-2">{EQUIPMENT_OPTIONS.map(eq => <Chip key={eq} active={p.equipment.includes(eq)} onClick={() => update("equipment", toggleArr(p.equipment, eq))}>{eq}</Chip>)}</div>,
    },
    /* ── 5  Schedule + Style ────────────────────────────────────── */
    {
      title: "Training preferences",
      subtitle: "How you like to train.",
      icon: <Calendar className="size-5 text-accent" />,
      why: "Your schedule and preferred split determine how we distribute volume across the week.",
      body: (
        <div className="space-y-6">
          {/* Days per week card */}
          <div className="space-y-3 bg-muted/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Days per week</label>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{p.daysPerWeek}</div>
                <div className="text-xs text-muted-foreground">days</div>
              </div>
            </div>
            <Slider min={2} max={6} step={1} value={[p.daysPerWeek]} onValueChange={([v]) => update("daysPerWeek", v)} />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>2 days</span>
              <span>6 days</span>
            </div>
          </div>

          {/* Session length card */}
          <div className="space-y-3 bg-muted/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏱️</span>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Session length</label>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{p.durationMin}</div>
                <div className="text-xs text-muted-foreground">min</div>
              </div>
            </div>
            <Slider min={30} max={120} step={15} value={[p.durationMin]} onValueChange={([v]) => update("durationMin", v)} />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>30 min</span>
              <span>120 min</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Workout style</label>
            <div className="flex flex-wrap gap-2 mt-2">{STYLES.map(s => <Chip key={s} active={p.style === s} onClick={() => update("style", s)}>{s}</Chip>)}</div>
          </div>
        </div>
      ),
    },
  ];

  // ── Advanced steps (optional) ─────────────────────────────────────
  const advancedSteps: { title: string; subtitle: string; icon: React.ReactNode; why: string; body: React.ReactNode }[] = [
    /* ── A0  Prioritize & avoid ──────────────────────────────────── */
    {
      title: "Prioritize & avoid",
      subtitle: "Fine-tune your plan (optional).",
      icon: <Flame className="size-5 text-accent" />,
      why: "We'll add extra volume to prioritized muscles and work around anything you need to avoid.",
      body: (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prioritized muscle groups</label>
            <div className="flex flex-wrap gap-2 mt-2">{MUSCLE_GROUPS.map(m => <Chip key={m} active={p.priorities.includes(m)} onClick={() => update("priorities", toggleArr(p.priorities, m))}>{m}</Chip>)}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Exercises to avoid</label>
            <Input placeholder="deadlift, overhead press" className="mt-2" value={p.avoid.join(", ")} onChange={e => update("avoid", e.target.value.split(",").map(x => x.trim()).filter(Boolean))} />
            <p className="text-xs text-muted-foreground mt-1">Comma separated</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Injuries / limitations</label>
            <Textarea placeholder="Anything we should work around?" className="mt-2" value={p.injuries} onChange={e => update("injuries", e.target.value)} />
          </div>
        </div>
      ),
    },
    /* ── A1  Hydration & supplements ─────────────────────────────── */
    {
      title: "Hydration & supplements",
      subtitle: "We'll track these on your dashboard.",
      icon: <Droplet className="size-5 text-accent" />,
      why: "Staying hydrated and consistent with supplements supports recovery and performance.",
      body: (
        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Supplements you take</label>
            <div className="flex flex-wrap gap-2 mt-2">{SUPPS.map(s => <Chip key={s} active={p.supplements.includes(s)} onClick={() => update("supplements", toggleArr(p.supplements, s))}>{s}</Chip>)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Auto water target</div>
              <div className="text-xs text-muted-foreground">Based on body weight (35 ml/kg)</div>
            </div>
            <Switch checked={p.waterAuto} onCheckedChange={v => update("waterAuto", v)} />
          </div>
          {!p.waterAuto && <Field label="Water goal" suffix="ml"><Input type="number" value={p.waterTargetMl} onChange={e => update("waterTargetMl", +e.target.value)} /></Field>}
        </div>
      ),
    },
    /* ── A2  Movement + Training history ─────────────────────────── */
    {
      title: "Movement & history",
      subtitle: "Helps us choose the right exercises and starting weights.",
      icon: <ActivityIcon className="size-5 text-accent" />,
      why: "Understanding your body and training background ensures safe, effective exercise selection.",
      body: (
        <div className="space-y-6">
          {/* Movement assessment */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mobility</label>
            <div className="flex items-center justify-between">
              <span className="text-sm">Can you squat below parallel?</span>
              <Switch checked={p.movementAssessment?.canSquatBelowParallel ?? true}
                onCheckedChange={v => update("movementAssessment", { ...(p.movementAssessment ?? { canSquatBelowParallel: true, canTouchToes: true, shoulderMobility: "full", hipFlexorTightness: "none" }), canSquatBelowParallel: v })} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Can you touch your toes?</span>
              <Switch checked={p.movementAssessment?.canTouchToes ?? true}
                onCheckedChange={v => update("movementAssessment", { ...(p.movementAssessment ?? { canSquatBelowParallel: true, canTouchToes: true, shoulderMobility: "full", hipFlexorTightness: "none" }), canTouchToes: v })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Shoulder mobility</label>
              <div className="flex gap-2 mt-1">{(["full", "limited", "restricted"] as const).map(s =>
                <Chip key={s} active={(p.movementAssessment?.shoulderMobility ?? "full") === s}
                  onClick={() => update("movementAssessment", { ...(p.movementAssessment ?? { canSquatBelowParallel: true, canTouchToes: true, shoulderMobility: "full", hipFlexorTightness: "none" }), shoulderMobility: s })}>{s}</Chip>
              )}</div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Hip flexor tightness</label>
              <div className="flex gap-2 mt-1">{(["none", "mild", "severe"] as const).map(s =>
                <Chip key={s} active={(p.movementAssessment?.hipFlexorTightness ?? "none") === s}
                  onClick={() => update("movementAssessment", { ...(p.movementAssessment ?? { canSquatBelowParallel: true, canTouchToes: true, shoulderMobility: "full", hipFlexorTightness: "none" }), hipFlexorTightness: s })}>{s}</Chip>
              )}</div>
            </div>
          </div>

          {/* Training history */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</label>
            <div>
              <label className="text-xs text-muted-foreground">Years of consistent training</label>
              <div className="flex gap-2 mt-1">{[0, 1, 2, 3, 5, 8].map(y =>
                <Chip key={y} active={(p.trainingHistory?.yearsTraining ?? 0) === y}
                  onClick={() => update("trainingHistory", { ...(p.trainingHistory ?? { yearsTraining: 0, previousPrograms: [], peakLifts: {} }), yearsTraining: y })}>{y === 0 ? "<1" : `${y}+`}</Chip>
              )}</div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Previous programs (select all)</label>
              <div className="flex flex-wrap gap-2 mt-1">{["powerlifting", "bodybuilding", "crossfit", "calisthenics", "sports", "none"].map(prog =>
                <Chip key={prog} active={(p.trainingHistory?.previousPrograms ?? []).includes(prog)}
                  onClick={() => {
                    const current = p.trainingHistory?.previousPrograms ?? [];
                    const updated = current.includes(prog) ? current.filter(x => x !== prog) : [...current, prog];
                    update("trainingHistory", { ...(p.trainingHistory ?? { yearsTraining: 0, previousPrograms: [], peakLifts: {} }), previousPrograms: updated });
                  }}>{prog}</Chip>
              )}</div>
            </div>
          </div>
        </div>
      ),
    },
    /* ── A3  Recovery profile + Lifestyle ────────────────────────── */
    {
      title: "Recovery & lifestyle",
      subtitle: "Affects readiness scoring and volume recommendations.",
      icon: <Moon className="size-5 text-accent" />,
      why: "Sleep, stress, and daily activity impact how much training volume you can recover from.",
      body: (
        <div className="space-y-6">
          {/* Lifestyle */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Activity level outside training</label>
            <div className="flex flex-wrap gap-2 mt-2">{ACTIVITIES.map(a => <Chip key={a} active={p.activity === a} onClick={() => update("activity", a)}>{a}</Chip>)}</div>
          </div>

          {/* Sleep card */}
          <div className="space-y-3 bg-muted/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌙</span>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Average sleep</label>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{p.recoveryProfile?.sleepHoursAvg ?? 7}</div>
                <div className="text-xs text-muted-foreground">hours</div>
              </div>
            </div>
            <Slider min={4} max={10} step={0.5} value={[p.recoveryProfile?.sleepHoursAvg ?? 7]}
              onValueChange={([v]) => update("recoveryProfile", { ...(p.recoveryProfile ?? { sleepHoursAvg: 7, stressLevel: 3, jobActivity: "desk", cardioFrequency: 0 }), sleepHoursAvg: v })} />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>4 hours</span>
              <span>10 hours</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stress level</label>
            <div className="flex gap-2 mt-2">{([1, 2, 3, 4, 5] as const).map(s =>
              <Chip key={s} active={(p.recoveryProfile?.stressLevel ?? 3) === s}
                onClick={() => update("recoveryProfile", { ...(p.recoveryProfile ?? { sleepHoursAvg: 7, stressLevel: 3, jobActivity: "desk", cardioFrequency: 0 }), stressLevel: s })}>{s === 1 ? "Low" : s === 5 ? "High" : `${s}`}</Chip>
            )}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Job activity</label>
            <div className="flex gap-2 mt-2">{(["desk", "light", "physical"] as const).map(j =>
              <Chip key={j} active={(p.recoveryProfile?.jobActivity ?? "desk") === j}
                onClick={() => update("recoveryProfile", { ...(p.recoveryProfile ?? { sleepHoursAvg: 7, stressLevel: 3, jobActivity: "desk", cardioFrequency: 0 }), jobActivity: j })}>{j}</Chip>
            )}</div>
          </div>
          {/* Cardio frequency card */}
          <div className="space-y-3 bg-muted/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">❤️</span>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cardio sessions per week</label>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{p.recoveryProfile?.cardioFrequency ?? 0}</div>
                <div className="text-xs text-muted-foreground">sessions</div>
              </div>
            </div>
            <Slider min={0} max={7} step={1} value={[p.recoveryProfile?.cardioFrequency ?? 0]}
              onValueChange={([v]) => update("recoveryProfile", { ...(p.recoveryProfile ?? { sleepHoursAvg: 7, stressLevel: 3, jobActivity: "desk", cardioFrequency: 0 }), cardioFrequency: v })} />
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>0</span>
              <span>7</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // ── All steps combined for display ────────────────────────────────
  const allSteps = [...essentialSteps, ...advancedSteps];
  const essentialCount = essentialSteps.length;
  const advancedCount = advancedSteps.length;
  const totalSteps = showAdvanced ? allSteps.length : essentialCount;
  const isAdvancedMode = step >= essentialCount;
  const currentStep = showAdvanced ? allSteps[step] : essentialSteps[step];
  const isLast = step === totalSteps - 1;
  const isFirst = step === 0;

  // Progress calculation: essential steps only, or all steps if advanced
  const progress = ((step + 1) / totalSteps) * 100;

  const finish = () => {
    setPlanError(null);
    try {
      setProfile(p);
      navigate({ to: "/plan" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate plan";
      console.error("Plan generation error:", err);
      setPlanError(msg);
    }
  };

  // ── Summary page with jump links ──────────────────────────────────
  const renderSummary = () => (
    <div className="space-y-4">
      {/* Plan summary */}
      <div className="rounded-2xl bg-accent/5 border border-accent/20 p-4">
        <p className="text-sm leading-relaxed">
          A <strong>{p.style}</strong> routine for <strong>{p.goal}</strong>, training{" "}
          <strong>{p.daysPerWeek}×</strong> per week for <strong>{p.durationMin} min</strong> sessions.
          {p.priorities.length > 0 && ` Emphasizing ${p.priorities.join(", ")}.`}
        </p>
      </div>

      {/* Detail rows with jump links */}
      <div className="space-y-0">
        <SummaryRow k="Goal" v={p.goal} why="Determines rep ranges, rest periods, and intensity" jumpTo={() => { setStep(1); setShowAdvanced(false); }} />
        <SummaryRow k="Experience" v={p.experience} why="Sets starting volume and exercise complexity" jumpTo={() => { setStep(2); setShowAdvanced(false); }} />
        <SummaryRow k="Schedule" v={`${p.daysPerWeek}× / week · ${p.durationMin} min`} why="Distributes training across the week" jumpTo={() => { setStep(5); setShowAdvanced(false); }} />
        <SummaryRow k="Style" v={p.style} why="Structures muscle group pairing" jumpTo={() => { setStep(5); setShowAdvanced(false); }} />
        <SummaryRow k="Equipment" v={p.equipment.join(", ")} why="Limits exercise pool to what you have" jumpTo={() => { setStep(4); setShowAdvanced(false); }} />
        {p.priorities.length > 0 && <SummaryRow k="Priority" v={p.priorities.join(", ")} why="Extra volume for focused growth" jumpTo={() => { setStep(essentialCount); setShowAdvanced(true); }} />}
        {p.avoid.length > 0 && <SummaryRow k="Avoid" v={p.avoid.join(", ")} why="Excluded from all programming" jumpTo={() => { setStep(essentialCount); setShowAdvanced(true); }} />}
        <SummaryRow k="Supplements" v={p.supplements.join(", ") || "none"} why="Tracked on your dashboard" jumpTo={() => { setStep(essentialCount + 1); setShowAdvanced(true); }} />
        {p.movementAssessment && <SummaryRow k="Mobility" v={`Squat: ${p.movementAssessment.canSquatBelowParallel ? "yes" : "no"}, Shoulders: ${p.movementAssessment.shoulderMobility}`} why="Informs exercise substitutions" jumpTo={() => { setStep(essentialCount + 2); setShowAdvanced(true); }} />}
        {p.trainingHistory && <SummaryRow k="History" v={`${p.trainingHistory.yearsTraining}yr, ${(p.trainingHistory.previousPrograms ?? []).join(", ") || "none"}`} why="Guides starting weight estimates" jumpTo={() => { setStep(essentialCount + 2); setShowAdvanced(true); }} />}
        {p.recoveryProfile && <SummaryRow k="Recovery" v={`${p.recoveryProfile.sleepHoursAvg}h sleep, stress ${p.recoveryProfile.stressLevel}/5`} why="Adjusts volume for recovery capacity" jumpTo={() => { setStep(essentialCount + 3); setShowAdvanced(true); }} />}
      </div>
    </div>
  );

  // ── Between essential and advanced: summary + choice screen ──────
  const renderAdvancedChoice = () => (
    <div className="space-y-6">
      <div className="rounded-2xl bg-accent/5 border border-accent/20 p-4">
        <p className="text-sm leading-relaxed">
          Your plan is ready with the essentials! You can <strong>generate it now</strong> or
          add advanced preferences to fine-tune your training.
        </p>
      </div>

      {/* Quick summary of what's set */}
      <div className="space-y-0">
        <SummaryRow k="Goal" v={p.goal} />
        <SummaryRow k="Experience" v={p.experience} />
        <SummaryRow k="Schedule" v={`${p.daysPerWeek}× / week · ${p.durationMin} min`} />
        <SummaryRow k="Style" v={p.style} />
        <SummaryRow k="Equipment" v={p.equipment.join(", ")} />
      </div>

      {/* Advanced options preview */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Optional advanced settings</p>
        <div className="space-y-2">
          {[
            { icon: <Flame className="size-4 text-accent" />, label: "Prioritize muscles & avoid exercises" },
            { icon: <Droplet className="size-4 text-accent" />, label: "Hydration & supplement tracking" },
            { icon: <ActivityIcon className="size-4 text-accent" />, label: "Movement assessment & training history" },
            { icon: <Moon className="size-4 text-accent" />, label: "Recovery & lifestyle profile" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-shell min-h-dvh px-4 safe-pt pb-32 flex flex-col">
      {/* Progress header */}
      {!isFirst && (
        <header className="flex items-center gap-3 py-3">
          {step > 0 ? (
            <button
              onClick={() => {
                if (showAdvanced && step === essentialCount) {
                  // Going back from first advanced step to essential summary
                  setShowAdvanced(false);
                  setStep(essentialCount - 1);
                } else {
                  setStep(s => s - 1);
                }
              }}
              className="size-10 grid place-items-center rounded-full bg-card border border-border tap-scale"
              aria-label="Go back"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : <div className="size-10" />}
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs tabular-nums text-muted-foreground">{step + 1}/{totalSteps}</div>
        </header>
      )}

      {/* Step content */}
      <div className="mt-4 flex-1">
        {isFirst && (
          <div className="flex items-center gap-2 mb-6">
            {currentStep.icon}
          </div>
        )}
        <h1 className={cn("font-bold tracking-tight", isFirst ? "text-4xl" : "text-3xl")}>{currentStep.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{currentStep.subtitle}</p>

        {/* "Why this matters" hint */}
        {currentStep.why && (
          <p className="text-xs text-muted-foreground mt-3 bg-muted/40 rounded-xl px-3 py-2 border border-border/50">
            💡 {currentStep.why}
          </p>
        )}

        <div className="mt-6">{currentStep.body}</div>
      </div>

      {/* Error banner */}
      {planError && (
        <div className="fixed bottom-28 inset-x-0 px-4 z-50">
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3 app-shell">
            <p className="font-medium">Plan generation failed</p>
            <p className="text-xs mt-1 opacity-80">{planError}</p>
          </div>
        </div>
      )}

      {/* Bottom action */}
      <div className="fixed bottom-0 inset-x-0 bg-background border-t border-border safe-pb">
        <div className="app-shell px-4 py-3 space-y-2">
          {/* Primary action */}
          {isFirst ? (
            <Button
              size="lg"
              className="w-full rounded-full text-base tap-scale"
              onClick={() => setStep(s => s + 1)}
            >
              Let's get started
            </Button>
          ) : isAdvancedMode && isLast ? (
            // Last advanced step → generate
            <Button
              size="lg"
              className="w-full rounded-full text-base tap-scale"
              onClick={finish}
            >
              Generate my plan
            </Button>
          ) : step === essentialCount - 1 && !showAdvanced ? (
            // Last essential step → show advanced choice
            <>
              <Button
                size="lg"
                className="w-full rounded-full text-base tap-scale"
                onClick={finish}
              >
                <CheckCircle2 className="size-5" /> Generate plan with essentials
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-full text-base tap-scale"
                onClick={() => { setShowAdvanced(true); setStep(essentialCount); }}
              >
                <ArrowRight className="size-4" /> Add advanced preferences
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              className="w-full rounded-full text-base tap-scale"
              onClick={() => setStep(s => s + 1)}
            >
              Continue
            </Button>
          )}
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

function Row({ k, v, why }: { k: string; v: string; why?: string }) {
  return (
    <div className="py-2.5 border-b border-border/50 last:border-0">
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground capitalize text-sm">{k}</span>
        <span className="font-medium text-right capitalize text-sm">{v}</span>
      </div>
      {why && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{why}</p>}
    </div>
  );
}

function SummaryRow({ k, v, why, jumpTo }: { k: string; v: string; why?: string; jumpTo?: () => void }) {
  return (
    <button
      className={cn(
        "w-full py-2.5 border-b border-border/50 last:border-0 text-left",
        jumpTo && "tap-scale hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
      )}
      onClick={jumpTo}
    >
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground capitalize text-sm">{k}</span>
        <span className="font-medium text-right capitalize text-sm flex items-center gap-1">
          {v}
          {jumpTo && <ChevronLeft className="size-3 rotate-180 opacity-40" />}
        </span>
      </div>
      {why && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{why}</p>}
    </button>
  );
}