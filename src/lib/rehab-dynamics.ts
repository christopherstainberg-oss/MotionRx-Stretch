/**
 * Evidence-informed rehab dynamics + intelligent recovery program generation.
 *
 * Upgrades plan/builder engines with:
 * - Tissue stage & irritability dosing (acute → remodeling → capacity)
 * - Mechanism detection (tendon, muscle, joint, nerve, ligament, bone, overuse…)
 * - Kinetic-chain partners (e.g. knee → hip/ankle control)
 * - Multi-issue prioritization (primary complaint first, secondary coverage)
 * - Minimal-effective-dose selection (high-value multi-purpose moves, diversity)
 * - Functional task matching (stairs, desk, gait, lift, overhead, balance)
 *
 * Educational only — not diagnosis, prognosis as clinical fact, or a substitute
 * for licensed care. Surgeon/PT protocols always override.
 */

import type { BodyPart, Difficulty, MovementKind, SymptomInput } from "@/lib/types";
import type { ClinicalRehabPlan, RehabPhase } from "@/lib/clinical-rehab-intel";
import { parseInjuryTimeline, type InjuryTimeline } from "@/lib/injury-timeline";
import type { StoryIntelligence } from "@/lib/story-intelligence";
import { getSurgeryById, weeksSinceSurgery } from "@/data/surgeries";
import { summarizeConditions } from "@/data/clinical-conditions";

/** Tissue / load-management stage driving exercise selection */
export type TissueStage =
  | "inflammatory" // 0–~2 weeks: protect, calm, gentle motion
  | "proliferative" // ~2–6 weeks: restore motion, light load
  | "remodeling" // ~6–12+ weeks: progressive loading
  | "chronic-capacity" // >3 months: capacity, graded exposure, deconditioning
  | "post-op-protect" // early post-op educational protection window
  | "unknown";

export type PrognosisBand =
  | "short" // often days–few weeks with consistent dosing
  | "moderate" // often 4–12 weeks
  | "extended" // months; criteria-based
  | "chronic-management" // long-term self-management focus
  | "post-op-protocol" // defer timeline to surgical team
  | "unclear";

/** Dominant tissue / mechanism hypothesis for selection (educational) */
export type TissueMechanism =
  | "tendon-load" // tendinopathy / overload tendons
  | "muscle-strain" // contractile unit strain
  | "joint-irritable" // OA, meniscus, PFPS, capsular irritation
  | "nerve-sensitive" // radicular / neural sensitivity
  | "ligament-protect" // sprain / instability early
  | "bone-protect" // fracture / stress injury caution
  | "stiffness-mobility" // ROM loss dominant
  | "overuse-posture" // desk / repetitive posture load
  | "post-op" // surgical protocol window
  | "deconditioning" // general capacity deficit
  | "balance-falls" // fall risk / proprioception
  | "mixed";

export type RehabDynamics = {
  tissueStage: TissueStage;
  phase: RehabPhase;
  prognosisBand: PrognosisBand;
  /** Ranked mechanisms (primary first) */
  mechanisms: TissueMechanism[];
  primaryMechanism: TissueMechanism;
  /** Educational outlook lines (not a personal prognosis) */
  prognosisLines: string[];
  /** Evidence themes used for selection */
  evidenceLines: string[];
  /** Summary for UI / plan narrative */
  summaryLines: string[];
  /** Efficiency / algorithm notes for UI */
  efficiencyLines: string[];
  preferTags: string[];
  avoidTags: string[];
  preferredStretchIds: string[];
  preferredExerciseIds: string[];
  /** Kinetic-chain partner regions for soft scoring */
  chainAreas: BodyPart[];
  /** Primary issue regions (pain-weighted) */
  primaryAreas: BodyPart[];
  /** Secondary regions to cover lightly */
  secondaryAreas: BodyPart[];
  maxDifficulty: Difficulty;
  minutesScale: number;
  stretchBias: number;
  exerciseBias: number;
  /** Soft boost for movements matching evidence priorities */
  priorityBoostTags: string[];
  /** Target stretch:exercise balance for efficient recovery */
  stretchQuotaHint: number;
  exerciseQuotaHint: number;
  /** Weeks since onset when known */
  weeksSince?: number;
  postOpWeeks?: number | null;
  /** Algorithm intelligence version */
  intelligenceVersion: number;
};

const PHASE_ORDER: RehabPhase[] = [
  "protect-calm",
  "mobility-restore",
  "motor-control",
  "capacity-load",
  "function-return",
];

