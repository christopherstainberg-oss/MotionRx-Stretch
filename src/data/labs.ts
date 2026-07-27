/**
 * Educational lab test catalog + target ranges.
 * Vast multi-specialty coverage via generated catalog.
 * Not a diagnostic or medical advice system — clinician interpretation wins.
 */

import {
  GENERATED_LAB_COUNT,
  GENERATED_LAB_TESTS,
  GENERATED_LAB_CATEGORIES,
} from "@/data/lab-catalog-generated";
import type {
  LabCategory,
  LabRange,
  LabReport,
  LabStatus,
  LabTestDef,
  LabValueEntry,
} from "@/data/labs-types";

export type {
  LabCategory,
  LabRange,
  LabReport,
  LabStatus,
  LabTestDef,
  LabValueEntry,
} from "@/data/labs-types";

/** Full educational lab menu (core + panels + channel variants) */
export const LAB_TESTS: LabTestDef[] = GENERATED_LAB_TESTS;

export const LAB_TEST_BY_KEY = Object.fromEntries(
  LAB_TESTS.map((t) => [t.key, t])
) as Record<string, LabTestDef>;

export function resolveRange(
  def: LabTestDef,
  sex?: string | null
): { low?: number; high?: number } {
  const r = def.range;
  if (sex === "male" && r.male) return r.male;
  if (sex === "female" && r.female) return r.female;
  // Sex-specific defaults for a few common keys when generated ranges are unisex
  if (def.key === "hemoglobin" || def.key.endsWith("_hemoglobin")) {
    if (sex === "male") return { low: 13.5, high: 17.5 };
    if (sex === "female") return { low: 12.0, high: 15.5 };
  }
  if (def.key === "hematocrit" || def.key.endsWith("_hematocrit")) {
    if (sex === "male") return { low: 41, high: 50 };
    if (sex === "female") return { low: 36, high: 46 };
  }
  if (def.key === "creatinine" || def.key.endsWith("_creatinine")) {
    if (sex === "male") return { low: 0.74, high: 1.35 };
    if (sex === "female") return { low: 0.59, high: 1.04 };
  }
  return { low: r.low, high: r.high };
}

export function interpretLabValue(
  def: LabTestDef,
  value: number,
  sex?: string | null
): { status: LabStatus; tip?: string; recoveryNote?: string } {
  if (!Number.isFinite(value)) return { status: "unknown" };
  const crit = def.critical;
  if (crit?.low != null && value <= crit.low)
    return {
      status: "critical-low",
      tip: def.lowTip,
      recoveryNote: def.recoveryNote,
    };
  if (crit?.high != null && value >= crit.high)
    return {
      status: "critical-high",
      tip: def.highTip,
      recoveryNote: def.recoveryNote,
    };
  const range = resolveRange(def, sex);
  if (range.low != null && value < range.low)
    return { status: "low", tip: def.lowTip, recoveryNote: def.recoveryNote };
  if (range.high != null && value > range.high)
    return { status: "high", tip: def.highTip, recoveryNote: def.recoveryNote };
  // eGFR-style: only low bound
  if (range.low != null && range.high == null && value < range.low)
    return { status: "low", tip: def.lowTip, recoveryNote: def.recoveryNote };
  return { status: "normal", recoveryNote: def.recoveryNote };
}

export const LAB_STATS = {
  testCount: GENERATED_LAB_COUNT,
  categoryCount: GENERATED_LAB_CATEGORIES.length,
  categories: GENERATED_LAB_CATEGORIES,
  description: `Educational catalog of ${GENERATED_LAB_COUNT} lab assays across ${GENERATED_LAB_CATEGORIES.length} specialty areas and lab types (chemistry, hematology, hormones, infectious, genetics, microbiology, reproductive, neonatal, molecular, body fluids, toxicology, UA, CSF, clinic/hospital panels, and more). Target ranges are typical adult educational values — not lab-specific reportables or diagnoses.`,
};
