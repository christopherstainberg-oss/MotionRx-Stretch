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

  if (
    input.clearanceRequired ||
    has("surgery", "post-op", "postop", "replacement", "s/p", "fracture", "fusion") ||
    (input.precautionIds && input.precautionIds.length > 0)
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
}): RehabPhase {
  if (opts.clearanceRequired || opts.patterns.includes("post-op-conservative")) {
    return opts.avgPain >= 4 ? "protect-calm" : "motor-control";
  }
  if (opts.avgPain >= 6 || opts.patterns.includes("lumbar-irritable") || opts.patterns.includes("neuro-sensitive")) {
    return "protect-calm";
  }
  if (opts.avgPain >= 4) {
    return opts.patterns.includes("general-decond") ? "motor-control" : "mobility-restore";
  }
  if (opts.patterns.includes("balance-fall-risk")) return "motor-control";
  if (opts.avgPain <= 2) return "capacity-load";
  return "mobility-restore";
}

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

  // Story-driven phase can override generic phase when free text is rich
  let phase = phaseFor({
    avgPain,
    patterns,
    clearanceRequired: cond.clearanceRequired,
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
    if (story.irritability === "high" || story.redFlagHints.length) {
      phase = "protect-calm";
    } else if (order.indexOf(storyPhase) < order.indexOf(phase)) {
      phase = storyPhase;
    } else if (story.irritability === "low" && avgPain <= 3) {
      phase = storyPhase;
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

  for (const pat of patterns) {
    const pref = PATTERN_PREFS[pat];
    preferTags.push(...pref.preferTags);
    avoidTags.push(...pref.avoidTags);
    preferredStretchIds.push(...pref.stretches);
    preferredExerciseIds.push(...pref.exercises);
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
    `Session built as graded outpatient-style HEP: ${PHASE_BLUEPRINT[phase].join(" → ")}.`,
    avgPain >= 5 || story?.irritability === "high"
      ? "Higher irritability: prioritize control and protected ROM over aggressive stretch or load."
      : story?.irritability === "low"
        ? "Lower irritability (stated evidence): progress motor control and capacity while maintaining mobility gains."
        : "Irritability not assumed from silence — use traffic-light dosing and reassess from what the user states.",
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
