/**
 * MotionRx Program Creation Model — ported from PhysioPath generateProgram()
 * and all of its timeline / variant / healing / signature intricacies.
 *
 * Educational multi-phase recovery scaffolding:
 *   track (acute | chronic) → condition-specific REHAB_PLAN (+ variants)
 *   → healing-scale comorbidities → phase week windows + criteria
 *   → signature / RTS / sport / falls exercise layers
 *   → load guidance, session frequency, builtFrom drift fingerprint
 *
 * A treating clinician or surgeon protocol always overrides this educational model.
 */

import {
  REHAB_PLANS,
  DOMAIN_FALLBACK,
  PROGRAM_TEMPLATE,
  PHASE_CRITERIA,
  PHASE_TARGET,
  PACE_VARIANTS,
  XCUT_VARIANTS,
  INJURY_FOCUS,
  BALANCE_LADDER,
  AGILITY_LADDER,
  FALLS_LADDER,
  SPORT_DEMANDS,
  type RehabPlanDef,
  type PlanVariant,
  type PhaseTuple,
  type TrackId,
  type InjuryFocusDef,
} from "@/data/program-creation-catalog";
import { getConditionsByIds } from "@/data/clinical-conditions";
import { getSurgeryById, weeksSinceSurgery } from "@/data/surgeries";
import { getSportById } from "@/data/sports";
import { summarizeUserMedications } from "@/data/medications";
import type { SymptomInput } from "@/lib/types";
import { parseInjuryTimeline } from "@/lib/injury-timeline";
import { v4 as uuid } from "uuid";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ProgramExerciseSeed = {
  n: string;
  d: string;
  c: string;
  tags?: string[];
  /** Soft library match hints for MotionRx catalog */
  preferTags?: string[];
  phase: number; // 1-based
  source: "signature" | "rts" | "sport" | "falls" | "adl" | "protocol";
};

export type ProgramPhase = {
  index: number; // 0-based
  title: string;
  goal: string;
  weekStart: number;
  weekEnd: number;
  criteria: string;
  restrict: string;
  /** Whether this is the active phase based on weeks since injury/surgery */
  current: boolean;
  /** PhysioPath-style exercise seeds for this phase (before catalog mapping) */
  seeds: ProgramExerciseSeed[];
  /** Target count of movements (time-budget scaled) */
  targetCount: number;
};

export type ProgramVariantInfo = {
  k: string;
  label: string;
  sub: string;
};

export type ResolvedRehabPlan = {
  label: string;
  total: number;
  freq: string;
  note: string;
  ph: PhaseTuple[];
  variant: ProgramVariantInfo | null;
  variantList: ProgramVariantInfo[];
  generic?: boolean;
  surgeryName?: string;
};

export type ProgramCreationInput = {
  /** Free-text condition / surgery / injury names to match REHAB_PLANS */
  conditionNames: string[];
  /** Optional MotionRx clinical condition IDs (labels used as names) */
  conditionIds?: string[];
  /** Weeks since injury onset (null = unknown) */
  weeksSinceOnset: number | null;
  /** Current movement pain 0–10 */
  painMove: number;
  /** Resting pain if known */
  painRest?: number;
  ageYears?: number;
  fitness?: "low" | "moderate" | "high";
  surgery?: boolean;
  surgeryName?: string;
  surgeryId?: string;
  surgeryDate?: string;
  /** Explicit plan variant key per plan label */
  planVariantByLabel?: Record<string, string>;
  /** Sport names or demand labels for late-phase specificity */
  sportLabels?: string[];
  sportIds?: string[];
  /** Available minutes bucket */
  timePerDay?: "lt10" | "10to20" | "20to40" | "gt40" | number;
  /** Medical / history flags that drive healingScale + variants */
  flags?: string[];
  smoking?: "never" | "former" | "current";
  alcohol?: "none" | "moderate" | "heavy";
  heightCm?: number;
  weightKg?: number;
  /** Medication flags (corticosteroid, beta_blocker, …) */
  medFlags?: string[];
  falls?: "0" | "1" | "2";
  aid?: string;
  priorEpisodes?: "first" | "recurrent";
  sleep?: string;
  stress?: string;
  moveConfidence?: string;
  workDemand?: string;
  equipment?: string;
  returnSports?: string[];
  /** Water confidence (aquatic allowed) */
  waterConfidence?: boolean;
  /** Prefer home equipment pathway */
  homeBased?: boolean;
  domain?: "msk" | "neuro" | "cardiac" | "pulmonary";
  /** Free-text story for timeline / domain hints */
  concernParagraph?: string;
  pastMedicalHistory?: string;
  currentMedicalHistory?: string;
  /** ADL limited labels for phase seeds */
  adlLimited?: string[];
};

export type BuiltFromFingerprint = {
  pain: number;
  flags: string;
  track: TrackId;
  planLabel: string;
  variantKey: string;
  weeksSinceOnset: number | null;
};

