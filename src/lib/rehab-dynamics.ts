/**
 * Evidence-informed rehab dynamics for MotionRx plan / builder engines.
 *
 * Synthesizes common outpatient PT frameworks used in contemporary practice:
 * - Tissue irritability & load tolerance (Maitland / clinical reasoning)
 * - Stage-of-healing dosing (acute inflammatory → remodeling → chronic capacity)
 * - Graded exposure & motor control → progressive loading progressions
 * - Traffic-light 24h symptom response rules
 * - Functional priority (PSFS-style task first) over generic stretch lists
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

export type RehabDynamics = {
  tissueStage: TissueStage;
  phase: RehabPhase;
  prognosisBand: PrognosisBand;
  /** Educational outlook lines (not a personal prognosis) */
  prognosisLines: string[];
  /** Evidence themes used for selection */
  evidenceLines: string[];
  /** Summary for UI / plan narrative */
  summaryLines: string[];
  preferTags: string[];
  avoidTags: string[];
  preferredStretchIds: string[];
  preferredExerciseIds: string[];
  maxDifficulty: Difficulty;
  minutesScale: number;
  stretchBias: number;
  exerciseBias: number;
  /** Soft boost for movements matching evidence priorities */
  priorityBoostTags: string[];
  /** Weeks since onset when known */
  weeksSince?: number;
  postOpWeeks?: number | null;
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

/**
 * Map healing time + irritability → tissue stage (educational synthesis).
 * Common OP-PT teaching: early relative protection → progressive loading
 * as irritability settles; chronic problems shift toward capacity & exposure.
 */
export function resolveTissueStage(opts: {
  weeksSince?: number | null;
  postOpWeeks?: number | null;
  protectWeeksTypical?: number;
  irritability?: StoryIntelligence["irritability"];
  activityResponse?: StoryIntelligence["activityResponse"];
  avgPain: number;
  clearanceRequired?: boolean;
}): TissueStage {
  const { weeksSince, postOpWeeks, protectWeeksTypical = 6, irritability, activityResponse, avgPain, clearanceRequired } =
    opts;

  if (
    clearanceRequired ||
    (postOpWeeks != null && postOpWeeks < protectWeeksTypical)
  ) {
    return "post-op-protect";
  }

  if (irritability === "high" || activityResponse === "delayed-worse" || avgPain >= 7) {
    // High irritability: treat as early protect regardless of calendar when flare-dominant
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
      // Chronic: avoid pure protect unless base already protective
      if (base === "protect-calm") return "motor-control";
      return base;
    default:
      return base;
  }
}

/**
 * Evidence-framed prognosis *band* — population-level educational framing,
 * not individualized medical prognosis.
 */
export function resolvePrognosisBand(
  stage: TissueStage,
  opts: {
    patterns: string[];
    clearanceRequired?: boolean;
    chronicLanguage?: boolean;
  }
): PrognosisBand {
  if (stage === "post-op-protect" || opts.clearanceRequired) return "post-op-protocol";
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
    "Avoid sudden spikes in volume/intensity—tendon and graft timelines are load-sensitive.",
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
    stretchBias: 0.6,
    exerciseBias: 0.3,
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
    stretchBias: 0.45,
    exerciseBias: 0.45,
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
    exerciseIds: ["ex-sit-to-stand", "ex-hip-hinge-dowel", "ex-step-up", "ex-scapular-rows-band", "ex-heel-raises"],
    stretchBias: 0.3,
    exerciseBias: 0.6,
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
    exerciseIds: ["ex-sit-to-stand", "ex-hip-hinge-dowel", "ex-bird-dog", "ex-glute-bridge", "ex-tandem-balance"],
    stretchBias: 0.25,
    exerciseBias: 0.65,
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
    stretchBias: 0.55,
    exerciseBias: 0.35,
    minutesScale: 0.7,
    maxDifficulty: "beginner",
    evidence: [
      "Post-op educational default: protect the repair, control swelling, use only permitted motions.",
      "Your written surgical/PT protocol always supersedes catalog defaults.",
    ],
  },
  unknown: {
    preferTags: ["gentle", "motor-control", "mobility", "activation"],
    avoidTags: ["plyo", "heavy-load", "impact"],
    stretchIds: ["cat-cow", "chin-tuck", "pelvic-tilt"],
    exerciseIds: ["ex-glute-bridge", "ex-bird-dog", "ex-sit-to-stand"],
    stretchBias: 0.4,
    exerciseBias: 0.4,
    minutesScale: 0.9,
    maxDifficulty: "beginner",
    evidence: [
      "Onset unclear: dose by irritability and 24h response; start moderate-volume and adjust.",
    ],
  },
};

/** Region-priority exercise seeds (common OP-PT first-line choices) */
const REGION_SEEDS: Partial<
  Record<BodyPart, { stretches: string[]; exercises: string[]; tags: string[] }>
