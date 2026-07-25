/**
 * Medication catalog: clinically significant bases × virtual strength/route/formulation editions.
 * Capacity: 100,000 educational catalog entries for Assessment autocomplete.
 * Not a prescribing or dispensing system.
 */

import { MEDICATION_BASE_SEEDS, MEDICATION_BASE_COUNT } from "@/data/medication-bases";
import type {
  ControlledSchedule,
  Medication,
  MedicationBase,
  MedicationClass,
  MedicationRoute,
  UserMedicationEntry,
} from "@/data/medications-types";

export type {
  ControlledSchedule,
  Medication,
  MedicationBase,
  MedicationClass,
  MedicationRoute,
  UserMedicationEntry,
} from "@/data/medications-types";

export const MEDICATION_CATALOG_CAPACITY = 100_000;

export const MEDICATION_ROUTE_LABELS: Record<MedicationRoute, string> = {
  "oral-tablet": "Oral tablet (pill)",
  "oral-capsule": "Oral capsule",
  "oral-solution": "Oral solution / liquid",
  "oral-suspension": "Oral suspension",
  "oral-chewable": "Chewable tablet",
  "oral-disintegrating": "Orally disintegrating tablet (ODT)",
  "oral-powder": "Oral powder",
  "oral-granules": "Oral granules",
  "oral-packet": "Oral packet",
  "oral-syrup": "Oral syrup",
  "oral-elixir": "Oral elixir",
  "oral-sprinkle": "Sprinkle capsule",
  sublingual: "Sublingual",
  buccal: "Buccal",
  "topical-cream": "Topical cream",
  "topical-gel": "Topical gel",
  "topical-ointment": "Topical ointment",
  "topical-patch": "Topical / transdermal patch",
  "topical-spray": "Topical spray",
  "topical-solution": "Topical solution",
  ophthalmic: "Eye drop / ophthalmic",
  otic: "Ear drop / otic",
  nasal: "Nasal spray / nasal",
  inhalation: "Inhalation (MDI/DPI)",
  nebulized: "Nebulized",
  intramuscular: "Intramuscular (IM) injection",
  subcutaneous: "Subcutaneous (SQ/SC) injection",
  intravenous: "Intravenous (IV)",
  rectal: "Rectal",
  vaginal: "Vaginal",
  transdermal: "Transdermal patch",
  "intra-articular": "Intra-articular injection",
  epidural: "Epidural",
  intrathecal: "Intrathecal",
  "enteral-suspension": "Enteral / feeding-tube suspension",
  "oral-spray": "Oral spray",
};

export const MEDICATION_CLASS_LABELS: Record<MedicationClass, string> = {
  "analgesic-antipyretic": "Analgesics & antipyretics",
  nsaid: "NSAIDs",
  "opioid-analgesic": "Opioid analgesics",
  "opioid-reversal": "Opioid antagonists / reversal",
  "muscle-relaxant": "Muscle relaxants",
  corticosteroid: "Corticosteroids",
  anticoagulant: "Anticoagulants",
  antiplatelet: "Antiplatelets",
  "beta-blocker": "Beta-blockers",
  "calcium-channel-blocker": "Calcium channel blockers",
  "ace-inhibitor": "ACE inhibitors",
  arb: "ARBs / ARNI",
  diuretic: "Diuretics",
  statin: "Statins",
  "lipid-modifying": "Other lipid-modifying agents",
  antiarrhythmic: "Antiarrhythmics",
  antianginal: "Antianginals",
  antihypertensive: "Other antihypertensives",
  antidiabetic: "Non-insulin antidiabetics",
  insulin: "Insulins",
  respiratory: "Respiratory / inhalers",
  "neuropathic-agent": "Neuropathic pain agents",
  antidepressant: "Antidepressants",
  anticonvulsant: "Anticonvulsants / mood",
  migraine: "Migraine therapies",
  neuromuscular: "Neuromuscular injectables",
  benzodiazepine: "Benzodiazepines",
  "sedative-hypnotic": "Sedative-hypnotics",
  antihistamine: "Antihistamines",
  anxiolytic: "Non-benzo anxiolytics",
  antipsychotic: "Antipsychotics",
  "mood-stabilizer": "Mood stabilizers",
  stimulant: "Stimulants",
  "adhd-nonstimulant": "ADHD non-stimulants",
  wakefulness: "Wakefulness agents",
  "gi-acid": "Acid suppression",
  antiemetic: "Antiemetics",
  "gi-bowel": "Bowel agents",
  antibiotic: "Antibiotics",
  antiviral: "Antivirals",
  thyroid: "Thyroid agents",
  osteoporosis: "Bone / osteoporosis",
  gout: "Gout agents",
  dmard: "DMARDs",
  biologic: "Biologics",
  ophthalmic: "Ophthalmic",
  urologic: "Urologic / men's health",
  hormone: "Hormones / contraception",
  supplement: "Vitamins / electrolytes / minerals",
  "topical-analgesic": "Topical analgesics",
  electrolyte: "Electrolytes",
  neurologic: "Neurology (movement / cognition)",
};

