export type Experience = "beginner" | "intermediate" | "advanced";
export type Goal = "lose fat" | "build muscle" | "strength" | "general fitness" | "recomposition";

export type PeriodizationPhase = "accumulation" | "intensification" | "realization" | "deload";

/**
 * The type of periodization strategy to use for plan generation.
 * - linear: Classic block-based progression (accumulate → intensify → realize → deload)
 * - undulating: Daily or weekly variation in rep ranges within each block
 * - block: Specialized blocks focusing on single qualities (hypertrophy → strength → peaking)
 */
export type PeriodizationType = "linear" | "undulating" | "block";

export interface TrainingBlock {
  phase: PeriodizationPhase;
  weeks: number;
  targetRIR: number;
  volumeModifier: number;
  intensityRange: [number, number];
  /** Recommended rep range for this phase */
  repRange: [number, number];
  /** Set count multiplier applied to MAV-based set targets */
  setCountModifier: number;
}

/**
 * Undulating periodization adds per-session rep range variation within a block.
 * Instead of a single rep range for the entire block, each session within a week
 * gets a different rep target. This provides daily stimulus variation while keeping
 * the overall weekly volume consistent.
 *
 * Example: For an accumulation block, sessions might be:
 *   Session A: 10-12 reps (hypertrophy focus)
 *   Session B: 8-10 reps (strength-endurance)
 *   Session C: 12-15 reps (metabolic conditioning)
 */
export interface UndulatingBlock extends TrainingBlock {
  /** Rep ranges for each session within a week (indexed by session number, 0-based) */
  sessionRepRanges: [number, number][];
  /** Intensity (% of e1RM) for each session within a week */
  sessionIntensityRanges: [number, number][];
}

/**
 * Block periodization dedicates entire mesocycles to a single training quality.
 * Each block has a specific focus and builds on the adaptations from the previous block.
 *
 * Example: Hypertrophy Block (weeks 1-4) → Strength Block (weeks 5-8) → Peaking Block (weeks 9-11) → Deload (week 12)
 */
export interface BlockPeriodizationBlock {
  /** Name of this specialized block (e.g., "Hypertrophy", "Strength", "Peaking") */
  name: string;
  weeks: number;
  /** Primary training quality this block targets */
  focus: "hypertrophy" | "strength" | "power" | "peaking" | "deload";
  /** Rep range for the block */
  repRange: [number, number];
  /** Intensity range as % of e1RM */
  intensityRange: [number, number];
  /** RIR target for the block */
  targetRIR: number;
  /** Set count multiplier */
  setCountModifier: number;
  /** Volume modifier */
  volumeModifier: number;
}

/**
 * Rep range constants per goal.
 * These map the periodization phase to concrete rep targets.
 */
const REP_RANGES: Record<string, [number, number]> = {
  // Strength goals use lower rep ranges
  accumulation_strength: [6, 8],
  intensification_strength: [4, 6],
  realization_strength: [2, 4],
  deload_strength: [8, 10],
  // Muscle-building goals use moderate rep ranges
  accumulation_hypertrophy: [8, 12],
  intensification_hypertrophy: [6, 10],
  realization_hypertrophy: [4, 8],
  deload_hypertrophy: [12, 15],
  // General fitness & fat loss use moderate-high ranges
  accumulation_general: [8, 12],
  intensification_general: [6, 10],
  realization_general: [6, 8],
  deload_general: [10, 15],
};

/**
 * Determine rep range key from phase + goal.
 */
function repRangeKey(phase: PeriodizationPhase, goal: Goal): string {
  const goalKey =
    goal === "strength"
      ? "strength"
      : goal === "build muscle"
        ? "hypertrophy"
        : "general";
  return `${phase}_${goalKey}`;
}

