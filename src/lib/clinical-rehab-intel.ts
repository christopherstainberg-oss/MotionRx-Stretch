/**
 * Evidence-informed rehab intelligence for routine generation.
 * Educational synthesis of common outpatient PT frameworks
 * (irritability-based dosing, McKenzie-style directional preference language,
 * graded exposure, motor-control → loading progressions, outcome tracking).
 * Not a diagnosis engine or substitute for licensed care.
 */

import type { BodyPart, Difficulty, MovementKind, SymptomInput } from "@/lib/types";
import type { ProgramBias } from "@/data/pain-descriptors";
import { summarizeConditions } from "@/data/clinical-conditions";
import { summarizeDescriptors } from "@/data/pain-descriptors";
import { clinicalHistorySummary, type SexSelection } from "@/lib/clinical-history";
import { analyzeStoryIntelligence } from "@/lib/story-intelligence";
import { parseInjuryTimeline } from "@/lib/injury-timeline";
import { parseOccupation } from "@/lib/occupation";

/** Clinical program phase for HEP structure */
export type RehabPhase =
  | "protect-calm"
  | "mobility-restore"
  | "motor-control"
  | "capacity-load"
  | "function-return";

export type InjuryPattern =
  | "lumbar-irritable"
  | "lumbar-stiff"
  | "cervical-desk"
  | "shoulder-guarded"
  | "hip-stiff"
  | "knee-irritable"
  | "ankle-foot"
  | "post-op-conservative"
  | "neuro-sensitive"
  | "general-decond"
  | "balance-fall-risk"
  | "thoracic-posture";

export type ClinicalRehabPlan = {
  phase: RehabPhase;
  patterns: InjuryPattern[];
  /** Primary body regions ordered by clinical priority */
  priorityAreas: BodyPart[];
  stretchQuota: number;
  exerciseQuota: number;
  preferKinds: MovementKind[];
  maxDifficulty: Difficulty;
  minutesScale: number;
  /** Extra prefer/avoid tags for movement scoring */
  preferTags: string[];
  avoidTags: string[];
  programBiases: ProgramBias[];
  /** Preferred catalog movement IDs (soft boost) */
  preferredStretchIds: string[];
  preferredExerciseIds: string[];
  /** Session structure labels for plan narrative */
  sessionBlueprint: string[];
  outcomeFocus: string[];
  evidenceNotes: string[];
  summaryLines: string[];
};

const PHASE_BLUEPRINT: Record<RehabPhase, string[]> = {
  "protect-calm": [
    "Gentle protected mobility within comfort",
    "Isometric / activation without flare",
    "Short volume; stop for red/yellow traffic-light pain",
    "Optional brief heat for stiffness or relative rest for irritable tissue",
  ],
  "mobility-restore": [
    "Warm-up joint circles / easy motion",
    "Targeted stretches for restricted regions",
    "Light motor control to “own” new range",
    "Cool-down easy breathing mobility",
  ],
  "motor-control": [
    "Warm-up mobility",
    "Deep control / scapular or lumbopelvic timing drills",
    "Low-load endurance holds",
    "Functional transition (sit-to-stand, reach, step) if tolerated",
  ],
  "capacity-load": [
    "Dynamic warm-up",
    "Primary strength for underactive muscles",
    "Accessory mobility for remaining stiffness",
    "Graded functional loading",
  ],
  "function-return": [
    "Task-specific warm-up",
    "Strength + power/endurance as appropriate",
    "Mobility maintenance",
    "Activity simulation (work, sport, ADLs)",
  ],
};

/** Soft preferred catalog IDs by pattern (must exist in BASE libraries) */
/** Soft preferred catalog IDs (must match stretch/exercise library ids) */
const PATTERN_PREFS: Record<
  InjuryPattern,
  { stretches: string[]; exercises: string[]; preferTags: string[]; avoidTags: string[] }