export type MotionRxProgram = {
  track: TrackId;
  totalWeeks: number;
  sessions: string;
  load: string;
  focus: string;
  plan: ResolvedRehabPlan | null;
  phases: ProgramPhase[];
  /** Current phase index (0-based) */
  currentPhaseIndex: number;
  /** Injury-focus prose when matched */
  injuryFocusNote: string;
  notes: string[];
  clearance: boolean;
  supervision: "self" | "supervised" | "clinical";
  domain: string;
  /** Seeds across all phases (for catalog scoring boosts) */
  allSeeds: ProgramExerciseSeed[];
  /** Prefer tags derived from current-phase seeds */
  preferTags: string[];
  avoidHints: string[];
  builtFrom: BuiltFromFingerprint;
  summaryLines: string[];
  evidenceNotes: string[];
};

/* -------------------------------------------------------------------------- */
/* Track + phase week splits (PhysioPath buildPhaseWeeks)                      */
/* -------------------------------------------------------------------------- */

export function classifyTrack(weeks: number | null | undefined): TrackId {
  if (weeks == null || Number.isNaN(weeks)) return "acute";
  return weeks <= 6 ? "acute" : "chronic";
}

export function buildPhaseWeeks(
  track: TrackId,
  opts: {
    surgery?: boolean;
    painMove?: number;
    fitness?: string;
  } = {}
): number[] {
  const total = PROGRAM_TEMPLATE[track].total;
  let split: number[];
  if (track === "acute") {
    split = [3, 4, 5, 4];
    if (opts.surgery) split = [4, 4, 5, 3];
    if ((opts.painMove ?? 0) >= 7) split = [4, 5, 4, 3];
    if ((opts.painMove ?? 0) <= 2 && opts.fitness === "high") split = [2, 4, 5, 5];
  } else {
    split = [2, 5, 4, 3];
    if ((opts.painMove ?? 0) >= 7) split = [3, 5, 3, 3];
    if (opts.fitness === "high" && (opts.painMove ?? 0) <= 3) split = [2, 4, 4, 4];
  }
  let sum = split.reduce((a, b) => a + b, 0);
  while (sum < total) {
    split[1]!++;
    sum++;
  }
  while (sum > total) {
    split[3] = Math.max(2, split[3]! - 1);
    sum = split.reduce((a, b) => a + b, 0);
  }
  return split;
}

export function sessionsText(
  track: TrackId,
  opts: { painMove?: number; fitness?: string } = {}
): string {
  if (track === "acute" && (opts.painMove ?? 0) >= 6)
    return "5–7 short sessions/week (little & often)";
  if (opts.fitness === "high") return "4–5 sessions/week";
  return "4–6 sessions/week";
}

export function loadGuidance(pain: number, from = "your intake answer"): string {
  const src = ` (based on ${from})`;
  if (pain >= 7)
    return (
      "Keep effort very light. Pain during exercise should stay at/below 3/10 and settle within an hour." +
      src
    );
  if (pain >= 4)
    return (
      "Mild discomfort (up to ~4/10) during loading is acceptable if it settles by the next morning. Sharp pain means back off." +
      src
    );
  return (
    "You can load with confidence. Progress ~10% per week while pain stays low and settles overnight." +
    src
  );
}

export function phaseTarget(
  phaseIndex: number,
  timePerDay?: ProgramCreationInput["timePerDay"]
): number {
  const base = PHASE_TARGET[phaseIndex] ?? 6;
  if (timePerDay === "lt10" || timePerDay === 8)
    return Math.max(3, Math.round(base * 0.5));
  if (timePerDay === "10to20" || (typeof timePerDay === "number" && timePerDay <= 20))
    return Math.max(4, Math.round(base * 0.7));
  if (timePerDay === "gt40" || (typeof timePerDay === "number" && timePerDay >= 40))
    return base + 2;
  return base;
}

/* -------------------------------------------------------------------------- */
/* Variants + healing scale                                                   */
/* -------------------------------------------------------------------------- */

export function planVariants(plan: RehabPlanDef | null | undefined): PlanVariant[] {
  if (!plan) return PACE_VARIANTS;
  const own = plan.variants;
  if (!own?.length) return PACE_VARIANTS;
  const have = new Set(own.map((v) => v.k));
  return own.concat(XCUT_VARIANTS.filter((v) => !have.has(v.k)));
}

export function bmiCalc(heightCm?: number, weightKg?: number): number | null {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  const b = weightKg / (m * m);
  return Number.isFinite(b) && b > 8 && b < 100 ? Math.round(b * 10) / 10 : null;
}

/**
 * Systemic factors that slow tissue healing — multiply and cap at 1.6×.
 * Age is handled by the `older` variant, not here.
 */
export function healingScale(input: {
  flags?: string[];
  smoking?: string;
  alcohol?: string;
  medFlags?: string[];
  heightCm?: number;
  weightKg?: number;
}): { scale: number; factors: string[] } {
  const flags = new Set(input.flags || []);
  const meds = new Set(input.medFlags || []);
  const bmi = bmiCalc(input.heightCm, input.weightKg);
  const F: Array<[boolean, number, string]> = [
    [flags.has("diabetes"), 1.15, "diabetes"],
    [input.smoking === "current", 1.15, "current smoking"],
    [meds.has("corticosteroid") || meds.has("steroid"), 1.1, "long-term corticosteroids"],
    [flags.has("ckd"), 1.1, "chronic kidney disease"],
    [flags.has("cancer_treatment") || flags.has("cancer"), 1.15, "active cancer treatment"],
    [flags.has("pad"), 1.1, "poor circulation (PAD)"],
    [input.alcohol === "heavy", 1.05, "heavy alcohol use"],
    [Number.isFinite(bmi as number) && (bmi as number) >= 35, 1.08, "a high BMI"],
  ];
  let s = 1;
  const factors: string[] = [];
  for (const [on, mult, label] of F) {
    if (on) {
      s *= mult;
      factors.push(label);
    }
  }
  return { scale: Math.min(s, 1.6), factors };
}