function moreProtective(a: RehabPhase, b: RehabPhase): RehabPhase {
  return PHASE_ORDER.indexOf(a) <= PHASE_ORDER.indexOf(b) ? a : b;
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

function uniqueBp(arr: BodyPart[]): BodyPart[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

/** Stable variety seed from free-text (same story → same order; different stories → different near-tie picks). */
export function varietyOffset(text: string, salt = 0): number {
  const s = `${text || ""}\0${salt}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

/**
 * Among near-equal top scores, rotate which candidate wins so programs are more versatile
 * while staying clinically ranked.
 */
export function applyVarietyBand<T extends { score: number; id: string }>(
  ranked: T[],
  seed: number,
  band = 8
): T[] {
  if (ranked.length <= 1) return ranked;
  const top = ranked[0]!.score;
  const near: T[] = [];
  const rest: T[] = [];
  for (const r of ranked) {
    if (top - r.score <= band) near.push(r);
    else rest.push(r);
  }
  if (near.length <= 1) return ranked;
  const start = seed % near.length;
  const rotated = [...near.slice(start), ...near.slice(0, start)];
  return [...rotated, ...rest];
}

/**
 * Map healing time + irritability → tissue stage (educational synthesis).
 */
export function resolveTissueStage(opts: {
  weeksSince?: number | null;
  postOpWeeks?: number | null;
  protectWeeksTypical?: number;
  irritability?: StoryIntelligence["irritability"];
  activityResponse?: StoryIntelligence["activityResponse"];
  avgPain: number;
  clearanceRequired?: boolean;
  mechanisms?: TissueMechanism[];
}): TissueStage {
  const {
    weeksSince,
    postOpWeeks,
    protectWeeksTypical = 6,
    irritability,
    activityResponse,
    avgPain,
    clearanceRequired,
    mechanisms = [],
  } = opts;

  if (
    clearanceRequired ||
    mechanisms.includes("post-op") ||
    (postOpWeeks != null && postOpWeeks < protectWeeksTypical)
  ) {
    return "post-op-protect";
  }

  // Bone / early ligament: stay protective longer
  if (
    (mechanisms.includes("bone-protect") || mechanisms.includes("ligament-protect")) &&
    (weeksSince == null || weeksSince < 6)
  ) {
    return weeksSince != null && weeksSince < 2 ? "inflammatory" : "proliferative";
  }

  if (irritability === "high" || activityResponse === "delayed-worse" || avgPain >= 7) {
    if (weeksSince == null || weeksSince <= 12) return "inflammatory";
  }

  if (weeksSince == null || !Number.isFinite(weeksSince)) return "unknown";
  if (weeksSince < 2) return "inflammatory";
  if (weeksSince < 6) return "proliferative";
  if (weeksSince < 12) return "remodeling";
  return "chronic-capacity";
}

export function stageToPhase(stage: TissueStage, base: RehabPhase): RehabPhase {
  switch (stage) {
    case "inflammatory":
    case "post-op-protect":
      return "protect-calm";
    case "proliferative":
      return moreProtective(base, "mobility-restore");
    case "remodeling":
      return moreProtective(base, "motor-control");
    case "chronic-capacity":
      if (base === "protect-calm") return "motor-control";
      return base;
    default:
      return base;
  }
}

export function resolvePrognosisBand(
  stage: TissueStage,
  opts: {
    patterns: string[];
    clearanceRequired?: boolean;
    chronicLanguage?: boolean;
    mechanisms?: TissueMechanism[];
  }
): PrognosisBand {
  if (stage === "post-op-protect" || opts.clearanceRequired) return "post-op-protocol";
  if (opts.mechanisms?.includes("bone-protect")) return "extended";
  if (opts.mechanisms?.includes("tendon-load") && stage !== "inflammatory") return "moderate";
  if (opts.chronicLanguage || stage === "chronic-capacity") return "chronic-management";
  if (stage === "inflammatory") return "short";
  if (stage === "proliferative") return "moderate";
  if (stage === "remodeling") return "moderate";
  if (/post-op|ligament|tendon|fracture/.test(opts.patterns.join(" "))) return "extended";
  return "unclear";
}

const PROGNOSIS_COPY: Record<PrognosisBand, string[]> = {
  short: [
    "Many irritable soft-tissue presentations settle substantially over days to a few weeks when load is paced and motion is kept gentle but regular.",
    "Track a daily task (0–10 ease) and 24-hour symptom response more than calendar dates.",
  ],
  moderate: [
    "Many outpatient mobility and strength goals show meaningful change over ~4–12 weeks of consistent, tolerable dosing.",
    "Progress when pain rises ≤2/10 during work and settles by the next day; ease 30–50% if worse >24h.",
  ],
  extended: [
    "Tissue remodeling and return-to-load often take months; criteria (control, strength, confidence) matter more than fixed weeks.",
    "Avoid sudden spikes in volume/intensity—tendon, graft, and bone timelines are load-sensitive.",
  ],
  "chronic-management": [
    "Longer-standing problems often improve with graded exposure, strength capacity, sleep/stress load management—not more complete rest.",
    "Aim for function and flare resilience over chasing zero pain.",
  ],
  "post-op-protocol": [
    "Post-operative timelines are protocol-specific; your surgeon/PT orders override app education.",
    "Early phases emphasize protection, swelling control, and permitted motion only.",
  ],
  unclear: [
    "Without a clear onset window, dosing follows irritability and 24-hour response rather than assumed tissue stage.",
  ],
};

/** Stage-specific evidence tags for movement scoring */
const STAGE_EVIDENCE: Record<
  TissueStage,
  {
    preferTags: string[];
    avoidTags: string[];
    stretchIds: string[];
    exerciseIds: string[];
    stretchBias: number;
    exerciseBias: number;
    minutesScale: number;
    maxDifficulty: Difficulty;
    evidence: string[];
  }
> = {
  inflammatory: {
    preferTags: ["gentle", "isometric", "activation", "mobility", "protected", "pain-free-range"],
    avoidTags: ["plyo", "impact", "heavy-load", "jump", "end-range-aggressive", "twist-aggressive"],
    stretchIds: ["cat-cow", "pelvic-tilt", "ankle-alphabet", "chin-tuck"],
    exerciseIds: ["ex-quad-set", "ex-glute-bridge", "ex-dead-bug", "ex-scapular-rows-band"],
    stretchBias: 0.55,
    exerciseBias: 0.4,
    minutesScale: 0.75,
    maxDifficulty: "beginner",
    evidence: [
      "Early phase: relative protection + frequent short motion bouts; avoid aggressive end-range and impact.",
      "Isometrics and gentle activation often calm irritable tissue better than complete rest.",
    ],
  },
  proliferative: {
    preferTags: ["mobility", "motor-control", "activation", "closed-chain-gentle", "ROM"],
    avoidTags: ["plyo", "impact", "heavy-load", "jump"],
    stretchIds: ["cat-cow", "open-book-thoracic", "half-kneeling-hip-flexor", "supine-hamstring-strap"],
    exerciseIds: ["ex-glute-bridge", "ex-bird-dog", "ex-sit-to-stand", "ex-terminal-knee-extension"],
    stretchBias: 0.4,
    exerciseBias: 0.5,
    minutesScale: 0.9,
    maxDifficulty: "beginner",
    evidence: [
      "Proliferative window: restore comfortable range, re-educate control, introduce light graded load.",
      "Closed-chain and motor-control drills often preferred before open-chain heavy loading.",
    ],
  },
  remodeling: {
    preferTags: ["strength", "motor-control", "functional", "progressive", "endurance"],
    avoidTags: ["plyo-early"],
    stretchIds: ["figure-four-glute", "doorway-chest-stretch", "cat-cow"],
    exerciseIds: [
      "ex-sit-to-stand",
      "ex-hip-hinge-dowel",
      "ex-step-up",
      "ex-scapular-rows-band",
      "ex-heel-raises",
    ],
    stretchBias: 0.28,
    exerciseBias: 0.65,
    minutesScale: 1,
    maxDifficulty: "intermediate",
    evidence: [
      "Remodeling: progressive resistance and functional task practice drive capacity.",
      "Load increases of roughly ~10%/week are a common educational pacing heuristic when symptoms stay green.",
    ],
  },
  "chronic-capacity": {
    preferTags: ["strength", "functional", "graded-exposure", "motor-control", "endurance", "balance"],
    avoidTags: [],
    stretchIds: ["cat-cow", "childs-pose", "open-book-thoracic", "half-kneeling-hip-flexor"],
    exerciseIds: [
      "ex-sit-to-stand",
      "ex-hip-hinge-dowel",
      "ex-bird-dog",
      "ex-glute-bridge",
      "ex-tandem-balance",
    ],
    stretchBias: 0.22,
    exerciseBias: 0.7,
    minutesScale: 1.05,
    maxDifficulty: "intermediate",
    evidence: [
      "Chronic presentations: progressive loading and graded exposure outperform prolonged rest for most MSK pain.",
      "Build self-efficacy with meaningful tasks; monitor delayed symptom response (next-day flare).",
    ],
  },
  "post-op-protect": {
    preferTags: ["gentle", "protected", "isometric", "activation", "home", "walking"],
    avoidTags: ["plyo", "impact", "heavy-load", "jump", "twist-aggressive", "overhead-aggressive"],
    stretchIds: ["ankle-alphabet", "cat-cow", "chin-tuck", "pelvic-tilt"],
    exerciseIds: ["ex-quad-set", "ex-glute-bridge", "ex-dead-bug", "ex-scapular-rows-band"],
    stretchBias: 0.5,
    exerciseBias: 0.4,
    minutesScale: 0.7,
    maxDifficulty: "beginner",
    evidence: [
      "Post-op educational default: protect the repair, control swelling, use only permitted motions.",
      "Your written surgical/PT protocol always supersedes catalog defaults.",
    ],
  },
  unknown: {
    preferTags: ["gentle", "motor-control", "mobility", "activation", "functional"],
    avoidTags: ["plyo", "heavy-load", "impact"],
    stretchIds: ["cat-cow", "chin-tuck", "pelvic-tilt"],
    exerciseIds: ["ex-glute-bridge", "ex-bird-dog", "ex-sit-to-stand"],
    stretchBias: 0.35,
    exerciseBias: 0.45,
    minutesScale: 0.9,
    maxDifficulty: "beginner",
    evidence: [
      "Onset unclear: dose by irritability and 24h response; start moderate-volume and adjust.",
    ],
  },
};

/**
 * Mechanism-first protocols — highest leverage educational first-line choices.
 * Bias: few high-value movements that accelerate recovery path (not long stretch lists).
 */
const MECHANISM_PROTOCOL: Record<
  TissueMechanism,
  {
    preferTags: string[];
    avoidTags: string[];
    stretchIds: string[];
    exerciseIds: string[];
    stretchBias: number;
    exerciseBias: number;
    evidence: string;
  }
> = {
  "tendon-load": {
    preferTags: ["isometric", "strength", "tendon", "heavy-slow", "progressive", "closed-chain"],
    avoidTags: ["ballistic", "plyo", "sprint", "end-range-aggressive"],
    stretchIds: ["gastroc-wall", "supine-hamstring-strap", "doorway-chest-stretch"],
    exerciseIds: ["ex-heel-raises", "ex-wall-sit", "ex-shoulder-er-band", "ex-sit-to-stand"],
    stretchBias: 0.2,
    exerciseBias: 0.75,
    evidence:
      "Tendon: progressive loading (isometrics → heavy-slow → energy storage) outperforms passive stretch alone.",
  },
  "muscle-strain": {
    preferTags: ["isometric", "activation", "gentle", "motor-control", "progressive"],
    avoidTags: ["ballistic", "sprint", "endrange-hamstring-stretch", "plyo"],
    stretchIds: ["supine-hamstring-strap", "half-kneeling-hip-flexor", "cat-cow"],
    exerciseIds: ["ex-glute-bridge", "ex-bird-dog", "ex-hip-hinge-dowel", "ex-quad-set"],
    stretchBias: 0.35,
    exerciseBias: 0.55,
    evidence:
      "Muscle strain: early gentle activation and progressive load; avoid aggressive end-range stretch early.",
  },
  "joint-irritable": {
    preferTags: ["closed-chain-gentle", "isometric", "motor-control", "quad", "glute", "gentle"],
    avoidTags: ["deep-squat", "twist", "impact", "plyo", "jump"],
    stretchIds: ["supine-hamstring-strap", "quad-standing", "cat-cow", "childs-pose"],
    exerciseIds: ["ex-quad-set", "ex-terminal-knee-extension", "ex-glute-bridge", "ex-sit-to-stand"],
    stretchBias: 0.35,
    exerciseBias: 0.55,
    evidence:
      "Joint irritability: short arc / isometrics and control before deep loaded compression or twist.",
  },
  "nerve-sensitive": {
    preferTags: ["gentle", "motor-control", "core", "neural-gentle", "protected"],
    avoidTags: ["neural-aggressive", "end-range", "ballistic", "plyo", "sit-up"],
    stretchIds: ["cat-cow", "pelvic-tilt", "chin-tuck", "childs-pose"],
    exerciseIds: ["ex-bird-dog", "ex-dead-bug", "ex-glute-bridge"],
    stretchBias: 0.45,
    exerciseBias: 0.45,
    evidence:
      "Neural sensitivity: calm volume, gentle motion, motor control; avoid aggressive neural tension early.",
  },
  "ligament-protect": {
    preferTags: ["isometric", "activation", "closed-chain-gentle", "proprioception", "protected"],
    avoidTags: ["cutting", "twist", "plyo", "jump", "pivot"],
    stretchIds: ["ankle-alphabet", "quad-standing", "supine-hamstring-strap"],
    exerciseIds: ["ex-quad-set", "ex-terminal-knee-extension", "ex-heel-raises", "ex-tandem-balance"],
    stretchBias: 0.3,
    exerciseBias: 0.6,
    evidence:
      "Ligament/sprain: protect instability directions; rebuild proprioception and supporting muscle early.",
  },
  "bone-protect": {
    preferTags: ["gentle", "protected", "isometric", "non-impact", "activation"],
    avoidTags: ["impact", "jump", "plyo", "twist-aggressive", "heavy-load"],
    stretchIds: ["ankle-alphabet", "cat-cow", "chin-tuck"],
    exerciseIds: ["ex-quad-set", "ex-glute-bridge", "ex-dead-bug"],
    stretchBias: 0.4,
    exerciseBias: 0.4,
    evidence:
      "Bone/stress injury education: protect impact; licensed protocol governs loading timeline.",
  },
  "stiffness-mobility": {
    preferTags: ["mobility", "ROM", "gentle", "motor-control", "extension"],
    avoidTags: ["plyo", "heavy-load"],
    stretchIds: [
      "cat-cow",
      "open-book-thoracic",
      "half-kneeling-hip-flexor",
      "doorway-chest-stretch",
      "supine-hamstring-strap",
    ],
    exerciseIds: ["ex-bird-dog", "ex-glute-bridge", "ex-thoracic-extension-foam", "ex-sit-to-stand"],
    stretchBias: 0.55,
    exerciseBias: 0.4,
    evidence:
      "Stiffness-dominant: restore comfortable range, then immediately train control in new range.",
  },
  "overuse-posture": {
    preferTags: ["posture", "scapular", "thoracic", "desk", "endurance", "motor-control"],
    avoidTags: ["plyo", "overhead-aggressive", "heavy-load"],
    stretchIds: ["chin-tuck", "doorway-chest-stretch", "open-book-thoracic", "upper-trap-stretch"],
    exerciseIds: ["ex-scapular-rows-band", "ex-thoracic-extension-foam", "ex-serratus-punch"],
    stretchBias: 0.4,
    exerciseBias: 0.55,
    evidence:
      "Posture/overuse: thoracic + scapular endurance and work-rest microbreaks beat stretch-only programs.",
  },
  "post-op": {
    preferTags: ["gentle", "protected", "isometric", "activation", "home"],
    avoidTags: ["plyo", "impact", "heavy-load", "jump", "twist-aggressive"],
    stretchIds: ["ankle-alphabet", "pelvic-tilt", "chin-tuck", "cat-cow"],
    exerciseIds: ["ex-quad-set", "ex-glute-bridge", "ex-dead-bug", "ex-scapular-rows-band"],
    stretchBias: 0.5,
    exerciseBias: 0.4,
    evidence: "Post-op: permitted motion only; surgeon/PT protocol is the source of truth.",
  },
  deconditioning: {
    preferTags: ["functional", "endurance", "activation", "strength", "sit-to-stand"],
    avoidTags: ["plyo", "max-strength"],
    stretchIds: ["cat-cow", "half-kneeling-hip-flexor", "doorway-chest-stretch"],
    exerciseIds: ["ex-sit-to-stand", "ex-glute-bridge", "ex-scapular-rows-band", "ex-wall-pushup"],
    stretchBias: 0.25,
    exerciseBias: 0.7,
    evidence:
      "Deconditioning: short, frequent functional strength sessions rebuild capacity faster than long stretch routines.",
  },
  "balance-falls": {
    preferTags: ["balance", "proprioception", "functional", "hip", "supported"],
    avoidTags: ["plyo", "jump", "unstable-surface-advanced"],
    stretchIds: ["ankle-alphabet", "cat-cow", "half-kneeling-hip-flexor"],
    exerciseIds: ["ex-sit-to-stand", "ex-tandem-balance", "ex-heel-raises", "ex-glute-bridge"],
    stretchBias: 0.25,
    exerciseBias: 0.7,
    evidence:
      "Fall risk: progressive static→dynamic balance + hip/ankle strength with safe support options.",
  },
  mixed: {
    preferTags: ["motor-control", "functional", "gentle", "mobility"],
    avoidTags: ["plyo", "impact"],
    stretchIds: ["cat-cow", "chin-tuck", "pelvic-tilt"],
    exerciseIds: ["ex-glute-bridge", "ex-bird-dog", "ex-sit-to-stand"],
    stretchBias: 0.35,
    exerciseBias: 0.5,
    evidence: "Mixed presentation: protect irritability first, then multi-system control + function.",
  },
};

/** Kinetic chain partners — cover upstream/downstream without diluting primary focus */
const KINETIC_CHAIN: Partial<Record<BodyPart, BodyPart[]>> = {
  knee: ["hips", "glutes", "ankles", "quadriceps", "hamstrings"],
  "lower-back": ["hips", "glutes", "core", "thoracic", "hamstrings"],
  neck: ["thoracic", "shoulders", "scapular", "upper-back"],
  shoulders: ["scapular", "thoracic", "neck", "chest"],
  hips: ["glutes", "lower-back", "core", "hamstrings", "knee"],
  ankles: ["calves", "foot", "knee", "hips"],
  foot: ["ankles", "calves"],
  thoracic: ["neck", "shoulders", "scapular", "chest"],
  "upper-back": ["thoracic", "scapular", "neck"],
  hamstrings: ["hips", "glutes", "lower-back", "knee"],
  glutes: ["hips", "lower-back", "core"],
  core: ["lower-back", "hips", "pelvis"],
  pelvis: ["lower-back", "hips", "core"],
  scapular: ["shoulders", "thoracic", "neck"],
  calves: ["ankles", "foot", "knee"],
  chest: ["shoulders", "thoracic"],
};

const REGION_SEEDS: Partial<
  Record<BodyPart, { stretches: string[]; exercises: string[]; tags: string[] }>
> = {
  "lower-back": {
    stretches: [
      "cat-cow",
      "knee-to-chest",
      "childs-pose",
      "pelvic-tilt",
      "figure-four-glute",
      "open-book-thoracic",
    ],
    exercises: [
      "ex-bird-dog",
      "ex-dead-bug",
      "ex-glute-bridge",
      "ex-hip-hinge-dowel",
      "ex-side-lying-abduction",
      "ex-sit-to-stand",
    ],
    tags: ["lumbar", "core", "glute", "motor-control"],
  },
  neck: {
    stretches: [
      "chin-tuck",
      "upper-trap-stretch",
      "open-book-thoracic",
      "doorway-chest-stretch",
      "levator-scapulae-stretch",
    ],
    exercises: [
      "ex-cervical-isometrics",
      "ex-scapular-rows-band",
      "ex-thoracic-extension-foam",
      "ex-serratus-punch",
    ],
    tags: ["cervical", "posture", "scapular"],
  },
  shoulders: {
    stretches: [
      "doorway-chest-stretch",
      "upper-trap-stretch",
      "open-book-thoracic",
      "thread-the-needle",
    ],
    exercises: [
      "ex-scapular-rows-band",
      "ex-serratus-punch",
      "ex-shoulder-er-band",
      "ex-wall-pushup",
    ],
    tags: ["shoulder", "scapular", "rotator-cuff"],
  },
  knee: {
    stretches: ["supine-hamstring-strap", "quad-standing", "half-kneeling-hip-flexor", "figure-four-glute"],
    exercises: [
      "ex-quad-set",
      "ex-terminal-knee-extension",
      "ex-sit-to-stand",
      "ex-glute-bridge",
      "ex-side-lying-abduction",
      "ex-step-up",
      "ex-heel-raises",
    ],
    tags: ["knee", "quad", "closed-chain-gentle"],
  },
  hips: {
    stretches: [
      "half-kneeling-hip-flexor",
      "figure-four-glute",
      "supine-hamstring-strap",
      "cat-cow",
    ],
    exercises: [
      "ex-glute-bridge",
      "ex-side-lying-abduction",
      "ex-sit-to-stand",
      "ex-hip-hinge-dowel",
      "ex-bird-dog",
    ],
    tags: ["hip", "glute"],
  },
  ankles: {
    stretches: ["ankle-alphabet", "plantar-fascia-wall", "gastroc-wall", "soleus-wall"],
    exercises: [
      "ex-heel-raises",
      "ex-tandem-balance",
      "ex-ankle-alphabet-strength",
      "ex-short-foot",
      "ex-sit-to-stand",
    ],
    tags: ["ankle", "balance", "proprioception"],
  },
  thoracic: {
    stretches: ["open-book-thoracic", "cat-cow", "doorway-chest-stretch"],
    exercises: ["ex-thoracic-extension-foam", "ex-scapular-rows-band"],
    tags: ["thoracic", "posture", "extension"],
  },
  "upper-back": {
    stretches: ["open-book-thoracic", "cat-cow", "doorway-chest-stretch"],
    exercises: ["ex-scapular-rows-band", "ex-thoracic-extension-foam"],
    tags: ["thoracic", "scapular"],
  },
  hamstrings: {
    stretches: ["supine-hamstring-strap", "figure-four-glute"],
    exercises: ["ex-glute-bridge", "ex-hip-hinge-dowel", "ex-bird-dog"],
    tags: ["hamstring", "glute", "hip"],
  },
  glutes: {
    stretches: ["figure-four-glute", "half-kneeling-hip-flexor"],
    exercises: ["ex-glute-bridge", "ex-side-lying-abduction", "ex-sit-to-stand"],
    tags: ["glute", "hip"],
  },
  foot: {
    stretches: ["plantar-fascia-wall", "ankle-alphabet", "gastroc-wall"],
    exercises: ["ex-short-foot", "ex-heel-raises", "ex-tandem-balance"],
    tags: ["foot", "intrinsic-foot", "calf"],
  },
  calves: {
    stretches: ["gastroc-wall", "soleus-wall", "ankle-alphabet"],
    exercises: ["ex-heel-raises", "ex-sit-to-stand"],
    tags: ["calf", "ankle"],
  },
  chest: {
    stretches: ["doorway-chest-stretch", "open-book-thoracic"],
    exercises: ["ex-scapular-rows-band", "ex-serratus-punch"],
    tags: ["posture", "scapular", "chest"],
  },
  core: {
    stretches: ["cat-cow", "pelvic-tilt"],
    exercises: ["ex-dead-bug", "ex-bird-dog", "ex-glute-bridge"],
    tags: ["core", "motor-control"],
  },
  scapular: {
    stretches: ["doorway-chest-stretch", "open-book-thoracic"],
    exercises: ["ex-scapular-rows-band", "ex-serratus-punch", "ex-shoulder-er-band"],
    tags: ["scapular", "posture"],
  },
};

/**
 * Detect educational tissue mechanisms from free text + conditions + descriptors.
 * Ordered by confidence (primary first).
 */
export function detectTissueMechanisms(opts: {
  paragraph: string;
  conditionIds?: string[];
  descriptorIds?: string[];
  patterns?: string[];
  goals?: string[];
  clearanceRequired?: boolean;
  surgery?: boolean;
}): TissueMechanism[] {
  const p = `${opts.paragraph} ${(opts.goals || []).join(" ")}`.toLowerCase();
  const cond = (opts.conditionIds || []).join(" ").toLowerCase();
  const desc = (opts.descriptorIds || []).join(" ").toLowerCase();
  const pat = (opts.patterns || []).join(" ");
  const blob = `${p} ${cond} ${desc} ${pat}`;
  const scored: Array<{ m: TissueMechanism; w: number }> = [];

  const add = (m: TissueMechanism, w: number) => {
    const hit = scored.find((x) => x.m === m);
    if (hit) hit.w += w;
    else scored.push({ m, w });
  };

  // Post-op mechanism only when surgery is selected or free text states a procedure/event
  if (opts.clearanceRequired || opts.surgery) {
    add("post-op", 12);
  } else if (
    !/\b(?:no surgery|never had (?:any )?surgery|considering surgery|might need surgery|before surgery|pre[-\s]?op)\b/i.test(
      blob
    ) &&
    (/\b(?:had|have had|underwent|after my|status post|s\s*\/\s*p|post[-\s]?op|recovering from).{0,48}\b(?:surgery|replacement|reconstruction|repair|fusion|arthroplasty|orif)\b/i.test(
      blob
    ) ||
      /\b(?:tka|tha|aclr|acdf|cabg|knee replacement|hip replacement|acl reconstruction|rotator cuff repair|spinal fusion)\b/i.test(
        blob
      ))
  ) {
    add("post-op", 12);
  }
  if (
    /tendon|tendin|achilles|rotator cuff|tennis elbow|golfer.?s elbow|patellar tendon|jumper.?s knee/.test(
      blob
    ) ||
    /cond-achilles|cond-rotator|cond-lateral-epicondyl|cond-patellar-tendon/.test(cond)
  ) {
    add("tendon-load", 10);
  }
  if (
    /strain|pulled (a |my )?(muscle|hamstring|calf|quad)|torn muscle|hamstring strain|calf strain|quad strain/.test(
      blob
    ) ||
    /cond-hamstring|cond-low-back-strain|cond-cervical-strain/.test(cond)
  ) {
    add("muscle-strain", 9);
  }
  if (
    /numb|tingl|sciatic|radiat|\bnerve\b|neural|radicul|burning down|pins and needles/.test(blob) ||
    /neural|radicul/.test(desc) ||
    /neuro-sensitive/.test(pat)
  ) {
    add("nerve-sensitive", 11);
  }
  if (
    /sprain|\bacl\b|\bmcl\b|\blcl\b|\bpcl\b|ligament|unstable|give.?way|rolled (my )?ankle/.test(
      blob
    ) ||
    /cond-acl|cond-ankle-sprain|cond-mcl/.test(cond)
  ) {
    add("ligament-protect", 10);
  }
  if (/fracture|broken bone|stress fracture|bone bruise|avulsion/.test(blob)) {
    add("bone-protect", 12);
  }
  if (
    /arthritis|\boa\b|menisc|pfps|patellofemoral|impinge|\bclick\b|\block(ed|ing)?\b|swelling joint/.test(
      blob
    ) ||
    /cond-patellofemoral|cond-meniscus|cond-oa|cond-discogenic/.test(cond)
  ) {
    add("joint-irritable", 9);
  }
  if (
    /stiff|tight|lost range|can'?t reach|frozen|immobile|won'?t straighten|won'?t bend/.test(blob)
  ) {
    add("stiffness-mobility", 7);
  }
  if (
    /desk|posture|screen|computer|forward head|tech neck|sitting all day/.test(blob) ||
    /cervical-desk|thoracic-posture/.test(pat)
  ) {
    add("overuse-posture", 8);
  }
  if (/\bfall\b|balance|unsteady|dizzy|\btrip\b/.test(blob) || /balance-fall/.test(pat)) {
    add("balance-falls", 9);
  }
  if (
    /\bweak\b|decond|out of shape|tired legs|can'?t walk far|endurance/.test(blob) ||
    /general-decond/.test(pat)
  ) {
    add("deconditioning", 6);
  }
  // Overuse language without specific tissue → tendon or posture soft
  if (/overuse|repetitive|training load|ramped mileage/.test(blob)) {
    add("tendon-load", 4);
    add("deconditioning", 2);
  }

  scored.sort((a, b) => b.w - a.w);
  const out = scored.filter((x) => x.w >= 4).map((x) => x.m);
  if (!out.length) out.push("mixed");
  return unique(out as string[]).slice(0, 4) as TissueMechanism[];
}

/**
 * Pain-weighted primary vs secondary body regions for multi-issue plans.
 */
export function rankIssueAreas(opts: {
  areas: BodyPart[];
  painLevels?: Partial<Record<BodyPart, number>>;
  storyRegions?: BodyPart[];
  avgPain: number;
}): { primary: BodyPart[]; secondary: BodyPart[]; chain: BodyPart[] } {
  const areas = uniqueBp([...(opts.areas || []), ...(opts.storyRegions || [])]);
  if (!areas.length) {
    return { primary: ["full-body" as BodyPart], secondary: [], chain: [] };
  }
  const scored = areas.map((a) => ({
    a,
    pain: opts.painLevels?.[a] ?? opts.avgPain,
  }));
  scored.sort((x, y) => y.pain - x.pain || areas.indexOf(x.a) - areas.indexOf(y.a));
  const primary = scored.slice(0, Math.min(2, scored.length)).map((x) => x.a);
  const secondary = scored.slice(2, 5).map((x) => x.a);
  const chain = uniqueBp(
    primary.flatMap((p) => KINETIC_CHAIN[p] || []).filter((c) => !primary.includes(c))
  ).slice(0, 4);
  return { primary, secondary, chain };
}

/**
 * Functional-task high-value seeds (PSFS-style efficiency).
 */
function functionalSeeds(text: string): {
  stretches: string[];
  exercises: string[];
  tags: string[];
} {
  const fn = text.toLowerCase();
  const stretches: string[] = [];
  const exercises: string[] = [];
  const tags: string[] = [];
  if (/stair|step up|step-up/.test(fn)) {
    exercises.push("ex-sit-to-stand", "ex-step-up", "ex-terminal-knee-extension", "ex-glute-bridge");
    tags.push("stairs", "functional", "quad");
  }
  if (/walk|gait|distance|hike/.test(fn)) {
    exercises.push("ex-heel-raises", "ex-glute-bridge", "ex-tandem-balance", "ex-sit-to-stand");
    tags.push("gait", "endurance", "balance");
  }
  if (/lift|bend|hinge|garden|yard|pick up/.test(fn)) {
    exercises.push("ex-hip-hinge-dowel", "ex-bird-dog", "ex-dead-bug", "ex-glute-bridge");
    tags.push("hip-hinge", "core", "functional");
  }
  if (/desk|sit|posture|screen|computer|drive/.test(fn)) {
    stretches.push("chin-tuck", "doorway-chest-stretch", "open-book-thoracic", "upper-trap-stretch");
    exercises.push("ex-scapular-rows-band", "ex-thoracic-extension-foam", "ex-serratus-punch");
    tags.push("desk", "posture", "scapular");
  }
  if (/reach|overhead|shelf|throw|serve/.test(fn)) {
    stretches.push("doorway-chest-stretch", "open-book-thoracic");
    exercises.push("ex-shoulder-er-band", "ex-serratus-punch", "ex-scapular-rows-band");
    tags.push("shoulder", "scapular", "rotator-cuff");
  }
  if (/sleep|night pain|roll over/.test(fn)) {
    stretches.push("cat-cow", "childs-pose", "open-book-thoracic");
    tags.push("gentle", "mobility");
  }
  if (/balance|fall|unsteady/.test(fn)) {
    exercises.push("ex-tandem-balance", "ex-heel-raises", "ex-sit-to-stand");
    tags.push("balance", "proprioception");
  }
  if (/run|sport|return to play|athlete/.test(fn)) {
    exercises.push("ex-step-up", "ex-heel-raises", "ex-glute-bridge", "ex-sit-to-stand");
    tags.push("strength", "functional", "single-leg");
  }
  return {
    stretches: unique(stretches),
    exercises: unique(exercises),
    tags: unique(tags),
  };
}

/**
 * Adaptive stretch/exercise quotas for fastest sensible recovery path.
 */
export function efficientQuotas(
  stage: TissueStage,
  mechanisms: TissueMechanism[],
  phase: RehabPhase,
  minutesTargetHint = 20
): { stretch: number; exercise: number; stretchBias: number; exerciseBias: number } {
  const primary = mechanisms[0] || "mixed";
  const proto = MECHANISM_PROTOCOL[primary];
  let stretchBias = proto.stretchBias;
  let exerciseBias = proto.exerciseBias;

  // Stage overrides: early = more motion/protect activation; late = more load
  if (stage === "inflammatory" || stage === "post-op-protect") {
    stretchBias = Math.max(stretchBias, 0.45);
    exerciseBias = Math.min(Math.max(exerciseBias, 0.35), 0.5);
  } else if (stage === "chronic-capacity" || stage === "remodeling") {
    exerciseBias = Math.max(exerciseBias, 0.6);
    stretchBias = Math.min(stretchBias, 0.3);
  }

  // Tendon/decond/balance → load-first; stiffness → mobility-first
  if (primary === "tendon-load" || primary === "deconditioning" || primary === "balance-falls") {
    exerciseBias = Math.max(exerciseBias, 0.65);
    stretchBias = Math.min(stretchBias, 0.25);
  }
  if (primary === "stiffness-mobility") {
    stretchBias = Math.max(stretchBias, 0.5);
  }
  if (primary === "nerve-sensitive") {
    stretchBias = 0.45;
    exerciseBias = 0.45;
  }

  const short = minutesTargetHint <= 12;
  const total = short ? 6 : phase === "protect-calm" ? 7 : 8;
  const stretchShare = stretchBias / (stretchBias + exerciseBias || 1);
  let stretch = Math.max(2, Math.round(total * stretchShare));
  let exercise = Math.max(2, total - stretch);
  if (phase === "protect-calm") {
    stretch = Math.min(stretch, 4);
    exercise = Math.min(exercise, 3);
  }
  if (phase === "capacity-load" || phase === "function-return") {
    exercise = Math.max(exercise, short ? 4 : 5);
    stretch = Math.min(stretch, short ? 2 : 3);
  }
  return { stretch, exercise, stretchBias, exerciseBias };
}

/**
 * Build dynamics used by plan-engine / session composer.
 */
export function buildRehabDynamics(opts: {
  input: SymptomInput;
  rehab: ClinicalRehabPlan;
  storyIntel?: StoryIntelligence | null;
  timeline?: InjuryTimeline | null;
}): RehabDynamics {
  const { input, rehab, storyIntel } = opts;
  const paragraph = input.concernParagraph || "";
  const timeline =
    opts.timeline ||
    storyIntel?.injuryTimeline ||
    (paragraph.trim() ? parseInjuryTimeline(paragraph) : null);

  const weeksSince =
    timeline?.source === "stated" && timeline.approxWeeksSince != null
      ? timeline.approxWeeksSince
      : undefined;

  const surgery = input.surgeryId ? getSurgeryById(input.surgeryId) : undefined;
  const postOpWeeks = weeksSinceSurgery(input.surgeryDate);

  const painVals = Object.values(input.painLevels || {}).filter(
    (n): n is number => typeof n === "number"
  );
  const avgPain =
    painVals.length > 0
      ? painVals.reduce((a, b) => a + b, 0) / painVals.length
      : storyIntel?.painNow ?? 3;

  const cond = summarizeConditions(input.conditionIds || storyIntel?.conditionIds || []);
  const clearanceRequired = cond.clearanceRequired || Boolean(surgery);

  const mechanisms = detectTissueMechanisms({
    paragraph,
    conditionIds: input.conditionIds || storyIntel?.conditionIds,
    descriptorIds: input.painDescriptorIds || storyIntel?.descriptorIds,
    patterns: rehab.patterns,
    goals: input.goals,
    clearanceRequired,
    surgery: Boolean(surgery),
  });
  const primaryMechanism = mechanisms[0] || "mixed";

  const tissueStage = resolveTissueStage({
    weeksSince,
    postOpWeeks,
    protectWeeksTypical: surgery?.protectWeeksTypical,
    irritability: storyIntel?.irritability,
    activityResponse: storyIntel?.activityResponse,
    avgPain,
    clearanceRequired,
    mechanisms,
  });

  const stage = STAGE_EVIDENCE[tissueStage];
  let phase = stageToPhase(tissueStage, rehab.phase);

  // Mechanism can force a more efficient phase (e.g. chronic tendon → capacity sooner)
  if (
    (primaryMechanism === "tendon-load" || primaryMechanism === "deconditioning") &&
    tissueStage === "chronic-capacity" &&
    phase === "mobility-restore"
  ) {
    phase = "capacity-load";
  }
  if (primaryMechanism === "nerve-sensitive" && avgPain >= 4) {
    phase = moreProtective(phase, "protect-calm");
  }

  const chronicLanguage =
    tissueStage === "chronic-capacity" ||
    Boolean(timeline?.tissuePhase === "chronic") ||
    /\bchronic|long[- ]standing|years of\b/i.test(paragraph);

  const prognosisBand = resolvePrognosisBand(tissueStage, {
    patterns: rehab.patterns,
    clearanceRequired,
    chronicLanguage,
    mechanisms,
  });

  const issueAreas = rankIssueAreas({
    areas: (input.areas?.length ? input.areas : rehab.priorityAreas) as BodyPart[],
    painLevels: input.painLevels,
    storyRegions: storyIntel?.regions,
    avgPain,
  });

  const quotas = efficientQuotas(
    tissueStage,
    mechanisms,
    phase,
    input.availableMinutes || 20
  );

  // Merge tags from stage + primary/secondary mechanisms + rehab + story
  const mechTags = mechanisms.flatMap((m) => MECHANISM_PROTOCOL[m].preferTags);
  const mechAvoid = mechanisms.flatMap((m) => MECHANISM_PROTOCOL[m].avoidTags);
  const preferTags = unique([
    ...stage.preferTags,
    ...mechTags,
    ...rehab.preferTags,
    ...(storyIntel?.planHints.preferTags || []),
  ]);
  const avoidTags = unique([
    ...stage.avoidTags,
    ...mechAvoid,
    ...rehab.avoidTags,
    ...(storyIntel?.planHints.avoidTags || []),
    ...(surgery?.avoidTags || []),
  ]);

  // Seed priority: mechanism first-line → primary region → functional task → stage → chain (light)
  let preferredStretchIds: string[] = [];
  let preferredExerciseIds: string[] = [];

  for (const m of mechanisms.slice(0, 2)) {
    const proto = MECHANISM_PROTOCOL[m];
    preferredStretchIds = unique([...proto.stretchIds, ...preferredStretchIds]);
    preferredExerciseIds = unique([...proto.exerciseIds, ...preferredExerciseIds]);
  }

  for (const bp of issueAreas.primary) {
    const seed = REGION_SEEDS[bp];
    if (!seed) continue;
    preferredStretchIds = unique([...seed.stretches, ...preferredStretchIds]);
    preferredExerciseIds = unique([...seed.exercises, ...preferredExerciseIds]);
    preferTags.push(...seed.tags);
  }

  // Secondary regions: light coverage (1–2 seeds) so multi-issue is addressed without bloat
  for (const bp of issueAreas.secondary.slice(0, 2)) {
    const seed = REGION_SEEDS[bp];
    if (!seed) continue;
    preferredStretchIds = unique([...preferredStretchIds, ...seed.stretches.slice(0, 1)]);
    preferredExerciseIds = unique([...preferredExerciseIds, ...seed.exercises.slice(0, 1)]);
  }

  // Kinetic chain: soft partner seeds (high efficiency for knee/back/shoulder problems)
  for (const bp of issueAreas.chain.slice(0, 3)) {
    const seed = REGION_SEEDS[bp];
    if (!seed) continue;
    preferredExerciseIds = unique([...preferredExerciseIds, ...seed.exercises.slice(0, 1)]);
  }

  const fnText = [
    paragraph,
    ...(storyIntel?.functionalLimits || []),
    ...(storyIntel?.aggravators || []),
    ...(input.goals || []),
  ].join(" ");
  const fn = functionalSeeds(fnText);
  preferredStretchIds = unique([...fn.stretches, ...preferredStretchIds]);
  preferredExerciseIds = unique([...fn.exercises, ...preferredExerciseIds]);
  preferTags.push(...fn.tags);

  // Existing clinical + stage seeds last (fill gaps)
  preferredStretchIds = unique([
    ...preferredStretchIds,
    ...stage.stretchIds,
    ...rehab.preferredStretchIds,
  ]);
  preferredExerciseIds = unique([
    ...preferredExerciseIds,
    ...stage.exerciseIds,
    ...rehab.preferredExerciseIds,
  ]);

  // Efficiency trim: keep tight preferred sets so composer picks winners not laundry lists
  preferredStretchIds = preferredStretchIds.slice(0, 10);
  preferredExerciseIds = preferredExerciseIds.slice(0, 12);

  let maxDifficulty: Difficulty = stage.maxDifficulty;
  if (rehab.maxDifficulty === "beginner" || avgPain >= 6) maxDifficulty = "beginner";
  if (phase === "protect-calm" || tissueStage === "post-op-protect") maxDifficulty = "beginner";
  if (primaryMechanism === "bone-protect" || primaryMechanism === "nerve-sensitive") {
    maxDifficulty = "beginner";
  }

  let minutesScale = stage.minutesScale * (rehab.minutesScale || 1);
  if (storyIntel?.irritability === "high") minutesScale *= 0.85;
  if (storyIntel?.activityResponse === "delayed-worse") minutesScale *= 0.8;
  if (mechanisms.length >= 3) minutesScale *= 0.95; // multi-issue: quality over volume
  minutesScale = Math.max(0.55, Math.min(1.15, minutesScale));

  const prognosisLines = PROGNOSIS_COPY[prognosisBand];
  const efficiencyLines = [
    `Smart recovery path: mechanism “${primaryMechanism.replace(/-/g, " ")}” + stage “${tissueStage.replace(/-/g, " ")}"`,
    `Minimal-effective-dose bias ~${quotas.stretch} mobility / ~${quotas.exercise} activation-load items (not a random long list)`,
    issueAreas.primary.length
      ? `Primary focus: ${issueAreas.primary.map((a) => a.replace(/-/g, " ")).join(", ")}`
      : "",
    issueAreas.chain.length
      ? `Kinetic-chain partners: ${issueAreas.chain.map((a) => a.replace(/-/g, " ")).join(", ")}`
      : "",
    mechanisms.length > 1
      ? `Also considered: ${mechanisms
          .slice(1)
          .map((m) => m.replace(/-/g, " "))
          .join(", ")}`
      : "",
  ].filter(Boolean);

  const summaryLines = [
    `Tissue dosing stage: ${tissueStage.replace(/-/g, " ")} → session phase “${phase.replace(/-/g, " ")}"`,
    `Mechanism focus: ${primaryMechanism.replace(/-/g, " ")}`,
    weeksSince != null
      ? `Onset framing ~${Math.round(weeksSince * 10) / 10} weeks (educational stage map)`
      : "Onset window unclear — irritability-led dosing",
    postOpWeeks != null
      ? `Post-op week ~${postOpWeeks}${surgery ? ` · ${surgery.name}` : ""}`
      : "",
    `Prognosis framing: ${prognosisBand.replace(/-/g, " ")} (population-level education, not a personal forecast)`,
  ].filter(Boolean);

  const evidenceLines = unique([
    MECHANISM_PROTOCOL[primaryMechanism].evidence,
    ...mechanisms.slice(1, 3).map((m) => MECHANISM_PROTOCOL[m].evidence),
    ...stage.evidence,
    ...rehab.evidenceNotes.slice(0, 2),
    ...prognosisLines.slice(0, 2),
  ]).slice(0, 10);

  return {
    tissueStage,
    phase,
    prognosisBand,
    mechanisms,
    primaryMechanism,
    prognosisLines,
    evidenceLines,
    summaryLines,
    efficiencyLines,
    preferTags: unique(preferTags),
    avoidTags: unique(avoidTags),
    preferredStretchIds,
    preferredExerciseIds,
    chainAreas: issueAreas.chain,
    primaryAreas: issueAreas.primary,
    secondaryAreas: issueAreas.secondary,
    maxDifficulty,
    minutesScale,
    stretchBias: quotas.stretchBias,
    exerciseBias: quotas.exerciseBias,
    priorityBoostTags: unique([
      ...stage.preferTags,
      ...MECHANISM_PROTOCOL[primaryMechanism].preferTags.slice(0, 6),
      "motor-control",
      "functional",
      "isometric",
      "activation",
    ]),
    stretchQuotaHint: quotas.stretch,
    exerciseQuotaHint: quotas.exercise,
    weeksSince,
    postOpWeeks,
    intelligenceVersion: 2,
  };
}

/**
 * Soft score contribution for a catalog movement under current dynamics.
 * Heavily rewards high-leverage, stage-appropriate, multi-purpose picks.
 */
export function dynamicsMovementBoost(
  dyn: RehabDynamics,
  movement: {
    id: string;
    kind: MovementKind;
    name: string;
    tags: string[];
    bodyParts: BodyPart[];
  }
): number {
  let score = 0;
  const blob = `${movement.name} ${movement.tags.join(" ")}`.toLowerCase();
  const parts = new Set(movement.bodyParts);

  // Preferred first-line seeds (highest leverage)
  if (movement.kind === "stretch") {
    const idx = dyn.preferredStretchIds.indexOf(movement.id);
    if (idx >= 0) score += 22 - Math.min(idx, 8); // earlier seeds score higher
    score += dyn.stretchBias * 6;
  } else {
    const idx = dyn.preferredExerciseIds.indexOf(movement.id);
    if (idx >= 0) score += 24 - Math.min(idx, 8);
    score += dyn.exerciseBias * 6;
  }

  // Primary region hit (pain-weighted focus)
  for (let i = 0; i < dyn.primaryAreas.length; i++) {
    if (parts.has(dyn.primaryAreas[i]!)) score += 12 - i * 3;
  }
  // Secondary soft
  for (const a of dyn.secondaryAreas) {
    if (parts.has(a)) score += 3;
  }
  // Kinetic chain soft partner (efficiency without stealing primary focus)
  for (const a of dyn.chainAreas) {
    if (parts.has(a)) score += 4;
  }

  for (const t of dyn.preferTags) {
    if (movement.tags.includes(t) || blob.includes(t.toLowerCase())) score += 3.5;
  }
  for (const t of dyn.priorityBoostTags) {
    if (movement.tags.includes(t) || blob.includes(t.toLowerCase())) score += 2.5;
  }
  for (const t of dyn.avoidTags) {
    if (t === "all") score -= 25;
    else if (movement.tags.includes(t) || blob.includes(t.toLowerCase())) score -= 12;
  }

  // Multi-purpose efficiency: movement covers 2+ of primary/chain areas
  const coverage = [...dyn.primaryAreas, ...dyn.chainAreas].filter((a) => parts.has(a)).length;
  if (coverage >= 2) score += 7;
  if (coverage >= 3) score += 4;

  // Stage realism
  if (
    (dyn.tissueStage === "inflammatory" || dyn.tissueStage === "post-op-protect") &&
    (blob.includes("jump") ||
      blob.includes("plyo") ||
      blob.includes("sprint") ||
      movement.tags.includes("plyo"))
  ) {
    score -= 22;
  }

  // Mechanism-specific intelligence
  const mech = dyn.primaryMechanism;
  if (mech === "tendon-load") {
    if (
      movement.tags.includes("isometric") ||
      movement.tags.includes("strength") ||
      blob.includes("raise") ||
      blob.includes("hold")
    ) {
      score += 8;
    }
    if (movement.kind === "stretch" && blob.includes("ballistic")) score -= 15;
  }
  if (mech === "nerve-sensitive") {
    if (movement.tags.includes("neural") && !blob.includes("gentle")) score -= 14;
    if (movement.tags.includes("motor-control") || movement.tags.includes("core")) score += 6;
  }
  if (mech === "joint-irritable") {
    if (blob.includes("deep squat") || blob.includes("lunge") || movement.tags.includes("plyo")) {
      score -= 10;
    }
    if (movement.tags.includes("isometric") || blob.includes("quad set") || blob.includes("tke")) {
      score += 7;
    }
  }
  if (mech === "overuse-posture") {
    if (
      movement.tags.includes("posture") ||
      movement.tags.includes("scapular") ||
      movement.tags.includes("thoracic")
    ) {
      score += 7;
    }
  }
  if (mech === "stiffness-mobility" && movement.kind === "stretch") score += 5;
  if (
    (mech === "deconditioning" || mech === "balance-falls") &&
    (movement.tags.includes("functional") ||
      movement.tags.includes("balance") ||
      blob.includes("sit to stand") ||
      blob.includes("sit-to-stand"))
  ) {
    score += 8;
  }

  // Chronic: reward graded strength/function
  if (
    dyn.tissueStage === "chronic-capacity" &&
    (movement.tags.includes("strength") ||
      movement.tags.includes("functional") ||
      movement.tags.includes("motor-control"))
  ) {
    score += 7;
  }

  // Early inflammatory: reward isometrics / protected activation
  if (
    (dyn.tissueStage === "inflammatory" || dyn.tissueStage === "post-op-protect") &&
    (movement.tags.includes("isometric") ||
      movement.tags.includes("activation") ||
      movement.tags.includes("gentle") ||
      movement.tags.includes("protected"))
  ) {
    score += 6;
  }

  return score;
}

/**
 * Re-rank scored candidates for diversity + multi-issue efficiency.
 * Prevents five near-duplicate stretches dominating the HEP.
 */
export function efficiencyRerank<T extends { id: string; score: number }>(
  ranked: T[],
  resolve: (id: string) => { tags: string[]; bodyParts: BodyPart[]; name: string } | undefined,
  opts: {
    primaryAreas: BodyPart[];
    secondaryAreas?: BodyPart[];
    limit?: number;
  }
): T[] {
  const limit = opts.limit ?? ranked.length;
  const selected: T[] = [];
  const usedTags = new Map<string, number>();
  const usedRegions = new Map<string, number>();
  const usedFamilies = new Map<string, number>();

  const familyOf = (name: string, tags: string[]) => {
    const blob = `${name} ${tags.join(" ")}`.toLowerCase();
    if (/hamstring/.test(blob)) return "hamstring";
    if (/hip flexor|iliopsoas/.test(blob)) return "hip-flexor";
    if (/glute|figure.?four|piriformis/.test(blob)) return "glute";
    if (/chest|pec|doorway/.test(blob)) return "chest";
    if (/chin.?tuck|cervical|neck/.test(blob)) return "cervical";
    if (/cat.?cow|pelvic|lumbar/.test(blob)) return "lumbar-mob";
    if (/quad set|tke|terminal knee|vmo/.test(blob)) return "quad-act";
    if (/bridge/.test(blob)) return "bridge";
    if (/bird.?dog|dead.?bug/.test(blob)) return "core-control";
    if (/row|scapular/.test(blob)) return "scap-row";
    if (/heel raise|calf/.test(blob)) return "calf";
    if (/balance|tandem/.test(blob)) return "balance";
    if (/sit.?to.?stand|squat/.test(blob)) return "sts";
    return tags[0] || name.split(" ")[0] || "other";
  };

  const remaining = [...ranked].sort((a, b) => b.score - a.score);

  while (selected.length < limit && remaining.length) {
    let bestIdx = 0;
    let bestAdj = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i]!;
      const meta = resolve(cand.id);
      if (!meta) {
        if (cand.score > bestAdj) {
          bestAdj = cand.score;
          bestIdx = i;
        }
        continue;
      }
      let adj = cand.score;
      const fam = familyOf(meta.name, meta.tags);
      const famCount = usedFamilies.get(fam) || 0;
      // Diversity: penalize same movement family
      adj -= famCount * 14;
      // Soft tag diversity
      for (const t of meta.tags.slice(0, 4)) {
        adj -= (usedTags.get(t) || 0) * 2;
      }
      // Region balance: reward uncovered primary, mild secondary
      let coveredPrimary = false;
      for (const bp of meta.bodyParts) {
        const rc = usedRegions.get(bp) || 0;
        if (opts.primaryAreas.includes(bp)) {
          coveredPrimary = true;
          adj += rc === 0 ? 10 : rc === 1 ? 2 : -4;
        } else if (opts.secondaryAreas?.includes(bp)) {
          adj += rc === 0 ? 4 : -1;
        } else {
          adj -= rc >= 2 ? 3 : 0;
        }
      }
      if (!coveredPrimary && opts.primaryAreas.length && selected.length >= 2) {
        adj -= 3; // after core picks, prefer primary coverage
      }
      if (adj > bestAdj) {
        bestAdj = adj;
        bestIdx = i;
      }
    }
    const pick = remaining.splice(bestIdx, 1)[0]!;
    selected.push(pick);
    const meta = resolve(pick.id);
    if (meta) {
      const fam = familyOf(meta.name, meta.tags);
      usedFamilies.set(fam, (usedFamilies.get(fam) || 0) + 1);
      for (const t of meta.tags) usedTags.set(t, (usedTags.get(t) || 0) + 1);
      for (const bp of meta.bodyParts) usedRegions.set(bp, (usedRegions.get(bp) || 0) + 1);
    }
  }

  return selected;
}

