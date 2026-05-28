/**
 * Plan generation algorithm for creating personalized training plans.
 *
 * Generates training plans using:
 * - Exercise scoring (equipment, injury, preference, experience, variety)
 * - Periodization-aware rep ranges (accumulation = higher reps, etc.)
 * - Volume landmarks (MEV/MAV/MRV) for set counts
 * - Muscle coverage balancing (via DAY_MUSCLE_MAP)
 * - Undulating periodization support (per-session rep ranges)
 * - User preferences (favorites/disliked) for better exercise selection
 *
 * This is a pure module — all functions are deterministic with no side effects.
 */

import { EXERCISES, type MuscleGroup } from "@/data/exercises";
import type {
  Profile,
  PlanDay,
  PlannedExercise,
  Style,
} from "@/data/types";
import {
  getCurrentBlock,
  formatRepRange,
  type TrainingBlock,
  type UndulatingBlock,
} from "@/lib/periodization";
import { getVolumeLandmarks } from "@/lib/volumeLandmarks";
import { pickTopScored } from "@/lib/exerciseScorer";

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Default number of exercises per muscle group per session.
 * Used as baseline for volume calculations.
 */
const DEFAULT_EXERCISES_PER_MUSCLE: Partial<Record<MuscleGroup, number>> = {
  chest: 2,
  shoulders: 2,
  triceps: 1,
  lats: 2,
  middle_back: 1,
  traps: 1,
  biceps: 1,
  quads: 2,
  hamstrings: 1,
  glutes: 1,
  calves: 1,
  abs: 1,
  lower_back: 1,
  forearms: 0,
  abductors: 0,
  adductors: 1,
  neck: 0,
  // Legacy aliases
  back: 2,
  legs: 3,
  core: 1,
  "full body": 1,
};

/**
 * Muscle groups covered by each workout style per day.
 * Used to determine which muscles need coverage when generating a plan.
 */
const DAY_MUSCLE_MAP: Record<string, MuscleGroup[][]> = {
  "push/pull/legs": [
    ["chest", "shoulders", "triceps"],                              // Push
    ["lats", "middle_back", "biceps", "traps"],                     // Pull
    ["quads", "hamstrings", "glutes", "calves", "abs"],             // Legs
  ],
  "upper/lower": [
    ["chest", "lats", "middle_back", "shoulders", "biceps", "triceps"],  // Upper
    ["quads", "hamstrings", "glutes", "calves", "abs"],                  // Lower
  ],
  "full body": [
    ["quads", "chest", "lats", "shoulders", "abs"], // single full body template
  ],
};

// ─── Plan Generation ────────────────────────────────────────────────────────

/**
 * Generate an enhanced training plan using exercise scoring,
 * periodization-aware rep ranges, and volume landmarks.
 *
 * @param profile - User's profile and preferences
 * @param blocks - Periodization training blocks
 * @param weekNumber - Current week (0-indexed) for phase lookup
 * @param options - Optional overrides for favorites, disliked, undulating blocks
 * @returns Array of PlanDay objects representing the weekly training plan
 */