> = {
  "lumbar-irritable": {
    stretches: ["cat-cow", "pelvic-tilt", "childs-pose", "knee-to-chest"],
    exercises: ["ex-glute-bridge", "ex-bird-dog", "ex-dead-bug"],
    preferTags: ["lumbar", "core", "glute", "motor-control", "gentle", "hip"],
    avoidTags: ["plyo", "jump", "heavy-load", "end-range-flexion-load", "impact"],
  },
  "lumbar-stiff": {
    stretches: ["cat-cow", "knee-to-chest", "childs-pose", "figure-four-glute", "open-book-thoracic"],
    exercises: ["ex-glute-bridge", "ex-bird-dog", "ex-hip-hinge-dowel"],
    preferTags: ["mobility", "hip", "thoracic", "extension", "glute"],
    avoidTags: ["plyo", "jump"],
  },
  "cervical-desk": {
    stretches: ["chin-tuck", "upper-trap-stretch", "doorway-chest-stretch", "open-book-thoracic", "cat-cow"],
    exercises: ["ex-scapular-rows-band", "ex-thoracic-extension-foam", "ex-wall-pushup"],
    preferTags: ["cervical", "posture", "desk", "scapular", "thoracic", "chin-tuck"],
    avoidTags: ["plyo", "heavy-load", "overhead-aggressive"],
  },
  "shoulder-guarded": {
    stretches: ["doorway-chest-stretch", "upper-trap-stretch", "open-book-thoracic"],
    exercises: ["ex-scapular-rows-band", "ex-serratus-punch", "ex-shoulder-er-band"],
    preferTags: ["shoulder", "scapular", "rotator-cuff", "isometric", "posture"],
    avoidTags: ["overhead-aggressive", "plyo", "heavy-load", "throw"],
  },
  "hip-stiff": {
    stretches: ["half-kneeling-hip-flexor", "figure-four-glute", "supine-hamstring-strap", "cat-cow"],
    exercises: ["ex-glute-bridge", "ex-side-lying-abduction", "ex-sit-to-stand"],
    preferTags: ["hip", "glute", "flexor", "hamstring", "mobility"],
    avoidTags: ["plyo", "deep-squat-irritable"],
  },
  "knee-irritable": {
    stretches: ["supine-hamstring-strap", "quad-standing", "childs-pose"],
    exercises: ["ex-quad-set", "ex-terminal-knee-extension", "ex-sit-to-stand", "ex-glute-bridge"],
    preferTags: ["knee", "quad", "glute", "isometric", "closed-chain-gentle"],
    avoidTags: ["deep-squat", "lunge-aggressive", "jump", "plyo", "running"],
  },
  "ankle-foot": {
    stretches: ["ankle-alphabet", "plantar-fascia-wall", "supine-hamstring-strap"],
    exercises: ["ex-heel-raises", "ex-tandem-balance", "ex-ankle-alphabet-strength"],
    preferTags: ["ankle", "calf", "foot", "balance", "proprioception"],
    avoidTags: ["jump", "plyo", "cutting"],
  },
  "post-op-conservative": {
    stretches: ["cat-cow", "chin-tuck", "ankle-alphabet", "pelvic-tilt"],
    exercises: ["ex-quad-set", "ex-glute-bridge", "ex-dead-bug", "ex-scapular-rows-band"],
    preferTags: ["gentle", "isometric", "activation", "protected", "home", "motor-control"],
    avoidTags: ["plyo", "jump", "heavy-load", "impact", "twist-aggressive", "overhead-aggressive"],
  },
  "neuro-sensitive": {
    stretches: ["cat-cow", "supine-hamstring-strap", "chin-tuck", "childs-pose"],
    exercises: ["ex-bird-dog", "ex-dead-bug", "ex-glute-bridge"],
    preferTags: ["gentle", "neural-gentle", "motor-control", "core"],
    avoidTags: ["neural-aggressive", "end-range", "ballistic", "plyo"],
  },
  "general-decond": {
    stretches: ["cat-cow", "doorway-chest-stretch", "half-kneeling-hip-flexor", "childs-pose"],
    exercises: ["ex-sit-to-stand", "ex-glute-bridge", "ex-scapular-rows-band", "ex-wall-pushup"],
    preferTags: ["functional", "endurance", "activation", "posture"],
    avoidTags: ["plyo", "max-strength"],
  },
  "balance-fall-risk": {
    stretches: ["ankle-alphabet", "cat-cow", "half-kneeling-hip-flexor"],
    exercises: ["ex-sit-to-stand", "ex-tandem-balance", "ex-heel-raises", "ex-glute-bridge"],
    preferTags: ["balance", "proprioception", "hip", "functional", "supported"],
    avoidTags: ["plyo", "jump", "unstable-surface-advanced", "single-leg-eyes-closed-advanced"],
  },
  "thoracic-posture": {
    stretches: ["open-book-thoracic", "cat-cow", "doorway-chest-stretch", "chin-tuck"],
    exercises: ["ex-thoracic-extension-foam", "ex-scapular-rows-band", "ex-serratus-punch"],
    preferTags: ["thoracic", "posture", "extension", "scapular", "desk"],
    avoidTags: ["heavy-load", "flexion-loaded-spine"],
  },
};

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function detectPatterns(input: {
  areas: BodyPart[];
  paragraph: string;
  conditionIds: string[];
  descriptorIds: string[];
  avgPain: number;
  clearanceRequired: boolean;
  precautionIds?: string[];
  sex?: SexSelection;
  pastMedicalHistory?: string;
  currentMedicalHistory?: string;
}): InjuryPattern[] {
  const p = input.paragraph.toLowerCase();
  const areas = new Set(input.areas);
  const hist = `${input.pastMedicalHistory || ""} ${input.currentMedicalHistory || ""}`.toLowerCase();
  const patterns: InjuryPattern[] = [];

  const has = (...keys: string[]) => keys.some((k) => p.includes(k) || hist.includes(k));
  const area = (...bps: BodyPart[]) => bps.some((b) => areas.has(b));

  // Post-op only with explicit surgical language or structured precautions — not soft clearance alone
  if (
    has("surgery", "post-op", "postop", "replacement", "s/p", "after my operation", "fusion surgery") ||
    (input.precautionIds && input.precautionIds.length > 0) ||
    (input.clearanceRequired &&
      has("surgeon", "protocol", "weight bearing", "nwb", "ttwb", "sling", "brace after"))
  ) {
    patterns.push("post-op-conservative");
  }

  if (
    has("numb", "tingl", "sciatic", "radiat", "neural", "nerve") ||
    input.descriptorIds.some((id) => /neural|radicul|burning/i.test(id))
  ) {
    patterns.push("neuro-sensitive");
  }

  if (area("lower-back", "pelvis") || has("low back", "lumbar", "sciatica", "si joint")) {
    if (input.avgPain >= 5 || has("flare", "irritab", "sharp", "worse sitting")) {
      patterns.push("lumbar-irritable");
    } else {
      patterns.push("lumbar-stiff");
    }
  }

  if (area("neck", "jaw") || has("neck", "cervical", "forward head")) {
    patterns.push("cervical-desk");
  }

  if (area("shoulders", "scapular") || has("shoulder", "rotator", "impinge")) {
    patterns.push("shoulder-guarded");
  }

  if (area("hips", "glutes", "groin", "hamstrings") || has("hip", "piriformis", "groin")) {
    patterns.push("hip-stiff");
  }

  if (area("knee", "quadriceps") || has("knee", "patell", "menisc", "acl")) {
    patterns.push("knee-irritable");
  }

  if (area("ankles", "foot", "toes", "calves", "shins") || has("ankle", "plantar", "achilles", "foot")) {
    patterns.push("ankle-foot");
  }

  if (area("thoracic", "upper-back", "chest") || has("posture", "desk", "mid back", "thoracic")) {
    patterns.push("thoracic-posture");
  }

  if (has("fall", "balance", "dizzy", "unsteady") || area("full-body")) {
    if (has("fall", "balance", "unsteady")) patterns.push("balance-fall-risk");
  }

  if (!patterns.length) patterns.push("general-decond");

  // Sex-informed soft patterns (educational, not identity enforcement)
  if (input.sex === "female" && (has("pelvic", "pregnan", "postpartum") || area("pelvis"))) {
    if (!patterns.includes("post-op-conservative")) patterns.push("lumbar-irritable");
  }

  return unique(patterns).slice(0, 4);
}

