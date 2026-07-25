/**
 * Shared medication types (kept separate so bases file can import without cycles).
 */

export type MedicationRoute =
  | "oral-tablet"
  | "oral-capsule"
  | "oral-solution"
  | "oral-suspension"
  | "oral-chewable"
  | "oral-disintegrating"
  | "oral-powder"
  | "oral-granules"
  | "oral-packet"
  | "oral-syrup"
  | "oral-elixir"
  | "oral-sprinkle"
  | "sublingual"
  | "buccal"
  | "topical-cream"
  | "topical-gel"
  | "topical-ointment"
  | "topical-patch"
  | "topical-spray"
  | "topical-solution"
  | "ophthalmic"
  | "otic"
  | "nasal"
  | "inhalation"
  | "nebulized"
  | "intramuscular"
  | "subcutaneous"
  | "intravenous"
  | "rectal"
  | "vaginal"
  | "transdermal"
  | "intra-articular"
  | "epidural"
  | "intrathecal"
  | "enteral-suspension"
  | "oral-spray";

export type MedicationClass =
  | "analgesic-antipyretic"
  | "nsaid"
  | "opioid-analgesic"
  | "opioid-reversal"
  | "muscle-relaxant"
  | "corticosteroid"
  | "anticoagulant"
  | "antiplatelet"
  | "beta-blocker"
  | "calcium-channel-blocker"
  | "ace-inhibitor"
  | "arb"
  | "diuretic"
  | "statin"
  | "lipid-modifying"
  | "antiarrhythmic"
  | "antianginal"
  | "antihypertensive"
  | "antidiabetic"
  | "insulin"
  | "respiratory"
  | "neuropathic-agent"
  | "antidepressant"
  | "anticonvulsant"
  | "migraine"
  | "neuromuscular"
  | "benzodiazepine"
  | "sedative-hypnotic"
  | "antihistamine"
  | "anxiolytic"
  | "antipsychotic"
  | "mood-stabilizer"
  | "stimulant"
  | "adhd-nonstimulant"
  | "wakefulness"
  | "gi-acid"
  | "antiemetic"
  | "gi-bowel"
  | "antibiotic"
  | "antiviral"
  | "thyroid"
  | "osteoporosis"
  | "gout"
  | "dmard"
  | "biologic"
  | "ophthalmic"
  | "urologic"
  | "hormone"
  | "supplement"
  | "topical-analgesic"
  | "electrolyte"
  | "neurologic";

export type ControlledSchedule = "none" | "II" | "III" | "IV" | "V";

export interface MedicationBase {
  id: string;
  slug: string;
  genericName: string;
  brandNames: string[];
  classId: MedicationClass;
  primaryUse: string;
  offLabelUses: string[];
  routes: MedicationRoute[];
  defaultRoute: MedicationRoute;
  commonStrengths: string[];
  evidenceNote: string;
  ptRelevantNotes?: string;
  controlledSchedule: ControlledSchedule;
  searchTerms: string[];
}

/** Fully resolved catalog entry (base or strength/route/formulation edition) */
export interface Medication {
  id: string;
  baseId: string;
  slug: string;
  genericName: string;
  brandNames: string[];
  classId: MedicationClass;
  classLabel: string;
  primaryUse: string;
  offLabelUses: string[];
  /** All applicable routes for this molecule */
  routes: MedicationRoute[];
  /** Selected route for this catalog edition */
  route: MedicationRoute;
  routeLabel: string;
  routeCategory: "oral" | "injectable" | "topical" | "inhaled" | "other";
  strength: string;
  formulation: string;
  formulationLabel: string;
  evidenceNote: string;
  ptRelevantNotes?: string;
  controlledSchedule: ControlledSchedule;
  /** Short display title */
  title: string;
  searchTerms: string[];
  isBase: boolean;
  catalogIndex?: number;
}

/** User-selected current medication with dose/frequency */
export interface UserMedicationEntry {
  /** Catalog medication id (base or expanded) */
  medicationId: string;
  genericName: string;
  brandName?: string;
  strength: string;
  route: MedicationRoute;
  routeLabel: string;
  /** e.g. "1 tablet", "2 puffs", "10 mg" */
  doseText: string;
  /** e.g. "twice daily", "every morning", "as needed" */
  frequency: string;
  asNeeded?: boolean;
  notes?: string;
  primaryUse?: string;
  classLabel?: string;
}