export function generateEnhancedPlan(
  profile: Profile,
  blocks: TrainingBlock[],
  weekNumber: number,
  options?: {
    favorites?: string[];
    disliked?: string[];
    undulatingBlocks?: UndulatingBlock[];
    sessionIndex?: number; // Which session within the week (0-indexed)
  },
): PlanDay[] {
  const currentBlock = getCurrentBlock(blocks, weekNumber);
  const setModifier = currentBlock.setCountModifier;

  // Determine rep range — use undulating per-session range if available
  const repRange: [number, number] = (() => {
    if (
      options?.undulatingBlocks &&
      options.sessionIndex !== undefined &&
      options.sessionIndex >= 0
    ) {
      const undBlock = options.undulatingBlocks.find(
        (b) => b.phase === currentBlock.phase,
      );
      if (undBlock && options.sessionIndex < undBlock.sessionRepRanges.length) {
        return undBlock.sessionRepRanges[options.sessionIndex];
      }
    }
    return currentBlock.repRange;
  })();
  const repStr = formatRepRange(repRange);

  // Filter usable exercises once
  const usable = EXERCISES.filter((e) =>
    e.equipment.some((eq) => profile.equipment.includes(eq)) &&
    !profile.avoid.some((a) =>
      e.name.toLowerCase().includes(a.toLowerCase().trim()),
    ),
  );

  // Build a profile with favorites/disliked for the scorer
  // Uses a safe spread copy — never mutates the original profile
  const scoreProfile = {
    ...profile,
    favorites: options?.favorites ?? [],
    disliked: options?.disliked ?? [],
  } as Profile & { favorites: string[]; disliked: string[] };

  const day = (id: string, name: string, exs: PlannedExercise[]): PlanDay => ({
    id,
    name,
    exercises: exs,
  });

  /**
   * Get the muscle groups that still need coverage for a given day.
   * Uses DAY_MUSCLE_MAP to determine which muscle groups are primary
   * for the current workout style and day index.
   */
  const getNeededMuscles = (style: Style, dayIndex: number): MuscleGroup[] => {
    const template = DAY_MUSCLE_MAP[style];
    if (!template || dayIndex >= template.length) return [];
    return template[dayIndex];
  };

  /**
   * Get the default exercise count for a muscle group.
   * Uses DEFAULT_EXERCISES_PER_MUSCLE as baseline.
   */
  const getExerciseCount = (muscle: MuscleGroup, _dayIndex: number): number => {
    return DEFAULT_EXERCISES_PER_MUSCLE[muscle] ?? 1;
  };

  /**
   * Scored pick: picks top N scored exercises for a muscle group,
   * respecting already-selected exercises for variety AND muscle coverage needs.
   */
  const scoredPick = (
    muscle: MuscleGroup,
    count: number,
    alreadySelected: string[],
    dayIndex: number,
  ): PlannedExercise[] => {
    const neededMuscles = getNeededMuscles(profile.style, dayIndex);

    const picked = pickTopScored(
      usable,
      muscle,
      scoreProfile,
      count,
      alreadySelected,
      neededMuscles,
    );

    // Calculate target sets based on volume landmarks
    const landmarks = getVolumeLandmarks(muscle);
    // Target is between MEV and MAV, adjusted by setCountModifier
    const targetSets = Math.max(
      2,
      Math.round((landmarks.mev + (landmarks.mav - landmarks.mev) * 0.5) * setModifier),
    );

    return picked.map((e) => ({
      exerciseId: e.id,
      sets: targetSets,
      reps: repStr,
      restSec: e.restSec,
    }));
  };

  const days = profile.daysPerWeek;
  const style = profile.style;

  if (style === "push/pull/legs") {
    const muscleMap = DAY_MUSCLE_MAP["push/pull/legs"];
    const base = muscleMap.map((muscles, i) => {
      const dayNames = ["Push", "Pull", "Legs"];
      const name = dayNames[i] ?? `Day ${i + 1}`;
      return day(
        `d${i + 1}`,
        name,
        muscles.flatMap((m) =>
          scoredPick(m as MuscleGroup, getExerciseCount(m as MuscleGroup, i), [], i),
        ),
      );
    });
    return base.slice(0, Math.max(3, days)).concat(
      days > 3
        ? base.slice(0, days - 3).map((d, i) => ({
            ...d,
            id: `d${4 + i}`,
            name: `${d.name} 2`,
          }))
        : [],
    );
  }

  if (style === "upper/lower") {
    const muscleMap = DAY_MUSCLE_MAP["upper/lower"];
    const base = muscleMap.map((muscles, i) => {
      const dayNames = ["Upper", "Lower"];
      const name = dayNames[i] ?? `Day ${i + 1}`;
      return day(
        `d${i + 1}`,
        name,
        muscles.flatMap((m) =>
          scoredPick(m as MuscleGroup, getExerciseCount(m as MuscleGroup, i), [], i),
        ),
      );
    });
    const out: PlanDay[] = [];
    for (let i = 0; i < days; i++) {
      const sourceDay = base[i % base.length];
      out.push({
        ...sourceDay,
        id: `d${i + 1}`,
        name: `${sourceDay.name} ${Math.floor(i / base.length) + 1}`,
      });
    }
    return out;
  }

  if (style === "bodybuilding split") {
    const split: [string, MuscleGroup[]][] = [
      ["Chest & Triceps", ["chest", "triceps"]],
      ["Back & Biceps", ["back", "biceps"]],
      ["Legs", ["legs", "glutes", "calves"]],
      ["Shoulders & Core", ["shoulders", "core"]],
      ["Arms", ["biceps", "triceps"]],
    ];
    return split.slice(0, days).map((s, i) =>
      day(
        `d${i + 1}`,
        s[0],
        s[1].flatMap((m) => scoredPick(m, getExerciseCount(m, i), [], i)),
      ),
    );
  }

  if (style === "strength focused") {
    const base = [
      day("d1", "Squat Focus", scoredPick("legs", 2, [], 0)),
      day("d2", "Bench Focus", scoredPick("chest", 2, [], 1)),
      day("d3", "Deadlift Focus", scoredPick("back", 2, [], 2)),
      day("d4", "Press Focus", scoredPick("shoulders", 2, [], 3)),
    ];
    return base.slice(0, days);
  }

  // full body — default fallback
  const fbMuscles: MuscleGroup[] = [
    "legs",
    "chest",
    "back",
    "shoulders",
    "core",
  ];
  return Array.from({ length: days }).map((_, i) =>
    day(
      `d${i + 1}`,
      `Full Body ${i + 1}`,
      fbMuscles.flatMap((m) => scoredPick(m, 1, [], i)),
    ),
  );
}