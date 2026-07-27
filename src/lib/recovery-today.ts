/**
 * Today recovery dashboard (NutriFit-inspired daily balance + PhysioPath readiness).
 * Client-side logs for hydration + progression checks. Educational only.
 */

import { buildSleepCorrelation } from "@/lib/psqi";
import { loadClinicalContext } from "@/lib/clinical-context";
import { parseInjuryTimeline } from "@/lib/injury-timeline";
import { weeksSinceSurgery, getSurgeryById } from "@/data/surgeries";

export const HYDRATION_KEY = "motionrx-hydration-log";
export const PROGRESSION_KEY = "motionrx-progression-checks";

export type HydrationEntry = {
  id: string;
  at: string; // ISO
  /** fluid oz */
  oz: number;
  note?: string;
};

export type ProgressionCheck = {
  at: string;
  painNow: number;
  taskConfidence: number; // 0–10
  nextDayOk: boolean;
  romOk: boolean;
  notes?: string;
};

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function loadHydrationEntries(): HydrationEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HYDRATION_KEY);
    const arr = raw ? (JSON.parse(raw) as HydrationEntry[]) : [];
    return Array.isArray(arr) ? arr.slice(-200) : [];
  } catch {
    return [];
  }
}

export function saveHydrationEntries(entries: HydrationEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HYDRATION_KEY, JSON.stringify(entries.slice(-200)));
  } catch {
    /* ignore */
  }
}

export function addHydrationOz(oz: number, note?: string): HydrationEntry[] {
  const entry: HydrationEntry = {
    id: `h-${Date.now()}`,
    at: new Date().toISOString(),
    oz: Math.max(0, Math.min(128, oz)),
    note,
  };
  const next = [...loadHydrationEntries(), entry];
  saveHydrationEntries(next);
  return next;
}

export function todayHydrationOz(entries?: HydrationEntry[]): number {
  const list = entries || loadHydrationEntries();
  const key = dayKey();
  return list
    .filter((e) => e.at.slice(0, 10) === key)
    .reduce((n, e) => n + (e.oz || 0), 0);
}

/** Soft educational target ~64–80 oz for many adults; not personalized medical advice */
export const HYDRATION_TARGET_OZ = 64;

export function loadProgressionChecks(): ProgressionCheck[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROGRESSION_KEY);
    const arr = raw ? (JSON.parse(raw) as ProgressionCheck[]) : [];
    return Array.isArray(arr) ? arr.slice(-60) : [];
  } catch {
    return [];
  }
}

export function saveProgressionCheck(check: ProgressionCheck) {
  const next = [...loadProgressionChecks(), check].slice(-60);
  if (typeof window === "undefined") return next;
  try {
    localStorage.setItem(PROGRESSION_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export type ReadinessBand = "green" | "yellow" | "red" | "unknown";

export type TodayRecoverySnapshot = {
  hydrationOz: number;
  hydrationTarget: number;
  hydrationPct: number;
  sleepLine: string;
  sleepBand?: string;
  storyIrritability?: string;
  phaseBias?: string;
  injuryLine?: string;
  surgeryLine?: string;
  clearanceCaution: boolean;
  clearanceBody?: string;
  readiness: ReadinessBand;
  readinessWhy: string[];
  lastProgression?: ProgressionCheck;
  progressionHint: string;
  preferName: string;
};

export function buildTodayRecoverySnapshot(opts?: {
  surgeryId?: string;
  surgeryDate?: string;
  precautionIds?: string[];
}): TodayRecoverySnapshot {
  const hydrationOz = todayHydrationOz();
  const hydrationPct = Math.min(
    100,
    Math.round((hydrationOz / HYDRATION_TARGET_OZ) * 100)
  );
  const sleep = buildSleepCorrelation();
  const ctx = loadClinicalContext();
  const preferName =
    ctx?.preferredName?.trim() ||
    (typeof window !== "undefined"
      ? localStorage.getItem("preferredName") || "friend"
      : "friend");

  const injury = parseInjuryTimeline(ctx?.freeText || "");
  const surgeryId = opts?.surgeryId;
  const surgery = surgeryId ? getSurgeryById(surgeryId) : undefined;
  const weeks = weeksSinceSurgery(opts?.surgeryDate);
  const surgeryLine = surgery
    ? `${surgery.name}${weeks != null ? ` · ~${weeks} wk post-op` : ""}`
    : undefined;

  const precautionIds = opts?.precautionIds || [];
  const highRiskPrec =
    precautionIds.some((id) =>
      /nwb|sternal|spinal|fusion|cardiac|clearance/i.test(id)
    ) ||
    surgery?.flags.includes("sternal-precautions") ||
    surgery?.flags.includes("nwb-possible");

  const clearanceCaution =
    highRiskPrec ||
    (ctx?.storyIrritability === "high") ||
    (injury.source === "stated" &&
      (injury.tissuePhase === "hyperacute" || injury.tissuePhase === "acute"));

  const readinessWhy: string[] = [];
  let readiness: ReadinessBand = "unknown";

  const lastProgression = loadProgressionChecks().slice(-1)[0];
  if (lastProgression) {
    const greenSignals =
      (lastProgression.painNow <= 3 ? 1 : 0) +
      (lastProgression.taskConfidence >= 6 ? 1 : 0) +
      (lastProgression.nextDayOk ? 1 : 0) +
      (lastProgression.romOk ? 1 : 0);
    if (lastProgression.painNow >= 7 || !lastProgression.nextDayOk) {
      readiness = "red";
      readinessWhy.push("Last check: high pain or delayed flare — protect volume.");
    } else if (greenSignals >= 3 && !clearanceCaution) {
      readiness = "green";
      readinessWhy.push("Last check supports careful progression if session response stays green.");
    } else {
      readiness = "yellow";
      readinessWhy.push("Mixed progression signals — hold or micro-progress only.");
    }
  } else if (ctx?.storyIrritability === "high") {
    readiness = "red";
    readinessWhy.push("Story irritability high — prioritize calm, short sessions.");
  } else if (ctx?.storyIrritability === "low") {
    readiness = "green";
    readinessWhy.push("Lower irritability on file — graded capacity may fit.");
  } else {
    readiness = "yellow";
    readinessWhy.push("Log a quick progression check after your next session.");
  }

  if (clearanceCaution) {
    readinessWhy.push("Clearance/protection cues present — do not force progress.");
    if (readiness === "green") readiness = "yellow";
  }

  if (hydrationPct < 40) {
    readinessWhy.push("Hydration so far is light today — sip steadily around sessions.");
  }

  const sleepLine = sleep.hasData
    ? `PSQI ${sleep.global}/21 · ${sleep.bandLabel}`
    : "Sleep PSQI not logged";

  return {
    hydrationOz,
    hydrationTarget: HYDRATION_TARGET_OZ,
    hydrationPct,
    sleepLine,
    sleepBand: sleep.band,
    storyIrritability: ctx?.storyIrritability,
    phaseBias: ctx?.storyPhaseBias,
    injuryLine:
      injury.source === "stated"
        ? `${injury.label} · ${injury.tissuePhase}`
        : undefined,
    surgeryLine,
    clearanceCaution,
    clearanceBody: clearanceCaution
      ? "Protection or high-irritability cues are active. Prefer short, green-light sessions and written clinician guidance for post-op/WB limits."
      : undefined,
    readiness,
    readinessWhy: readinessWhy.slice(0, 4),
    lastProgression,
    progressionHint:
      "Ready to progress? Pain ≤3/10 most of day, task confidence ≥6/10, no next-day flare, and ROM feels freer — then add small volume, not heroics.",
    preferName,
  };
}