export function createPeriodizationBlocks(
  experience: Experience,
  weeksTrained: number,
  goal: Goal,
): TrainingBlock[] {
  const repRange = (phase: PeriodizationPhase): [number, number] => {
    return REP_RANGES[repRangeKey(phase, goal)] ?? [8, 12];
  };

  const base: TrainingBlock[] = [
    {
      phase: "accumulation",
      weeks: 2,
      targetRIR: 2,
      volumeModifier: 1.0,
      intensityRange: [60, 70],
      repRange: repRange("accumulation"),
      setCountModifier: 1.0,
    },
    {
      phase: "intensification",
      weeks: 2,
      targetRIR: 1,
      volumeModifier: 0.95,
      intensityRange: [70, 80],
      repRange: repRange("intensification"),
      setCountModifier: 0.9,
    },
    {
      phase: "realization",
      weeks: 2,
      targetRIR: 0,
      volumeModifier: 0.9,
      intensityRange: [80, 90],
      repRange: repRange("realization"),
      setCountModifier: 0.8,
    },
    {
      phase: "deload",
      weeks: 1,
      targetRIR: 3,
      volumeModifier: 0.55,
      intensityRange: [50, 60],
      repRange: repRange("deload"),
      setCountModifier: 0.5,
    },
  ];

  if (experience === "beginner") {
    return [
      {
        ...base[0],
        weeks: 4,
        intensityRange: [55, 65] as [number, number],
        targetRIR: 3,
        repRange: [10, 15] as [number, number],
        setCountModifier: 0.8,
      },
      {
        ...base[3],
        weeks: 1,
        volumeModifier: 0.6,
        repRange: [10, 15] as [number, number],
        setCountModifier: 0.6,
      },
    ];
  }

  if (experience === "intermediate") {
    return base;
  }

  // Advanced
  return [
    { ...base[0], weeks: 3, volumeModifier: 1.05 },
    { ...base[1], weeks: 3, intensityRange: [72, 82] as [number, number] },
    { ...base[2], weeks: 3, intensityRange: [82, 92] as [number, number] },
    base[3],
  ];
}

export function getCurrentBlock(
  blocks: TrainingBlock[],
  weekNumber: number,
): TrainingBlock {
  let cursor = 0;
  for (const block of blocks) {
    if (weekNumber < cursor + block.weeks) {
      return block;
    }
    cursor += block.weeks;
  }
  return blocks[blocks.length - 1];
}

export function targetIntensityForWeek(
  blocks: TrainingBlock[],
  weekNumber: number,
) {
  const block = getCurrentBlock(blocks, weekNumber);
  return block.intensityRange;
}

/**
 * Get the rep range for the current periodization phase.
 * Returns a tuple [min, max] e.g. [8, 12].
 */
export function repRangeForWeek(
  blocks: TrainingBlock[],
  weekNumber: number,
): [number, number] {
  const block = getCurrentBlock(blocks, weekNumber);
  return block.repRange;
}

/**
 * Create an undulating periodization schedule.
 * Instead of a single rep range for the entire block, each session within a week
 * gets a different rep target. This provides daily stimulus variation while keeping
 * overall weekly volume consistent.
 *
 * @param basePhase - The base training phase (accumulation, intensification, etc.)
 * @param goal - The user's training goal
 * @param sessionsPerWeek - Number of weekly sessions for this block
 * @returns UndulatingBlock with per-session rep range variation
 *
 * DESIGN NOTE: Undulating periodization works by rotating rep ranges across sessions.
 * For example, in an accumulation block with 3 sessions/week:
 *   Session 1: 10-12 reps (hypertrophy focus)
 *   Session 2: 8-10 reps (strength-endurance)
 *   Session 3: 12-15 reps (metabolic conditioning)
 * This ensures all rep ranges are hit within each week while avoiding
 * monotony and connective tissue fatigue from the same range every session.
 */