function phaseFor(opts: {
  avgPain: number;
  patterns: InjuryPattern[];
  clearanceRequired: boolean;
  daysSinceAcute?: number;
  /** delayed-worse | worse | better | same | unknown */
  activityResponse?: string;
  irritability?: string;
  functionalReady?: boolean;
}): RehabPhase {
  // Delayed post-activity flare or high irritability always protects first
  if (
    opts.activityResponse === "delayed-worse" ||
    opts.irritability === "high" ||
    opts.avgPain >= 7
  ) {
    return "protect-calm";
  }
  // Very early (0–7 days): protect unless pain is already low and calming
  if (
    opts.daysSinceAcute != null &&
    opts.daysSinceAcute <= 7 &&
    opts.avgPain >= 3
  ) {
    return "protect-calm";
  }
  if (opts.clearanceRequired || opts.patterns.includes("post-op-conservative")) {
    // Post-op / early post-event: first ~6 weeks more protective
    if (opts.daysSinceAcute != null && opts.daysSinceAcute < 42) {
      return opts.avgPain >= 3 ? "protect-calm" : "motor-control";
    }
    return opts.avgPain >= 4 ? "protect-calm" : "motor-control";
  }
  // Protect when truly irritable / neuro — not every lumbar label at moderate pain
  if (opts.avgPain >= 6 || opts.patterns.includes("neuro-sensitive")) {
    return "protect-calm";
  }
  if (
    opts.patterns.includes("lumbar-irritable") &&
    (opts.avgPain >= 5 || opts.irritability === "high" || opts.activityResponse === "worse")
  ) {
    return "protect-calm";
  }
  if (opts.avgPain >= 4) {
    return opts.patterns.includes("general-decond") ? "motor-control" : "mobility-restore";
  }
  if (opts.patterns.includes("balance-fall-risk")) return "motor-control";
  // Low pain + stated function goals → capacity or function-return
  if (opts.avgPain <= 2 && opts.functionalReady && opts.irritability === "low") {
    return "function-return";
  }
  if (opts.avgPain <= 2) return "capacity-load";
  if (opts.activityResponse === "better" && opts.avgPain <= 3) return "motor-control";
  return "mobility-restore";
}

/**
 * Condition-specific HEP seeds (library IDs) — outpatient educational protocols.
 * Applied on top of injury patterns when free-text / chips match a condition.
 */
const CONDITION_PROTOCOL: Record<
  string,
  { stretches: string[]; exercises: string[]; preferTags: string[]; avoidTags: string[]; note: string }