/** Scale phase week boundaries while keeping them contiguous and non-zero. */
export function scalePlanPhases(ph: PhaseTuple[], scale: number): PhaseTuple[] {
  if (!ph.length || scale === 1) return ph;
  const bounds = [ph[0]![1], ...ph.map((f) => f[2])];
  const sc = bounds.map((b) => Math.round(b * scale));
  sc[0] = bounds[0]!;
  for (let i = 1; i < sc.length; i++) {
    if (sc[i]! <= sc[i - 1]!) sc[i] = sc[i - 1]! + 1;
  }
  return ph.map(
    (f, i) =>
      [f[0], sc[i]!, sc[i + 1]!, f[3], f[4], f[5]] as PhaseTuple
  );
}

export function historyVariantKeys(input: ProgramCreationInput): string[] {
  const keys: string[] = [];
  const flags = new Set(input.flags || []);
  const sname = (input.surgeryName || "").toLowerCase();
  if (
    /arthroscop|keyhole|laparoscop|percutaneous|robotic|minimally invasive|endoscopic/.test(
      sname
    )
  )
    keys.push("keyhole");
  else if (/\bopen\b|mini-?open|sternotom|laparotom|thoracotom/.test(sname))
    keys.push("open");
  if (/revision|complex|redo/.test(sname)) keys.unshift("revision");
  if (input.falls === "2" || (input.aid && input.aid !== "none") || (input.ageYears ?? 0) >= 70)
    keys.push("older");
  if (input.fitness === "low") keys.push("decond");
  if (
    input.fitness === "high" &&
    (input.ageYears ?? 99) < 40 &&
    (input.painMove ?? 0) <= 3
  )
    keys.push("accelerated");
  if ((input.painMove ?? 0) >= 7 || (input.painRest ?? 0) >= 6) keys.push("irritable");
  if (flags.has("hypermobility")) keys.push("hypermobile");
  if ((input.returnSports || []).length || (input.sportIds || []).length)
    keys.push("athlete");
  if (input.priorEpisodes === "recurrent") keys.unshift("recurrent");
  if (input.sleep === "lt6" || input.stress === "high") keys.push("irritable");
  if (input.moveConfidence === "fearful") keys.push("irritable");
  if (input.workDemand === "manual" || input.workDemand === "heavy") keys.push("work");
  if (input.equipment === "gym") keys.push("gym");
  if (input.equipment === "none" || input.equipment === "bands" || input.homeBased)
    keys.push("home");
  return keys;
}

export function selectedVariant(
  plan: RehabPlanDef,
  condName: string,
  input: ProgramCreationInput
): PlanVariant {
  const list = planVariants(plan);
  const chosenKey = input.planVariantByLabel?.[plan.label];
  if (chosenKey) {
    const found = list.find((v) => v.k === chosenKey);
    if (found) return found;
  }
  const name = (condName || "").toLowerCase();
  let best: PlanVariant | null = null;
  let bestLen = 0;
  for (const v of list) {
    if (!v.pick) continue;
    const m = name.match(v.pick);
    if (m && m[0].length > bestLen) {
      best = v;
      bestLen = m[0].length;
    }
  }
  if (best) return best;
  const want = historyVariantKeys(input);
  for (const k of want) {
    const v = list.find((x) => x.k === k);
    if (v) return v;
  }
  return list[0]!;
}

export function applyVariant(
  plan: RehabPlanDef,
  v: PlanVariant | null,
  input: ProgramCreationInput
): ResolvedRehabPlan {
  let ph: PhaseTuple[] =
    v?.ph ||
    (v?.scale && v.scale !== 1 ? scalePlanPhases(plan.ph, v.scale) : plan.ph);
  const hs = healingScale(input);
  if (hs.scale > 1) ph = scalePlanPhases(ph, hs.scale);
  const healNote = hs.factors.length
    ? ` Your recovery timeline is extended (~${Math.round((hs.scale - 1) * 100)}% longer) because ${hs.factors.join(", ")} slow tissue healing — the phase weeks below already account for this.`
    : "";
  return {
    label: plan.label,
    total: ph[ph.length - 1]![2],
    note: plan.note + (v?.note ? " " + v.note : "") + healNote,
    freq: v?.freq || plan.freq,
    ph,
    variant: v ? { k: v.k, label: v.label, sub: v.sub } : null,
    variantList: planVariants(plan).map((x) => ({
      k: x.k,
      label: x.label,
      sub: x.sub,
    })),
    generic: plan.generic,
  };
}

