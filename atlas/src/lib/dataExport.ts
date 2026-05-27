/**
 * GDPR-compliant data export utility.
 *
 * Allows users to download all their data as a JSON file.
 * Includes: profile, plan, sessions, body weight, water logs,
 * supplements, favorites, achievements, body metrics, PRs, check-ins.
 *
 * All functions are pure and deterministic.
 */

import type {
  Profile,
  PlanDay,
  Session,
  BodyWeightLog,
  WaterLog,
  SupplementLog,
  BodyMetrics,
  ExercisePR,
  WeeklyCheckin,
} from "@/data/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExportData {
  exportDate: string;
  version: string;
  profile: Profile | null;
  plan: PlanDay[];
  sessions: Session[];
  bodyWeight: BodyWeightLog[];
  water: WaterLog[];
  supplements: SupplementLog[];
  favorites: string[];
  disliked: string[];
  achievements: string[];
  bodyMetrics: BodyMetrics[];
  exercisePRs: ExercisePR[];
  weeklyCheckins: WeeklyCheckin[];
}

// ─── Core Function ──────────────────────────────────────────────────────────

/**
 * Export all user data as a JSON blob.
 *
 * @param data - Object containing all app state slices
 * @returns Blob containing JSON data, ready for download
 */
export function exportUserData(data: {
  profile: Profile | null;
  plan: PlanDay[];
  sessions: Session[];
  bodyWeight: BodyWeightLog[];
  water: WaterLog[];
  supplements: SupplementLog[];
  favorites: string[];
  disliked: string[];
  achievements: string[];
  bodyMetrics: BodyMetrics[];
  exercisePRs: ExercisePR[];
  weeklyCheckins: WeeklyCheckin[];
}): Blob {
  const exportData: ExportData = {
    exportDate: new Date().toISOString(),
    version: "1.0.0",
    ...data,
  };

  const json = JSON.stringify(exportData, null, 2);
  return new Blob([json], { type: "application/json" });
}

/**
 * Trigger a file download of the exported data.
 *
 * @param data - Object containing all app state slices
 * @param filename - Optional filename (default: "atlas-export-YYYY-MM-DD.json")
 */
export function downloadExport(
  data: Parameters<typeof exportUserData>[0],
  filename?: string,
): void {
  const blob = exportUserData(data);
  const date = new Date().toISOString().slice(0, 10);
  const name = filename ?? `atlas-export-${date}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get a summary of what will be exported.
 *
 * @param data - Object containing all app state slices
 * @returns Human-readable summary
 */
export function getExportSummary(data: {
  sessions: Session[];
  bodyWeight: BodyWeightLog[];
  exercisePRs: ExercisePR[];
  achievements: string[];
}): string {
  const parts: string[] = [];

  if (data.sessions.length > 0) {
    parts.push(`${data.sessions.length} workout sessions`);
  }
  if (data.bodyWeight.length > 0) {
    parts.push(`${data.bodyWeight.length} body weight entries`);
  }
  if (data.exercisePRs.length > 0) {
    parts.push(`${data.exercisePRs.length} personal records`);
  }
  if (data.achievements.length > 0) {
    parts.push(`${data.achievements.length} achievements`);
  }

  return parts.length > 0
    ? `Export includes: ${parts.join(", ")}.`
    : "No data to export yet.";
}