> = {
  "cond-patellofemoral": {
    stretches: ["supine-hamstring-strap", "quad-standing", "half-kneeling-hip-flexor"],
    exercises: ["ex-side-lying-abduction", "ex-quad-set", "ex-sit-to-stand", "ex-glute-bridge"],
    preferTags: ["hip-abduction", "quad-iso", "closed-chain", "glute"],
    avoidTags: ["deep-knee-flexion-load", "deep-squat", "jump"],
    note: "PFPS-style: hip/quad control, avoid painful deep loaded flexion early.",
  },
  "cond-acl-sprain": {
    stretches: ["supine-hamstring-strap", "quad-standing", "childs-pose"],
    exercises: ["ex-quad-set", "ex-terminal-knee-extension", "ex-glute-bridge", "ex-sit-to-stand"],
    preferTags: ["quad", "hamstring", "neuromuscular", "closed-chain-gentle"],
    avoidTags: ["plyometric", "cutting", "jump", "twist"],
    note: "ACL-oriented early: quad activation, controlled closed-chain; no cutting/plyo.",
  },
  "cond-ankle-sprain": {
    stretches: ["ankle-alphabet", "gastroc-wall"],
    exercises: ["ex-heel-raises", "ex-tandem-balance", "ex-ankle-alphabet-strength", "ex-short-foot"],
    preferTags: ["proprioception", "peroneal", "balance", "calf"],
    avoidTags: ["jump", "cutting", "uneven-advanced"],
    note: "Lateral ankle: ROM + progressive proprioception/balance before agility.",
  },
  "cond-achilles-tendinopathy": {
    stretches: ["gastroc-wall", "soleus-wall", "ankle-alphabet"],
    exercises: ["ex-heel-raises", "ex-wall-sit", "ex-sit-to-stand"],
    preferTags: ["calf-raise", "isometric", "heavy-slow", "tendon"],
    avoidTags: ["ballistic", "plyo", "sprint"],
    note: "Achilles load management: progressive calf loading; avoid ballistic stretch early.",
  },
  "cond-plantar-fasciopathy": {
    stretches: ["plantar-fascia-wall", "gastroc-wall", "ankle-alphabet"],
    exercises: ["ex-heel-raises", "ex-short-foot", "ex-tandem-balance"],
    preferTags: ["calf", "intrinsic-foot", "foot"],
    avoidTags: ["barefoot-impact", "jump"],
    note: "Plantar fascia: calf/foot mobility + progressive loading of plantar flexors/intrinsics.",
  },
  "cond-rotator-cuff": {
    stretches: ["doorway-chest-stretch", "upper-trap-stretch", "open-book-thoracic"],
    exercises: ["ex-shoulder-er-band", "ex-scapular-rows-band", "ex-serratus-punch", "ex-wall-pushup"],
    preferTags: ["er-iso", "scapular", "rotator-cuff", "isometric"],
    avoidTags: ["overhead-aggressive", "throw", "heavy-load"],
    note: "RCRSP: scapular setting + graded ER/isometrics before aggressive overhead.",
  },
  "cond-cervical-strain": {
    stretches: ["chin-tuck", "upper-trap-stretch", "doorway-chest-stretch", "open-book-thoracic"],
    exercises: ["ex-cervical-isometrics", "ex-scapular-rows-band", "ex-thoracic-extension-foam"],
    preferTags: ["cervical", "chin-tuck", "posture", "scapular"],
    avoidTags: ["end-range", "ballistic", "heavy-load"],
    note: "Cervical strain: deep neck flexor control, scapular endurance, thoracic mobility.",
  },
  "cond-low-back-strain": {
    stretches: ["cat-cow", "pelvic-tilt", "childs-pose", "knee-to-chest"],
    exercises: ["ex-bird-dog", "ex-dead-bug", "ex-glute-bridge", "ex-hip-hinge-dowel"],
    preferTags: ["lumbar", "core", "glute", "motor-control", "hip-hinge"],
    avoidTags: ["end-range-flexion-load", "twist-aggressive", "plyo"],
    note: "Lumbar strain: protected mobility + lumbopelvic motor control + hip hinge pattern.",
  },
  "cond-discogenic-lbp": {
    stretches: ["cat-cow", "pelvic-tilt", "open-book-thoracic", "childs-pose"],
    exercises: ["ex-bird-dog", "ex-dead-bug", "ex-glute-bridge", "ex-hip-hinge-dowel"],
    preferTags: ["extension", "core-control", "motor-control", "gentle"],
    avoidTags: ["sit-flexion-bias", "sit-up", "end-range-flexion-load"],
    note: "Discogenic pattern: motor control + prefer extension-friendly options; avoid loaded end-range flexion early.",
  },
  "cond-hamstring-strain": {
    stretches: ["supine-hamstring-strap", "figure-four-glute", "half-kneeling-hip-flexor"],
    exercises: ["ex-glute-bridge", "ex-bird-dog", "ex-hip-hinge-dowel"],
    preferTags: ["nordic-progress", "bridge", "hamstring", "glute"],
    avoidTags: ["endrange-hamstring-stretch", "sprint", "ballistic"],
    note: "Hamstring strain: progressive load, avoid aggressive end-range stretch early.",
  },
  "cond-meniscus": {
    stretches: ["supine-hamstring-strap", "quad-standing", "childs-pose"],
    exercises: ["ex-quad-set", "ex-terminal-knee-extension", "ex-sit-to-stand", "ex-glute-bridge"],
    preferTags: ["quad-set", "closed-chain-gentle", "bike"],
    avoidTags: ["deep-squat", "twist", "pivot"],
    note: "Meniscal irritation: quad activation, avoid deep loaded twist/compression early.",
  },
};

/**
 * Build a clinical rehab plan used to drive intelligent hybrid routine creation.
 */