/* -------------------------------------------------------------------------- */
/* Plan matching (detectPlan / rankPlans)                                     */
/* -------------------------------------------------------------------------- */

function rankPlans(name: string, plans: RehabPlanDef[]): RehabPlanDef | null {
  const n = (name || "").toLowerCase();
  let best: RehabPlanDef | null = null;
  let bestSpec = -1;
  let bestLen = 0;
  for (const p of plans) {
    const m = n.match(p.re);
    if (!m) continue;
    const spec = p.generic ? 0 : 1;
    if (spec > bestSpec || (spec === bestSpec && m[0].length > bestLen)) {
      best = p;
      bestSpec = spec;
      bestLen = m[0].length;
    }
  }
  return best;
}

export function detectPlan(
  condName: string,
  input: ProgramCreationInput
): RehabPlanDef | null {
  if (!condName) return null;
  const name = condName.toLowerCase();
  const isPostop = Boolean(input.surgery || input.surgeryId || input.surgeryName);
  // Explicit surgery name can override when more specific
  if (input.surgeryName) {
    const named = rankPlans(input.surgeryName, REHAB_PLANS);
    if (named && !named.generic) return named;
  }
  let best: RehabPlanDef | null = null;
  let bestSpec = -1;
  let bestLen = 0;
  for (const p of REHAB_PLANS) {
    if (p.postop === true && !isPostop) continue;
    if (p.postop === false && isPostop) continue;
    const m = name.match(p.re);
    if (!m) continue;
    const spec = p.generic ? 0 : 1;
    const len = m[0].length;
    if (spec > bestSpec || (spec === bestSpec && len > bestLen)) {
      best = p;
      bestSpec = spec;
      bestLen = len;
    }
  }
  if (best && !best.generic) return best;
  if (input.surgeryName) {
    const sp = rankPlans(input.surgeryName, REHAB_PLANS);
    if (sp && !sp.generic) return sp;
  }
  if (best) return best;
  // Domain fallback
  const domain = input.domain || inferDomain(condName, input);
  return DOMAIN_FALLBACK[domain] || DOMAIN_FALLBACK.msk || null;
}

export function inferDomain(
  name: string,
  input: ProgramCreationInput
): "msk" | "neuro" | "cardiac" | "pulmonary" {
  if (input.domain) return input.domain;
  const blob = [
    name,
    input.concernParagraph || "",
    input.pastMedicalHistory || "",
    input.currentMedicalHistory || "",
    ...(input.conditionNames || []),
  ]
    .join(" ")
    .toLowerCase();
  if (
    /stroke|parkinson|multiple sclerosis|\bms\b|spinal cord|sci\b|guillain|neuropathy|vestibular|tbi|concussion|hemipleg/.test(
      blob
    )
  )
    return "neuro";
  if (
    /heart|cardiac|cabg|pci|myocardial|angina|heart failure|cardiomyopath|valve|stent/.test(
      blob
    )
  )
    return "cardiac";
  if (
    /copd|pulmonary|asthma|interstitial|ild\b|pneumonia|respiratory|breathless|dyspnea/.test(
      blob
    )
  )
    return "pulmonary";
  return "msk";
}

/* -------------------------------------------------------------------------- */
/* Signature / RTS / sport / falls layers                                     */
/* -------------------------------------------------------------------------- */

export function detectFocus(name: string): InjuryFocusDef | null {
  const n = name || "";
  let best: InjuryFocusDef | null = null;
  let bestLen = 0;
  for (const f of INJURY_FOCUS) {
    const m = n.match(f.re);
    if (m && m[0].length > bestLen) {
      best = f;
      bestLen = m[0].length;
    }
  }
  return best;
}

function seedsFromAdds(
  adds: Array<{ p: number; n: string; d: string; c: string; tags?: string[] }>,
  phase1Based: number,
  source: ProgramExerciseSeed["source"]
): ProgramExerciseSeed[] {
  return adds
    .filter((a) => a.p === phase1Based)
    .map((a) => ({
      n: a.n,
      d: a.d,
      c: a.c,
      tags: a.tags,
      preferTags: a.tags,
      phase: phase1Based,
      source,
    }));
}

const RTS_LOWER =
  /knee|ankle|hip|foot|calf|thigh|lower limb|leg|acl|pcl|mcl|lcl|meniscus|hamstring|achilles|patell|groin|adductor|iliotibial|\bitb\b|quadric/i;
const RTS_DEGEN =
  /osteoarthritis|arthritis|replacement|arthroplasty|\btkr\b|\bthr\b|fracture|osteoporos|amputation|avascular|gout/i;
const RTS_SPORT =
  /acl|pcl|mcl|lcl|ligament|sprain|instab|meniscus|hamstring|calf (strain|tear)|gastroc|achilles tendinop|patell.*tendin|jumper|groin|adductor|iliotibial|\bitb\b|sport|athlet|return to (run|sport)/i;
const RTS_NO_WB =
  /charcot (foot|joint|arthropath|neuroarthropath)|neuroarthropath|acute compartment|fasciotomy|avascular necrosis|osteonecrosis|\bavn\b|non-?weight-?bearing|limb lengthening|external fixation|ilizarov|bone transport|osteomyelitis|unstable fracture|stress fracture (of the )?(femoral neck|navicular)/i;
