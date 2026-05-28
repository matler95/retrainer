/**
 * SessionSummaryScreen — Post-workout celebration screen.
 *
 * Displays a full-screen summary after completing a workout:
 * - Amplified celebration header
 * - Volume and duration stats
 * - PR highlights with polished treatment
 * - Progression decisions
 * - Next-step guidance (next workout, recovery, plan review)
 * - Session tags for journaling
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, HighlightBadge } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import {
  Trophy, Clock, Dumbbell, Target, TrendingUp, Check,
  ArrowRight, Moon, CalendarCheck,
} from "lucide-react";
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
        <div className="text-center pt-4 pb-2">
          <div className="text-6xl mb-4 animate-bounce">{hasPRs ? "🏆" : "🎉"}</div>
          <h1 className="text-3xl font-bold font-display tracking-tight">
            {hasPRs ? "New Personal Records!" : "Workout Complete!"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {hasPRs
              ? `You broke ${summary.prsBreached.length} PR${summary.prsBreached.length > 1 ? "s" : ""} today!`
              : "Great effort — consistency is what builds strength."}
          </p>
          <HighlightBadge className="mt-3">
            <Clock className="size-3" /> {summary.duration} min
          </HighlightBadge>
        </div>

        {/* PR highlights */}
        {hasPRs && (
          <Card className="border-accent/30 bg-accent/5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="size-5 text-accent" />
              <span className="font-semibold text-accent">Personal Records</span>
            </div>
            <div className="space-y-3">
              {summary.prsBreached.map((pr, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{pr.exerciseName}</div>
                    <div className="text-xs text-muted-foreground">
                      {pr.weight}kg × {pr.reps}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold font-display text-accent">
                      {pr.estimated1RM}kg
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">e1RM</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryStatCard
            icon={<Dumbbell className="size-4" />}
            label="Volume"
            value={`${(summary.totalVolume / 1000).toFixed(1)}k kg`}
          />
          <SummaryStatCard
            icon={<Clock className="size-4" />}
            label="Duration"
            value={`${summary.duration} min`}
          />
          <SummaryStatCard
            icon={<Target className="size-4" />}
            label="Sets"
            value={`${summary.setsCompleted}/${summary.setsPlanned}`}
            sub={`${summary.completionRate}% completion`}
          />
          <SummaryStatCard
            icon={<TrendingUp className="size-4" />}
            label="Avg RPE"
            value={summary.avgRpe > 0 ? summary.avgRpe.toFixed(1) : "—"}
          />
        </div>

        {/* Top set */}
        {summary.topSet && (
          <Card>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top Set</div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-bold font-display text-lg">{summary.topSet.exercise}</span>
                <span className="text-muted-foreground ml-2">
                  {summary.topSet.weight}kg × {summary.topSet.reps}
                </span>
              </div>
              <span className="text-accent font-bold font-display">
                e1RM {summary.topSet.e1rm}kg
              </span>
            </div>
          </Card>
        )}

        {/* Progression decisions */}
        {summary.progressionDecisions.length > 0 && (
          <Card>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Next Time</div>
            <div className="space-y-2.5">
              {summary.progressionDecisions.slice(0, 4).map((prog, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{prog.exerciseName}</span>
                  <span
                    className={cn(
                      "font-semibold",
                      prog.decision.action === "increase" && "text-green-500",
                      prog.decision.action === "maintain" && "text-yellow-500",
                      prog.decision.action === "deload" && "text-red-400",
                    )}
                  >
                    {prog.decision.action === "increase" && `↑ ${prog.decision.nextWeight}kg`}
                    {prog.decision.action === "maintain" && "→ maintain"}
                    {prog.decision.action === "deload" && `↓ ${prog.decision.nextWeight}kg`}
                    {prog.decision.action === "technique" && "🎯 technique focus"}
                    {prog.decision.action === "variation" && "🔄 try variation"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Coach hint */}
        <Card className="border-primary/15 bg-primary/5">
          <p className="text-sm leading-relaxed">{summary.nextSessionHint}</p>
        </Card>

        {/* Next steps */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">What's next</div>
          <div className="space-y-2">
            <NextStepCard
              icon={<CalendarCheck className="size-4 text-accent" />}
              title="Plan your next session"
              description="Check your plan for the next scheduled workout."
              to="/plan"
            />
            <NextStepCard
              icon={<Moon className="size-4 text-blue-400" />}
              title="Recovery"
              description="Prioritize sleep, hydration, and nutrition today."
            />
            <NextStepCard
              icon={<TrendingUp className="size-4 text-green-500" />}
              title="View progress"
              description="Track your trends and PR history over time."
              to="/progress"
            />
          </div>
        </div>

        {/* Session tags */}
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">How did it feel?</div>
          <div className="flex flex-wrap gap-2">
            {SESSION_TAGS.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id as SessionTag)}
                className={cn(
                  "px-3 py-2 rounded-full border text-sm flex items-center gap-1.5 transition-all tap-scale min-h-[2.75rem]",
                  selectedTags.includes(tag.id as SessionTag)
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border text-foreground hover:border-primary/40",
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
            className="w-full rounded-full text-base tap-scale bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => onFinish(selectedTags)}
          >
            <Check className="size-5" /> Save & Finish
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Summary Stat Card ──────────────────────────────────────────── */
function SummaryStatCard({
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
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold font-display">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

/* ── Next Step Card ─────────────────────────────────────────────── */
function NextStepCard({
  icon,
  title,
  description,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  to?: string;
}) {
  const content = (
    <div className="flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground shrink-0" />
    </div>
  );

  if (to) {
    return (
      <Link to={to}>
        <Card className="tap-scale hover:border-primary/30 transition-colors">
          {content}
        </Card>
      </Link>
    );
  }

  return (
    <Card className="opacity-80">
      {content}
    </Card>
  );
}