export function buildClinicalRehabPlan(input: SymptomInput & {
  conditionIds?: string[];
  painDescriptorIds?: string[];
}): ClinicalRehabPlan {
  const paragraph = input.concernParagraph || "";
  const story = paragraph.trim()
    ? analyzeStoryIntelligence(paragraph, {
        areas: input.areas,
        sex: input.sex,
        pastMedicalHistory: input.pastMedicalHistory,
        currentMedicalHistory: input.currentMedicalHistory,
        goals: input.goals,
      })
    : null;

  const descIds = unique([
    ...(input.painDescriptorIds || []),
    ...(story?.descriptorIds || []),
  ]);
  const condIds = unique([
    ...(input.conditionIds || []),
    ...(story?.conditionIds || []),
  ]);
  const desc = summarizeDescriptors(descIds);
  const cond = summarizeConditions(condIds);

  const areas = unique([
    ...(input.areas || []),
    ...(story?.regions || []),
    ...cond.bodyParts,
  ]) as BodyPart[];

  const areaPainValues = areas.map(
    (a) => input.painLevels?.[a] ?? story?.painNow ?? 3
  );
  const rawAvg =
    areaPainValues.length > 0
      ? areaPainValues.reduce((a, b) => a + b, 0) / areaPainValues.length
      : story?.painNow ?? 3;
  const avgPain = Math.min(
    10,
    rawAvg +
      desc.effectivePainBoost * 0.35 +
      cond.effectivePainBoost * 0.35 +
      (story?.irritability === "high" ? 1 : story?.irritability === "low" ? -0.5 : 0)
  );

  const patterns = detectPatterns({
    areas: areas.length ? areas : ["full-body"],
    paragraph,
    conditionIds: condIds,
    descriptorIds: descIds,
    avgPain,
    clearanceRequired: cond.clearanceRequired,
    precautionIds: input.precautionIds,
    sex: input.sex,
    pastMedicalHistory: input.pastMedicalHistory,
    currentMedicalHistory: input.currentMedicalHistory,
  });

  const injuryTl =
    story?.injuryTimeline ||
    (paragraph.trim() ? parseInjuryTimeline(paragraph) : undefined);
  const occupation =
    story?.occupation ||
    (paragraph.trim() ? parseOccupation(paragraph) : undefined);

  // Story-driven phase can override generic phase when free text is rich
  let phase = phaseFor({
    avgPain,
    patterns,
    clearanceRequired: cond.clearanceRequired,
    activityResponse: story?.activityResponse,
    irritability: story?.irritability,
    functionalReady: Boolean(
      story?.functionalLimits.length ||
        story?.goals.length ||
        story?.planHints.functionalGoals.length
    ),
    daysSinceAcute:
      injuryTl?.source === "stated" && injuryTl.approxWeeksSince != null
        ? Math.round(injuryTl.approxWeeksSince * 7)
        : undefined,
  });
  if (story && (story.richness === "rich" || story.richness === "clinical" || story.richness === "moderate")) {
    const storyPhase = story.planHints.phaseBias;
    // Prefer more protective phase when story and heuristic disagree under high irritability
    const order: RehabPhase[] = [
      "protect-calm",
      "mobility-restore",
      "motor-control",
      "capacity-load",
      "function-return",
    ];
    if (
      story.irritability === "high" ||
      story.redFlagHints.length ||
      story.activityResponse === "delayed-worse"
    ) {
      phase = "protect-calm";
    } else if (order.indexOf(storyPhase) < order.indexOf(phase)) {
      // Story more protective than heuristic
      phase = storyPhase;
    } else if (
      story.irritability === "low" &&
      story.activityResponse !== "worse" &&
      avgPain <= 5
    ) {
      // Stated low irritability + better/same (delayed-worse already handled above) → allow story phase
      phase = storyPhase;
    } else if (
      story.activityResponse === "better" &&
      avgPain <= 5 &&
      phase === "protect-calm" &&
      !story.redFlagHints.length
    ) {
      // Activity eases symptoms: step up from pure protect when pain is moderate
      phase = "motor-control";
    }
  }

  let preferTags: string[] = [
    ...desc.preferTags,
    ...cond.preferTags,
    ...(story?.planHints.preferTags || []),
  ];
  let avoidTags: string[] = [
    ...desc.avoidTags,
    ...cond.avoidTags,
    ...(story?.planHints.avoidTags || []),
  ];
  let preferredStretchIds: string[] = [];
  let preferredExerciseIds: string[] = [];
  const programBiases = unique([
    ...desc.biases,
    ...cond.biases,
  ]) as ProgramBias[];
  const protocolNotes: string[] = [];

  // Occupation-informed movement seeds + tags (real-world load)
  if (occupation && occupation.source === "stated") {
    preferTags.push(...occupation.preferTags);
    avoidTags.push(...occupation.avoidTags);
    preferredStretchIds.push(...occupation.preferredStretchIds);
    preferredExerciseIds.push(...occupation.preferredExerciseIds);
    protocolNotes.push(...occupation.sessionNotes.slice(0, 2));
    protocolNotes.push(
      `Occupation: ${occupation.label} → volume ×${occupation.minutesScale.toFixed(2)}; demands ${occupation.demands.slice(0, 3).join(", ") || "general"}.`
    );
  }

  // Injury pattern seeds (region/irritability frameworks)
  for (const pat of patterns) {
    const pref = PATTERN_PREFS[pat];
    preferTags.push(...pref.preferTags);
    avoidTags.push(...pref.avoidTags);
    preferredStretchIds.push(...pref.stretches);
    preferredExerciseIds.push(...pref.exercises);
  }

  // Condition-specific outpatient protocols (higher fidelity than region alone)
  for (const cid of condIds) {
    const proto = CONDITION_PROTOCOL[cid];
    if (!proto) continue;
    preferredStretchIds = [...proto.stretches, ...preferredStretchIds];
    preferredExerciseIds = [...proto.exercises, ...preferredExerciseIds];
    preferTags.push(...proto.preferTags);
    avoidTags.push(...proto.avoidTags);
    protocolNotes.push(proto.note);
  }

  // Functional task priority: put task-related exercises first in preferred list
  if (story?.functionalLimits.length || story?.aggravators.length) {
    const fn = `${story.functionalLimits.join(" ")} ${story.aggravators.join(" ")}`.toLowerCase();
    const frontload: string[] = [];
    if (/stair/.test(fn)) {
      frontload.push("ex-sit-to-stand", "ex-step-up", "ex-terminal-knee-extension", "ex-quad-set");
    }
    if (/sit|desk/.test(fn)) {
      frontload.push("ex-scapular-rows-band", "ex-thoracic-extension-foam", "ex-cervical-isometrics");
    }
    if (/walk|gait/.test(fn)) {
      frontload.push("ex-heel-raises", "ex-glute-bridge", "ex-tandem-balance");
    }
    if (/reach|overhead|shoulder/.test(fn)) {
      frontload.push("ex-serratus-punch", "ex-scapular-rows-band", "ex-shoulder-er-band");
    }
    if (/lift|bend|hinge/.test(fn)) {
      frontload.push("ex-hip-hinge-dowel", "ex-bird-dog", "ex-dead-bug", "ex-glute-bridge");
    }
    if (/balance|fall|unsteady/.test(fn)) {
      frontload.push("ex-tandem-balance", "ex-sit-to-stand", "ex-heel-raises");
    }
    preferredExerciseIds = unique([...frontload, ...preferredExerciseIds]);
  }

  preferTags = unique(preferTags);
  avoidTags = unique(avoidTags);
  preferredStretchIds = unique(preferredStretchIds);
  preferredExerciseIds = unique(preferredExerciseIds);

  // Phase-based quotas (realistic outpatient HEP size)
  let stretchQuota = 4;
  let exerciseQuota = 3;
  let minutesScale = 1;
  let maxDifficulty: Difficulty = input.difficulty || "beginner";
  let preferKinds: MovementKind[] = ["stretch", "exercise"];

  switch (phase) {
    case "protect-calm":
      stretchQuota = 4;
      exerciseQuota = 2;
      minutesScale = 0.75;
      maxDifficulty = "beginner";
      preferKinds = ["stretch", "exercise"];
      preferTags.push("gentle", "isometric", "activation", "motor-control");
      avoidTags.push("plyo", "heavy-load", "impact");
      break;
    case "mobility-restore":
      stretchQuota = 5;
      exerciseQuota = 2;
      preferKinds = ["stretch", "exercise"];
      preferTags.push("mobility", "flexibility");
      break;
    case "motor-control":
      stretchQuota = 3;
      exerciseQuota = 4;
      preferKinds = ["exercise", "stretch"];
      preferTags.push("motor-control", "activation", "core", "scapular");
      break;
    case "capacity-load":
      stretchQuota = 2;
      exerciseQuota = 5;
      preferKinds = ["exercise", "stretch"];
      preferTags.push("strength", "endurance", "functional");
      if (avgPain <= 2 && maxDifficulty === "beginner") maxDifficulty = "intermediate";
      break;
    case "function-return":
      stretchQuota = 2;
      exerciseQuota = 5;
      preferKinds = ["exercise", "stretch"];
      preferTags.push("functional", "strength", "balance");
      break;
  }

  // Injury timeline minutes bias (0–6 weeks often shorter volume)
  if (injuryTl?.source === "stated") {
    minutesScale *= injuryTl.minutesScale;
    if ((injuryTl.approxWeeksSince ?? 99) < 2) {
      maxDifficulty = "beginner";
    }
    protocolNotes.push(
      `Time since onset: ${injuryTl.label} → volume ×${injuryTl.minutesScale.toFixed(2)}; progress check ${injuryTl.progressOutlook[0]?.windowLabel || "weekly"}.`
    );
    if (injuryTl.progressOutlook[0]) {
      protocolNotes.push(
        `Progress outlook: ${injuryTl.progressOutlook[0].windowLabel} — ${injuryTl.progressOutlook[0].lookFor}`
      );
    }
  }

  // Occupation volume bias (labor/healthcare shorter post-shift; desk micro-dose friendly)
  if (occupation?.source === "stated") {
    minutesScale *= occupation.minutesScale;
  }

  // Story minutes / kind bias
  if (story) {
    minutesScale *= story.planHints.minutesScale;
    if (story.planHints.preferKinds?.length) {
      preferKinds = story.planHints.preferKinds;
    }
    // Function-task quotas: stairs/sit-to-stand → more exercise control
    if (
      story.functionalLimits.some((f) =>
        /stairs|sit-to-stand|walking|sport|gym/.test(f)
      ) &&
      story.irritability !== "high"
    ) {
      exerciseQuota = Math.max(exerciseQuota, 4);
      stretchQuota = Math.min(stretchQuota, 4);
    }
    if (story.sensory.includes("stiff/tight") && story.irritability !== "high") {
      stretchQuota = Math.max(stretchQuota, 4);
    }
  }

  // Condition/descriptor caps
  if (cond.maxDifficulty && difficultyRank(cond.maxDifficulty) < difficultyRank(maxDifficulty)) {
    maxDifficulty = cond.maxDifficulty;
  }
  if (desc.maxDifficulty && difficultyRank(desc.maxDifficulty) < difficultyRank(maxDifficulty)) {
    maxDifficulty = desc.maxDifficulty;
  }
  if (story?.planHints.maxDifficulty &&
    difficultyRank(story.planHints.maxDifficulty) < difficultyRank(maxDifficulty)
  ) {
    maxDifficulty = story.planHints.maxDifficulty;
  }
  if (avgPain >= 6 || cond.clearanceRequired || story?.irritability === "high")
    maxDifficulty = "beginner";

  // Desk / posture language
  if (
    /desk|posture|screen|computer/i.test(paragraph) ||
    story?.aggravators.some((a) => a.includes("sitting") || a.includes("desk"))
  ) {
    preferTags.push("desk", "posture", "thoracic", "chin-tuck");
    if (!patterns.includes("cervical-desk")) preferKinds = ["stretch", "exercise"];
  }

  // History-informed conservative bias
  const histBlob = `${input.pastMedicalHistory || ""} ${input.currentMedicalHistory || ""}`.toLowerCase();
  if (/osteopor|fracture|cancer|cardiac|heart failure|dvt|pe\b|clot|stroke/i.test(histBlob)) {
    maxDifficulty = "beginner";
    minutesScale *= 0.85;
    avoidTags.push("plyo", "impact", "heavy-load", "twist-aggressive");
    programBiases.push("short-volume" as ProgramBias);
  }
  if (/diabetes|neuropathy/i.test(histBlob)) {
    preferTags.push("balance", "foot", "gentle");
  }

  const priorityAreas = prioritizeAreas(
    areas.length ? areas : ["full-body"],
    patterns,
    paragraph
  );

  const outcomeFocus = unique([
    ...cond.outcomeFocus,
    ...(story?.planHints.functionalGoals || []),
    ...patterns.map((pat) => patternOutcome(pat)),
  ]).slice(0, 8);

  const evidenceNotes = [
    `Phase: ${phaseLabel(phase)} — irritability-guided dosing (pain traffic light; mild productive discomfort ≤3/10 often acceptable if settles ≤24h).`,
    `Patterns: ${patterns.map(patternLabel).join("; ")}.`,
    ...protocolNotes.slice(0, 3).map((n) => `Protocol: ${n}`),
    story
      ? `Free-text story: ${
          story.irritability !== "unknown"
            ? `${story.irritability} irritability`
            : "irritability not determined (not assumed)"
        }${
          story.activityResponse !== "unknown"
            ? `, activity ${story.activityResponse}`
            : ""
        }${
          story.aggravators.length
            ? `; aggravators you stated: ${story.aggravators.slice(0, 4).join(", ")}`
            : "; aggravators not specified (not assumed)"
        }${story.painNow != null ? `; pain ${story.painNow}/10 stated` : "; no 0–10 pain stated"}.`
      : null,
    `Session built as graded outpatient-style HEP: warm-up → target mobility → motor control → functional/capacity → cool-down (${PHASE_BLUEPRINT[phase].join(" → ")}).`,
    avgPain >= 5 || story?.irritability === "high"
      ? "Higher irritability: prioritize control and protected ROM over aggressive stretch or load; short volume most days."
      : story?.irritability === "low"
        ? "Lower irritability (stated evidence): progress motor control and capacity while maintaining mobility gains."
        : "Irritability not assumed from silence — use traffic-light dosing and reassess from what the user states.",
    story?.activityResponse === "delayed-worse"
      ? "24h delayed flare stated: cut volume ~30–50% and emphasize isometrics/motor control until response improves."
      : story?.activityResponse === "better"
        ? "Activity response better: allow graded capacity if pain rules stay green."
        : null,
    ...(story?.planHints.evidenceLines.slice(0, 3) || []),
    cond.clinicalOutcomes[0]
      ? `Outcome focus example: ${cond.clinicalOutcomes[0].label} (${cond.clinicalOutcomes[0].timeframe}).`
      : story?.goals?.[0]
        ? `Track goal you stated: ${story.goals[0]} (PSFS-style weekly).`
        : story?.functionalLimits[0]
          ? `Track function limit you stated: ${story.functionalLimits[0]} (PSFS-style weekly).`
          : "Track a patient-specific functional goal (PSFS-style) weekly when stated.",
    clinicalHistorySummary({
      sex: input.sex,
      pastMedicalHistory: input.pastMedicalHistory,
      currentMedicalHistory: input.currentMedicalHistory,
    }) || "No extra medical-history modifiers beyond paragraph/conditions.",
  ].filter(Boolean) as string[];

  const summaryLines = [
    `Rehab phase: ${phaseLabel(phase)}`,
    `Injury/clinical patterns: ${patterns.map(patternLabel).join(", ")}`,
    story
      ? `Story irritability: ${
          story.irritability !== "unknown" ? story.irritability : "not determined (not assumed)"
        }${story.painNow != null ? ` · ${story.painNow}/10 stated` : " · no 0–10 stated"}`
      : null,
    `Priority regions: ${priorityAreas.slice(0, 5).join(", ")}`,
    `Volume bias: ${stretchQuota} mobility + ${exerciseQuota} strength/control (scaled)`,
    `Max difficulty cap: ${maxDifficulty}`,
  ].filter(Boolean) as string[];

  return {
    phase,
    patterns,
    priorityAreas,
    stretchQuota,
    exerciseQuota,
    preferKinds,
    maxDifficulty,
    minutesScale,
    preferTags: unique(preferTags),
    avoidTags: unique(avoidTags),
    programBiases: unique(programBiases),
    preferredStretchIds,
    preferredExerciseIds,
    sessionBlueprint: PHASE_BLUEPRINT[phase],
    outcomeFocus,
    evidenceNotes,
    summaryLines,
  };
}

