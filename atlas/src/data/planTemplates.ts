/**
 * Pre-built training program templates from proven methodologies.
 *
 * Users can import any template to auto-populate their plan with
 * correct exercises, sets, reps, and progression rules.
 */

import type { PlanDay, PlannedExercise } from "@/data/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  author: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  style: "full body" | "upper/lower" | "push/pull/legs" | "bodybuilding split" | "strength focused";
  goal: "strength" | "build muscle" | "general fitness";
  duration: string; // e.g., "12 weeks"
  generatePlan: (daysPerWeek: number) => PlanDay[];
}

// ─── Helper ─────────────────────────────────────────────────────────────────

const pe = (exerciseId: string, sets: number, reps: string, restSec: number): PlannedExercise => ({
  exerciseId, sets, reps, restSec,
});

// ─── Templates ──────────────────────────────────────────────────────────────

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "5x5-stronglifts",
    name: "StrongLifts 5×5",
    description: "Classic beginner strength program. 3 days/week, alternating full body workouts with progressive 5×5 loading.",
    author: "Mehdi Hadim",
    difficulty: "beginner",
    daysPerWeek: 3,
    style: "full body",
    goal: "strength",
    duration: "12+ weeks",
    generatePlan: () => [
      {
        id: "d1", name: "Workout A",
        exercises: [
          pe("squat", 5, "5-5", 180),
          pe("bench-press", 5, "5-5", 180),
          pe("barbell-row", 5, "5-5", 120),
        ],
      },
      {
        id: "d2", name: "Workout B",
        exercises: [
          pe("squat", 5, "5-5", 180),
          pe("ohp", 5, "5-5", 180),
          pe("deadlift", 1, "5-5", 180),
        ],
      },
      {
        id: "d3", name: "Workout A (2)",
        exercises: [
          pe("squat", 5, "5-5", 180),
          pe("bench-press", 5, "5-5", 180),
          pe("barbell-row", 5, "5-5", 120),
        ],
      },
    ],
  },
  {
    id: "531-beginner",
    name: "5/3/1 Beginners",
    description: "Jim Wendler's 5/3/1 for beginners. Focus on the 4 main lifts with submaximal training and PR sets.",
    author: "Jim Wendler",
    difficulty: "beginner",
    daysPerWeek: 3,
    style: "full body",
    goal: "strength",
    duration: "4-week cycles",
    generatePlan: () => [
      {
        id: "d1", name: "Squat & Bench",
        exercises: [
          pe("squat", 3, "5-5", 180),
          pe("bench-press", 3, "5-5", 180),
          pe("lat-pulldown", 5, "10-15", 60),
          pe("db-curl", 3, "10-15", 60),
        ],
      },
      {
        id: "d2", name: "Deadlift & OHP",
        exercises: [
          pe("deadlift", 3, "5-5", 180),
          pe("ohp", 3, "5-5", 180),
          pe("barbell-row", 5, "10-15", 60),
          pe("hanging-leg-raise", 3, "10-15", 60),
        ],
      },
      {
        id: "d3", name: "Squat & Bench (2)",
        exercises: [
          pe("squat", 3, "5-5", 180),
          pe("bench-press", 3, "5-5", 180),
          pe("lat-pulldown", 5, "10-15", 60),
          pe("tricep-pushdown", 3, "10-15", 60),
        ],
      },
    ],
  },
  {
    id: "phul",
    name: "PHUL (Power Hypertrophy)",
    description: "4-day upper/lower split combining strength (heavy) and hypertrophy (volume) days.",
    author: "Brandon Campbell",
    difficulty: "intermediate",
    daysPerWeek: 4,
    style: "upper/lower",
    goal: "build muscle",
    duration: "Ongoing",
    generatePlan: () => [
      {
        id: "d1", name: "Upper Power",
        exercises: [
          pe("bench-press", 4, "3-5", 180),
          pe("barbell-row", 4, "3-5", 150),
          pe("ohp", 3, "5-8", 120),
          pe("lat-pulldown", 3, "6-10", 90),
          pe("bb-curl", 3, "6-10", 75),
          pe("tricep-pushdown", 3, "6-10", 60),
        ],
      },
      {
        id: "d2", name: "Lower Power",
        exercises: [
          pe("squat", 4, "3-5", 180),
          pe("deadlift", 3, "3-5", 180),
          pe("leg-press", 3, "8-12", 120),
          pe("leg-curl", 3, "8-12", 75),
          pe("calf-raise", 4, "10-15", 60),
        ],
      },
      {
        id: "d3", name: "Upper Hypertrophy",
        exercises: [
          pe("db-bench", 4, "8-12", 90),
          pe("seated-row", 4, "8-12", 90),
          pe("lateral-raise", 3, "12-15", 60),
          pe("chest-fly", 3, "12-15", 60),
          pe("db-curl", 3, "10-12", 60),
          pe("skullcrusher", 3, "10-12", 60),
        ],
      },
      {
        id: "d4", name: "Lower Hypertrophy",
        exercises: [
          pe("squat", 4, "8-12", 120),
          pe("rdl", 3, "8-12", 120),
          pe("lunge", 3, "10-12/leg", 90),
          pe("leg-curl", 3, "10-15", 75),
          pe("hip-thrust", 3, "10-15", 90),
          pe("calf-raise", 4, "12-20", 60),
        ],
      },
    ],
  },
  {
    id: "ppl",
    name: "Push/Pull/Legs",
    description: "Classic 6-day PPL split. Each muscle group hit twice per week with balanced volume.",
    author: "Community",
    difficulty: "intermediate",
    daysPerWeek: 6,
    style: "push/pull/legs",
    goal: "build muscle",
    duration: "Ongoing",
    generatePlan: () => [
      {
        id: "d1", name: "Push",
        exercises: [
          pe("bench-press", 4, "6-8", 150),
          pe("ohp", 3, "8-10", 120),
          pe("incline-db", 3, "8-12", 90),
          pe("lateral-raise", 3, "12-15", 60),
          pe("tricep-pushdown", 3, "10-15", 60),
          pe("overhead-ext", 2, "12-15", 60),
        ],
      },
      {
        id: "d2", name: "Pull",
        exercises: [
          pe("deadlift", 3, "5-5", 180),
          pe("pullup", 3, "6-10", 120),
          pe("barbell-row", 3, "8-10", 120),
          pe("face-pull", 3, "15-20", 60),
          pe("bb-curl", 3, "8-12", 75),
          pe("hammer-curl", 2, "10-12", 60),
        ],
      },
      {
        id: "d3", name: "Legs",
        exercises: [
          pe("squat", 4, "5-8", 180),
          pe("rdl", 3, "8-10", 120),
          pe("leg-press", 3, "10-12", 120),
          pe("leg-curl", 3, "10-12", 75),
          pe("calf-raise", 4, "12-15", 60),
          pe("plank", 3, "30-60s", 45),
        ],
      },
      {
        id: "d4", name: "Push 2",
        exercises: [
          pe("db-bench", 4, "8-12", 90),
          pe("db-shoulder", 3, "8-12", 90),
          pe("chest-dip", 3, "8-12", 90),
          pe("cable-lateral", 3, "12-15", 60),
          pe("skullcrusher", 3, "10-12", 60),
        ],
      },
      {
        id: "d5", name: "Pull 2",
        exercises: [
          pe("chinup", 3, "6-10", 120),
          pe("seated-row", 3, "8-12", 90),
          pe("tbar-row", 3, "8-10", 120),
          pe("reverse-fly", 3, "12-15", 60),
          pe("preacher-curl", 3, "10-12", 60),
          pe("cable-curl", 2, "12-15", 60),
        ],
      },
      {
        id: "d6", name: "Legs 2",
        exercises: [
          pe("front-squat", 3, "5-8", 180),
          pe("hip-thrust", 3, "8-12", 90),
          pe("bulgarian-split", 3, "8-12/leg", 90),
          pe("leg-ext", 3, "10-15", 60),
          pe("seated-calf", 4, "12-20", 60),
        ],
      },
    ],
  },
  {
    id: "gzclp",
    name: "GZCLP",
    description: "Cody Lefever's linear progression program. Tiered approach: T1 (strength), T2 (volume), T3 (accessories).",
    author: "Cody Lefever",
    difficulty: "beginner",
    daysPerWeek: 3,
    style: "full body",
    goal: "strength",
    duration: "12+ weeks",
    generatePlan: () => [
      {
        id: "d1", name: "Day 1 (T1 Squat / T2 Bench)",
        exercises: [
          pe("squat", 5, "3-3", 180),
          pe("bench-press", 3, "8-10", 120),
          pe("barbell-row", 3, "15-15", 60),
        ],
      },
      {
        id: "d2", name: "Day 2 (T1 OHP / T2 Deadlift)",
        exercises: [
          pe("ohp", 5, "3-3", 180),
          pe("deadlift", 3, "8-10", 150),
          pe("lat-pulldown", 3, "15-15", 60),
        ],
      },
      {
        id: "d3", name: "Day 3 (T1 Bench / T2 Squat)",
        exercises: [
          pe("bench-press", 5, "3-3", 180),
          pe("squat", 3, "8-10", 150),
          pe("barbell-row", 3, "15-15", 60),
        ],
      },
    ],
  },
];

/**
 * Get a template by ID.
 */
export function getTemplateById(id: string): PlanTemplate | undefined {
  return PLAN_TEMPLATES.find((t) => t.id === id);
}