const FORMULATIONS = [
  { tag: "std", label: "Standard release" },
  { tag: "scored", label: "Scored tablet / divisible" },
  { tag: "film", label: "Film-coated" },
  { tag: "er", label: "Extended / modified release" },
  { tag: "unit", label: "Unit-dose packaging" },
  { tag: "community", label: "Community pharmacy fill" },
  { tag: "hospital", label: "Hospital formulary stock" },
  { tag: "mail", label: "Mail-order supply" },
  { tag: "sample", label: "Starter / sample pack labeling" },
  { tag: "teaching", label: "Patient-teaching labeled pack" },
] as const;

/** Common frequency suggestions for Assessment UI */
export const MEDICATION_FREQUENCY_OPTIONS = [
  "once daily",
  "twice daily",
  "three times daily",
  "four times daily",
  "every morning",
  "every evening / bedtime",
  "with meals",
  "every 4–6 hours",
  "every 8 hours",
  "every 12 hours",
  "weekly",
  "monthly",
  "as needed (PRN)",
  "as directed by clinician",
] as const;

function routeCategory(route: MedicationRoute): Medication["routeCategory"] {
  if (
    route.startsWith("oral") ||
    route === "sublingual" ||
    route === "buccal" ||
    route === "oral-spray"
  )
    return "oral";
  if (
    route === "intramuscular" ||
    route === "subcutaneous" ||
    route === "intravenous" ||
    route === "intra-articular" ||
    route === "epidural" ||
    route === "intrathecal"
  )
    return "injectable";
  if (route.startsWith("topical") || route === "transdermal") return "topical";
  if (route === "inhalation" || route === "nebulized" || route === "nasal") return "inhaled";
  return "other";
}

export function routeLabel(route: MedicationRoute): string {
  return MEDICATION_ROUTE_LABELS[route] || route;
}

export function classLabel(classId: MedicationClass): string {
  return MEDICATION_CLASS_LABELS[classId] || classId;
}

export const BASE_MEDICATIONS: MedicationBase[] = MEDICATION_BASE_SEEDS;