function difficultyRank(d: Difficulty): number {
  return d === "beginner" ? 1 : d === "intermediate" ? 2 : 3;
}

function phaseLabel(p: RehabPhase): string {
  switch (p) {
    case "protect-calm":
      return "Protect & calm (high irritability / early protection)";
    case "mobility-restore":
      return "Restore mobility";
    case "motor-control":
      return "Motor control & activation";
    case "capacity-load":
      return "Build capacity / load";
    case "function-return":
      return "Return to function";
  }
}

function patternLabel(p: InjuryPattern): string {
  return p.replace(/-/g, " ");
}

function patternOutcome(p: InjuryPattern): string {
  switch (p) {
    case "lumbar-irritable":
      return "Sitting/standing tolerance with lower ODI-oriented burden";
    case "lumbar-stiff":
      return "Morning stiffness and bend-to-reach ease";
    case "cervical-desk":
      return "Desk tolerance and cervical rotation comfort (NDI-oriented)";
    case "shoulder-guarded":
      return "Reach/dressing comfort (QuickDASH-oriented)";
    case "hip-stiff":
      return "Hip mobility for gait and sit-to-stand";
    case "knee-irritable":
      return "Stair and sit-to-stand comfort (KOOS-oriented)";
    case "ankle-foot":
      return "Push-off and balance confidence (FAAM-oriented)";
    case "post-op-conservative":
      return "Protected ROM and activation per protocol";
    case "neuro-sensitive":
      return "Centralization/reduced peripheral symptoms with gentle dosing";
    case "balance-fall-risk":
      return "Steady gait and reduced fall risk tasks";
    case "thoracic-posture":
      return "Upright sitting endurance and rotation";
    default:
      return "General mobility and activity tolerance";
  }
}