const AGILITY_RICH = /knee_ligament|ankle|acl|ankle sprain|lateral ankle/i;

type LadderEx = { n: string; d: string; c: string; tags?: readonly string[] | string[] };
type LadderMap = Record<string, readonly LadderEx[] | LadderEx[]>;

function ladderPhase(
  ladder: LadderMap,
  phase1Based: number,
  source: ProgramExerciseSeed["source"]
): ProgramExerciseSeed[] {
  const items = (ladder[String(phase1Based)] || []) as LadderEx[];
  return items.map((a) => ({
    n: a.n,
    d: a.d,
    c: a.c,
    tags: a.tags ? [...a.tags] : undefined,
    preferTags: a.tags ? [...a.tags] : undefined,
    phase: phase1Based,
    source,
  }));
}

export function rtsFor(
  condName: string,
  phaseIdx0: number
): ProgramExerciseSeed[] {
  const phase = phaseIdx0 + 1;
  const name = condName || "";
  if (!RTS_LOWER.test(name) || RTS_DEGEN.test(name)) return [];
  if (!RTS_SPORT.test(name) && phase < 3) return [];
  const out = ladderPhase(BALANCE_LADDER as unknown as LadderMap, phase, "rts");
  if (AGILITY_RICH.test(name) || phase >= 3) {
    out.push(...ladderPhase(AGILITY_LADDER as unknown as LadderMap, phase, "rts"));
  }
  return out;
}

export function fallsFor(phaseIdx0: number): ProgramExerciseSeed[] {
  return ladderPhase(FALLS_LADDER as unknown as LadderMap, phaseIdx0 + 1, "falls");
}

export function sportFor(
  sportLabels: string[],
  phaseIdx0: number
): ProgramExerciseSeed[] {
  if (!sportLabels.length) return [];
  const blob = sportLabels.join(" ");
  const phase = phaseIdx0 + 1;
  const out: ProgramExerciseSeed[] = [];
  const seen = new Set<string>();
  for (const s of SPORT_DEMANDS) {
    if (!s.re.test(blob)) continue;
    for (const seed of seedsFromAdds(s.add, phase, "sport")) {
      const k = seed.n.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(seed);
    }
  }
  return out.slice(0, 3);
}

export function signatureFor(
  focus: InjuryFocusDef | null,
  phase1Based: number
): ProgramExerciseSeed[] {
  if (!focus) return [];
  return seedsFromAdds(focus.add, phase1Based, "signature");
}

/* -------------------------------------------------------------------------- */
/* Current phase from absolute weeks                                          */
/* -------------------------------------------------------------------------- */

export function currentPlanPhase(
  plan: ResolvedRehabPlan | null,
  weeksSince: number | null
): number {
  if (!plan?.ph?.length) return 0;
  if (weeksSince == null || Number.isNaN(weeksSince)) return 0;
  for (let i = 0; i < plan.ph.length; i++) {
    const [, start, end] = plan.ph[i]!;
    if (weeksSince >= start && weeksSince < end) return i;
    // last phase inclusive of end
    if (i === plan.ph.length - 1 && weeksSince >= start) return i;
  }
  // past end → last phase
  if (weeksSince >= plan.ph[plan.ph.length - 1]![2]) return plan.ph.length - 1;
  return 0;
}

/* -------------------------------------------------------------------------- */
/* Flags from PMH / meds / precautions (subset for program model)             */
/* -------------------------------------------------------------------------- */

const FLAG_PATTERNS: Array<[RegExp, string]> = [
  [/diabetes|diabetic/i, "diabetes"],
  [/osteoporos|low bone/i, "osteoporosis"],
  [/cardiac|heart disease|heart failure|angina|mi\b|cabg|pci/i, "cardiac"],
  [/copd|asthma|pulmonary fibrosis|interstitial lung/i, "pulmonary"],
  [/pacemaker|icd\b|defibrillator/i, "pacemaker_icd"],
  [/dvt|pe\b|blood thinner|anticoagul/i, "dvt"],
  [/hip replacement|tha\b/i, "hip_replacement"],
  [/knee replacement|tka\b|tkr\b/i, "knee_replacement"],
  [/hypermobil|heds|ehlers/i, "hypermobility"],
  [/balance|falls?|vertigo|dizzy/i, "balance_risk"],
  [/neuropathy|numbness|tingling/i, "neuropathy"],
  [/multiple sclerosis|\bms\b|parkinson|stroke|cva/i, "neuro_condition"],
  [/ckd|chronic kidney|renal failure/i, "ckd"],
  [/cancer|chemo|radiation/i, "cancer_treatment"],
  [/pregnant|postpartum/i, "pregnancy"],
  [/peripheral artery|pad\b|claudication/i, "pad"],
];

export function gatherProgramFlags(input: ProgramCreationInput): string[] {
  const flags = new Set(input.flags || []);
  const blob = [
    input.concernParagraph || "",
    input.pastMedicalHistory || "",
    input.currentMedicalHistory || "",
    input.surgeryName || "",
    ...input.conditionNames,
  ].join(" ");
  for (const [re, flag] of FLAG_PATTERNS) {
    if (re.test(blob)) flags.add(flag);
  }
  if (input.surgery || input.surgeryId) flags.add("recent_surgery");
  return Array.from(flags).sort();
}

