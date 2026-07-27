/**
 * Routine specificity engine — maps free-text “Describe Your Issue” signals
 * to concrete stretch/exercise library IDs for highly personalized HEPs.
 * Educational only — not diagnosis or licensed care.
 */

import type { BodyPart } from "@/lib/types";
import type { StoryIntelligence } from "@/lib/story-intelligence";

export type StoryMovementPrefs = {
  /** Library stretch IDs ordered by story priority */
  stretchIds: string[];
  /** Library exercise IDs ordered by story priority */
  exerciseIds: string[];
  /** Tags to heavily boost in scoring */
  boostTags: string[];
  /** Tags / phrases to penalize */
  avoidTags: string[];
  /** Human-readable reasons (plan narrative / safety education) */
  reasonLines: string[];
  /** Extra scoring weight for preferred IDs */
  preferredIdBoost: number;
};

function unique(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

/**
 * Translate story intelligence into concrete catalog movement preferences.
 * This is the primary bridge from free text → routine composition.
 */
export function storyPreferredMovements(
  intel: StoryIntelligence | null | undefined,
  opts?: { areas?: BodyPart[] }
): StoryMovementPrefs {
  if (!intel || intel.richness === "empty") {
    return {
      stretchIds: [],
      exerciseIds: [],
      boostTags: [],
      avoidTags: [],
      reasonLines: [],
      preferredIdBoost: 0,
    };
  }

  const stretches: string[] = [];
  const exercises: string[] = [];
  const boostTags: string[] = [...intel.planHints.preferTags];
  const avoidTags: string[] = [...intel.planHints.avoidTags];
  const reasons: string[] = [];

  const hasAgg = (...keys: string[]) =>
    intel.aggravators.some((a) => keys.some((k) => a.includes(k)));
  const hasFn = (...keys: string[]) =>
    intel.functionalLimits.some((f) => keys.some((k) => f.includes(k)));
  const hasSens = (...keys: string[]) =>
    intel.sensory.some((s) => keys.some((k) => s.includes(k)));
  const hasDir = (...keys: string[]) =>
    intel.directionalCues.some((d) => keys.some((k) => d.includes(k)));
  const region = (bps: BodyPart[]) =>
    bps.some(
      (b) =>
        intel.regions.includes(b) ||
        (opts?.areas || []).includes(b)
    );

  // —— Aggravator / function driven (highest specificity) ——
  if (hasAgg("sitting", "desk") || hasFn("work/desk")) {
    stretches.push(
      "chin-tuck",
      "doorway-chest-stretch",
      "open-book-thoracic",
      "upper-trap-stretch",
      "half-kneeling-hip-flexor",
      "cat-cow"
    );
    exercises.push(
      "ex-scapular-rows-band",
      "ex-thoracic-extension-foam",
      "ex-serratus-punch",
      "ex-cervical-isometrics",
      "ex-glute-bridge"
    );
    boostTags.push("desk", "posture", "thoracic", "cervical", "chin-tuck", "hip", "flexor");
    reasons.push(
      "Story: sitting/desk flares → cervical/thoracic mobility + scapular control + hip flexor length."
    );
  }

  if (hasAgg("stairs") || hasFn("stairs")) {
    stretches.push("supine-hamstring-strap", "quad-standing", "half-kneeling-hip-flexor");
    exercises.push(
      "ex-sit-to-stand",
      "ex-terminal-knee-extension",
      "ex-quad-set",
      "ex-glute-bridge",
      "ex-heel-raises",
      "ex-step-up"
    );
    boostTags.push("stairs", "quad", "glute", "functional", "knee", "closed-chain");
    reasons.push(
      "Story: stairs limited → sit-to-stand, TKE/quad set, glute bridge, heel raises for graded LE control."
    );
  }

  if (hasAgg("walking") || hasFn("walking")) {
    stretches.push("supine-hamstring-strap", "ankle-alphabet", "half-kneeling-hip-flexor");
    exercises.push(
      "ex-heel-raises",
      "ex-glute-bridge",
      "ex-tandem-balance",
      "ex-sit-to-stand",
      "ex-side-lying-abduction"
    );
    boostTags.push("gait", "calf", "glute", "balance", "hip");
    reasons.push("Story: walking limited → calf/hip/glute capacity and balance confidence.");
  }

  if (hasAgg("bending") || hasAgg("lifting") || hasFn("lifting")) {
    stretches.push("cat-cow", "pelvic-tilt", "childs-pose", "half-kneeling-hip-flexor");
    exercises.push(
      "ex-hip-hinge-dowel",
      "ex-bird-dog",
      "ex-dead-bug",
      "ex-glute-bridge"
    );
    boostTags.push("hip-hinge", "motor-control", "core", "glute", "spinal-safe");
    avoidTags.push("end-range-flexion-load", "ballistic", "twist-aggressive");
    reasons.push(
      "Story: bend/lift limits → hip-hinge motor control, bird-dog/dead-bug, protected spinal motion."
    );
  }

  if (hasAgg("reaching") || hasFn("reaching")) {
    stretches.push("doorway-chest-stretch", "upper-trap-stretch", "open-book-thoracic");
    exercises.push(
      "ex-scapular-rows-band",
      "ex-serratus-punch",
      "ex-shoulder-er-band",
      "ex-wall-pushup"
    );
    boostTags.push("scapular", "shoulder", "rotator-cuff", "serratus", "posture");
    avoidTags.push("overhead-aggressive");
    reasons.push(
      "Story: reaching limits → scapular setting, gentle ER, wall push — not aggressive overhead."
    );
  }

  if (hasAgg("morning") || hasSens("stiff")) {
    stretches.push(
      "cat-cow",
      "knee-to-chest",
      "open-book-thoracic",
      "ankle-alphabet",
      "childs-pose"
    );
    boostTags.push("mobility", "warmup", "gentle", "flexibility");
    reasons.push("Story: stiffness/morning pattern → gentle mobility first, then light control.");
  }

  if (hasAgg("night") || hasFn("sleep")) {
    stretches.push("childs-pose", "knee-to-chest", "cat-cow", "chin-tuck");
    exercises.push("ex-dead-bug", "ex-glute-bridge");
    boostTags.push("gentle", "protected", "calm");
    reasons.push("Story: night/sleep impact → calm protected mobility; short volume.");
  }

  // —— Directional preference cues ——
  if (hasDir("sitting-sensitive", "flexion-sensitive")) {
    stretches.push("cat-cow", "open-book-thoracic", "half-kneeling-hip-flexor");
    exercises.push("ex-glute-bridge", "ex-bird-dog", "ex-hip-hinge-dowel");
    boostTags.push("extension", "hip", "glute", "motor-control");
    avoidTags.push("end-range-flexion-load");
    reasons.push("Story: flexion/sitting-sensitive cues → extension-friendly + hip/glute control.");
  }
  if (hasDir("extension-sensitive", "standing-sensitive")) {
    stretches.push("knee-to-chest", "childs-pose", "supine-hamstring-strap");
    boostTags.push("flexion-gentle", "mobility");
    reasons.push("Story: extension/standing-sensitive cues → gentle flexion-biased mobility.");
  }

  // —— Region-specific core sets ——
  if (region(["lower-back", "pelvis", "core"])) {
    stretches.push("cat-cow", "pelvic-tilt", "childs-pose", "knee-to-chest", "figure-four-glute");
    exercises.push("ex-bird-dog", "ex-dead-bug", "ex-glute-bridge", "ex-hip-hinge-dowel");
    boostTags.push("lumbar", "core", "glute", "motor-control");
    if (intel.irritability === "high" || intel.neuroLanguage) {
      avoidTags.push("plyo", "heavy-load", "end-range", "neural-aggressive");
    }
    reasons.push("Story priority region: lumbar/pelvis → motor control + protected mobility.");
  }

  if (region(["neck", "jaw"])) {
    stretches.push("chin-tuck", "upper-trap-stretch", "doorway-chest-stretch", "open-book-thoracic");
    exercises.push("ex-scapular-rows-band", "ex-cervical-isometrics", "ex-thoracic-extension-foam");
    boostTags.push("cervical", "posture", "chin-tuck", "scapular");
    reasons.push("Story priority region: neck → chin-tuck, scapular endurance, thoracic mobility.");
  }

  if (region(["shoulders", "scapular", "chest"])) {
    stretches.push("doorway-chest-stretch", "upper-trap-stretch", "open-book-thoracic");
    exercises.push(
      "ex-scapular-rows-band",
      "ex-shoulder-er-band",
      "ex-serratus-punch",
      "ex-wall-pushup"
    );
    boostTags.push("shoulder", "scapular", "rotator-cuff");
    reasons.push("Story priority region: shoulder/scapula → cuff/scapular control.");
  }

  if (region(["hips", "glutes", "groin", "hamstrings"])) {
    stretches.push(
      "half-kneeling-hip-flexor",
      "figure-four-glute",
      "supine-hamstring-strap",
      "cat-cow"
    );
    exercises.push(
      "ex-glute-bridge",
      "ex-side-lying-abduction",
      "ex-sit-to-stand",
      "ex-hip-hinge-dowel"
    );
    boostTags.push("hip", "glute", "hamstring", "mobility");
    reasons.push("Story priority region: hip/glute → flexor/glute mobility + activation.");
  }

  if (region(["knee", "quadriceps"])) {
    stretches.push("supine-hamstring-strap", "quad-standing", "childs-pose");
    exercises.push(
      "ex-quad-set",
      "ex-terminal-knee-extension",
      "ex-sit-to-stand",
      "ex-glute-bridge",
      "ex-slr"
    );
    boostTags.push("knee", "quad", "isometric", "closed-chain-gentle");
    avoidTags.push("deep-squat", "lunge-aggressive", "jump", "plyo");
    reasons.push("Story priority region: knee → isometrics, TKE, graded sit-to-stand.");
  }

  if (region(["ankles", "foot", "calves", "shins", "toes"])) {
    stretches.push("ankle-alphabet", "gastroc-wall", "plantar-fascia-wall", "supine-hamstring-strap");
    exercises.push(
      "ex-heel-raises",
      "ex-tandem-balance",
      "ex-ankle-alphabet-strength",
      "ex-short-foot"
    );
    boostTags.push("ankle", "foot", "calf", "balance", "proprioception");
    reasons.push("Story priority region: ankle/foot → mobility, heel raise, balance.");
  }

  if (region(["thoracic", "upper-back"])) {
    stretches.push("open-book-thoracic", "cat-cow", "doorway-chest-stretch", "chin-tuck");
    exercises.push(
      "ex-thoracic-extension-foam",
      "ex-scapular-rows-band",
      "ex-serratus-punch"
    );
    boostTags.push("thoracic", "posture", "extension", "scapular");
    reasons.push("Story priority region: thoracic → rotation/extension + scapular work.");
  }

  // —— Neuro / high irritability ——
  if (intel.neuroLanguage || intel.radiation) {
    stretches.push("cat-cow", "chin-tuck", "supine-hamstring-strap", "childs-pose", "pelvic-tilt");
    exercises.push("ex-bird-dog", "ex-dead-bug", "ex-glute-bridge");
    boostTags.push("gentle", "neural-gentle", "motor-control", "core");
    avoidTags.push("neural-aggressive", "end-range", "ballistic", "plyo");
    reasons.push(
      "Story: neuro/radiation language → gentle dosing, motor control; avoid aggressive neural tension."
    );
  }

  if (intel.irritability === "high" || intel.activityResponse === "delayed-worse") {
    boostTags.push("gentle", "isometric", "activation", "protected", "motor-control");
    avoidTags.push("plyo", "jump", "heavy-load", "impact", "end-range");
    reasons.push(
      `Story: ${intel.irritability} irritability${
        intel.activityResponse === "delayed-worse" ? " + delayed flare" : ""
      } → protect-calm IDs preferred.`
    );
  }

  if (intel.fearAvoidance) {
    exercises.push("ex-sit-to-stand", "ex-glute-bridge", "ex-bird-dog", "ex-wall-pushup");
    boostTags.push("gentle", "functional", "motor-control");
    reasons.push("Story: fear-avoidance → high-success graded functional control drills.");
  }

  // —— Occupation / work-role specific HEP seeds ——
  if (intel.occupation?.source === "stated") {
    const o = intel.occupation;
    stretches.push(...o.preferredStretchIds);
    exercises.push(...o.preferredExerciseIds);
    boostTags.push(...o.preferTags);
    avoidTags.push(...o.avoidTags);
    reasons.push(
      `Occupation: ${o.label} → ${o.sessionNotes[0] || o.preferTags.slice(0, 4).join(", ")}`
    );
  }

  if (hasSens("weakness", "giving-way")) {
    exercises.push(
      "ex-quad-set",
      "ex-glute-bridge",
      "ex-sit-to-stand",
      "ex-heel-raises",
      "ex-tandem-balance"
    );
    boostTags.push("activation", "isometric", "strength", "balance");
    reasons.push("Story: weakness/giving-way → activation isometrics + supported balance.");
  }

  // Always seed a calm opener when story is rich
  if (intel.richness === "rich" || intel.richness === "clinical") {
    stretches.unshift("cat-cow", "pelvic-tilt");
  }

  return {
    stretchIds: unique(stretches).slice(0, 12),
    exerciseIds: unique(exercises).slice(0, 12),
    boostTags: unique(boostTags),
    avoidTags: unique(avoidTags),
    reasonLines: unique(reasons).slice(0, 8),
    preferredIdBoost: intel.richness === "clinical" || intel.richness === "rich" ? 28 : 18,
  };
}

/**
 * Extra score for a movement ID under story-specific preferences.
 */
export function storyIdBoost(
  prefs: StoryMovementPrefs,
  movementId: string,
  kind: "stretch" | "exercise"
): number {
  if (!prefs.preferredIdBoost) return 0;
  const list = kind === "stretch" ? prefs.stretchIds : prefs.exerciseIds;
  const idx = list.indexOf(movementId);
  if (idx === -1) return 0;
  // Higher boost for earlier (more story-relevant) IDs
  return prefs.preferredIdBoost - idx * 1.5;
}

/**
 * Penalty when story is region-specific but movement doesn't touch priority regions.
 */
export function storyRegionMismatchPenalty(
  intel: StoryIntelligence | null | undefined,
  bodyParts: BodyPart[]
): number {
  if (!intel || intel.regions.length === 0) return 0;
  if (intel.richness === "empty" || intel.richness === "thin") return 0;
  const hit = bodyParts.some(
    (bp) =>
      intel.regions.includes(bp) ||
      // Related chains
      (intel.regions.includes("lower-back") &&
        ["hips", "glutes", "core", "hamstrings", "pelvis"].includes(bp)) ||
      (intel.regions.includes("neck") &&
        ["shoulders", "scapular", "thoracic", "chest"].includes(bp)) ||
      (intel.regions.includes("knee") &&
        ["quadriceps", "hamstrings", "glutes", "hips", "calves"].includes(bp)) ||
      (intel.regions.includes("shoulders") &&
        ["scapular", "chest", "thoracic", "neck"].includes(bp))
  );
  if (hit) return 0;
  // Strong penalty for off-topic full-body when story is focused
  if (bodyParts.includes("full-body") && intel.regions.length <= 3) return -14;
  return -10;
}
