import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAppStore, type SessionExerciseLog, type SetLog, type SessionTag } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXERCISES } from "@/data/exercises";
import {
  Check, ChevronLeft, ChevronUp, ChevronDown, X, Play,
  SkipForward, RotateCcw, Plus, Minus, ListOrdered, Tag,
} from "lucide-react";
import { analyzeSet, adaptiveRest, SESSION_TAGS } from "@/lib/setFeedback";
import { computeSessionSummary } from "@/lib/sessionSummary";
import { SessionSummaryScreen } from "@/components/SessionSummaryScreen";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workout/$dayId")({
  component: WorkoutSession,
});

const DEFAULT_REST = 120; // 2 minutes

function WorkoutSession() {
  const { dayId } = Route.useParams();
  const navigate = useNavigate();
  const day = useAppStore(s => s.plan.find(d => d.id === dayId));
  const saveSession = useAppStore(s => s.saveSession);

  // Local ordered list (user can reorder/skip)
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
        <p className="mt-8">Day not found.</p>
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

    // Analyze the set for feedback
    const completedSet = log.sets[currentSet];
    const targetReps: [number, number] = (() => {
      const parts = plan.reps.split("-").map(Number);
      return [parts[0] ?? 8, parts[1] ?? 12];
    })();
    const previousSets = log.sets.filter((s, i) => i < currentSet && s.done);
    const feedback = analyzeSet(completedSet, targetReps, previousSets, log.exerciseId);

    // Show feedback message
    setLastFeedback(feedback.message);
    toast(feedback.message, {
      duration: 3000,
    });

    // Apply next-set suggestion if available
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
      // Use adaptive rest based on RPE
      const adaptiveRestTime = adaptiveRest(completedSet.rpe ?? 7, plan.restSec || DEFAULT_REST);
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
    // find next not-fully-done exercise from order
    for (let step = 1; step <= order.length; step++) {
      const next = (activeIdx + step) % order.length;
      const nl = logs[order[next]];
      if (!nl.sets.every(s => s.done)) {
        setActiveIdx(next);
        return;
      }
    }
    // all done
    toast.success("All exercises complete!");
  };

  const goPrev = () => {
    setRest(null);
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
    // Compute summary before saving
    const sessions = useAppStore.getState().sessions;
    const summary = computeSessionSummary(session, day.exercises, sessions);
    // Show summary screen
    setShowSummary(summary);
    // Save session (we'll handle tags in the summary finish)
    saveSession(session);
  };

  const handleSummaryFinish = (tags: SessionTag[]) => {
    // Tags are saved with the session already
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

  const bump = (field: "weight" | "reps", delta: number) => {
    setSet(exerciseIndex, setBeingLogged, { [field]: Math.max(0, activeSet[field] + delta) });
  };

  // Show summary screen if workout is finished
  if (showSummary) {
    return <SessionSummaryScreen summary={showSummary} onFinish={handleSummaryFinish} />;
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col safe-pt">
      {/* Top bar */}
      <header className="app-shell w-full px-4 flex items-center justify-between py-3">
        <Button asChild size="icon" variant="ghost">
          <Link to="/plan"><ChevronLeft className="size-5" /></Link>
        </Button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{day.name}</div>
          <div className="text-sm font-semibold">
            Exercise {activeIdx + 1} / {totalExercises}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => setShowList(s => !s)}>
          <ListOrdered className="size-5" />
        </Button>
      </header>

      {/* Overall progress */}
      <div className="app-shell w-full px-4">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
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
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur safe-pt">
          <div className="app-shell px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Exercises</h2>
              <Button size="icon" variant="ghost" onClick={() => setShowList(false)}>
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
                      "rounded-xl border p-3 flex items-center gap-2 bg-card",
                      i === activeIdx && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0}>
                        <ChevronUp className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === order.length - 1}>
                        <ChevronDown className="size-4" />
                      </Button>
                    </div>
                    <button className="flex-1 text-left" onClick={() => jumpTo(i)}>
                      <div className="flex items-center gap-2">
                        {done && <Check className="size-4 text-primary" />}
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
            <Button className="w-full mt-6 rounded-full" size="lg" onClick={handleFinish}>
              Finish & save workout
            </Button>
          </div>
        </div>
      )}

      {/* Focused card */}
      <main className="app-shell w-full flex-1 px-4 pt-4 pb-44 flex flex-col">
        <div className="rounded-3xl border bg-card p-6 flex-1 flex flex-col">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {ex.primary}
          </div>
          <h2 className="text-3xl font-display font-bold mt-1 leading-tight">{ex.name}</h2>
          <div className="text-sm text-muted-foreground mt-1">
            Target {totalSets}×{plan.reps} · {plan.restSec || DEFAULT_REST}s rest
          </div>

          {/* Set dots */}
          <div className="flex gap-2 mt-5">
            {log.sets.map((s, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-2.5 rounded-full transition-colors",
                  s.done ? "bg-primary" : i === currentSet ? "bg-primary/40" : "bg-muted"
                )}
              />
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Set {Math.min(currentSet === -1 ? totalSets : currentSet + 1, totalSets)} of {totalSets}
            {" · "}{completedSets} completed
          </div>

          {!exerciseDone ? (
            <div className="mt-8 grid grid-cols-2 gap-4">
              {/* Weight */}
              <div className="rounded-2xl border bg-background p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Weight (kg)</div>
                <div className="flex items-center justify-between mt-2">
                  <Button size="icon" variant="outline" className="h-10 w-10 rounded-full" onClick={() => bump("weight", -2.5)}>
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={activeSet.weight}
                    onChange={e => setSet(exerciseIndex, setBeingLogged, { weight: +e.target.value })}
                    className="h-12 text-center text-2xl font-bold font-display border-0 bg-transparent p-0 w-20"
                  />
                  <Button size="icon" variant="outline" className="h-10 w-10 rounded-full" onClick={() => bump("weight", 2.5)}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
              {/* Reps */}
              <div className="rounded-2xl border bg-background p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reps</div>
                <div className="flex items-center justify-between mt-2">
                  <Button size="icon" variant="outline" className="h-10 w-10 rounded-full" onClick={() => bump("reps", -1)}>
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={activeSet.reps}
                    onChange={e => setSet(exerciseIndex, setBeingLogged, { reps: +e.target.value })}
                    className="h-12 text-center text-2xl font-bold font-display border-0 bg-transparent p-0 w-20"
                  />
                  <Button size="icon" variant="outline" className="h-10 w-10 rounded-full" onClick={() => bump("reps", 1)}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl bg-primary/10 border border-primary/30 p-4">
              <div className="text-sm font-semibold text-primary">Exercise complete 🎉</div>
              {hint && <div className="text-sm mt-1">{hint.message}</div>}
            </div>
          )}

          {/* Tips or set feedback */}
          {!exerciseDone && lastFeedback && (
            <div className="mt-4 rounded-xl bg-primary/5 border border-primary/20 p-3 text-sm text-primary">
              {lastFeedback}
            </div>
          )}
          {!exerciseDone && !lastFeedback && ex.tips[0] && (
            <div className="mt-6 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Tip · </span>{ex.tips[0]}
            </div>
          )}

          <div className="flex-1" />

          {/* Action buttons */}
          {!exerciseDone ? (
            <div className="mt-6 space-y-2">
              <Button
                size="lg"
                className="w-full h-14 rounded-full text-base font-semibold"
                onClick={completeSet}
              >
                <Check className="size-5" /> Complete set {currentSet + 1}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="lg" className="rounded-full" onClick={undoLastSet} disabled={completedSets === 0}>
                  <RotateCcw className="size-4" /> Undo
                </Button>
                <Button variant="outline" size="lg" className="rounded-full" onClick={goNext}>
                  <SkipForward className="size-4" /> Skip
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <Button size="lg" className="w-full h-14 rounded-full" onClick={goNext}>
                <SkipForward className="size-5" /> Next exercise
              </Button>
            </div>
          )}
        </div>

        {/* Prev/Next mini-nav */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <button className="text-muted-foreground hover:text-foreground" onClick={goPrev}>
            ← Previous
          </button>
          <button className="text-muted-foreground hover:text-foreground" onClick={goNext}>
            Next →
          </button>
        </div>
      </main>

      {/* Rest timer overlay */}
      {rest !== null && rest > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4 safe-pb">
          <div className="app-shell">
            <div className="rounded-2xl border border-primary/40 bg-primary text-primary-foreground px-5 py-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] opacity-80 uppercase tracking-wider">Rest</div>
                  <div className="text-4xl font-bold font-display tabular-nums leading-none mt-1">
                    {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setRest(r => Math.max(0, (r ?? 0) - 15))}>
                    -15s
                  </Button>
                  <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setRest(r => (r ?? 0) + 15)}>
                    +15s
                  </Button>
                  <Button size="icon" variant="secondary" className="rounded-full" onClick={() => setRest(null)}>
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-primary-foreground/20 overflow-hidden">
                <div
                  className="h-full bg-primary-foreground transition-all"
                  style={{
                    width: `${100 - (rest / (plan.restSec || DEFAULT_REST)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finish workout floating button when nothing's resting */}
      {(rest === null || rest === 0) && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-4 safe-pb">
          <div className="app-shell px-4">
            <Button variant="outline" size="lg" className="w-full rounded-full" onClick={handleFinish}>
              <Play className="size-4 rotate-90" /> Finish & save workout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