/* -------------------------------------------------------------------------- */
/* Drift detection                                                            */
/* -------------------------------------------------------------------------- */

export function planDrift(
  builtFrom: BuiltFromFingerprint | undefined | null,
  now: { pain: number; flags: string[]; track?: TrackId }
): string[] | null {
  if (!builtFrom) return null;
  const out: string[] = [];
  const dp = Math.round((now.pain - builtFrom.pain) * 10) / 10;
  if (dp >= 2)
    out.push(
      `you're logging ${now.pain}/10 now — up ${dp} on the ${builtFrom.pain}/10 this plan was built for`
    );
  else if (dp <= -2)
    out.push(
      `you're logging ${now.pain}/10 now — down ${Math.abs(dp)} on the ${builtFrom.pain}/10 this plan was built for`
    );
  const had = new Set((builtFrom.flags || "").split(",").filter(Boolean));
  const added = now.flags.filter((f) => !had.has(f));
  if (added.length)
    out.push(
      `new precautions apply from what you've logged (${added.slice(0, 3).join(", ")})`
    );
  if (now.track && now.track !== builtFrom.track)
    out.push(`track shifted from ${builtFrom.track} to ${now.track}`);
  return out.length ? out : null;
}

/* -------------------------------------------------------------------------- */
/* Core: generateProgram                                                      */
/* -------------------------------------------------------------------------- */

export function createProgramCreationInputFromSymptom(
  input: SymptomInput
): ProgramCreationInput {
  const conds = getConditionsByIds(input.conditionIds || []);
  const surgery = input.surgeryId ? getSurgeryById(input.surgeryId) : undefined;
  const sports = (input.sportIds || [])
    .map((id) => getSportById(id))
    .filter(Boolean);
  const timeline = input.concernParagraph
    ? parseInjuryTimeline(input.concernParagraph)
    : null;
  const postOpWeeks = weeksSinceSurgery(input.surgeryDate);
  let weeks: number | null =
    postOpWeeks != null
      ? postOpWeeks
      : timeline?.approxWeeksSince != null
        ? timeline.approxWeeksSince
        : null;

  const painVals = Object.values(input.painLevels || {}).filter(
    (n): n is number => typeof n === "number"
  );
  const painMove =
    painVals.length > 0
      ? painVals.reduce((a, b) => a + b, 0) / painVals.length
      : 3;

  const medSummary =
    input.medications && input.medications.length
      ? summarizeUserMedications(input.medications)
      : null;
  const medFlags: string[] = [];
  if (medSummary?.steroidExposure) medFlags.push("corticosteroid");
  if (medSummary?.hrBlunting) medFlags.push("beta_blocker");
  if (medSummary?.bleedingRisk) medFlags.push("anticoagulant");

  const flags: string[] = [];
  for (const p of input.precautionIds || []) {
    if (/nwb|ttwb|pwb/i.test(p)) flags.push("recent_surgery");
    if (/sternal/i.test(p)) flags.push("cardiac");
    if (/fall/i.test(p)) flags.push("balance_risk");
  }

  const adlLimited = (input.adlEntries || [])
    .filter((e) => e.assistance && e.assistance !== "independent")
    .map((e) => e.label);

  let timePerDay: ProgramCreationInput["timePerDay"] = "20to40";
  if (input.availableMinutes < 10) timePerDay = "lt10";
  else if (input.availableMinutes <= 20) timePerDay = "10to20";
  else if (input.availableMinutes > 40) timePerDay = "gt40";

  const fitness =
    input.activityLevel === "high" || input.activityLevel === "athlete"
      ? "high"
      : input.activityLevel === "low" || input.activityLevel === "sedentary"
        ? "low"
        : "moderate";

  return {
    conditionNames: [
      ...conds.map((c) => c.label),
      surgery?.name || "",
      input.concernParagraph || "",
    ].filter(Boolean),
    conditionIds: input.conditionIds,
    weeksSinceOnset: weeks,
    painMove,
    ageYears: input.ageYears,
    fitness,
    surgery: Boolean(surgery || input.surgeryId || /surgery|post-?op|s\/p/i.test(input.concernParagraph || "")),
    surgeryName: surgery?.name,
    surgeryId: input.surgeryId,
    surgeryDate: input.surgeryDate,
    sportLabels: sports.map((s) => s!.name),
    sportIds: input.sportIds,
    timePerDay,
    flags,
    medFlags,
    homeBased: input.homeBasedProgram,
    concernParagraph: input.concernParagraph,
    pastMedicalHistory: input.pastMedicalHistory,
    currentMedicalHistory: input.currentMedicalHistory,
    adlLimited,
    returnSports: sports.map((s) => s!.name),
  };
}

/**
 * Full PhysioPath-style multi-phase program generation for MotionRx.
 */
