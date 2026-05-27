/**
 * MuscleHeatmap — SVG body outline with color-coded muscle activation.
 *
 * Shows which muscle groups were trained this week vs last week.
 * Color coding:
 * - Gray: untrained (0 sets)
 * - Yellow: below MEV
 * - Green: optimal (MEV-MAV)
 * - Orange/red: above MRV (overtraining risk)
 */

import type { MuscleGroup } from "@/data/exercises";
import { cn } from "@/lib/utils";

interface MuscleHeatmapProps {
  /** Volume status per muscle group */
  volumeStatus: Record<string, "below" | "optimal" | "high" | "over">;
  /** Sets per muscle group (for tooltip) */
  setsByMuscle?: Record<string, number>;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  untrained: "#6b7280",    // gray
  below: "#eab308",        // yellow
  optimal: "#22c55e",      // green
  high: "#f97316",         // orange
  over: "#ef4444",         // red
};

const STATUS_LABELS: Record<string, string> = {
  untrained: "Not trained",
  below: "Below MEV",
  optimal: "Optimal range",
  high: "High volume",
  over: "Above MRV",
};

export function MuscleHeatmap({ volumeStatus, setsByMuscle, className }: MuscleHeatmapProps) {
  const getColor = (muscle: string) => {
    const status = volumeStatus[muscle] ?? "untrained";
    return STATUS_COLORS[status];
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="flex gap-8">
        {/* Front view */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground mb-2">Front</span>
          <svg viewBox="0 0 200 400" width="120" height="240" className="fill-none">
            {/* Body outline */}
            <ellipse cx="100" cy="30" rx="22" ry="28" stroke="currentColor" strokeWidth="1.5" fill={getColor("shoulders")} opacity="0.6" />
            <text x="100" y="34" textAnchor="middle" fontSize="8" fill="currentColor" className="fill-foreground">Head</text>

            {/* Shoulders */}
            <path d="M 65 60 Q 60 55 55 65 L 55 80 L 80 80 L 80 65 Q 80 58 75 55 Z" stroke="currentColor" strokeWidth="1" fill={getColor("shoulders")} opacity="0.6" />
            <path d="M 135 60 Q 140 55 145 65 L 145 80 L 120 80 L 120 65 Q 120 58 125 55 Z" stroke="currentColor" strokeWidth="1" fill={getColor("shoulders")} opacity="0.6" />

            {/* Chest */}
            <path d="M 80 65 L 80 110 L 100 115 L 120 110 L 120 65 Q 110 55 100 55 Q 90 55 80 65 Z" stroke="currentColor" strokeWidth="1" fill={getColor("chest")} opacity="0.6" />

            {/* Biceps */}
            <rect x="48" y="80" width="14" height="45" rx="7" stroke="currentColor" strokeWidth="1" fill={getColor("biceps")} opacity="0.6" />
            <rect x="138" y="80" width="14" height="45" rx="7" stroke="currentColor" strokeWidth="1" fill={getColor("biceps")} opacity="0.6" />

            {/* Core */}
            <rect x="82" y="115" width="36" height="50" rx="4" stroke="currentColor" strokeWidth="1" fill={getColor("core")} opacity="0.6" />

            {/* Legs (quads) */}
            <path d="M 78 170 L 75 260 L 90 265 L 100 260 L 100 170 Z" stroke="currentColor" strokeWidth="1" fill={getColor("legs")} opacity="0.6" />
            <path d="M 122 170 L 125 260 L 110 265 L 100 260 L 100 170 Z" stroke="currentColor" strokeWidth="1" fill={getColor("legs")} opacity="0.6" />

            {/* Calves */}
            <path d="M 78 270 L 76 340 L 88 345 L 92 270 Z" stroke="currentColor" strokeWidth="1" fill={getColor("calves")} opacity="0.6" />
            <path d="M 122 270 L 124 340 L 112 345 L 108 270 Z" stroke="currentColor" strokeWidth="1" fill={getColor("calves")} opacity="0.6" />

            {/* Labels */}
            <text x="100" y="95" textAnchor="middle" fontSize="7" className="fill-foreground">Chest</text>
            <text x="55" y="105" textAnchor="middle" fontSize="6" className="fill-foreground">Bi</text>
            <text x="145" y="105" textAnchor="middle" fontSize="6" className="fill-foreground">Bi</text>
            <text x="100" y="145" textAnchor="middle" fontSize="7" className="fill-foreground">Core</text>
            <text x="88" y="220" textAnchor="middle" fontSize="7" className="fill-foreground">Legs</text>
            <text x="112" y="220" textAnchor="middle" fontSize="7" className="fill-foreground">Legs</text>
            <text x="84" y="310" textAnchor="middle" fontSize="6" className="fill-foreground">Cal</text>
            <text x="116" y="310" textAnchor="middle" fontSize="6" className="fill-foreground">Cal</text>
          </svg>
        </div>

        {/* Back view */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground mb-2">Back</span>
          <svg viewBox="0 0 200 400" width="120" height="240" className="fill-none">
            {/* Body outline */}
            <ellipse cx="100" cy="30" rx="22" ry="28" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
            <text x="100" y="34" textAnchor="middle" fontSize="8" fill="currentColor" className="fill-foreground">Head</text>

            {/* Traps */}
            <path d="M 75 55 L 80 45 L 100 42 L 120 45 L 125 55 L 110 70 L 90 70 Z" stroke="currentColor" strokeWidth="1" fill={getColor("back")} opacity="0.4" />

            {/* Back (lats) */}
            <path d="M 70 70 L 80 70 L 85 130 L 100 140 L 115 130 L 120 70 L 130 70 L 125 140 L 100 155 L 75 140 Z" stroke="currentColor" strokeWidth="1" fill={getColor("back")} opacity="0.6" />

            {/* Triceps */}
            <rect x="48" y="80" width="14" height="45" rx="7" stroke="currentColor" strokeWidth="1" fill={getColor("triceps")} opacity="0.6" />
            <rect x="138" y="80" width="14" height="45" rx="7" stroke="currentColor" strokeWidth="1" fill={getColor("triceps")} opacity="0.6" />

            {/* Glutes */}
            <path d="M 78 155 L 78 185 L 100 190 L 122 185 L 122 155 L 100 145 Z" stroke="currentColor" strokeWidth="1" fill={getColor("glutes")} opacity="0.6" />

            {/* Hamstrings */}
            <path d="M 78 195 L 75 260 L 90 265 L 100 260 L 100 195 Z" stroke="currentColor" strokeWidth="1" fill={getColor("legs")} opacity="0.4" />
            <path d="M 122 195 L 125 260 L 110 265 L 100 260 L 100 195 Z" stroke="currentColor" strokeWidth="1" fill={getColor("legs")} opacity="0.4" />

            {/* Calves */}
            <path d="M 78 270 L 76 340 L 88 345 L 92 270 Z" stroke="currentColor" strokeWidth="1" fill={getColor("calves")} opacity="0.6" />
            <path d="M 122 270 L 124 340 L 112 345 L 108 270 Z" stroke="currentColor" strokeWidth="1" fill={getColor("calves")} opacity="0.6" />

            {/* Labels */}
            <text x="100" y="110" textAnchor="middle" fontSize="7" className="fill-foreground">Back</text>
            <text x="55" y="105" textAnchor="middle" fontSize="6" className="fill-foreground">Tri</text>
            <text x="145" y="105" textAnchor="middle" fontSize="6" className="fill-foreground">Tri</text>
            <text x="100" y="175" textAnchor="middle" fontSize="7" className="fill-foreground">Glutes</text>
            <text x="84" y="310" textAnchor="middle" fontSize="6" className="fill-foreground">Cal</text>
            <text x="116" y="310" textAnchor="middle" fontSize="6" className="fill-foreground">Cal</text>
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="size-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-muted-foreground">{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}