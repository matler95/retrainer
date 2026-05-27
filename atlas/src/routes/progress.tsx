import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell, AppHeader, Card, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/useAppStore";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { EXERCISES } from "@/data/exercises";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Trophy } from "lucide-react";
import { computeWeeklyVolumes } from "@/lib/volumeLandmarks";
import { MuscleHeatmap } from "@/components/MuscleHeatmap";
import { getStrengthLevel } from "@/data/strengthStandards";
import { average1RM } from "@/lib/loadCalculator";

export const Route = createFileRoute("/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const bodyWeight = useAppStore(s => s.bodyWeight);
  const sessions = useAppStore(s => s.sessions);
  const addWeight = useAppStore(s => s.addWeight);
  const water = useAppStore(s => s.water);
  const exercisePRs = useAppStore(s => s.exercisePRs);
  const profile = useAppStore(s => s.profile);
  const [newW, setNewW] = useState("");

  // Real volume data from sessions
  const weeklyVolumes = useMemo(() => computeWeeklyVolumes(sessions), [sessions]);
  const latestWeek = weeklyVolumes[0];
  const volumeData = latestWeek
    ? Object.entries(latestWeek.setsByMuscle)
        .filter(([muscle]) => muscle !== "full body")
        .map(([muscle, sets]) => ({
          muscle,
          sets,
          status: latestWeek.statusByMuscle[muscle] ?? "below",
        }))
        .sort((a, b) => b.sets - a.sets)
    : [];

  // Real volume status for heatmap
  const volumeStatus = useMemo(() => {
    if (!latestWeek) return {};
    return latestWeek.statusByMuscle;
  }, [latestWeek]);

  // Real strength data from sessions
  const strengthData = useMemo(() => {
    const exercisesToShow = ["bench-press", "squat", "deadlift", "ohp"];
    return exercisesToShow.map(exId => {
      const ex = EXERCISES.find(e => e.id === exId);
      const dataPoints = sessions
        .filter(s => s.exercises.some(e => e.exerciseId === exId))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-12)
        .map(s => {
          const log = s.exercises.find(e => e.exerciseId === exId);
          if (!log) return null;
          const bestSet = log.sets
            .filter(set => set.done && set.reps > 0 && set.weight > 0)
            .reduce((best, set) => {
              const est = average1RM(set.weight, set.reps);
              return est > best.est ? { est, set } : best;
            }, { est: 0, set: log.sets[0] });
          return {
            date: s.date.slice(5),
            e1rm: Math.round(bestSet.est * 10) / 10,
            weight: bestSet.set.weight,
          };
        })
        .filter(Boolean);

      // Strength level
      const bestE1RM = dataPoints.length > 0 ? Math.max(...dataPoints.map(d => d!.e1rm)) : 0;
      const level = profile ? getStrengthLevel(exId, bestE1RM, profile.weightKg, profile.gender) : null;

      return { id: exId, name: ex?.name ?? exId, dataPoints, level };
    });
  }, [sessions, profile]);

  return (
    <AppShell>
      <AppHeader title="Progress" />
      <Tabs defaultValue="body">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="strength">Strength</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="consistency">Streak</TabsTrigger>
        </TabsList>

        <TabsContent value="body" className="space-y-4 mt-4">
          <Card>
            <div className="flex justify-between items-baseline">
              <div>
                <div className="text-3xl font-bold font-display">{bodyWeight.at(-1)?.kg.toFixed(1) ?? "—"} kg</div>
                <div className="text-xs text-muted-foreground">Current</div>
              </div>
              <Sheet>
                <SheetTrigger asChild><Button size="sm"><Plus className="size-4" /> Log</Button></SheetTrigger>
                <SheetContent side="bottom">
                  <SheetHeader><SheetTitle>Log body weight</SheetTitle></SheetHeader>
                  <div className="flex gap-2 mt-4">
                    <Input type="number" inputMode="decimal" placeholder="kg" value={newW} onChange={e => setNewW(e.target.value)} />
                    <Button onClick={() => { if (newW) { addWeight(+newW); setNewW(""); } }}>Save</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="h-48 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bodyWeight}>
                  <Line dataKey="kg" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis domain={["dataMin-1", "dataMax+1"]} hide />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <SectionTitle>Hydration last 7 days</SectionTitle>
          <Card>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={water}>
                  <Bar dataKey="ml" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} fontSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="strength" className="mt-4 space-y-3">
          {strengthData.map(ex => (
            <Card key={ex.id}>
              <div className="flex justify-between mb-2">
                <span className="font-medium">{ex.name}</span>
                {ex.level && (
                  <span className="text-sm text-primary font-semibold">
                    {ex.level.level} ({ex.level.percentile}%)
                  </span>
                )}
              </div>
              {ex.level && (
                <div className="text-xs text-muted-foreground mb-2">
                  e1RM ratio: {ex.level.ratio}× bodyweight
                  {ex.level.kgToNext > 0 && ` · ${ex.level.kgToNext}kg to ${ex.level.nextMilestone}`}
                </div>
              )}
              {ex.dataPoints.length > 0 ? (
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ex.dataPoints}>
                      <Line dataKey="e1rm" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis domain={["dataMin-2", "dataMax+2"]} hide />
                      <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No data yet — complete workouts to see progress</p>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="volume" className="mt-4 space-y-4">
          <SectionTitle>Muscle activation this week</SectionTitle>
          <Card>
            <MuscleHeatmap volumeStatus={volumeStatus} />
          </Card>

          <SectionTitle>Sets per muscle group</SectionTitle>
          <Card>
            {volumeData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData} layout="vertical">
                    <Bar dataKey="sets" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="muscle" type="category" width={70} fontSize={11} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No volume data yet — complete workouts to see your muscle activation</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="consistency" className="mt-4 space-y-3">
          <Card>
            <div className="text-3xl font-bold font-display">{sessions.length}</div>
            <div className="text-xs text-muted-foreground">total workouts logged</div>
          </Card>
          {exercisePRs.length > 0 && (
            <Card>
              <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Trophy className="size-4 text-primary" /> Personal Records ({exercisePRs.length})
              </div>
              <ul className="space-y-1">
                {exercisePRs
                  .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime())
                  .slice(0, 8)
                  .map((pr, i) => {
                    const ex = EXERCISES.find(e => e.id === pr.exerciseId);
                    return (
                      <li key={`${pr.exerciseId}-${pr.repCount}-${i}`} className="flex justify-between text-sm">
                        <span>{ex?.name ?? pr.exerciseId} ({pr.repCount}RM)</span>
                        <span className="font-semibold text-primary">{pr.weightKg}kg</span>
                      </li>
                    );
                  })}
              </ul>
            </Card>
          )}
          <Card>
            <div className="grid grid-cols-12 gap-1">
              {(() => {
                // Build real consistency grid from session dates
                const sessionDates = new Set(sessions.map(s => s.date.slice(0, 10)));
                return Array.from({ length: 84 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (83 - i));
                  const dateStr = d.toISOString().slice(0, 10);
                  const hasSession = sessionDates.has(dateStr);
                  return (
                    <div key={i} className="aspect-square rounded-sm" style={{
                      background: hasSession ? "var(--color-primary)" : "var(--color-muted)",
                    }} />
                  );
                });
              })()}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Last 12 weeks</div>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