export function generateProgram(input: ProgramCreationInput): MotionRxProgram {
  const flags = gatherProgramFlags(input);
  const track = classifyTrack(input.weeksSinceOnset);
  const tmpl = PROGRAM_TEMPLATE[track];
  const phaseWeeks = buildPhaseWeeks(track, {
    surgery: input.surgery,
    painMove: input.painMove,
    fitness: input.fitness,
  });

  const primaryName =
    input.conditionNames.find((n) => n && n.length > 3) ||
    input.surgeryName ||
    input.concernParagraph?.slice(0, 80) ||
    "general recovery";

  const basePlan = detectPlan(primaryName, input);
  const variant = basePlan
    ? selectedVariant(basePlan, primaryName, { ...input, flags })
    : null;
  const plan = basePlan
    ? applyVariant(basePlan, variant, { ...input, flags })
    : null;

  // weeks for current phase: post-op weeks or onset weeks
  let weeksCursor = input.weeksSinceOnset;
  if (weeksCursor == null && input.surgeryDate) {
    weeksCursor = weeksSinceSurgery(input.surgeryDate);
  }
  const curPhase = currentPlanPhase(plan, weeksCursor);
  const focus = detectFocus(primaryName);

  const domain = inferDomain(primaryName, input);
  const phases: ProgramPhase[] = [];
  const allSeeds: ProgramExerciseSeed[] = [];
  let cursor = 1;

  const phaseCount = plan?.ph?.length || tmpl.phases.length;
  for (let p = 0; p < phaseCount; p++) {
    const len = phaseWeeks[p] ?? phaseWeeks[phaseWeeks.length - 1] ?? 3;
    const wkStart = plan?.ph?.[p] ? plan.ph[p]![1] : cursor;
    const wkEnd = plan?.ph?.[p] ? plan.ph[p]![2] : cursor + len - 1;
    if (!plan?.ph?.[p]) cursor = wkEnd + 1;

    const phase1 = p + 1;
    const sigRaw: ProgramExerciseSeed[] = [
      ...signatureFor(focus, phase1),
      ...rtsFor(primaryName, p),
      ...sportFor(input.sportLabels || input.returnSports || [], p),
      ...(!RTS_NO_WB.test(primaryName) ? fallsFor(p) : []),
    ];
    // ADL practice on later phases
    if ((input.adlLimited || []).length && p >= 1) {
      for (const adl of (input.adlLimited || []).slice(0, 2)) {
        sigRaw.push({
          n: `Task practice: ${adl}`,
          d: "3–5 controlled reps",
          c: "Practise the real task with safe form — this is function, not just exercise",
          phase: phase1,
          source: "adl",
          preferTags: ["functional", "adl"],
        });
      }
    }

    const seen = new Set<string>();
    const seeds: ProgramExerciseSeed[] = [];
    for (const s of sigRaw) {
      const k = s.n.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      seeds.push(s);
    }
    allSeeds.push(...seeds);

    const pl = plan?.ph?.[p];
    const criteria =
      pl?.[4] ||
      (PHASE_CRITERIA[track] || PHASE_CRITERIA.acute)[p] ||
      "symptoms controlled and criteria met";

    phases.push({
      index: p,
      title: pl ? pl[0] : tmpl.phases[p]?.title || `Phase ${phase1}`,
      goal: pl ? pl[3] : tmpl.phases[p]?.goal || "",
      weekStart: wkStart,
      weekEnd: wkEnd,
      criteria,
      restrict: pl ? pl[5] : "",
      current: p === curPhase,
      seeds,
      targetCount: phaseTarget(p, input.timePerDay),
    });
  }

  const currentSeeds = phases[curPhase]?.seeds || [];
  const preferTags = Array.from(
    new Set(
      currentSeeds.flatMap((s) => [
        ...(s.tags || []),
        ...(s.preferTags || []),
        s.source,
      ])
    )
  );
  const avoidHints: string[] = [];
  for (const ph of phases) {
    if (ph.restrict) avoidHints.push(ph.restrict);
  }

  const notes: string[] = [];
  if (plan?.note) notes.push(plan.note);
  if (focus?.focus) notes.push(focus.focus);
  if (input.surgery) {
    notes.push(
      "Surgical / post-op context: your surgeon’s written protocol always overrides this educational timeline."
    );
  }

  const clearance =
    flags.includes("cardiac") ||
    flags.includes("dvt") ||
    flags.includes("recent_surgery") ||
    Boolean(input.surgery);
  let supervision: MotionRxProgram["supervision"] = "self";
  if (clearance || flags.includes("pulmonary")) supervision = "supervised";
  if (flags.includes("cardiac") || flags.includes("dvt")) supervision = "clinical";

  const totalWeeks = plan?.total ?? tmpl.total;
  const sessions =
    plan?.freq ||
    sessionsText(track, { painMove: input.painMove, fitness: input.fitness });
  const load = loadGuidance(input.painMove);

  const builtFrom: BuiltFromFingerprint = {
    pain: Math.round(input.painMove * 10) / 10,
    flags: flags.slice().sort().join(","),
    track,
    planLabel: plan?.label || tmpl.focus,
    variantKey: plan?.variant?.k || "standard",
    weeksSinceOnset: input.weeksSinceOnset,
  };

  const summaryLines = [
    `${track === "acute" ? "Acute" : "Chronic"} track · ${totalWeeks}-week educational program`,
    plan
      ? `Timeline: ${plan.label}${plan.variant ? ` (${plan.variant.label})` : ""}`
      : `Generic ${domain} template`,
    `Current phase ${curPhase + 1}/${phases.length}: ${phases[curPhase]?.title || "—"} (weeks ${phases[curPhase]?.weekStart}–${phases[curPhase]?.weekEnd})`,
    `Sessions: ${sessions}`,
    focus?.focus ? `Injury focus: ${focus.focus.slice(0, 120)}…` : "",
  ].filter(Boolean);

  const evidenceNotes = [
    plan?.note || tmpl.focus,
    "Progression is criteria-based where listed — calendar weeks are educational scaffolding, not a hard deadline.",
    "Surgeon / PT protocol always supersedes this model.",
  ].filter(Boolean);

  return {
    track,
    totalWeeks,
    sessions,
    load,
    focus: plan?.label || tmpl.focus,
    plan,
    phases,
    currentPhaseIndex: curPhase,
    injuryFocusNote: focus?.focus || "",
    notes,
    clearance,
    supervision,
    domain,
    allSeeds,
    preferTags,
    avoidHints,
    builtFrom,
    summaryLines,
    evidenceNotes,
  };
}