> = {
  "lower-back": {
    stretches: ["cat-cow", "knee-to-chest", "childs-pose", "pelvic-tilt"],
    exercises: ["ex-bird-dog", "ex-dead-bug", "ex-glute-bridge", "ex-hip-hinge-dowel"],
    tags: ["lumbar", "core", "glute", "motor-control"],
  },
  neck: {
    stretches: ["chin-tuck", "upper-trap-stretch", "open-book-thoracic"],
    exercises: ["ex-cervical-isometrics", "ex-scapular-rows-band", "ex-thoracic-extension-foam"],
    tags: ["cervical", "posture", "scapular"],
  },
  shoulders: {
    stretches: ["doorway-chest-stretch", "upper-trap-stretch"],
    exercises: ["ex-scapular-rows-band", "ex-serratus-punch", "ex-shoulder-er-band"],
    tags: ["shoulder", "scapular", "rotator-cuff"],
  },
  knee: {
    stretches: ["supine-hamstring-strap", "quad-standing"],
    exercises: ["ex-quad-set", "ex-terminal-knee-extension", "ex-sit-to-stand", "ex-glute-bridge"],
    tags: ["knee", "quad", "closed-chain-gentle"],
  },
  hips: {
    stretches: ["half-kneeling-hip-flexor", "figure-four-glute"],
    exercises: ["ex-glute-bridge", "ex-side-lying-abduction", "ex-sit-to-stand"],
    tags: ["hip", "glute"],
  },
  ankles: {
    stretches: ["ankle-alphabet", "plantar-fascia-wall"],
    exercises: ["ex-heel-raises", "ex-tandem-balance", "ex-ankle-alphabet-strength"],
    tags: ["ankle", "balance", "proprioception"],
  },
};

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

  const tissueStage = resolveTissueStage({
    weeksSince,
    postOpWeeks,
    protectWeeksTypical: surgery?.protectWeeksTypical,
    irritability: storyIntel?.irritability,
    activityResponse: storyIntel?.activityResponse,
    avgPain,
    clearanceRequired,
  });

  const stage = STAGE_EVIDENCE[tissueStage];
  const phase = stageToPhase(tissueStage, rehab.phase);

  const chronicLanguage =
    tissueStage === "chronic-capacity" ||
    Boolean(timeline?.tissuePhase === "chronic") ||
    /\bchronic|long[- ]standing|years of\b/i.test(paragraph);

  const prognosisBand = resolvePrognosisBand(tissueStage, {
    patterns: rehab.patterns,
    clearanceRequired,
    chronicLanguage,
  });

  const preferTags = unique([
    ...stage.preferTags,
    ...rehab.preferTags,
    ...(storyIntel?.planHints.preferTags || []),
  ]);
  const avoidTags = unique([
    ...stage.avoidTags,
    ...rehab.avoidTags,
    ...(storyIntel?.planHints.avoidTags || []),
    ...(surgery?.avoidTags || []),
  ]);

  let preferredStretchIds = unique([
    ...stage.stretchIds,
    ...rehab.preferredStretchIds,
  ]);
  let preferredExerciseIds = unique([
    ...stage.exerciseIds,
    ...rehab.preferredExerciseIds,
  ]);

  // Region-first seeds for realistic local tissue targets
  const priority = rehab.priorityAreas.length
    ? rehab.priorityAreas
    : (input.areas || []).slice(0, 4);
  for (const bp of priority.slice(0, 3)) {
    const seed = REGION_SEEDS[bp];
    if (!seed) continue;
    preferredStretchIds = unique([...seed.stretches, ...preferredStretchIds]);
    preferredExerciseIds = unique([...seed.exercises, ...preferredExerciseIds]);
    preferTags.push(...seed.tags);
  }

  // Functional task realism (stairs, sit, walk, lift)
  const fn = [
    ...(storyIntel?.functionalLimits || []),
    ...(storyIntel?.aggravators || []),
    ...(input.goals || []),
  ]
    .join(" ")
    .toLowerCase();
  if (/stair/.test(fn)) {
    preferredExerciseIds = unique([
      "ex-sit-to-stand",
      "ex-step-up",
      "ex-terminal-knee-extension",
      ...preferredExerciseIds,
    ]);
  }
  if (/walk|gait/.test(fn)) {
    preferredExerciseIds = unique([
      "ex-heel-raises",
      "ex-glute-bridge",
      "ex-tandem-balance",
      ...preferredExerciseIds,
    ]);
  }
  if (/lift|bend|hinge/.test(fn)) {
    preferredExerciseIds = unique([
      "ex-hip-hinge-dowel",
      "ex-bird-dog",
      "ex-dead-bug",
      ...preferredExerciseIds,
    ]);
  }
  if (/desk|sit|posture|screen/.test(fn)) {
    preferredStretchIds = unique([
      "chin-tuck",
      "doorway-chest-stretch",
      "open-book-thoracic",
      ...preferredStretchIds,
    ]);
    preferredExerciseIds = unique([
      "ex-scapular-rows-band",
      "ex-thoracic-extension-foam",
      ...preferredExerciseIds,
    ]);
  }

  let maxDifficulty: Difficulty = stage.maxDifficulty;
  if (rehab.maxDifficulty === "beginner" || avgPain >= 6) maxDifficulty = "beginner";
  if (phase === "protect-calm" || tissueStage === "post-op-protect") maxDifficulty = "beginner";

  let minutesScale = stage.minutesScale * (rehab.minutesScale || 1);
  if (storyIntel?.irritability === "high") minutesScale *= 0.85;
  if (storyIntel?.activityResponse === "delayed-worse") minutesScale *= 0.8;
  minutesScale = Math.max(0.55, Math.min(1.15, minutesScale));

  const prognosisLines = PROGNOSIS_COPY[prognosisBand];
  const summaryLines = [
    `Tissue dosing stage: ${tissueStage.replace(/-/g, " ")} → session phase “${phase.replace(/-/g, " ")}"`,
    weeksSince != null
      ? `Onset framing ~${Math.round(weeksSince * 10) / 10} weeks (educational stage map)`
      : "Onset window unclear — irritability-led dosing",
    postOpWeeks != null
      ? `Post-op week ~${postOpWeeks}${surgery ? ` · ${surgery.name}` : ""}`
      : "",
    `Prognosis framing: ${prognosisBand.replace(/-/g, " ")} (population-level education, not a personal forecast)`,
  ].filter(Boolean);

  const evidenceLines = unique([
    ...stage.evidence,
    ...rehab.evidenceNotes.slice(0, 3),
    ...prognosisLines.slice(0, 2),
  ]).slice(0, 8);

  return {
    tissueStage,
    phase,
    prognosisBand,
    prognosisLines,
    evidenceLines,
    summaryLines,
    preferTags: unique(preferTags),
    avoidTags: unique(avoidTags),
    preferredStretchIds: preferredStretchIds.slice(0, 16),
    preferredExerciseIds: preferredExerciseIds.slice(0, 16),
    maxDifficulty,
    minutesScale,
    stretchBias: stage.stretchBias,
    exerciseBias: stage.exerciseBias,
    priorityBoostTags: unique([
      ...stage.preferTags,
      "motor-control",
      "functional",
      "isometric",
      "activation",
    ]),
    weeksSince,
    postOpWeeks,
  };
}