/** Merge dynamics into a clinical rehab plan (preferred seeds + phase + quotas). */
export function applyDynamicsToRehabPlan(
  rehab: ClinicalRehabPlan,
  dyn: RehabDynamics
): ClinicalRehabPlan {
  return {
    ...rehab,
    phase: dyn.phase,
    priorityAreas: uniqueBp([
      ...dyn.primaryAreas,
      ...rehab.priorityAreas,
      ...dyn.chainAreas,
    ]).slice(0, 6),
    preferTags: unique([...dyn.preferTags, ...rehab.preferTags]),
    avoidTags: unique([...dyn.avoidTags, ...rehab.avoidTags]),
    preferredStretchIds: unique([
      ...dyn.preferredStretchIds,
      ...rehab.preferredStretchIds,
    ]).slice(0, 14),
    preferredExerciseIds: unique([
      ...dyn.preferredExerciseIds,
      ...rehab.preferredExerciseIds,
    ]).slice(0, 14),
    stretchQuota: dyn.stretchQuotaHint,
    exerciseQuota: dyn.exerciseQuotaHint,
    maxDifficulty:
      PHASE_ORDER.indexOf(dyn.phase) <= 1 || dyn.maxDifficulty === "beginner"
        ? "beginner"
        : rehab.maxDifficulty === "beginner"
          ? "beginner"
          : dyn.maxDifficulty,
    minutesScale: Math.max(0.55, Math.min(1.15, rehab.minutesScale * dyn.minutesScale)),
    evidenceNotes: unique([...dyn.evidenceLines, ...rehab.evidenceNotes]).slice(0, 12),
    summaryLines: unique([
      ...dyn.efficiencyLines.slice(0, 2),
      ...dyn.summaryLines,
      ...rehab.summaryLines,
    ]).slice(0, 12),
    sessionBlueprint: rehab.sessionBlueprint,
  };
}
