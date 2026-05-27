import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, AppHeader, Card, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/useAppStore";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { EXERCISES } from "@/data/exercises";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const bodyWeight = useAppStore(s => s.bodyWeight);
  const sessions = useAppStore(s => s.sessions);
  const addWeight = useAppStore(s => s.addWeight);
  const water = useAppStore(s => s.water);
  const [newW, setNewW] = useState("");

  // Mock per-muscle volume (last 7 entries)
  const volumeData = ["chest", "back", "legs", "shoulders", "arms"].map(m => ({
    muscle: m, volume: Math.floor(2000 + Math.random() * 6000),
  }));

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
          {EXERCISES.slice(0, 4).map(e => {
            const data = Array.from({ length: 6 }).map((_, i) => ({ s: i, w: 40 + i * 2.5 + Math.random() * 2 }));
            return (
              <Card key={e.id}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{e.name}</span>
                  <span className="text-sm text-primary font-semibold">+{(Math.random() * 10).toFixed(1)}%</span>
                </div>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <Line dataKey="w" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="volume" className="mt-4">
          <Card>
            <div className="text-sm text-muted-foreground mb-2">Weekly volume by muscle (kg × reps)</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} layout="vertical">
                  <Bar dataKey="volume" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="muscle" type="category" width={70} fontSize={11} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="consistency" className="mt-4 space-y-3">
          <Card>
            <div className="text-3xl font-bold font-display">{sessions.length}</div>
            <div className="text-xs text-muted-foreground">total workouts logged</div>
          </Card>
          <Card>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 84 }).map((_, i) => {
                const intensity = Math.random();
                return <div key={i} className="aspect-square rounded-sm" style={{ background: intensity > 0.6 ? "var(--color-primary)" : intensity > 0.3 ? "color-mix(in oklab, var(--color-primary) 40%, var(--color-muted))" : "var(--color-muted)" }} />;
              })}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Last 12 weeks</div>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