/**
 * Soft score contribution for a catalog movement under current dynamics.
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

  if (movement.kind === "stretch") {
    if (dyn.preferredStretchIds.includes(movement.id)) score += 18;
    score += dyn.stretchBias * 5;
  } else {
    if (dyn.preferredExerciseIds.includes(movement.id)) score += 18;
    score += dyn.exerciseBias * 5;
  }

  for (const t of dyn.preferTags) {
    if (movement.tags.includes(t) || blob.includes(t.toLowerCase())) score += 3.5;
  }
  for (const t of dyn.priorityBoostTags) {
    if (movement.tags.includes(t) || blob.includes(t.toLowerCase())) score += 2;
  }
  for (const t of dyn.avoidTags) {
    if (t === "all") score -= 25;
    else if (movement.tags.includes(t) || blob.includes(t.toLowerCase())) score -= 10;
  }

  // Stage realism: suppress high-impact early
  if (
    (dyn.tissueStage === "inflammatory" || dyn.tissueStage === "post-op-protect") &&
    (blob.includes("jump") ||
      blob.includes("plyo") ||
      blob.includes("sprint") ||
      movement.tags.includes("plyo"))
  ) {
    score -= 20;
  }

  // Chronic: reward graded strength/function
  if (
    dyn.tissueStage === "chronic-capacity" &&
    (movement.tags.includes("strength") ||
      movement.tags.includes("functional") ||
      movement.tags.includes("motor-control"))
  ) {
    score += 6;
  }

  return score;
}

/** Merge dynamics into a clinical rehab plan (preferred seeds + phase). */
export function applyDynamicsToRehabPlan(
  rehab: ClinicalRehabPlan,
  dyn: RehabDynamics
): ClinicalRehabPlan {
  return {
    ...rehab,
    phase: dyn.phase,
    preferTags: unique([...dyn.preferTags, ...rehab.preferTags]),
    avoidTags: unique([...dyn.avoidTags, ...rehab.avoidTags]),
    preferredStretchIds: unique([
      ...dyn.preferredStretchIds,
      ...rehab.preferredStretchIds,
    ]).slice(0, 20),
    preferredExerciseIds: unique([
      ...dyn.preferredExerciseIds,
      ...rehab.preferredExerciseIds,
    ]).slice(0, 20),
    maxDifficulty:
      PHASE_ORDER.indexOf(dyn.phase) <= 1 || dyn.maxDifficulty === "beginner"
        ? "beginner"
        : rehab.maxDifficulty === "beginner"
          ? "beginner"
          : dyn.maxDifficulty,
    minutesScale: Math.max(0.55, Math.min(1.15, rehab.minutesScale * dyn.minutesScale)),
    evidenceNotes: unique([...dyn.evidenceLines, ...rehab.evidenceNotes]).slice(0, 12),
    summaryLines: unique([...dyn.summaryLines, ...rehab.summaryLines]).slice(0, 10),
    sessionBlueprint: rehab.sessionBlueprint,
  };
}
