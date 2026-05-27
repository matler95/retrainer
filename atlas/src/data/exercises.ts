export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps"
  | "legs" | "glutes" | "core" | "calves" | "full body";

export type Equipment =
  | "barbell" | "dumbbells" | "machine" | "cable" | "bodyweight" | "bands" | "kettlebell";

export type Difficulty = "beginner" | "intermediate" | "advanced";

/**
 * Exercise category for classification and substitution logic.
 */
export type ExerciseCategory = "compound" | "isolation" | "cardio" | "mobility";

/**
 * Movement mechanic classification.
 */
export type Mechanic = "push" | "pull" | "hinge" | "squat" | "carry" | "rotation" | "static";

/**
 * Movement plane classification.
 */
export type Plane = "sagittal" | "frontal" | "transverse";

/**
 * Force type classification.
 */
export type ForceType = "concentric" | "eccentric" | "isometric";

/**
 * Muscle activation level for each muscle group involved.
 */
export type ActivationLevel = "primary" | "secondary" | "stabilizer";

export interface Exercise {
  id: string;
  name: string;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment[];
  difficulty: Difficulty;
  instructions: string[];
  tips: string[];
  mistakes: string[];
  defaultSets: number;
  defaultReps: string; // "8-12"
  restSec: number;
  progression: string;
  // ── Extended fields (Sprint 1 additions) ──
  /** YouTube embed ID for exercise demo video */
  videoUrl?: string;
  /** Movement cues for real-time feedback */
  cues?: string[];
  /** Detailed muscle activation map */
  muscleActivation?: Partial<Record<MuscleGroup, ActivationLevel>>;
  /** Exercise category */
  category?: ExerciseCategory;
  /** Whether this is a unilateral (single-limb) exercise */
  unilateral?: boolean;
  /** Movement mechanic classification */
  mechanic?: Mechanic;
  /** Movement plane */
  plane?: Plane;
  /** Force type */
  forceType?: ForceType;
  /** Exercise IDs that can substitute for this one */
  substituteIds?: string[];
}

const ex = (e: Exercise) => e;

