/**
 * Educational lab test catalog + reference ranges (NutriFit-inspired).
 * Not a diagnostic or medical advice system — clinician interpretation wins.
 */

export type LabCategory =
  | "Electrolytes"
  | "Kidney"
  | "Metabolic"
  | "Liver"
  | "Blood count"
  | "Iron"
  | "Lipids"
  | "Cardiac"
  | "Coagulation"
  | "Thyroid"
  | "Vitamins"
  | "Inflammation"
  | "Other";

export type LabRange = {
  low?: number;
  high?: number;
  male?: { low?: number; high?: number };
  female?: { low?: number; high?: number };
};

export type LabTestDef = {
  key: string;
  label: string;
  unit: string;
  category: LabCategory;
  range: LabRange;
  critical?: { low?: number; high?: number };
  /** Aliases for parse */
  aliases: string[];
  lowTip?: string;
  highTip?: string;
  /** Soft link to MSK / recovery dosing education */
  recoveryNote?: string;
};

export const LAB_TESTS: LabTestDef[] = [
  {
    key: "sodium",
    label: "Sodium (Na)",
    unit: "mmol/L",
    category: "Electrolytes",
    range: { low: 135, high: 145 },
    critical: { low: 120, high: 160 },
    aliases: ["sodium", "na+", "na"],
    lowTip: "Hyponatremia can follow overhydration or losses — clinician review if symptomatic.",
    highTip: "High sodium often tracks dehydration — hydrate thoughtfully.",
    recoveryNote: "Electrolyte balance can influence cramp perception and session tolerance.",
  },
  {
    key: "potassium",
    label: "Potassium (K)",
    unit: "mmol/L",
    category: "Electrolytes",
    range: { low: 3.5, high: 5.1 },
    critical: { low: 2.5, high: 6.0 },
    aliases: ["potassium", "k+", "k"],
    lowTip: "Low K: food sources include banana, potato, beans, greens — confirm with clinician.",
    highTip: "High K can affect heart rhythm — urgent clinician review if marked.",
    recoveryNote: "Marked K abnormalities are a reason to pause aggressive exercise until cleared.",
  },
  {
    key: "chloride",
    label: "Chloride (Cl)",
    unit: "mmol/L",
    category: "Electrolytes",
    range: { low: 98, high: 107 },
    aliases: ["chloride", "cl-", "cl"],
  },
  {
    key: "bicarbonate",
    label: "Bicarbonate (CO2)",
    unit: "mmol/L",
    category: "Electrolytes",
    range: { low: 22, high: 29 },
    aliases: ["bicarbonate", "total co2", "hco3", "co2"],
  },
  {
    key: "magnesium",
    label: "Magnesium (Mg)",
    unit: "mg/dL",
    category: "Electrolytes",
    range: { low: 1.7, high: 2.2 },
    aliases: ["magnesium", "mg"],
    recoveryNote: "Low Mg sometimes coexists with cramp/fatigue complaints — food first, clinician if low.",
  },
  {
    key: "calcium",
    label: "Calcium (Ca)",
    unit: "mg/dL",
    category: "Electrolytes",
    range: { low: 8.6, high: 10.3 },
    aliases: ["calcium", "ca++", "ca"],
  },
  {
    key: "bun",
    label: "BUN",
    unit: "mg/dL",
    category: "Kidney",
    range: { low: 7, high: 20 },
    aliases: ["blood urea nitrogen", "urea nitrogen", "bun", "urea"],
  },
  {
    key: "creatinine",
    label: "Creatinine",
    unit: "mg/dL",
    category: "Kidney",
    range: {
      male: { low: 0.74, high: 1.35 },
      female: { low: 0.59, high: 1.04 },
    },
    aliases: ["creatinine", "creat"],
    recoveryNote: "High creatinine → hydrate education and clinician follow-up; avoid assuming “just muscle”.",
  },
  {
    key: "egfr",
    label: "eGFR",
    unit: "mL/min/1.73m²",
    category: "Kidney",
    range: { low: 90 },
    aliases: ["estimated gfr", "egfr", "gfr"],
    lowTip: "Reduced eGFR needs kidney-aware dosing education — clinician-led.",
    recoveryNote: "Lower eGFR favors conservative volume and medication caution education.",
  },
  {
    key: "glucose",
    label: "Glucose (fasting)",
    unit: "mg/dL",
    category: "Metabolic",
    range: { low: 70, high: 99 },
    critical: { low: 54, high: 400 },
    aliases: ["fasting glucose", "blood glucose", "glucose", "glu"],
    recoveryNote: "Hypoglycemia risk with some meds — fuel around sessions if directed by clinician.",
  },
  {
    key: "hba1c",
    label: "HbA1c",
    unit: "%",
    category: "Metabolic",
    range: { low: 4.0, high: 5.6 },
    aliases: ["hemoglobin a1c", "hgb a1c", "hba1c", "a1c"],
  },
  {
    key: "alt",
    label: "ALT",
    unit: "U/L",
    category: "Liver",
    range: { low: 7, high: 56 },
    aliases: ["alanine aminotransferase", "sgpt", "alt"],
  },
  {
    key: "ast",
    label: "AST",
    unit: "U/L",
    category: "Liver",
    range: { low: 10, high: 40 },
    aliases: ["aspartate aminotransferase", "sgot", "ast"],
    recoveryNote: "AST can rise after hard exercise — context matters; not automatic “liver injury”.",
  },
  {
    key: "alk_phos",
    label: "Alkaline phosphatase",
    unit: "U/L",
    category: "Liver",
    range: { low: 40, high: 129 },
    aliases: ["alkaline phosphatase", "alk phos", "alp"],
  },
  {
    key: "bilirubin",
    label: "Total bilirubin",
    unit: "mg/dL",
    category: "Liver",
    range: { low: 0.1, high: 1.2 },
    aliases: ["total bilirubin", "bilirubin", "tbili"],
  },
  {
    key: "hemoglobin",
    label: "Hemoglobin",
    unit: "g/dL",
    category: "Blood count",
    range: {
      male: { low: 13.5, high: 17.5 },
      female: { low: 12.0, high: 15.5 },
    },
    aliases: ["hemoglobin", "haemoglobin", "hgb", "hb"],
    recoveryNote: "Low Hgb can limit endurance tolerance — grade aerobic volume.",
  },
  {
    key: "hematocrit",
    label: "Hematocrit",
    unit: "%",
    category: "Blood count",
    range: {
      male: { low: 41, high: 50 },
      female: { low: 36, high: 46 },
    },
    aliases: ["hematocrit", "haematocrit", "hct"],
  },
  {
    key: "wbc",
    label: "WBC",
    unit: "×10³/µL",
    category: "Blood count",
    range: { low: 4.5, high: 11.0 },
    aliases: ["white blood cell count", "white blood cells", "leukocytes", "wbc"],
  },
  {
    key: "platelets",
    label: "Platelets",
    unit: "×10³/µL",
    category: "Blood count",
    range: { low: 150, high: 450 },
    critical: { low: 50, high: 1000 },
    aliases: ["platelet count", "platelets", "plt"],
    recoveryNote: "Very low platelets → fall/bleed risk education; avoid high-fall drills.",
  },
  {
    key: "ferritin",
    label: "Ferritin",
    unit: "ng/mL",
    category: "Iron",
    range: { low: 30, high: 400 },
    aliases: ["ferritin"],
    recoveryNote: "Low iron stores can show as fatigue with training load.",
  },
  {
    key: "iron",
    label: "Serum iron",
    unit: "µg/dL",
    category: "Iron",
    range: { low: 60, high: 170 },
    aliases: ["serum iron", "iron"],
  },
  {
    key: "total_cholesterol",
    label: "Total cholesterol",
    unit: "mg/dL",
    category: "Lipids",
    range: { high: 200 },
    aliases: ["total cholesterol", "cholesterol"],
  },
  {
    key: "ldl",
    label: "LDL cholesterol",
    unit: "mg/dL",
    category: "Lipids",
    range: { high: 100 },
    aliases: ["ldl cholesterol", "ldl-c", "ldl"],
  },
  {
    key: "hdl",
    label: "HDL cholesterol",
    unit: "mg/dL",
    category: "Lipids",
    range: { low: 40 },
    aliases: ["hdl cholesterol", "hdl-c", "hdl"],
  },
  {
    key: "triglycerides",
    label: "Triglycerides",
    unit: "mg/dL",
    category: "Lipids",
    range: { high: 150 },
    aliases: ["triglycerides", "trig"],
  },
  {
    key: "tsh",
    label: "TSH",
    unit: "mIU/L",
    category: "Thyroid",
    range: { low: 0.4, high: 4.0 },
    aliases: ["thyroid stimulating hormone", "thyrotropin", "tsh"],
    recoveryNote: "Thyroid imbalance can affect energy and perceived exertion.",
  },
  {
    key: "crp",
    label: "CRP",
    unit: "mg/L",
    category: "Inflammation",
    range: { high: 10 },
    aliases: ["c-reactive protein", "c reactive protein", "crp"],
  },
  {
    key: "hs_crp",
    label: "hs-CRP",
    unit: "mg/L",
    category: "Inflammation",
    range: { high: 3 },
    aliases: ["high sensitivity crp", "hs-crp", "hscrp", "hs crp"],
  },
  {
    key: "ck",
    label: "Creatine kinase (CK)",
    unit: "U/L",
    category: "Other",
    range: { low: 30, high: 200 },
    aliases: ["creatine phosphokinase", "creatine kinase", "cpk", "ck"],
    recoveryNote: "CK rises after hard training — interpret with soreness/context, not fear alone.",
  },
  {
    key: "inr",
    label: "INR",
    unit: "",
    category: "Coagulation",
    range: { low: 0.8, high: 1.2 },
    aliases: ["international normalized ratio", "inr"],
    recoveryNote: "Therapeutic INR on anticoagulants changes fall/bleed risk — prefer low-fall HEP.",
  },
  {
    key: "vitamin_d",
    label: "Vitamin D (25-OH)",
    unit: "ng/mL",
    category: "Vitamins",
    range: { low: 30, high: 100 },
    aliases: ["25-hydroxyvitamin d", "25-oh vitamin d", "vitamin d", "vit d"],
    recoveryNote: "Low vitamin D is common; bone/muscle education, clinician-directed repletion.",
  },
  {
    key: "vitamin_b12",
    label: "Vitamin B12",
    unit: "pg/mL",
    category: "Vitamins",
    range: { low: 200, high: 900 },
    aliases: ["vitamin b12", "cobalamin", "vit b12", "b12"],
  },
  {
    key: "troponin_i",
    label: "Troponin I",
    unit: "ng/mL",
    category: "Cardiac",
    range: { high: 0.04 },
    aliases: ["troponin i", "troponin-i", "troponin", "ctni"],
    highTip: "Elevated troponin is urgent medical territory — not an HEP adjustment alone.",
    recoveryNote: "Any elevated troponin → stop exercise advice and seek emergency/clinician care.",
  },
];

export const LAB_TEST_BY_KEY = Object.fromEntries(
  LAB_TESTS.map((t) => [t.key, t])
) as Record<string, LabTestDef>;

export type LabStatus = "low" | "normal" | "high" | "critical-low" | "critical-high" | "unknown";

export function resolveRange(
  def: LabTestDef,
  sex?: string | null
): { low?: number; high?: number } {
  const r = def.range;
  if (sex === "male" && r.male) return r.male;
  if (sex === "female" && r.female) return r.female;
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
  return { status: "normal", recoveryNote: def.recoveryNote };
}

export type LabValueEntry = {
  key: string;
  value: number;
  unit?: string;
  status?: LabStatus;
  source?: "manual" | "parsed";
  rawLabel?: string;
};

export type LabReport = {
  id: string;
  collectedAt: string; // ISO date
  uploadedAt: string;
  fileName?: string;
  fileType?: string;
  values: LabValueEntry[];
  notes?: string;
  parseWarnings?: string[];
};

export const LAB_STATS = {
  testCount: LAB_TESTS.length,
  description:
    "Educational lab catalog with typical adult ranges. Not a complete lab menu or diagnosis.",
};