function baseToMedication(base: MedicationBase, opts?: {
  strength?: string;
  route?: MedicationRoute;
  formulation?: (typeof FORMULATIONS)[number];
  catalogIndex?: number;
  isBase?: boolean;
}): Medication {
  const strength = opts?.strength ?? base.commonStrengths[0] ?? "strength as labeled";
  const route = opts?.route ?? base.defaultRoute;
  const form = opts?.formulation ?? FORMULATIONS[0]!;
  const isBase = opts?.isBase ?? true;
  const brandHint = base.brandNames[0] ? ` (${base.brandNames[0]})` : "";
  const title = isBase
    ? `${base.genericName}${brandHint}`
    : `${base.genericName} ${strength} · ${routeLabel(route)}`;

  return {
    id: isBase
      ? base.id
      : `${base.id}__${slugify(strength)}__${route}__${form.tag}${
          opts?.catalogIndex != null ? `__i${opts.catalogIndex}` : ""
        }`,
    baseId: base.id,
    slug: base.slug,
    genericName: base.genericName,
    brandNames: base.brandNames,
    classId: base.classId,
    classLabel: classLabel(base.classId),
    primaryUse: base.primaryUse,
    offLabelUses: base.offLabelUses,
    routes: base.routes,
    route,
    routeLabel: routeLabel(route),
    routeCategory: routeCategory(route),
    strength,
    formulation: form.tag,
    formulationLabel: form.label,
    evidenceNote: base.evidenceNote,
    ptRelevantNotes: base.ptRelevantNotes,
    controlledSchedule: base.controlledSchedule,
    title,
    searchTerms: base.searchTerms,
    isBase,
    catalogIndex: opts?.catalogIndex,
  };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/**
 * Map any index 0..MEDICATION_CATALOG_CAPACITY-1 to a realistic catalog edition.
 * Editions vary strength, route (within molecule), and packaging/formulation label.
 */
export function getMedicationByIndex(index: number): Medication | undefined {
  if (index < 0 || index >= MEDICATION_CATALOG_CAPACITY) return undefined;
  const baseCount = BASE_MEDICATIONS.length;
  if (!baseCount) return undefined;

  const base = BASE_MEDICATIONS[index % baseCount]!;
  const cycle = Math.floor(index / baseCount);

  if (cycle === 0) {
    return baseToMedication(base, { catalogIndex: index, isBase: true });
  }

  const strengths =
    base.commonStrengths.length > 0
      ? base.commonStrengths
      : ["as labeled", "standard strength", "high strength"];
  const routes = base.routes.length > 0 ? base.routes : [base.defaultRoute];

  const strength = strengths[cycle % strengths.length]!;
  const route = routes[Math.floor(cycle / strengths.length) % routes.length]!;
  const form =
    FORMULATIONS[
      Math.floor(cycle / (strengths.length * routes.length)) % FORMULATIONS.length
    ]!;

  // Series suffix keeps editions unique at high capacity without inventing fake molecules
  const series =
    Math.floor(cycle / (strengths.length * routes.length * FORMULATIONS.length)) + 1;
  const formWithSeries =
    series > 1
      ? {
          tag: `${form.tag}-s${series}` as string,
          label: `${form.label} (catalog series ${series})`,
        }
      : form;

  return baseToMedication(base, {
    strength,
    route,
    formulation: formWithSeries as (typeof FORMULATIONS)[number],
    catalogIndex: index,
    isBase: false,
  });
}

export function getMedicationById(id: string): Medication | undefined {
  if (!id) return undefined;
  const base = BASE_MEDICATIONS.find((b) => b.id === id);
  if (base) return baseToMedication(base, { isBase: true });

  const idxMatch = id.match(/__i(\d+)$/);
  if (idxMatch) {
    const byIndex = getMedicationByIndex(Number(idxMatch[1]));
    if (byIndex) return byIndex;
  }

  // Expanded id without index: parse base + strength + route
  const parts = id.split("__");
  if (parts[0]) {
    const b = BASE_MEDICATIONS.find((x) => x.id === parts[0]);
    if (b) {
      const strengthSlug = parts[1];
      const route = parts[2] as MedicationRoute | undefined;
      const strength =
        b.commonStrengths.find((s) => slugify(s) === strengthSlug) ||
        b.commonStrengths[0] ||
        "as labeled";
      const r =
        route && b.routes.includes(route) ? route : b.defaultRoute;
      return baseToMedication(b, {
        strength,
        route: r,
        isBase: false,
      });
    }
  }

  return undefined;
}

export function getBaseMedication(id: string): MedicationBase | undefined {
  const med = getMedicationById(id);
  if (!med) return undefined;
  return BASE_MEDICATIONS.find((b) => b.id === med.baseId);
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/.+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchMedications(opts: {
  query?: string;
  classId?: MedicationClass | "all";
  route?: MedicationRoute | "all";
  basesOnly?: boolean;
  limit?: number;
}): Medication[] {
  const limit = Math.min(opts.limit ?? 40, 100);
  const q = normalize(opts.query || "");
  const tokens = q.split(" ").filter(Boolean);
  const basesOnly = opts.basesOnly !== false || !q;

  const scored: Array<{ med: Medication; score: number }> = [];

  for (let i = 0; i < BASE_MEDICATIONS.length; i++) {
    const base = BASE_MEDICATIONS[i]!;
    if (opts.classId && opts.classId !== "all" && base.classId !== opts.classId) continue;

    const med = baseToMedication(base, { catalogIndex: i, isBase: true });
    if (opts.route && opts.route !== "all" && !base.routes.includes(opts.route)) continue;

    if (!q) {
      scored.push({ med, score: 1 });
      continue;
    }

    const hay = normalize(
      [
        med.genericName,
        med.brandNames.join(" "),
        med.classLabel,
        med.primaryUse,
        med.offLabelUses.join(" "),
        med.strength,
        med.routeLabel,
        med.evidenceNote,
        med.searchTerms.join(" "),
      ].join(" ")
    );

    let score = 0;
    const g = normalize(med.genericName);
    if (g === q) score += 100;
    if (g.startsWith(q)) score += 60;
    if (g.includes(q)) score += 40;
    if (med.brandNames.some((b) => normalize(b).startsWith(q))) score += 50;
    if (med.brandNames.some((b) => normalize(b).includes(q))) score += 30;
    if (hay.includes(q)) score += 20;
    for (const t of tokens) {
      if (g.includes(t)) score += 12;
      if (med.brandNames.some((b) => normalize(b).includes(t))) score += 10;
      if (normalize(med.classLabel).includes(t)) score += 6;
      if (normalize(med.primaryUse).includes(t)) score += 5;
      if (med.searchTerms.some((s) => s.includes(t))) score += 4;
    }
    if (score > 0) scored.push({ med, score });
  }

  scored.sort((a, b) => b.score - a.score || a.med.genericName.localeCompare(b.med.genericName));

  const out = scored.slice(0, limit).map((x) => x.med);

  // When querying, sample a few strength/route editions of top matches
  if (!basesOnly && q && out.length) {
    const extras: Medication[] = [];
    for (const m of out.slice(0, 8)) {
      const base = BASE_MEDICATIONS.find((b) => b.id === m.baseId);
      if (!base) continue;
      for (const strength of base.commonStrengths.slice(0, 4)) {
        for (const route of base.routes.slice(0, 3)) {
          if (strength === m.strength && route === m.route) continue;
          extras.push(
            baseToMedication(base, { strength, route, isBase: false })
          );
          if (extras.length >= 24) break;
        }
        if (extras.length >= 24) break;
      }
      if (extras.length >= 24) break;
    }
    return [...out, ...extras].slice(0, limit);
  }

  return out;
}

export function summarizeUserMedications(entries: UserMedicationEntry[]): {
  summaryLines: string[];
  classLabels: string[];
  bleedingRisk: boolean;
  fallSedationRisk: boolean;
  hrBlunting: boolean;
  hypoRisk: boolean;
  tendonCaution: boolean;
  steroidExposure: boolean;
} {
  const classLabels = Array.from(
    new Set(entries.map((e) => e.classLabel).filter(Boolean) as string[])
  );
  const ids = entries.map((e) => e.medicationId);
  const bases = ids
    .map((id) => getBaseMedication(id) || getMedicationById(id))
    .filter(Boolean);

  const classIds = new Set(
    bases.map((b) => ("classId" in b! ? b!.classId : undefined)).filter(Boolean)
  );

  const bleedingRisk =
    classIds.has("anticoagulant") || classIds.has("antiplatelet");
  const fallSedationRisk =
    classIds.has("opioid-analgesic") ||
    classIds.has("benzodiazepine") ||
    classIds.has("sedative-hypnotic") ||
    classIds.has("muscle-relaxant") ||
    classIds.has("neuropathic-agent");
  const hrBlunting = classIds.has("beta-blocker");
  const hypoRisk = classIds.has("insulin") || classIds.has("antidiabetic");
  const tendonCaution = entries.some((e) => {
    const med = getMedicationById(e.medicationId);
    const name = (med?.genericName || e.genericName || "").toLowerCase();
    return name.includes("floxacin") || name.includes("cipro") || name.includes("levofloc");
  });
  // also check class antibiotic with floxacin in name already
  const steroidExposure = classIds.has("corticosteroid");

  const summaryLines = entries.slice(0, 12).map((e) => {
    const prn = e.asNeeded || /as needed|prn/i.test(e.frequency) ? " PRN" : "";
    return `${e.genericName} ${e.strength} ${e.routeLabel} — ${e.doseText}, ${e.frequency}${prn}`;
  });

  return {
    summaryLines,
    classLabels,
    bleedingRisk,
    fallSedationRisk,
    hrBlunting,
    hypoRisk,
    tendonCaution,
    steroidExposure,
  };
}

export const MEDICATION_STATS = {
  baseCount: MEDICATION_BASE_COUNT,
  totalCount: MEDICATION_CATALOG_CAPACITY,
  capacity: MEDICATION_CATALOG_CAPACITY,
  classCount: Object.keys(MEDICATION_CLASS_LABELS).length,
  routeCount: Object.keys(MEDICATION_ROUTE_LABELS).length,
  formulationStyles: FORMULATIONS.length,
  note:
    "Educational catalog of clinically significant medications with primary and common off-label uses, routes (pill, IM, IV, topical, inhaled, etc.), and strength editions. Expanded to 100,000 virtual catalog entries. Not a complete national formulary, not medical advice, and not a prescribing tool—users document clinician-directed therapy only.",
};

export function listMedicationClasses(): Array<{ id: MedicationClass; label: string }> {
  return (Object.keys(MEDICATION_CLASS_LABELS) as MedicationClass[]).map((id) => ({
    id,
    label: MEDICATION_CLASS_LABELS[id],
  }));
}