export const EXERCISES: Exercise[] = [
  // Chest
  ex({
    id: "bench-press", name: "Barbell Bench Press", primary: "chest",
    secondary: ["triceps", "shoulders"], equipment: ["barbell"], difficulty: "intermediate",
    instructions: ["Lie flat on bench, grip just outside shoulder width.", "Unrack and lower bar to mid-chest.", "Press up to lockout without flaring elbows."],
    tips: ["Keep shoulder blades retracted.", "Drive feet into floor."],
    mistakes: ["Bouncing the bar off chest.", "Flaring elbows past 75°."],
    defaultSets: 4, defaultReps: "6-8", restSec: 150, progression: "+2.5kg when all reps hit at RPE ≤ 8",
  }),
  ex({
    id: "db-bench", name: "Dumbbell Bench Press", primary: "chest",
    secondary: ["triceps", "shoulders"], equipment: ["dumbbells"], difficulty: "beginner",
    instructions: ["Sit on bench with dumbbells on knees.", "Kick back and press up.", "Lower until elbows ~90°."],
    tips: ["Squeeze chest at top."], mistakes: ["Letting dumbbells drift apart."],
    defaultSets: 3, defaultReps: "8-12", restSec: 90, progression: "+1kg per hand when target reached",
  }),
  ex({
    id: "pushup", name: "Push-Up", primary: "chest",
    secondary: ["triceps", "core"], equipment: ["bodyweight"], difficulty: "beginner",
    instructions: ["Plank position, hands shoulder-width.", "Lower chest to floor.", "Press back up."],
    tips: ["Keep core tight."], mistakes: ["Sagging hips."],
    defaultSets: 3, defaultReps: "10-20", restSec: 60, progression: "Add reps weekly",
  }),
  ex({
    id: "incline-db", name: "Incline Dumbbell Press", primary: "chest",
    secondary: ["shoulders"], equipment: ["dumbbells"], difficulty: "intermediate",
    instructions: ["Set bench 30°.", "Press dumbbells overhead."],
    tips: ["Don't go higher than 45° incline."], mistakes: ["Locking out too hard."],
    defaultSets: 3, defaultReps: "8-12", restSec: 90, progression: "+1kg per hand",
  }),

  // Back
  ex({
    id: "deadlift", name: "Barbell Deadlift", primary: "back",
    secondary: ["legs", "glutes", "core"], equipment: ["barbell"], difficulty: "advanced",
    instructions: ["Bar over mid-foot.", "Hinge and grip just outside knees.", "Drive floor away, stand tall."],
    tips: ["Neutral spine throughout."], mistakes: ["Rounding lower back.", "Hyperextending at top."],
    defaultSets: 3, defaultReps: "3-5", restSec: 180, progression: "+5kg when all reps clean",
  }),
  ex({
    id: "pullup", name: "Pull-Up", primary: "back",
    secondary: ["biceps"], equipment: ["bodyweight"], difficulty: "intermediate",
    instructions: ["Hang from bar, hands shoulder-width.", "Pull chest to bar.", "Lower with control."],
    tips: ["Initiate from lats."], mistakes: ["Kipping unintentionally."],
    defaultSets: 4, defaultReps: "5-10", restSec: 120, progression: "Add reps, then add weight",
  }),
  ex({
    id: "lat-pulldown", name: "Lat Pulldown", primary: "back",
    secondary: ["biceps"], equipment: ["cable", "machine"], difficulty: "beginner",
    instructions: ["Wide grip on bar.", "Pull to upper chest.", "Control on the way up."],
    tips: ["Lead with elbows."], mistakes: ["Using too much momentum."],
    defaultSets: 3, defaultReps: "10-12", restSec: 90, progression: "+2.5kg",
  }),
  ex({
    id: "barbell-row", name: "Barbell Row", primary: "back",
    secondary: ["biceps"], equipment: ["barbell"], difficulty: "intermediate",
    instructions: ["Hinge to 45°.", "Row bar to lower chest.", "Lower with control."],
    tips: ["Keep torso angle constant."], mistakes: ["Standing up to lift."],
    defaultSets: 3, defaultReps: "6-10", restSec: 120, progression: "+2.5kg",
  }),
  ex({
    id: "db-row", name: "One-Arm Dumbbell Row", primary: "back",
    secondary: ["biceps"], equipment: ["dumbbells"], difficulty: "beginner",
    instructions: ["Knee on bench.", "Row dumbbell to hip."],
    tips: ["Squeeze shoulder blade."], mistakes: ["Twisting torso."],
    defaultSets: 3, defaultReps: "10-12", restSec: 75, progression: "+1kg",
  }),

  // Shoulders
  ex({
    id: "ohp", name: "Overhead Press", primary: "shoulders",
    secondary: ["triceps", "core"], equipment: ["barbell"], difficulty: "intermediate",
    instructions: ["Bar at collarbones.", "Press straight overhead.", "Lock out with biceps by ears."],
    tips: ["Squeeze glutes."], mistakes: ["Excessive back arch."],
    defaultSets: 3, defaultReps: "5-8", restSec: 120, progression: "+1-2.5kg",
  }),
  ex({
    id: "db-shoulder", name: "Dumbbell Shoulder Press", primary: "shoulders",
    secondary: ["triceps"], equipment: ["dumbbells"], difficulty: "beginner",
    instructions: ["Seated, dumbbells at shoulders.", "Press overhead."],
    tips: ["Neutral wrists."], mistakes: ["Flaring elbows out."],
    defaultSets: 3, defaultReps: "8-12", restSec: 90, progression: "+1kg per hand",
  }),
  ex({
    id: "lateral-raise", name: "Lateral Raise", primary: "shoulders",
    secondary: [], equipment: ["dumbbells"], difficulty: "beginner",
    instructions: ["Dumbbells at sides.", "Raise to shoulder height.", "Lower slowly."],
    tips: ["Lead with elbows."], mistakes: ["Using momentum."],
    defaultSets: 3, defaultReps: "12-15", restSec: 60, progression: "+0.5-1kg",
  }),

  // Biceps
  ex({
    id: "bb-curl", name: "Barbell Curl", primary: "biceps",
    secondary: [], equipment: ["barbell"], difficulty: "beginner",
    instructions: ["Stand tall, underhand grip.", "Curl bar to chest.", "Lower with control."],
    tips: ["Pin elbows to sides."], mistakes: ["Swinging."],
    defaultSets: 3, defaultReps: "8-12", restSec: 75, progression: "+1-2.5kg",
  }),
  ex({
    id: "db-curl", name: "Dumbbell Curl", primary: "biceps",
    secondary: [], equipment: ["dumbbells"], difficulty: "beginner",
    instructions: ["Alternate curls or together.", "Supinate as you lift."],
    tips: ["Squeeze at top."], mistakes: ["Half reps."],
    defaultSets: 3, defaultReps: "10-12", restSec: 60, progression: "+1kg",
  }),
  ex({
    id: "hammer-curl", name: "Hammer Curl", primary: "biceps",
    secondary: [], equipment: ["dumbbells"], difficulty: "beginner",
    instructions: ["Neutral grip.", "Curl up."],
    tips: ["Keep wrists straight."], mistakes: ["Swinging."],
    defaultSets: 3, defaultReps: "10-12", restSec: 60, progression: "+1kg",
  }),

  // Triceps
  ex({
    id: "tricep-pushdown", name: "Tricep Pushdown", primary: "triceps",
    secondary: [], equipment: ["cable"], difficulty: "beginner",
    instructions: ["Grip rope/bar.", "Push down to lockout.", "Control back up."],
    tips: ["Elbows pinned."], mistakes: ["Leaning into the weight."],
    defaultSets: 3, defaultReps: "10-15", restSec: 60, progression: "+2.5kg",
  }),
  ex({
    id: "dips", name: "Dips", primary: "triceps",
    secondary: ["chest", "shoulders"], equipment: ["bodyweight"], difficulty: "intermediate",
    instructions: ["Support on bars.", "Lower to ~90°.", "Press up."],
    tips: ["Slight lean forward hits chest more."], mistakes: ["Going too deep."],
    defaultSets: 3, defaultReps: "6-12", restSec: 90, progression: "Add reps, then weighted",
  }),
  ex({
    id: "skullcrusher", name: "Skullcrusher", primary: "triceps",
    secondary: [], equipment: ["barbell", "dumbbells"], difficulty: "intermediate",
    instructions: ["Lie back, bar over face.", "Bend at elbows, lower to forehead.", "Extend."],
    tips: ["Elbows still."], mistakes: ["Flaring elbows."],
    defaultSets: 3, defaultReps: "8-12", restSec: 75, progression: "+1-2.5kg",
  }),

  // Legs
  ex({
    id: "squat", name: "Back Squat", primary: "legs",
    secondary: ["glutes", "core"], equipment: ["barbell"], difficulty: "intermediate",
    instructions: ["Bar on upper traps.", "Descend until thighs parallel.", "Drive up through mid-foot."],
    tips: ["Knees track over toes."], mistakes: ["Caving knees inward."],
    defaultSets: 4, defaultReps: "5-8", restSec: 180, progression: "+2.5-5kg",
  }),
  ex({
    id: "goblet-squat", name: "Goblet Squat", primary: "legs",
    secondary: ["glutes"], equipment: ["dumbbells", "kettlebell"], difficulty: "beginner",
    instructions: ["Hold weight at chest.", "Squat down, keep chest up."],
    tips: ["Elbows brush inner thighs."], mistakes: ["Heels lifting."],
    defaultSets: 3, defaultReps: "10-12", restSec: 75, progression: "+2kg",
  }),
  ex({
    id: "rdl", name: "Romanian Deadlift", primary: "legs",
    secondary: ["glutes", "back"], equipment: ["barbell", "dumbbells"], difficulty: "intermediate",
    instructions: ["Hinge at hips.", "Lower bar along legs.", "Drive hips forward to lock."],
    tips: ["Slight knee bend."], mistakes: ["Rounding back."],
    defaultSets: 3, defaultReps: "8-10", restSec: 120, progression: "+2.5kg",
  }),
  ex({
    id: "lunge", name: "Walking Lunge", primary: "legs",
    secondary: ["glutes"], equipment: ["dumbbells", "bodyweight"], difficulty: "beginner",
    instructions: ["Step forward into lunge.", "Drive through front heel."],
    tips: ["Torso upright."], mistakes: ["Front knee past toes excessively."],
    defaultSets: 3, defaultReps: "10-12/leg", restSec: 75, progression: "+1kg per hand",
  }),
  ex({
    id: "leg-press", name: "Leg Press", primary: "legs",
    secondary: ["glutes"], equipment: ["machine"], difficulty: "beginner",
    instructions: ["Feet shoulder-width on plate.", "Lower until knees ~90°.", "Press up."],
    tips: ["Don't lock out hard."], mistakes: ["Heels lifting."],
    defaultSets: 3, defaultReps: "10-12", restSec: 90, progression: "+5kg",
  }),

  // Glutes
  ex({
    id: "hip-thrust", name: "Hip Thrust", primary: "glutes",
    secondary: ["legs"], equipment: ["barbell"], difficulty: "intermediate",
    instructions: ["Upper back on bench, bar across hips.", "Drive hips up to lockout.", "Squeeze glutes."],
    tips: ["Chin tucked."], mistakes: ["Overextending lower back."],
    defaultSets: 3, defaultReps: "8-12", restSec: 90, progression: "+2.5-5kg",
  }),
  ex({
    id: "glute-bridge", name: "Glute Bridge", primary: "glutes",
    secondary: ["legs"], equipment: ["bodyweight"], difficulty: "beginner",
    instructions: ["Lie on back, feet flat.", "Drive hips up.", "Squeeze."],
    tips: ["Slow tempo."], mistakes: ["Hyperextending back."],
    defaultSets: 3, defaultReps: "12-15", restSec: 45, progression: "Add reps then weighted",
  }),

  // Core
  ex({
    id: "plank", name: "Plank", primary: "core",
    secondary: [], equipment: ["bodyweight"], difficulty: "beginner",
    instructions: ["Forearms down, body straight.", "Hold."],
    tips: ["Squeeze glutes."], mistakes: ["Hips sagging."],
    defaultSets: 3, defaultReps: "30-60s", restSec: 45, progression: "+10s",
  }),
  ex({
    id: "hanging-leg-raise", name: "Hanging Leg Raise", primary: "core",
    secondary: [], equipment: ["bodyweight"], difficulty: "intermediate",
    instructions: ["Hang from bar.", "Raise legs to 90°.", "Lower slowly."],
    tips: ["No swinging."], mistakes: ["Using momentum."],
    defaultSets: 3, defaultReps: "8-12", restSec: 60, progression: "Add reps",
  }),
  ex({
    id: "ab-wheel", name: "Ab Wheel Rollout", primary: "core",
    secondary: [], equipment: ["bodyweight"], difficulty: "intermediate",
    instructions: ["Knees down, grip wheel.", "Roll out as far as control allows.", "Roll back in."],
    tips: ["Brace hard."], mistakes: ["Letting hips sag."],
    defaultSets: 3, defaultReps: "6-10", restSec: 60, progression: "Increase range",
  }),

  // Calves
  ex({
    id: "calf-raise", name: "Standing Calf Raise", primary: "calves",
    secondary: [], equipment: ["machine", "dumbbells", "bodyweight"], difficulty: "beginner",
    instructions: ["Push through balls of feet.", "Pause at top.", "Lower fully."],
    tips: ["Full ROM."], mistakes: ["Bouncing."],
    defaultSets: 4, defaultReps: "12-15", restSec: 60, progression: "+2.5kg",
  }),

  // Full body
  ex({
    id: "burpee", name: "Burpee", primary: "full body",
    secondary: ["core", "legs", "chest"], equipment: ["bodyweight"], difficulty: "intermediate",
    instructions: ["Squat, kick back to plank.", "Push-up, jump feet in.", "Jump up."],
    tips: ["Steady breathing."], mistakes: ["Sloppy plank."],
    defaultSets: 3, defaultReps: "8-12", restSec: 60, progression: "Add reps",
  }),
  ex({
    id: "kb-swing", name: "Kettlebell Swing", primary: "full body",
    secondary: ["glutes", "back"], equipment: ["kettlebell"], difficulty: "intermediate",
    instructions: ["Hinge, swing KB between legs.", "Snap hips to swing to chest height."],
    tips: ["Power from hips not arms."], mistakes: ["Squatting the swing."],
    defaultSets: 4, defaultReps: "15-20", restSec: 60, progression: "+4kg",
  }),
];

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest", "back", "shoulders", "biceps", "triceps", "legs", "glutes", "core", "calves", "full body",
];

export const EQUIPMENT_OPTIONS: Equipment[] = [
  "barbell", "dumbbells", "machine", "cable", "bodyweight", "bands", "kettlebell",
];
