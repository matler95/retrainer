export type Experience = "beginner" | "intermediate" | "advanced";
export type Goal = "lose fat" | "build muscle" | "strength" | "general fitness" | "recomposition";

export type PeriodizationPhase = "accumulation" | "intensification" | "realization" | "deload";

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