function prioritizeAreas(
  areas: BodyPart[],
  patterns: InjuryPattern[],
  paragraph: string
): BodyPart[] {
  const scores = new Map<BodyPart, number>();
  for (const a of areas) scores.set(a, 1);

  const boost = (bp: BodyPart, n: number) => scores.set(bp, (scores.get(bp) || 0) + n);

  for (const pat of patterns) {
    if (pat.startsWith("lumbar")) {
      boost("lower-back", 5);
      boost("hips", 3);
      boost("glutes", 3);
      boost("core", 2);
    }
    if (pat === "cervical-desk") {
      boost("neck", 5);
      boost("thoracic", 3);
      boost("shoulders", 2);
      boost("chest", 2);
    }
    if (pat === "shoulder-guarded") {
      boost("shoulders", 5);
      boost("scapular", 4);
    }
    if (pat === "hip-stiff") {
      boost("hips", 5);
      boost("hamstrings", 2);
      boost("glutes", 3);
    }
    if (pat === "knee-irritable") {
      boost("knee", 5);
      boost("quadriceps", 3);
      boost("glutes", 2);
    }
    if (pat === "ankle-foot") {
      boost("ankles", 5);
      boost("foot", 4);
      boost("calves", 3);
    }
    if (pat === "thoracic-posture") {
      boost("thoracic", 5);
      boost("chest", 3);
      boost("upper-back", 3);
    }
  }

  // Explicit mention in story
  const p = paragraph.toLowerCase();
  for (const [key, bp] of [
    ["low back", "lower-back"],
    ["neck", "neck"],
    ["shoulder", "shoulders"],
    ["knee", "knee"],
    ["hip", "hips"],
    ["ankle", "ankles"],
  ] as const) {
    if (p.includes(key)) boost(bp as BodyPart, 4);
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([bp]) => bp);
}