/**
 * Map program seeds into prefer/avoid tags for the hybrid HEP scorer.
 */
export function programHintsForScoring(program: MotionRxProgram): {
  preferTags: string[];
  avoidTags: string[];
  preferredNames: string[];
  minutesScale: number;
  maxDifficulty: "beginner" | "intermediate" | "advanced";
  summaryLines: string[];
  evidenceNotes: string[];
} {
  const cur = program.phases[program.currentPhaseIndex];
  const preferredNames = (cur?.seeds || []).map((s) => s.n);
  const preferTags = Array.from(
    new Set([
      ...program.preferTags,
      ...(cur?.seeds || []).flatMap((s) => s.tags || []),
      program.track === "acute" && program.currentPhaseIndex === 0
        ? "gentle"
        : "progressive",
    ])
  );
  const avoidTags: string[] = [];
  if (program.currentPhaseIndex <= 1) {
    avoidTags.push("plyo", "impact", "heavy-load", "jump");
  }
  if (program.clearance) {
    avoidTags.push("high-intensity");
  }
  const minutesScale =
    program.currentPhaseIndex === 0
      ? 0.85
      : program.currentPhaseIndex >= 3
        ? 1.05
        : 1;
  const maxDifficulty =
    program.currentPhaseIndex === 0
      ? "beginner"
      : program.currentPhaseIndex >= 3
        ? "advanced"
        : "intermediate";

  return {
    preferTags,
    avoidTags,
    preferredNames,
    minutesScale,
    maxDifficulty,
    summaryLines: program.summaryLines,
    evidenceNotes: program.evidenceNotes,
  };
}

/**
 * Build a human-readable multi-phase program section for prescribed plans / UI.
 */
export function formatProgramPhasesText(program: MotionRxProgram): string {
  const lines: string[] = [
    `PROGRAM MODEL (${program.track} track · ${program.totalWeeks} weeks)`,
    program.plan
      ? `Matched timeline: ${program.plan.label}${
          program.plan.variant ? ` — ${program.plan.variant.label}` : ""
        }`
      : "Generic phase template",
    `Frequency: ${program.sessions}`,
    `Load guidance: ${program.load}`,
    `Supervision: ${program.supervision}${program.clearance ? " (clearance-sensitive)" : ""}`,
    "",
  ];
  for (const ph of program.phases) {
    lines.push(
      `Phase ${ph.index + 1}: ${ph.title} (weeks ${ph.weekStart}–${ph.weekEnd})${
        ph.current ? "  ← current" : ""
      }`
    );
    if (ph.goal) lines.push(`  Goal: ${ph.goal}`);
    if (ph.criteria) lines.push(`  Advance when: ${ph.criteria}`);
    if (ph.restrict) lines.push(`  Restrictions: ${ph.restrict}`);
    if (ph.seeds.length) {
      lines.push(`  Signature / layered work:`);
      for (const s of ph.seeds.slice(0, 8)) {
        lines.push(`    • ${s.n} — ${s.d}${s.c ? ` (${s.c})` : ""} [${s.source}]`);
      }
    }
    lines.push("");
  }
  if (program.notes.length) {
    lines.push("Notes:");
    program.notes.slice(0, 4).forEach((n) => lines.push(`  • ${n}`));
  }
  return lines.join("\n");
}

/** Convenience: attach program seeds as synthetic routine notes items (not catalog IDs). */
export function programSeedNotes(program: MotionRxProgram): string[] {
  const cur = program.phases[program.currentPhaseIndex];
  return (cur?.seeds || []).map(
    (s) => `${s.n} — ${s.d}${s.c ? ` · ${s.c}` : ""} (${s.source})`
  );
}

export function programPhaseItemsAsNotes(
  program: MotionRxProgram
): Array<{ id: string; text: string }> {
  const cur = program.phases[program.currentPhaseIndex];
  return (cur?.seeds || []).map((s) => ({
    id: uuid(),
    text: `${s.n} — ${s.d}`,
  }));
}
