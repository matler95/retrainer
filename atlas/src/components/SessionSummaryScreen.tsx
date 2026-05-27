/**
 * SessionSummaryScreen — Post-workout celebration screen.
 *
 * Displays a full-screen summary after completing a workout:
 * - Volume and duration stats
 * - PR highlights with celebration
 * - Progression decisions
 * - Next session hint
 * - Session tags for journaling
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import { Trophy, Clock, Dumbbell, Target, TrendingUp, ChevronRight, Check } from "lucide-react";
import { SESSION_TAGS } from "@/lib/setFeedback";
import type { SessionSummary } from "@/lib/sessionSummary";
import type { SessionTag } from "@/data/types";

interface SessionSummaryScreenProps {
  summary: SessionSummary;
  onFinish: (tags: SessionTag[]) => void;
}

export function SessionSummaryScreen({ summary, onFinish }: SessionSummaryScreenProps) {
  const [selectedTags, setSelectedTags] = useState<SessionTag[]>([]);

  const toggleTag = (tagId: SessionTag) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
  };

  const hasPRs = summary.prsBreached.length > 0;

  return (
    <div className="min-h-dvh bg-background flex flex-col safe-pt">
      <main className="app-shell flex-1 px-4 pt-6 pb-32 space-y-4">
        {/* Celebration header */}
        <div className="text-center">
          <div className="text-5xl mb-3">{hasPRs ? "🏆" : "🎉"}</div>
          <h1 className="text-3xl font-bold font-display">
            {hasPRs ? "New Personal Records!" : "Workout Complete!"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {hasPRs
              ? `You broke ${summary.prsBreached.length} PR${summary.prsBreached.length > 1 ? "s" : ""}!`
              : "Great effort — consistency is key."}
          </p>
        </div>

        {/* PR highlights */}
        {hasPRs && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="size-5 text-yellow-500" />
              <span className="font-semibold text-yellow-500">Personal Records</span>
            </div>
            <div className="space-y-2">
              {summary.prsBreached.map((pr, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{pr.exerciseName}</span>
                  <span className="font-bold text-yellow-500">
                    {pr.weight}kg × {pr.reps} (e1RM: {pr.estimated1RM}kg)
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Dumbbell className="size-4" />}
            label="Volume"
            value={`${(summary.totalVolume / 1000).toFixed(1)}k kg`}
          />
          <StatCard
            icon={<Clock className="size-4" />}
            label="Duration"
            value={`${summary.duration} min`}
          />
          <StatCard
            icon={<Target className="size-4" />}
            label="Sets"
            value={`${summary.setsCompleted}/${summary.setsPlanned}`}
            sub={`${summary.completionRate}%`}
          />
          <StatCard
            icon={<TrendingUp className="size-4" />}
            label="Avg RPE"
            value={summary.avgRpe > 0 ? summary.avgRpe.toFixed(1) : "—"}
          />
        </div>

        {/* Top set */}
        {summary.topSet && (
          <Card>
            <div className="text-xs uppercase text-muted-foreground mb-1">Top Set</div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-bold font-display text-lg">{summary.topSet.exercise}</span>
                <span className="text-muted-foreground ml-2">
                  {summary.topSet.weight}kg × {summary.topSet.reps}
                </span>
              </div>
              <span className="text-primary font-bold">
                e1RM {summary.topSet.e1rm}kg
              </span>
            </div>
          </Card>
        )}

        {/* Progression decisions */}
        {summary.progressionDecisions.length > 0 && (
          <Card>
            <div className="text-xs uppercase text-muted-foreground mb-3">Next Time</div>
            <div className="space-y-2">
              {summary.progressionDecisions.slice(0, 4).map((prog, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{prog.exerciseName}</span>
                  <span className={cn(
                    "font-medium",
                    prog.decision.action === "increase" && "text-green-500",
                    prog.decision.action === "maintain" && "text-yellow-500",
                    prog.decision.action === "deload" && "text-red-400",
                  )}>
                    {prog.decision.action === "increase" && `↑ ${prog.decision.nextWeight}kg`}
                    {prog.decision.action === "maintain" && "→ maintain"}
                    {prog.decision.action === "deload" && `↓ ${prog.decision.nextWeight}kg`}
                    {prog.decision.action === "technique" && "🎯 technique"}
                    {prog.decision.action === "variation" && "🔄 variation"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Next session hint */}
        <Card className="border-primary/30 bg-primary/5">
          <p className="text-sm">{summary.nextSessionHint}</p>
        </Card>

        {/* Session tags */}
        <div>
          <div className="text-xs uppercase text-muted-foreground mb-3">How did it feel?</div>
          <div className="flex flex-wrap gap-2">
            {SESSION_TAGS.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id as SessionTag)}
                className={cn(
                  "px-3 py-2 rounded-full border text-sm flex items-center gap-1.5 transition-colors",
                  selectedTags.includes(tag.id as SessionTag)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-foreground hover:border-primary/50",
                )}
              >
                <span>{tag.emoji}</span>
                <span>{tag.label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Finish button */}
      <div className="fixed bottom-0 inset-x-0 bg-background border-t border-border safe-pb">
        <div className="app-shell px-4 py-3">
          <Button
            size="lg"
            className="w-full rounded-full text-base"
            onClick={() => onFinish(selectedTags)}
          >
            <Check className="size-5" /> Save & Finish
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs uppercase">{label}</span>
      </div>
      <div className="text-2xl font-bold font-display">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}