/**
 * Score boost for a catalog movement under the clinical rehab plan.
 */
export function clinicalMovementBoost(
  plan: ClinicalRehabPlan,
  opts: {
    id: string;
    kind: MovementKind;
    name: string;
    tags: string[];
    bodyParts: BodyPart[];
    benefits?: string[];
  }
): number {
  let score = 0;
  const blob = `${opts.name} ${opts.tags.join(" ")} ${(opts.benefits || []).join(" ")}`.toLowerCase();

  // Priority region match
  for (let i = 0; i < plan.priorityAreas.length; i++) {
    const area = plan.priorityAreas[i]!;
    if (opts.bodyParts.includes(area)) {
      score += Math.max(2, 8 - i); // higher weight for top priority regions
    }
  }

  // Preferred catalog IDs (pattern templates)
  if (opts.kind === "stretch" && plan.preferredStretchIds.includes(opts.id)) score += 12;
  if (opts.kind === "exercise" && plan.preferredExerciseIds.includes(opts.id)) score += 12;

  for (const t of plan.preferTags) {
    if (opts.tags.includes(t) || blob.includes(t.replace(/-/g, " "))) score += 3;
  }
  for (const t of plan.avoidTags) {
    if (t === "all") score -= 30;
    else if (opts.tags.includes(t) || blob.includes(t.replace(/-/g, " "))) score -= 8;
  }

  // Phase-appropriate kind bias
  if (plan.phase === "protect-calm" || plan.phase === "mobility-restore") {
    if (opts.kind === "stretch") score += 3;
    if (opts.kind === "exercise" && /isometric|activation|set|bridge|bird|dead.?bug|quad set/i.test(blob))
      score += 5;
    if (opts.kind === "exercise" && /jump|plyo|heavy|max/i.test(blob)) score -= 10;
  }
  if (plan.phase === "motor-control") {
    if (/motor-control|activation|timing|control|bird|dead.?bug|scapular|bridge/i.test(blob))
      score += 6;
  }
  if (plan.phase === "capacity-load" || plan.phase === "function-return") {
    if (opts.kind === "exercise") score += 4;
    if (/functional|sit.to.stand|step|row|carry|strength/i.test(blob)) score += 4;
  }

  return score;
}
