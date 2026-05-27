/**
 * Shared domain types for the Atlas personal trainer app.
 *
 * This is the single source of truth for all domain model types.
 * Import from here instead of defining types inline in stores or libraries.
 *
 * DESIGN PRINCIPLE: All types here are data shapes — no runtime logic.
 * Types that need runtime behavior belong in their respective modules.
 */

import type { Equipment, MuscleGroup } from "@/data/exercises";

// ─── User Profile Enums ──────────────────────────────────────────────────────

export type Goal = "lose fat" | "build muscle" | "strength" | "general fitness" | "recomposition";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Style = "full body" | "upper/lower" | "push/pull/legs" | "bodybuilding split" | "strength focused";
export type Activity = "sedentary" | "light" | "moderate" | "high";
export type Gender = "male" | "female" | "other";

// ─── Onboarding Extensions (Phase 2) ────────────────────────────────────────

/**
 * Self-reported movement assessment screens.
 * Influences exercise selection (e.g., restricted shoulder → dumbbell press over barbell OHP).
 */
export interface MovementAssessment {
  canSquatBelowParallel: boolean;
  canTouchToes: boolean;
  shoulderMobility: "full" | "limited" | "restricted";
  hipFlexorTightness: "none" | "mild" | "severe";
}

/**
 * Training history for starting weight estimation.
 * Pre-populates starting weights from peak lifts via 1RM formulas.
 */
export interface TrainingHistory {
  yearsTraining: number;
  previousPrograms: string[]; // powerlifting, bodybuilding, crossfit, etc.
  peakLifts: Partial<Record<string, { weight: number; reps: number }>>;
}

/**
 * Recovery profile for readiness scoring and volume recommendations.
 */
export interface RecoveryProfile {
  sleepHoursAvg: number;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  jobActivity: "desk" | "light" | "physical";
  cardioFrequency: number; // sessions/week
}

// ─── Core Domain Models ──────────────────────────────────────────────────────

/**
 * User profile — collected during onboarding.
 * Extended with optional movement assessment, training history, and recovery profile.
 */
export interface Profile {
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  experience: Experience;
  equipment: Equipment[];
  daysPerWeek: number;
  durationMin: number;
  style: Style;
  priorities: MuscleGroup[];
  avoid: string[];
  injuries: string;
  activity: Activity;
  supplements: string[];
  waterAuto: boolean;
  waterTargetMl: number;
  // Phase 2 additions (optional for backward compatibility)
  movementAssessment?: MovementAssessment;
  trainingHistory?: TrainingHistory;
  recoveryProfile?: RecoveryProfile;
}

/**
 * A single exercise within a training plan day.
 */
export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: string; // "8-12" format
  restSec: number;
  lastWeight?: number;
}

/**
 * A training day within a plan.
 */
export interface PlanDay {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}

/**
 * A single set log entry during a workout.
 */
export interface SetLog {
  reps: number;
  weight: number;
  rpe?: number;
  done: boolean;
}

/**
 * Exercise log within a session — contains all sets for one exercise.
 */
export interface SessionExerciseLog {
  exerciseId: string;
  sets: SetLog[];
  notes?: string;
}

/**
 * Session tags for quick in-workout journaling.
 */
export type SessionTag =
  | "felt_strong"
  | "low_energy"
  | "pr_day"
  | "pain_discomfort"
  | "bad_sleep"
  | "great_pump"
  | "stressed"
  | "well_rested";

/**
 * A completed workout session.
 */
export interface Session {
  id: string;
  dayId: string;
  date: string; // ISO
  exercises: SessionExerciseLog[];
  durationMin?: number;
  // Phase 3 additions (optional for backward compatibility)
  startedAt?: string; // ISO
  finishedAt?: string; // ISO
  rpeOverall?: number;
  tags?: SessionTag[];
}

/**
 * Body weight log entry.
 */
export interface BodyWeightLog {
  date: string;
  kg: number;
}

/**
 * Body metrics — extends body weight with measurements and composition.
 */
export interface BodyMetrics {
  date: string;
  weightKg: number;
  bodyFatPct?: number;
  measurements?: {
    waistCm?: number;
    hipCm?: number;
    chestCm?: number;
    armCm?: number;
    thighCm?: number;
    neckCm?: number;
  };
  photoUrl?: string;
  notes?: string;
}

/**
 * Water intake log entry.
 */
export interface WaterLog {
  date: string;
  ml: number;
}

/**
 * Supplement log entry.
 */
export interface SupplementLog {
  date: string;
  name: string;
  taken: boolean;
}

// ─── PR & Progression Tracking (Phase 5) ─────────────────────────────────────

/**
 * Common rep milestones for PR tracking.
 */
export type RepMilestone = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 20;

/**
 * A personal record for a specific exercise at a specific rep count.
 */
export interface ExercisePR {
  exerciseId: string;
  repCount: RepMilestone;
  weightKg: number;
  achievedAt: string; // ISO date
  sessionId: string;
  estimated1RM: number;
}

// ─── Weekly Check-In (Phase 4) ───────────────────────────────────────────────

/**
 * Weekly automated check-in for recovery and progress monitoring.
 */
export interface WeeklyCheckin {
  weekNumber: number;
  weightKg: number;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  muscleSoreness: 1 | 2 | 3 | 4 | 5;
  overallMood: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  date: string; // ISO date
}

// ─── Nutrition (Phase 4) ─────────────────────────────────────────────────────

/**
 * Computed nutrition targets for a given day.
 */
export interface NutritionTargets {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  water: number; // ml
  fiberMin: number; // grams
}