export function createUndulatingBlock(
  basePhase: PeriodizationPhase,
  goal: Goal,
  sessionsPerWeek: number,
): UndulatingBlock {
  const baseBlock = createPeriodizationBlocks("intermediate", 0, goal).find(
    (b) => b.phase === basePhase,
  ) ?? {
    phase: basePhase,
    weeks: 2,
    targetRIR: 2,
    volumeModifier: 1.0,
    intensityRange: [60, 70] as [number, number],
    repRange: [8, 12] as [number, number],
    setCountModifier: 1.0,
  };

  // Generate per-session rep range variation
  // We cycle through 3 distinct rep profiles regardless of sessions per week
  const repProfiles: [number, number][] = [
    [baseBlock.repRange[0], baseBlock.repRange[1]],            // Standard
    [Math.max(4, baseBlock.repRange[0] - 2), Math.max(6, baseBlock.repRange[1] - 2)],  // Lower (strength focus)
    [Math.min(20, baseBlock.repRange[0] + 2), Math.min(20, baseBlock.repRange[1] + 2)], // Higher (metabolic focus)
  ];

  // Generate per-session intensity variation
  const intensityProfiles: [number, number][] = [
    baseBlock.intensityRange,
    [Math.min(95, baseBlock.intensityRange[0] + 5), Math.min(95, baseBlock.intensityRange[1] + 5)] as [number, number],
    [Math.max(40, baseBlock.intensityRange[0] - 5), Math.max(50, baseBlock.intensityRange[1] - 5)] as [number, number],
  ];

  const sessionRepRanges: [number, number][] = [];
  const sessionIntensityRanges: [number, number][] = [];

  for (let i = 0; i < sessionsPerWeek; i++) {
    const profileIndex = i % repProfiles.length;
    sessionRepRanges.push(repProfiles[profileIndex]);
    sessionIntensityRanges.push(intensityProfiles[profileIndex]);
  }

  return {
    ...baseBlock,
    sessionRepRanges,
    sessionIntensityRanges,
  };
}

/**
 * Create a block periodization schedule.
 * Block periodization dedicates entire mesocycles to a single training quality,
 * building on adaptations from the previous block.
 *
 * Example for strength goal, intermediate:
 *   Hypertrophy Block (weeks 1-4): 8-12 reps @ 60-75% e1RM — Build muscle base
 *   Strength Block (weeks 5-8): 4-6 reps @ 75-85% e1RM — Neural adaptations
 *   Peaking Block (weeks 9-11): 2-4 reps @ 85-95% e1RM — Max strength
 *   Deload Block (week 12): 10-12 reps @ 50-60% e1RM — Recovery
 *
 * BLOCK PERIODIZATION RATIONALE: Unlike linear periodization where you progress
 * week-to-week within the same phase, block periodization dedicates full blocks
 * to single qualities. This allows greater volume accumulation in hypertrophy blocks
 * and higher intensity in strength blocks without interference.
 */
export function createBlockPeriodization(
  goal: Goal,
): BlockPeriodizationBlock[] {
  const blocks: BlockPeriodizationBlock[] = [];

  // Common pattern: Hypertrophy → Strength → Peaking → Deload
  // Adjust block durations based on goal
  if (goal === "strength") {
    blocks.push(
      { name: "Hypertrophy Base", weeks: 4, focus: "hypertrophy", repRange: [8, 12], intensityRange: [60, 75], targetRIR: 2, setCountModifier: 1.0, volumeModifier: 1.0 },
      { name: "Strength Accumulation", weeks: 4, focus: "strength", repRange: [4, 6], intensityRange: [75, 85], targetRIR: 1, setCountModifier: 0.8, volumeModifier: 0.9 },
      { name: "Peaking", weeks: 3, focus: "peaking", repRange: [2, 4], intensityRange: [85, 95], targetRIR: 0, setCountModifier: 0.6, volumeModifier: 0.8 },
      { name: "Deload", weeks: 1, focus: "deload", repRange: [10, 12], intensityRange: [50, 60], targetRIR: 3, setCountModifier: 0.5, volumeModifier: 0.5 },
    );
  } else if (goal === "build muscle") {
    blocks.push(
      { name: "Hypertrophy Phase 1", weeks: 4, focus: "hypertrophy", repRange: [10, 15], intensityRange: [55, 70], targetRIR: 2, setCountModifier: 1.1, volumeModifier: 1.0 },
      { name: "Hypertrophy Phase 2", weeks: 4, focus: "hypertrophy", repRange: [8, 12], intensityRange: [65, 80], targetRIR: 1, setCountModifier: 1.0, volumeModifier: 0.95 },
      { name: "Metabolic Conditioning", weeks: 3, focus: "power", repRange: [12, 20], intensityRange: [50, 65], targetRIR: 2, setCountModifier: 0.9, volumeModifier: 0.85 },
      { name: "Deload", weeks: 1, focus: "deload", repRange: [12, 15], intensityRange: [45, 55], targetRIR: 3, setCountModifier: 0.5, volumeModifier: 0.5 },
    );
  } else {
    // General fitness / fat loss / recomposition
    blocks.push(
      { name: "Base Building", weeks: 3, focus: "hypertrophy", repRange: [10, 15], intensityRange: [50, 65], targetRIR: 3, setCountModifier: 0.8, volumeModifier: 0.9 },
      { name: "Strength & Conditioning", weeks: 3, focus: "strength", repRange: [6, 10], intensityRange: [65, 80], targetRIR: 2, setCountModifier: 0.9, volumeModifier: 0.9 },
      { name: "Metabolic Finisher", weeks: 2, focus: "power", repRange: [10, 15], intensityRange: [55, 70], targetRIR: 2, setCountModifier: 0.8, volumeModifier: 0.8 },
      { name: "Deload", weeks: 1, focus: "deload", repRange: [10, 15], intensityRange: [45, 55], targetRIR: 3, setCountModifier: 0.5, volumeModifier: 0.5 },
    );
  }

  return blocks;
}

