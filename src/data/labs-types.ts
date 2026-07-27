/**
 * Shared lab types (kept separate for generated catalog imports).
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
  | "Hormones"
  | "Gastrointestinal"
  | "Bone"
  | "Autoimmune"
  | "Infectious"
  | "Tumor markers"
  | "Pulmonary"
  | "Allergy"
  | "Urinalysis"
  | "Toxicology"
  | "CSF"
  | "Genetics"
  | "Microbiology"
  | "Reproductive"
  | "Neonatal"
  | "Serology"
  | "Molecular"
  | "Body fluids"
  | "Diabetes"
  | "Nutrition"
  | "Hematology special"
  | "Parasitology"
  | "Therapeutic drug levels"
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
  category: LabCategory | string;
  range: LabRange;
  critical?: { low?: number; high?: number };
  aliases: string[];
  lowTip?: string;
  highTip?: string;
  recoveryNote?: string;
};

export type LabStatus =
  | "low"
  | "normal"
  | "high"
  | "critical-low"
  | "critical-high"
  | "unknown";

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
  collectedAt: string;
  uploadedAt: string;
  fileName?: string;
  fileType?: string;
  values: LabValueEntry[];
  notes?: string;
  parseWarnings?: string[];
};
