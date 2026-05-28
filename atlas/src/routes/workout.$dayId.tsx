import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAppStore, type SessionExerciseLog, type SetLog, type SessionTag } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXERCISES } from "@/data/exercises";
import {
  Check, ChevronLeft, ChevronUp, ChevronDown, X, Play,
  SkipForward, RotateCcw, Plus, Minus, ListOrdered, Timer,
} from "lucide-react";
import { analyzeSet, adaptiveRest } from "@/lib/setFeedback";
import { computeSessionSummary } from "@/lib/sessionSummary";
import { SessionSummaryScreen } from "@/components/SessionSummaryScreen";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workout/$dayId")({
  component: WorkoutSession,
});

const DEFAULT_REST = 120;

/* ── Rest Timer Overlay ─────────────────────────────────────────── */
function RestTimerOverlay({
  rest,
  totalRest,
  onSkip,
  onAdjust,
}: {
  rest: number;
  totalRest: number;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
}) {
  const pct = totalRest > 0 ? ((totalRest - rest) / totalRest) * 100 : 0;
  const isLow = rest <= 10;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4 safe-pb">
      <div className="app-shell">
        <div
          className={cn(
            "rounded-2xl border px-5 py-4 shadow-2xl elevation-overlay transition-colors",
            isLow
              ? "bg-accent text-accent-foreground border-accent/60"
              : "bg-primary text-primary-foreground border-primary/40"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="size-4 opacity-80" />
              <div>
                <div className="text-[10px] opacity-80 uppercase tracking-wider">Rest</div>
                <div className="text-4xl font-bold font-display tabular-nums leading-none mt-1">
                  {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full tap-scale"
                onClick={() => onAdjust(-15)}
              >
                -15s
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full tap-scale"
                onClick={() => onAdjust(15)}
              >
                +15s
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="rounded-full tap-scale"
                onClick={onSkip}
                aria-label="Skip rest"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-primary-foreground/20 overflow-hidden">
            <div
              className="h-full bg-primary-foreground transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          {isLow && (
            <p className="text-xs opacity-80 mt-2 font-medium">Almost there — get ready! 💪</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Weight / Reps Stepper ──────────────────────────────────────── */
function Stepper({
  label,
  value,
  unit,
  step,
  min,
  inputMode,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  step: number;
  min: number;
  inputMode: "decimal" | "numeric";
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex items-center justify-between mt-2">
        <Button
          size="icon"
          variant="outline"
          className="h-11 w-11 rounded-full tap-scale"
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="size-4" />
        </Button>
        <div className="flex flex-col items-center">
          <Input
            type="number"
            inputMode={inputMode}
            value={value}
            onChange={e => onChange(+e.target.value)}
            className="h-12 text-center text-2xl font-bold font-display border-0 bg-transparent p-0 w-20"
            aria-label={label}
          />
          <span className="text-[10px] text-muted-foreground -mt-1">{unit}</span>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-11 w-11 rounded-full tap-scale"
          onClick={() => onChange(value + step)}
          aria-label={`Increase ${label}`}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/* ── WorkoutSession ─────────────────────────────────────────────── */
function WorkoutSession() {
  const { dayId } = Route.useParams();
  const navigate = useNavigate();
  const day = useAppStore(s => s.plan.find(d => d.id === dayId));
  const saveSession = useAppStore(s => s.saveSession);

  const [order, setOrder] = useState<number[]>(() =>
    (day?.exercises ?? []).map((_, i) => i)
  );
  const [logs, setLogs] = useState<SessionExerciseLog[]>(() =>
    (day?.exercises ?? []).map(pe => ({
      exerciseId: pe.exerciseId,
      sets: Array.from({ length: pe.sets }).map(() => ({
        reps: parseInt(pe.reps.split("-")[0]) || 0,
        weight: pe.lastWeight ?? 20,
        rpe: undefined,
        done: false,
      })),
    }))
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const [showList, setShowList] = useState(false);
  const [showSummary, setShowSummary] = useState<import("@/lib/sessionSummary").SessionSummary | null>(null);
  const [sessionStartTime] = useState(() => Date.now());
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);

  // Rest timer
  const [rest, setRest] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(DEFAULT_REST);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (rest === null) return;
    restRef.current = setInterval(() => {
      setRest(r => {
        if (r === null) return null;
        if (r <= 1) {
          if (restRef.current) clearInterval(restRef.current);
          toast.success("Rest complete — let's go 💪");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, [rest !== null]);

  if (!day) {
    return (
      <div className="app-shell min-h-dvh px-4 safe-pt">
        <p className="mt-8 text-muted-foreground">Day not found.</p>
      </div>
    );
  }

  const exerciseIndex = order[activeIdx];
  const plan = day.exercises[exerciseIndex];
  const log = logs[exerciseIndex];
  const ex = EXERCISES.find(e => e.id === log.exerciseId)!;
  const currentSet = log.sets.findIndex(s => !s.done);
  const totalSets = log.sets.length;
  const completedSets = log.sets.filter(s => s.done).length;
  const exerciseDone = currentSet === -1;

  const totalExercises = order.length;
  const exercisesDone = logs.filter(l => l.sets.every(s => s.done)).length;
  const overallProgress = Math.round(
    (logs.reduce((acc, l) => acc + l.sets.filter(s => s.done).length, 0) /
      Math.max(1, logs.reduce((acc, l) => acc + l.sets.length, 0))) * 100
  );

  const setSet = (ei: number, si: number, patch: Partial<SetLog>) => {
    setLogs(prev => prev.map((l, i) => i === ei ? {
      ...l,
      sets: l.sets.map((s, j) => j === si ? { ...s, ...patch } : s),
    } : l));
  };

  const completeSet = () => {
    if (currentSet === -1) return;
    setSet(exerciseIndex, currentSet, { done: true });

    const completedSet = log.sets[currentSet];
    const targetReps: [number, number] = (() => {
      const parts = plan.reps.split("-").map(Number);
      return [parts[0] ?? 8, parts[1] ?? 12];
    })();
    const previousSets = log.sets.filter((s, i) => i < currentSet && s.done);
    const feedback = analyzeSet(completedSet, targetReps, previousSets, log.exerciseId);

    setLastFeedback(feedback.message);
    toast(feedback.message, { duration: 3000 });

    if (feedback.nextSetSuggestion && currentSet < totalSets - 1) {
      const nextSetIdx = currentSet + 1;
      setSet(exerciseIndex, nextSetIdx, {
        weight: feedback.nextSetSuggestion.weight,
      });
    }

    const isLastSet = currentSet === totalSets - 1;
    if (isLastSet) {
      toast.success(`${ex.name} done!`);
      setTimeout(() => goNext(), 400);
    } else {
      const adaptiveRestTime = adaptiveRest(completedSet.rpe ?? 7, plan.restSec || DEFAULT_REST);
      setRestTotal(adaptiveRestTime);
      setRest(adaptiveRestTime);
    }
  };

  const undoLastSet = () => {
    const lastDone = [...log.sets].reverse().findIndex(s => s.done);
    if (lastDone === -1) return;
    const idx = log.sets.length - 1 - lastDone;
    setSet(exerciseIndex, idx, { done: false });
    setRest(null);
  };

  const goNext = () => {
    setRest(null);
    setLastFeedback(null);
    for (let step = 1; step <= order.length; step++) {
      const next = (activeIdx + step) % order.length;
      const nl = logs[order[next]];
      if (!nl.sets.every(s => s.done)) {
        setActiveIdx(next);
        return;
      }
    }
    toast.success("All exercises complete!");
  };

  const goPrev = () => {
    setRest(null);
    setLastFeedback(null);
    setActiveIdx(i => (i - 1 + order.length) % order.length);
  };

  const move = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= order.length) return;
    setOrder(prev => {
      const copy = [...prev];
      [copy[from], copy[to]] = [copy[to], copy[from]];
      return copy;
    });
    if (activeIdx === from) setActiveIdx(to);
    else if (activeIdx === to) setActiveIdx(from);
  };

  const jumpTo = (idx: number) => {
    setActiveIdx(idx);
    setShowList(false);
    setRest(null);
    setLastFeedback(null);
  };

  const handleFinish = () => {
    const durationMs = Date.now() - sessionStartTime;
    const durationMin = Math.round(durationMs / (1000 * 60));
    const session = {
      id: `s-${Date.now()}`,
      dayId,
      date: new Date().toISOString(),
      startedAt: new Date(sessionStartTime).toISOString(),
      finishedAt: new Date().toISOString(),
      durationMin,
      exercises: logs,
    };
    const sessions = useAppStore.getState().sessions;
    const summary = computeSessionSummary(session, day.exercises, sessions);
    setShowSummary(summary);
    saveSession(session);
  };

  const handleSummaryFinish = (tags: SessionTag[]) => {
    toast.success("Workout saved", { description: "Great session 💪" });
    navigate({ to: "/" });
  };

  const hint = exerciseDone
    ? (() => {
        const doneSets = log.sets.filter(s => s.done);
        if (doneSets.length === 0) return null;
        const allHitTarget = doneSets.every(s => s.reps >= parseInt(plan.reps.split("-").pop() || "0"));
        if (allHitTarget) {
          const inc = (doneSets[0]?.weight ?? 20) >= 60 ? 2.5 : 1;
          return { message: `All reps hit! Try +${inc}kg next session.` };
        }
        return { message: "Solid effort. Aim for top of rep range next time." };
      })()
    : null;

  const setBeingLogged = currentSet === -1 ? totalSets - 1 : currentSet;
  const activeSet = log.sets[setBeingLogged];

  if (showSummary) {
    return <SessionSummaryScreen summary={showSummary} onFinish={handleSummaryFinish} />;
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col safe-pt">
      {/* Top bar */}
      <header className="app-shell w-full px-4 flex items-center justify-between py-3">
        <Button asChild size="icon" variant="ghost" className="tap-scale" aria-label="Back to plan">
          <Link to="/plan"><ChevronLeft className="size-5" /></Link>
        </Button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{day.name}</div>
          <div className="text-sm font-semibold">
            Exercise {activeIdx + 1} / {totalExercises}
          </div>
        </div>
        <Button size="icon" variant="ghost" className="tap-scale" onClick={() => setShowList(s => !s)} aria-label="Exercise list">
          <ListOrdered className="size-5" />
        </Button>
      </header>

      {/* Overall progress */}
      <div className="app-shell w-full px-4">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground flex justify-between">
          <span>{exercisesDone}/{totalExercises} exercises</span>
          <span>{overallProgress}%</span>
        </div>
      </div>

      {/* Exercise list overlay */}
      {showList && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur safe-pt" role="dialog" aria-label="Exercise list">
          <div className="app-shell px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-display">Exercises</h2>
              <Button size="icon" variant="ghost" className="tap-scale" onClick={() => setShowList(false)} aria-label="Close exercise list">
                <X className="size-5" />
              </Button>
            </div>
            <div className="space-y-2">
              {order.map((ei, i) => {
                const e = EXERCISES.find(x => x.id === logs[ei].exerciseId)!;
                const l = logs[ei];
                const done = l.sets.every(s => s.done);
                const doneSets = l.sets.filter(s => s.done).length;
                return (
                  <div
                    key={ei}
                    className={cn(
                      "rounded-xl border p-3 flex items-center gap-2 bg-card elevation-card",
                      i === activeIdx && "border-accent bg-accent/5"
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 tap-scale" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                        <ChevronUp className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 tap-scale" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label="Move down">
                        <ChevronDown className="size-4" />
                      </Button>
                    </div>
                    <button className="flex-1 text-left tap-scale" onClick={() => jumpTo(i)}>
                      <div className="flex items-center gap-2">
                        {done && <Check className="size-4 text-accent" />}
                        <span className="font-semibold">{e.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {doneSets}/{l.sets.length} sets · target {day.exercises[ei].reps}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
            <Button className="w-full mt-6 rounded-full tap-scale" size="lg" onClick={handleFinish}>
              Finish & save workout
            </Button>
          </div>
        </div>
      )}

      {/* Focused exercise card */}
      <main className="app-shell w-full flex-1 px-4 pt-4 pb-44 flex flex-col">
        <div className="rounded-3xl border bg-card p-6 flex-1 flex flex-col elevation-card">
          {/* Exercise info */}
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {ex.primary}
          </div>
          <h2 className="text-3xl font-display font-bold mt-1 leading-tight">{ex.name}</h2>
          <div className="text-sm text-muted-foreground mt-1">
            Target {totalSets}×{plan.reps} · {plan.restSec || DEFAULT_REST}s rest
          </div>

          {/* Set progress dots */}
          <div className="flex gap-2 mt-5">
            {log.sets.map((s, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-2.5 rounded-full transition-colors",
                  s.done ? "bg-accent" : i === currentSet ? "bg-accent/40" : "bg-muted"
                )}
              />
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Set {Math.min(currentSet === -1 ? totalSets : currentSet + 1, totalSets)} of {totalSets}
            {" · "}{completedSets} completed
          </div>

          {/* Controls or completion */}
          {!exerciseDone ? (
            <div className="mt-8 grid grid-cols-2 gap-4">
              <Stepper
                label="Weight"
                value={activeSet.weight}
                unit="kg"
                step={2.5}
                min={0}
                inputMode="decimal"
                onChange={v => setSet(exerciseIndex, setBeingLogged, { weight: v })}
              />
              <Stepper
                label="Reps"
                value={activeSet.reps}
                unit="reps"
                step={1}
                min={0}
                inputMode="numeric"
                onChange={v => setSet(exerciseIndex, setBeingLogged, { reps: v })}
              />
            </div>
          ) : (
            <div className="mt-8 rounded-2xl bg-accent/10 border border-accent/30 p-5 text-center">
              <div className="text-lg font-semibold text-accent">Exercise complete 🎉</div>
              {hint && <div className="text-sm text-muted-foreground mt-1">{hint.message}</div>}
            </div>
          )}

          {/* Feedback or tip */}
          {!exerciseDone && lastFeedback && (
            <div className="mt-4 rounded-xl bg-accent/5 border border-accent/20 p-3 text-sm text-accent font-medium">
              {lastFeedback}
            </div>
          )}
          {!exerciseDone && !lastFeedback && ex.tips[0] && (
            <div className="mt-6 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Tip · </span>{ex.tips[0]}
            </div>
          )}

          <div className="flex-1" />

          {/* Action buttons — thumb-friendly */}
          {!exerciseDone ? (
            <div className="mt-6 space-y-2">
              <Button
                size="lg"
                className="w-full h-14 rounded-full text-base font-semibold tap-scale bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={completeSet}
              >
                <Check className="size-5" /> Complete set {currentSet + 1}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" className="rounded-full tap-scale" onClick={undoLastSet} disabled={completedSets === 0}>
                  <RotateCcw className="size-4" /> Undo
                </Button>
                <Button variant="outline" size="lg" className="rounded-full tap-scale" onClick={goNext}>
                  <SkipForward className="size-4" /> Skip
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <Button size="lg" className="w-full h-14 rounded-full tap-scale bg-accent hover:bg-accent/90 text-accent-foreground" onClick={goNext}>
                <SkipForward className="size-5" /> Next exercise
              </Button>
            </div>
          )}
        </div>

        {/* Prev/Next mini-nav */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <button className="text-muted-foreground hover:text-foreground tap-scale px-3 py-2 rounded-lg" onClick={goPrev}>
            ← Previous
          </button>
          <button className="text-muted-foreground hover:text-foreground tap-scale px-3 py-2 rounded-lg" onClick={goNext}>
            Next →
          </button>
        </div>
      </main>

      {/* Rest timer overlay */}
      {rest !== null && rest > 0 && (
        <RestTimerOverlay
          rest={rest}
          totalRest={restTotal}
          onSkip={() => setRest(null)}
          onAdjust={delta => setRest(r => Math.max(0, (r ?? 0) + delta))}
        />
      )}

      {/* Finish workout floating button */}
      {(rest === null || rest === 0) && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-4 safe-pb">
          <div className="app-shell px-4">
            <Button variant="outline" size="lg" className="w-full rounded-full tap-scale" onClick={handleFinish}>
              <Play className="size-4 rotate-90" /> Finish & save workout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}