/**
 * Get the appropriate periodization strategy based on user preferences and experience.
 *
 * - Beginner: Linear is best (simplest, consistent stimulus)
 * - Intermediate with strength goal: Block periodization for focused adaptation
 * - Intermediate with muscle goal: Undulating for variation and volume tolerance
 * - Advanced: Block periodization for specialized overload
 *
 * @param experience - User's training experience
 * @param goal - User's training goal
 * @returns The recommended periodization strategy type
 */
export function recommendPeriodizationType(
  experience: Experience,
  goal: Goal,
): PeriodizationType {
  if (experience === "beginner") return "linear";
  if (experience === "advanced") return "block";
  // Intermediate
  if (goal === "strength") return "block";
  if (goal === "build muscle") return "undulating";
  return "linear";
}

/**
 * Get the rep range for a specific session within an undulating block.
 * Falls back to the block's base rep range if session-specific range is not defined.
 */
export function getUndulatingRepRange(
  block: UndulatingBlock,
  sessionIndex: number,
): [number, number] {
  if (sessionIndex < block.sessionRepRanges.length) {
    return block.sessionRepRanges[sessionIndex];
  }
  return block.repRange;
}

/**
 * Get the intensity range for a specific session within an undulating block.
 * Falls back to the block's base intensity range if session-specific range is not defined.
 */
export function getUndulatingIntensityRange(
  block: UndulatingBlock,
  sessionIndex: number,
): [number, number] {
  if (sessionIndex < block.sessionIntensityRanges.length) {
    return block.sessionIntensityRanges[sessionIndex];
  }
  return block.intensityRange;
}

/**
 * Get the current block periodization block based on week number.
 * Similar to getCurrentBlock but for BlockPeriodizationBlock arrays.
 */
export function getCurrentBlockPeriodization(
  blocks: BlockPeriodizationBlock[],
  weekNumber: number,
): BlockPeriodizationBlock {
  let cursor = 0;
  for (const block of blocks) {
    if (weekNumber < cursor + block.weeks) {
      return block;
    }
    cursor += block.weeks;
  }
  return blocks[blocks.length - 1];
}

/**
 * Format a rep range as a display string like "8-12".
 */
export function formatRepRange(range: [number, number]): string {
  return `${range[0]}-${range[1]}`;
}

/**
 * Convert a rep range string (e.g. "8-12") to a number tuple.
 */
export function parseRepRange(str: string): [number, number] {
  const parts = str.split("-").map(Number);
  return [parts[0] ?? 8, parts[1] ?? 12];
}
