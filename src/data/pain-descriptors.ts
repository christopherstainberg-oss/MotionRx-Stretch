/**
 * Clinically significant pain descriptor library.
 * Bases are drawn from common outpatient PT intake language, McGill-style
 * sensory/affective qualities, mechanical behavior, and neurologic patterns.
 * Expanded into a large searchable catalog via region + intensity editions.
 */

export type DescriptorCategory =
  | "quality-sensory"
  | "quality-affective"
  | "temporal"
  | "mechanical-aggravating"
  | "mechanical-easing"
  | "neurologic"
  | "inflammatory-pattern"
  | "postural-load"
  | "activity-related"
  | "spatial-pattern"
  | "red-flag-screen";

export type ProgramBias =
  | "gentle-mobility"
  | "controlled-strength"
  | "motor-control"
  | "neural-caution"
  | "avoid-endrange"
  | "prefer-extension"
  | "prefer-flexion"
  | "prefer-unloaded"
  | "short-volume"
  | "warm-up-heavy"
  | "cooldown-heavy"
  | "balance-focus"
  | "postural-endurance"
  | "defer-to-provider";

export interface PainDescriptor {
  id: string;
  label: string;
  clinicalTerm: string;
  category: DescriptorCategory;
  /** Plain language for users */
  plainLanguage: string;
  /** Kid-friendly analogy */
  kidFriendly: string;
  /** Tags used for matching library movements */
  relatedTags: string[];
  bodyPartsHint?: string[];
  programBiases: ProgramBias[];
  /** Prefer stretch vs exercise volume weight -1..1 */
  stretchBias: number;
  exerciseBias: number;
  /** Raise effective pain for dosing when present */
  irritabilityBoost: number;
  avoidTags: string[];
  preferTags: string[];
  maxDifficulty?: "beginner" | "intermediate" | "advanced";
  redFlagEducation?: string;
  searchTerms: string[];
}

export const DESCRIPTOR_CATEGORY_LABELS: Record<DescriptorCategory, string> = {
  "quality-sensory": "How it feels (sensory)",
  "quality-affective": "How it affects you",
  temporal: "When it happens",
  "mechanical-aggravating": "What makes it worse",
  "mechanical-easing": "What makes it better",
  neurologic: "Nerve-like symptoms",
  "inflammatory-pattern": "Stiffness / inflammatory pattern",
  "postural-load": "Posture & load",
  "activity-related": "Activity-related",
  "spatial-pattern": "Where symptoms go",
  "red-flag-screen": "Urgent-care screening questions",
};

type Seed = Omit<PainDescriptor, "searchTerms"> & { searchTerms?: string[] };

const SEEDS: Seed[] = [
  // —— Sensory quality (McGill-adjacent) ——
  {
    id: "pd-aching",
    label: "Aching",
    clinicalTerm: "Dull ache",
    category: "quality-sensory",
    plainLanguage: "A deep, dull ache that lingers.",
    kidFriendly: "Like a bruise that keeps humming.",
    relatedTags: ["stiffness", "mobility", "warmup"],
    programBiases: ["gentle-mobility", "warm-up-heavy"],
    stretchBias: 0.4,
    exerciseBias: 0.1,
    irritabilityBoost: 0,
    avoidTags: [],
    preferTags: ["warmup", "mobility", "cooldown"],
  },
  {
    id: "pd-sharp",
    label: "Sharp",
    clinicalTerm: "Sharp pain",
    category: "quality-sensory",
    plainLanguage: "Sudden, knife-like pain with certain moves.",
    kidFriendly: "Like stepping on a Lego—quick and ouch.",
    relatedTags: ["caution"],
    programBiases: ["gentle-mobility", "avoid-endrange", "short-volume", "motor-control"],
    stretchBias: 0.2,
    exerciseBias: -0.2,
    irritabilityBoost: 2,
    avoidTags: ["athletic", "advanced", "neural"],
    preferTags: ["motor-control", "beginner"],
    maxDifficulty: "beginner",
  },
  {
    id: "pd-stabbing",
    label: "Stabbing",
    clinicalTerm: "Stabbing / lancinating",
    category: "quality-sensory",
    plainLanguage: "Brief stabbing jabs.",
    kidFriendly: "Like a tiny pin poke that comes and goes.",
    relatedTags: ["caution"],
    programBiases: ["short-volume", "avoid-endrange", "gentle-mobility"],
    stretchBias: 0.1,
    exerciseBias: -0.3,
    irritabilityBoost: 2,
    avoidTags: ["neural", "athletic"],
    preferTags: ["control"],
    maxDifficulty: "beginner",
  },
  {
    id: "pd-burning",
    label: "Burning",
    clinicalTerm: "Burning dysesthesia",
    category: "quality-sensory",
    plainLanguage: "Hot or burning sensation, sometimes skin-level.",
    kidFriendly: "Like a sunburn feeling under the skin.",
    relatedTags: ["neural"],
    programBiases: ["neural-caution", "gentle-mobility", "short-volume"],
    stretchBias: 0.1,
    exerciseBias: 0,
    irritabilityBoost: 1.5,
    avoidTags: ["neural"],
    preferTags: ["motor-control", "activation"],
    maxDifficulty: "beginner",
  },
  {
    id: "pd-throbbing",
    label: "Throbbing",
    clinicalTerm: "Throbbing / pulsatile quality",
    category: "quality-sensory",
    plainLanguage: "Pulsing with your heartbeat or waves of intensity.",
    kidFriendly: "Like a drum thump in the sore spot.",
    relatedTags: [],
    programBiases: ["short-volume", "prefer-unloaded", "gentle-mobility"],
    stretchBias: 0.2,
    exerciseBias: -0.2,
    irritabilityBoost: 1,
    avoidTags: ["athletic"],
    preferTags: ["cooldown", "relaxation"],
  },
  {
    id: "pd-tight-band",
    label: "Tight / band-like",
    clinicalTerm: "Constriction / tightness",
    category: "quality-sensory",
    plainLanguage: "Feels bound or wrapped tightly.",
    kidFriendly: "Like wearing a belt that’s a notch too small.",
    relatedTags: ["stiffness", "mobility", "desk"],
    programBiases: ["gentle-mobility", "warm-up-heavy"],
    stretchBias: 0.6,
    exerciseBias: 0.1,
    irritabilityBoost: 0,
    avoidTags: [],
    preferTags: ["mobility", "warmup", "thoracic"],
  },
  {
    id: "pd-stiff",
    label: "Stiff",
    clinicalTerm: "Stiffness / reduced compliance",
    category: "quality-sensory",
    plainLanguage: "Hard to get moving; tissues feel rigid.",
    kidFriendly: "Like a rusty door hinge at first.",
    relatedTags: ["stiffness", "morning", "mobility"],
    programBiases: ["warm-up-heavy", "gentle-mobility"],
    stretchBias: 0.7,
    exerciseBias: 0.2,
    irritabilityBoost: 0,
    avoidTags: [],
    preferTags: ["warmup", "mobility", "desk"],
  },
  {
    id: "pd-sore",
    label: "Sore / tender",
    clinicalTerm: "Tenderness / DOMS-like soreness",
    category: "quality-sensory",
    plainLanguage: "Tender to touch or general soreness.",
    kidFriendly: "Like after a big playground day.",
    relatedTags: ["recovery"],
    programBiases: ["gentle-mobility", "short-volume"],
    stretchBias: 0.4,
    exerciseBias: -0.1,
    irritabilityBoost: 0.5,
    avoidTags: ["power", "athletic"],
    preferTags: ["cooldown", "mobility"],
  },
  {
    id: "pd-cramping",
    label: "Cramping",
    clinicalTerm: "Cramp / spasm quality",
    category: "quality-sensory",
    plainLanguage: "Muscle seizes or cramps.",
    kidFriendly: "Like a muscle making a tight fist.",
    relatedTags: ["calves", "activation"],
    programBiases: ["gentle-mobility", "controlled-strength", "short-volume"],
    stretchBias: 0.5,
    exerciseBias: 0.2,
    irritabilityBoost: 1,
    avoidTags: ["endurance"],
    preferTags: ["mobility", "activation"],
  },
  {
    id: "pd-pressure",
    label: "Pressure / heaviness",
    clinicalTerm: "Pressure sensation",
    category: "quality-sensory",
    plainLanguage: "Heavy pressure sensation.",
    kidFriendly: "Like a backpack resting on the sore place.",
    relatedTags: ["posture"],
    programBiases: ["postural-endurance", "gentle-mobility"],
    stretchBias: 0.3,
    exerciseBias: 0.3,
    irritabilityBoost: 0,
    avoidTags: [],
    preferTags: ["posture", "core", "scapula"],
  },
  {
    id: "pd-gnawing",
    label: "Gnawing",
    clinicalTerm: "Gnawing discomfort",
    category: "quality-sensory",
    plainLanguage: "Persistent gnawing discomfort.",
    kidFriendly: "Like a small bite that won’t stop.",
    relatedTags: [],
    programBiases: ["gentle-mobility", "motor-control"],
    stretchBias: 0.3,
    exerciseBias: 0.2,
    irritabilityBoost: 0.5,
    avoidTags: [],
    preferTags: ["control", "activation"],
  },
  {
    id: "pd-electric",
    label: "Electric / zapping",
    clinicalTerm: "Electric shock-like",
    category: "neurologic",
    plainLanguage: "Quick electric zaps with certain positions.",
    kidFriendly: "Like a static shock from a doorknob.",
    relatedTags: ["neural"],
    programBiases: ["neural-caution", "avoid-endrange", "short-volume", "defer-to-provider"],
    stretchBias: -0.2,
    exerciseBias: 0,
    irritabilityBoost: 2.5,
    avoidTags: ["neural", "advanced"],
    preferTags: ["motor-control", "beginner"],
    maxDifficulty: "beginner",
    redFlagEducation:
      "Electric or progressive neurologic symptoms deserve clinical evaluation if new, severe, or worsening.",
  },
  {
    id: "pd-numb",
    label: "Numbness",
    clinicalTerm: "Hypoesthesia / numbness",
    category: "neurologic",
    plainLanguage: "Reduced feeling or “asleep” sensation.",
    kidFriendly: "Like your foot fell asleep.",
    relatedTags: ["neural"],
    programBiases: ["neural-caution", "motor-control", "short-volume"],
    stretchBias: -0.1,
    exerciseBias: 0.2,
    irritabilityBoost: 1.5,
    avoidTags: ["neural"],
    preferTags: ["motor-control", "activation"],
    maxDifficulty: "beginner",
    redFlagEducation:
      "New or progressive numbness with weakness needs professional assessment.",
  },
  {
    id: "pd-tingling",
    label: "Tingling / pins and needles",
    clinicalTerm: "Paresthesia",
    category: "neurologic",
    plainLanguage: "Pins-and-needles or buzzing.",
    kidFriendly: "Like soda bubbles under the skin.",
    relatedTags: ["neural", "desk", "wrists"],
    programBiases: ["neural-caution", "postural-endurance", "gentle-mobility"],
    stretchBias: 0.1,
    exerciseBias: 0.2,
    irritabilityBoost: 1,
    avoidTags: ["neural"],
    preferTags: ["posture", "desk", "control"],
    maxDifficulty: "intermediate",
  },
  {
    id: "pd-shooting",
    label: "Shooting down the limb",
    clinicalTerm: "Radiating / shooting pain",
    category: "neurologic",
    plainLanguage: "Pain travels down an arm or leg.",
    kidFriendly: "Like a lightning bolt down the leg or arm.",
    relatedTags: ["neural", "lumbar", "cervical"],
    programBiases: ["neural-caution", "avoid-endrange", "short-volume", "prefer-unloaded"],
    stretchBias: 0,
    exerciseBias: 0.1,
    irritabilityBoost: 2,
    avoidTags: ["neural", "athletic"],
    preferTags: ["motor-control", "core", "gentle"],
    maxDifficulty: "beginner",
  },
  {
    id: "pd-weakness-sense",
    label: "Feels weak / giving way",
    clinicalTerm: "Subjective weakness / instability",
    category: "neurologic",
    plainLanguage: "Limb feels unreliable or about to give out.",
    kidFriendly: "Like a wobbly table leg.",
    relatedTags: ["strength", "balance", "control"],
    programBiases: ["controlled-strength", "motor-control", "balance-focus"],
    stretchBias: -0.1,
    exerciseBias: 0.7,
    irritabilityBoost: 0.5,
    avoidTags: [],
    preferTags: ["strength", "balance", "functional", "activation"],
    redFlagEducation:
      "True progressive weakness or falls should be evaluated by a clinician.",
  },

  // —— Temporal ——
  {
    id: "pd-morning-stiff",
    label: "Worse in the morning",
    clinicalTerm: "Morning predominance",
    category: "temporal",
    plainLanguage: "Stiffer or more painful after waking.",
    kidFriendly: "Hard to start the day, like cold morning muscles.",
    relatedTags: ["morning", "stiffness"],
    programBiases: ["warm-up-heavy", "gentle-mobility"],
    stretchBias: 0.6,
    exerciseBias: 0.2,
    irritabilityBoost: 0,
    avoidTags: [],
    preferTags: ["morning", "warmup", "mobility"],
  },
  {
    id: "pd-night-pain",
    label: "Night pain / sleep disruption",
    clinicalTerm: "Nocturnal pain",
    category: "temporal",
    plainLanguage: "Wakes you or prevents comfortable sleep.",
    kidFriendly: "Pain that visits at bedtime.",
    relatedTags: [],
    programBiases: ["short-volume", "gentle-mobility", "defer-to-provider"],
    stretchBias: 0.2,
    exerciseBias: -0.1,
    irritabilityBoost: 1.5,
    avoidTags: ["athletic"],
    preferTags: ["cooldown", "relaxation"],
    redFlagEducation:
      "Unexplained night pain that does not change with position may need medical review.",
  },
  {
    id: "pd-constant",
    label: "Constant",
    clinicalTerm: "Constant symptoms",
    category: "temporal",
    plainLanguage: "Present most or all of the time.",
    kidFriendly: "The ouch stays on, like a light that won’t switch off.",
    relatedTags: [],
    programBiases: ["short-volume", "gentle-mobility", "motor-control"],
    stretchBias: 0.2,
    exerciseBias: 0,
    irritabilityBoost: 1.5,
    avoidTags: ["athletic", "advanced"],
    preferTags: ["beginner", "control"],
    maxDifficulty: "beginner",
  },
  {
    id: "pd-intermittent",
    label: "Comes and goes",
    clinicalTerm: "Intermittent",
    category: "temporal",
    plainLanguage: "Episodes that start and stop.",
    kidFriendly: "Like rain showers of ouch.",
    relatedTags: [],
    programBiases: ["controlled-strength", "gentle-mobility"],
    stretchBias: 0.3,
    exerciseBias: 0.3,
    irritabilityBoost: 0,
    avoidTags: [],
    preferTags: ["mobility", "activation"],
  },
  {
    id: "pd-after-activity",
    label: "Worse after activity",
    clinicalTerm: "Post-activity flare",
    category: "activity-related",
    plainLanguage: "Feels worse hours after exercise or work.",
    kidFriendly: "Fine during play, grumpy later.",
    relatedTags: ["recovery"],
    programBiases: ["short-volume", "cooldown-heavy", "gentle-mobility"],
    stretchBias: 0.3,
    exerciseBias: -0.2,
    irritabilityBoost: 1,
    avoidTags: ["endurance", "power"],
    preferTags: ["cooldown", "recovery"],
  },
  {
    id: "pd-during-activity",
    label: "Worse during activity",
    clinicalTerm: "Activity-provoked",
    category: "activity-related",
    plainLanguage: "Builds while you are moving or working.",
    kidFriendly: "Gets louder while you are using it.",
    relatedTags: [],
    programBiases: ["motor-control", "short-volume", "controlled-strength"],
    stretchBias: 0.2,
    exerciseBias: 0.2,
    irritabilityBoost: 1,
    avoidTags: ["athletic"],
    preferTags: ["control", "activation"],
  },
  {
    id: "pd-end-of-day",
    label: "Worse by end of day",
    clinicalTerm: "End-of-day accumulation",
    category: "temporal",
    plainLanguage: "Builds with daily load and posture time.",
    kidFriendly: "Tired body at bedtime feels more ouchy.",
    relatedTags: ["desk", "posture"],
    programBiases: ["postural-endurance", "gentle-mobility", "cooldown-heavy"],
    stretchBias: 0.4,
    exerciseBias: 0.4,
    irritabilityBoost: 0.5,
    avoidTags: [],
    preferTags: ["desk", "posture", "evening"],
  },

  // —— Mechanical aggravating ——
  {
    id: "pd-worse-sitting",
    label: "Worse with sitting",
    clinicalTerm: "Sitting intolerance",
    category: "mechanical-aggravating",
    plainLanguage: "Sitting increases symptoms.",
    kidFriendly: "Chairs make it grumpy.",
    relatedTags: ["desk", "hips", "lumbar"],
    bodyPartsHint: ["lower-back", "hips", "hamstrings"],
    programBiases: ["prefer-extension", "gentle-mobility", "controlled-strength"],
    stretchBias: 0.4,
    exerciseBias: 0.3,
    irritabilityBoost: 0.5,
    avoidTags: [],
    preferTags: ["desk", "hips", "hip-flexor", "glutes", "extension"],
  },
  {
    id: "pd-worse-standing",
    label: "Worse with standing",
    clinicalTerm: "Standing intolerance",
    category: "mechanical-aggravating",
    plainLanguage: "Standing still increases symptoms.",
    kidFriendly: "Standing in line makes it louder.",
    relatedTags: ["lumbar", "extension"],
    bodyPartsHint: ["lower-back", "calves"],
    programBiases: ["prefer-flexion", "gentle-mobility", "motor-control"],
    stretchBias: 0.4,
    exerciseBias: 0.2,
    irritabilityBoost: 0.5,
    avoidTags: [],
    preferTags: ["flexion", "core", "mobility"],
  },
  {
    id: "pd-worse-walking",
    label: "Worse with walking",
    clinicalTerm: "Walking-related symptoms",
    category: "mechanical-aggravating",
    plainLanguage: "Walking brings symptoms on.",
    kidFriendly: "Steps make the ouch talk.",
    relatedTags: ["gait", "calves", "hips"],
    programBiases: ["controlled-strength", "balance-focus", "short-volume"],
    stretchBias: 0.2,
    exerciseBias: 0.5,
    irritabilityBoost: 0.5,
    avoidTags: [],
    preferTags: ["gait", "functional", "hips", "calves", "balance"],
  },
  {
    id: "pd-worse-bending",
    label: "Worse bending forward",
    clinicalTerm: "Flexion-sensitive",
    category: "mechanical-aggravating",
    plainLanguage: "Bending or rounding forward increases pain.",
    kidFriendly: "Touching toes makes it shout.",
    relatedTags: ["flexion", "lumbar"],
    bodyPartsHint: ["lower-back"],
    programBiases: ["prefer-extension", "avoid-endrange", "motor-control"],
    stretchBias: 0.1,
    exerciseBias: 0.3,
    irritabilityBoost: 1,
    avoidTags: [],
    preferTags: ["extension", "core", "activation", "glutes"],
  },
  {
    id: "pd-worse-arching",
    label: "Worse arching backward",
    clinicalTerm: "Extension-sensitive",
    category: "mechanical-aggravating",
    plainLanguage: "Arching or looking up increases pain.",
    kidFriendly: "Bending like a banana the wrong way hurts.",
    relatedTags: ["extension", "lumbar", "cervical"],
    programBiases: ["prefer-flexion", "avoid-endrange", "gentle-mobility"],
    stretchBias: 0.3,
    exerciseBias: 0.2,
    irritabilityBoost: 1,
    avoidTags: [],
    preferTags: ["flexion", "mobility", "core"],
  },
  {
    id: "pd-worse-twisting",
    label: "Worse with twisting",
    clinicalTerm: "Rotation-sensitive",
    category: "mechanical-aggravating",
    plainLanguage: "Turning the trunk or neck increases symptoms.",
    kidFriendly: "Looking over your shoulder makes it cranky.",
    relatedTags: ["thoracic", "rotation"],
    programBiases: ["gentle-mobility", "motor-control", "short-volume"],
    stretchBias: 0.3,
    exerciseBias: 0.2,
    irritabilityBoost: 1,
    avoidTags: ["athletic"],
    preferTags: ["thoracic", "control", "mobility"],
  },
  {
    id: "pd-worse-lifting",
    label: "Worse with lifting",
    clinicalTerm: "Load-sensitive",
    category: "mechanical-aggravating",
    plainLanguage: "Lifting objects increases symptoms.",
    kidFriendly: "Picking up heavy toys makes it yell.",
    relatedTags: ["strength", "functional", "core"],
    programBiases: ["controlled-strength", "motor-control", "short-volume"],
    stretchBias: 0.1,
    exerciseBias: 0.6,
    irritabilityBoost: 1,
    avoidTags: ["power"],
    preferTags: ["core", "functional", "activation", "glutes"],
  },
  {
    id: "pd-worse-overhead",
    label: "Worse reaching overhead",
    clinicalTerm: "Overhead provocation",
    category: "mechanical-aggravating",
    plainLanguage: "Arms up increases neck/shoulder symptoms.",
    kidFriendly: "Reaching the high shelf is hard.",
    relatedTags: ["shoulders", "scapula", "thoracic"],
    bodyPartsHint: ["shoulders", "neck", "thoracic"],
    programBiases: ["postural-endurance", "gentle-mobility", "controlled-strength"],
    stretchBias: 0.3,
    exerciseBias: 0.4,
    irritabilityBoost: 0.5,
    avoidTags: [],
    preferTags: ["shoulders", "scapula", "thoracic", "posture"],
  },
  {
    id: "pd-worse-stairs",
    label: "Worse on stairs",
    clinicalTerm: "Stair intolerance",
    category: "activity-related",
    plainLanguage: "Stairs provoke hip, knee, or back symptoms.",
    kidFriendly: "Climbing stairs feels yucky.",
    relatedTags: ["functional", "quads", "glutes"],
    programBiases: ["controlled-strength", "short-volume"],
    stretchBias: 0.2,
    exerciseBias: 0.6,
    irritabilityBoost: 0.5,
    avoidTags: [],
    preferTags: ["functional", "legs", "glutes", "quads"],
  },

  // —— Easing ——
  {
    id: "pd-better-movement",
    label: "Better with gentle movement",
    clinicalTerm: "Movement eases symptoms",
    category: "mechanical-easing",
    plainLanguage: "Easy motion reduces stiffness or pain.",
    kidFriendly: "Moving a little helps the ouch quiet down.",
    relatedTags: ["mobility", "warmup"],
    programBiases: ["gentle-mobility", "warm-up-heavy"],
    stretchBias: 0.6,
    exerciseBias: 0.3,
    irritabilityBoost: -0.5,
    avoidTags: [],
    preferTags: ["mobility", "warmup", "dynamic"],
  },
  {
    id: "pd-better-rest",
    label: "Better with rest",
    clinicalTerm: "Rest eases symptoms",
    category: "mechanical-easing",
    plainLanguage: "Rest reduces intensity (short-term).",
    kidFriendly: "Sitting quietly helps for a while.",
    relatedTags: [],
    programBiases: ["short-volume", "gentle-mobility"],
    stretchBias: 0.3,
    exerciseBias: -0.2,
    irritabilityBoost: 0.5,
    avoidTags: ["endurance"],
    preferTags: ["beginner", "cooldown"],
  },
  {
    id: "pd-better-heat",
    label: "Better with heat",
    clinicalTerm: "Heat-responsive",
    category: "mechanical-easing",
    plainLanguage: "Warmth reduces symptoms.",
    kidFriendly: "A warm hug for the sore spot helps.",
    relatedTags: ["stiffness"],
    programBiases: ["warm-up-heavy", "gentle-mobility"],
    stretchBias: 0.5,
    exerciseBias: 0.2,
    irritabilityBoost: 0,
    avoidTags: [],
    preferTags: ["warmup", "mobility"],
  },
  {
    id: "pd-better-walking",
    label: "Better with easy walking",
    clinicalTerm: "Walking eases symptoms",
    category: "mechanical-easing",
    plainLanguage: "Light walking reduces stiffness.",
    kidFriendly: "A little walk makes the robot less rusty.",
    relatedTags: ["gait", "warmup"],
    programBiases: ["gentle-mobility", "controlled-strength"],
    stretchBias: 0.3,
    exerciseBias: 0.4,
    irritabilityBoost: -0.5,
    avoidTags: [],
    preferTags: ["functional", "warmup", "gait"],
  },

  // —— Inflammatory pattern ——
  {
    id: "pd-morning-stiff-30",
    label: "Morning stiffness > 30 minutes",
    clinicalTerm: "Prolonged morning stiffness",
    category: "inflammatory-pattern",
    plainLanguage: "Takes a long time to loosen after waking.",
    kidFriendly: "Takes forever for the hinges to oil themselves.",
    relatedTags: ["morning", "stiffness"],
    programBiases: ["warm-up-heavy", "gentle-mobility", "short-volume"],
    stretchBias: 0.5,
    exerciseBias: 0.2,
    irritabilityBoost: 1,
    avoidTags: ["athletic"],
    preferTags: ["morning", "warmup", "mobility"],
    redFlagEducation:
      "Very prolonged morning stiffness with systemic symptoms may warrant medical evaluation.",
  },
  {
    id: "pd-swelling-sense",
    label: "Feels swollen / puffy",
    clinicalTerm: "Perceived swelling",
    category: "inflammatory-pattern",
    plainLanguage: "Area feels swollen even if not visibly large.",
    kidFriendly: "Like a balloon under the skin.",
    relatedTags: [],
    programBiases: ["prefer-unloaded", "short-volume", "gentle-mobility"],
    stretchBias: 0.2,
    exerciseBias: 0.1,
    irritabilityBoost: 1,
    avoidTags: ["power", "endurance"],
    preferTags: ["beginner", "control"],
  },

  // —— Postural ——
  {
    id: "pd-desk-related",
    label: "Related to desk / screens",
    clinicalTerm: "Screen-time / sustained posture load",
    category: "postural-load",
    plainLanguage: "Linked to computer or phone posture.",
    kidFriendly: "Too much tablet time makes the neck crabby.",
    relatedTags: ["desk", "posture", "thoracic", "neck"],
    bodyPartsHint: ["neck", "shoulders", "thoracic", "wrists"],
    programBiases: ["postural-endurance", "gentle-mobility"],
    stretchBias: 0.5,
    exerciseBias: 0.5,
    irritabilityBoost: 0,
    avoidTags: [],
    preferTags: ["desk", "posture", "thoracic", "scapula", "chin-tuck"],
  },
  {
    id: "pd-forward-head",
    label: "Forward-head / tech neck feel",
    clinicalTerm: "Forward head posture symptoms",
    category: "postural-load",
    plainLanguage: "Neck and upper back fatigue from head-forward posture.",
    kidFriendly: "Turtle neck from looking down at screens.",
    relatedTags: ["neck", "posture", "desk"],
    bodyPartsHint: ["neck", "upper-back", "shoulders"],
    programBiases: ["postural-endurance", "gentle-mobility"],
    stretchBias: 0.5,
    exerciseBias: 0.4,
    irritabilityBoost: 0,
    avoidTags: [],
    preferTags: ["neck", "posture", "chin-tuck", "thoracic"],
  },

  // —— Spatial pattern ——
  {
    id: "pd-local-only",
    label: "Stays in one local spot",
    clinicalTerm: "Localized symptoms",
    category: "spatial-pattern",
    plainLanguage: "Does not travel far from one area.",
    kidFriendly: "The ouch stays in its room.",
    relatedTags: [],
    programBiases: ["gentle-mobility", "controlled-strength"],
    stretchBias: 0.4,
    exerciseBias: 0.4,
    irritabilityBoost: 0,
    avoidTags: [],
    preferTags: ["mobility", "activation"],
  },
  {
    id: "pd-spreading",
    label: "Spreading / widening",
    clinicalTerm: "Expanding symptom area",
    category: "spatial-pattern",
    plainLanguage: "Area of symptoms is getting larger.",
    kidFriendly: "The ouch puddle is growing.",
    relatedTags: [],
    programBiases: ["short-volume", "gentle-mobility", "neural-caution"],
    stretchBias: 0.2,
    exerciseBias: 0,
    irritabilityBoost: 1.5,
    avoidTags: ["athletic", "advanced"],
    preferTags: ["beginner", "control"],
    maxDifficulty: "beginner",
  },
  {
    id: "pd-centralizing",
    label: "Moving toward the center (improving pattern)",
    clinicalTerm: "Centralization tendency",
    category: "spatial-pattern",
    plainLanguage: "Symptoms retreat toward the spine/center over time.",
    kidFriendly: "The lightning is walking back home to the middle.",
    relatedTags: [],
    programBiases: ["gentle-mobility", "motor-control"],
    stretchBias: 0.3,
    exerciseBias: 0.3,
    irritabilityBoost: -0.5,
    avoidTags: [],
    preferTags: ["mobility", "core", "control"],
  },

  // —— Affective ——
  {
    id: "pd-exhausting",
    label: "Exhausting",
    clinicalTerm: "Fatiguing / exhausting pain",
    category: "quality-affective",
    plainLanguage: "Pain drains energy and motivation.",
    kidFriendly: "The ouch makes your batteries low.",
    relatedTags: [],
    programBiases: ["short-volume", "gentle-mobility"],
    stretchBias: 0.3,
    exerciseBias: 0.1,
    irritabilityBoost: 0.5,
    avoidTags: ["endurance", "athletic"],
    preferTags: ["beginner", "cooldown"],
  },
  {
    id: "pd-fear-move",
    label: "Afraid to move certain ways",
    clinicalTerm: "Fear-avoidance / kinesiophobia signal",
    category: "quality-affective",
    plainLanguage: "You avoid movements because of fear of pain.",
    kidFriendly: "Scared the ouch will jump if you move.",
    relatedTags: ["control"],
    programBiases: ["motor-control", "gentle-mobility", "short-volume"],
    stretchBias: 0.3,
    exerciseBias: 0.3,
    irritabilityBoost: 0.5,
    avoidTags: ["advanced"],
    preferTags: ["motor-control", "beginner", "activation"],
  },

  // —— Red flag screens (education only) ——
  {
    id: "pd-rf-trauma",
    label: "Started after significant trauma",
    clinicalTerm: "Post-traumatic onset",
    category: "red-flag-screen",
    plainLanguage: "Began after a fall, crash, or major injury.",
    kidFriendly: "Started after a big tumble.",
    relatedTags: [],
    programBiases: ["defer-to-provider", "short-volume", "gentle-mobility"],
    stretchBias: 0,
    exerciseBias: 0,
    irritabilityBoost: 3,
    avoidTags: ["athletic", "advanced", "neural"],
    preferTags: ["beginner"],
    maxDifficulty: "beginner",
    redFlagEducation:
      "Post-trauma symptoms should be cleared by a licensed clinician before aggressive self-exercise.",
  },
  {
    id: "pd-rf-bowel",
    label: "New bowel/bladder change with back pain",
    clinicalTerm: "Cauda equina screen item",
    category: "red-flag-screen",
    plainLanguage: "New difficulty controlling bowel/bladder with back symptoms.",
    kidFriendly: "Bathroom control changed with back pain—tell a grown-up doctor now.",
    relatedTags: [],
    programBiases: ["defer-to-provider"],
    stretchBias: -1,
    exerciseBias: -1,
    irritabilityBoost: 5,
    avoidTags: ["all"],
    preferTags: [],
    maxDifficulty: "beginner",
    redFlagEducation:
      "This can be an emergency. Seek urgent medical care—do not self-progress exercise programs.",
  },
  {
    id: "pd-rf-fever",
    label: "Fever with new back pain",
    clinicalTerm: "Systemic infection screen",
    category: "red-flag-screen",
    plainLanguage: "Fever accompanies new spinal pain.",
    kidFriendly: "Hot fever plus new back ouch needs a doctor.",
    relatedTags: [],
    programBiases: ["defer-to-provider"],
    stretchBias: -1,
    exerciseBias: -1,
    irritabilityBoost: 5,
    avoidTags: ["all"],
    preferTags: [],
    redFlagEducation: "Fever with spinal pain needs prompt medical evaluation.",
  },
  {
    id: "pd-rf-unexplained-weight",
    label: "Unexplained weight loss with pain",
    clinicalTerm: "Constitutional symptom screen",
    category: "red-flag-screen",
    plainLanguage: "Losing weight without trying, plus ongoing pain.",
    kidFriendly: "Clothes getting looser without trying, and pain—see a doctor.",
    relatedTags: [],
    programBiases: ["defer-to-provider"],
    stretchBias: -0.5,
    exerciseBias: -0.5,
    irritabilityBoost: 3,
    avoidTags: ["athletic"],
    preferTags: ["beginner"],
    redFlagEducation: "Constitutional symptoms with pain warrant medical assessment.",
  },
];

function withSearch(d: Seed): PainDescriptor {
  const terms = new Set<string>([
    d.label.toLowerCase(),
    d.clinicalTerm.toLowerCase(),
    d.plainLanguage.toLowerCase(),
    d.category,
    ...(d.searchTerms || []),
    ...d.relatedTags,
    ...d.preferTags,
  ]);
  return { ...d, searchTerms: Array.from(terms) };
}

export const BASE_PAIN_DESCRIPTORS: PainDescriptor[] = SEEDS.map(withSearch);

const INTENSITY = [
  { tag: "mild", label: "Mild", boost: -0.5 },
  { tag: "moderate", label: "Moderate", boost: 0 },
  { tag: "severe", label: "Severe", boost: 1.5 },
] as const;

const REGIONS = [
  "neck",
  "shoulder",
  "upper back",
  "mid back",
  "low back",
  "hip",
  "thigh",
  "knee",
  "calf",
  "ankle",
  "foot",
  "wrist",
  "hand",
  "chest wall",
  "whole body",
] as const;

const CONTEXTS = [
  "at rest",
  "with movement",
  "after sitting",
  "after standing",
  "at night",
  "in the morning",
  "at work",
  "during sports",
  "when stressed",
] as const;

/**
 * Expanded clinical catalog: base × intensity × region × context editions.
 * Large searchable set for intake while keeping clinician-authored bases.
 */
export function expandPainDescriptorCatalog(): PainDescriptor[] {
  const out: PainDescriptor[] = [...BASE_PAIN_DESCRIPTORS];

  for (const base of BASE_PAIN_DESCRIPTORS) {
    if (base.category === "red-flag-screen") continue;

    for (const inten of INTENSITY) {
      out.push(
        withSearch({
          ...base,
          id: `${base.id}__${inten.tag}`,
          label: `${base.label} (${inten.label})`,
          clinicalTerm: `${base.clinicalTerm} — ${inten.label.toLowerCase()} intensity`,
          plainLanguage: `${base.plainLanguage} Intensity feels ${inten.label.toLowerCase()}.`,
          irritabilityBoost: Math.max(0, base.irritabilityBoost + inten.boost),
          maxDifficulty:
            inten.tag === "severe" ? "beginner" : base.maxDifficulty,
          programBiases:
            inten.tag === "severe"
              ? (Array.from(
                  new Set<ProgramBias>([
                    ...base.programBiases,
                    "short-volume",
                    "gentle-mobility",
                  ])
                ) as ProgramBias[])
              : base.programBiases,
        })
      );
    }

    for (const region of REGIONS) {
      out.push(
        withSearch({
          ...base,
          id: `${base.id}__reg_${region.replace(/\s+/g, "-")}`,
          label: `${base.label} — ${region}`,
          clinicalTerm: `${base.clinicalTerm} (regional: ${region})`,
          plainLanguage: `${base.plainLanguage} Most noticed around the ${region}.`,
          bodyPartsHint: base.bodyPartsHint,
          searchTerms: [region, ...(base.searchTerms || [])],
        })
      );
    }

    for (const ctx of CONTEXTS) {
      out.push(
        withSearch({
          ...base,
          id: `${base.id}__ctx_${ctx.replace(/\s+/g, "-")}`,
          label: `${base.label} ${ctx}`,
          clinicalTerm: `${base.clinicalTerm} (${ctx})`,
          plainLanguage: `${base.plainLanguage} Especially ${ctx}.`,
          searchTerms: [ctx, ...(base.searchTerms || [])],
        })
      );
    }
  }

  return out;
}

export const PAIN_DESCRIPTOR_CATALOG: PainDescriptor[] = expandPainDescriptorCatalog();

export const PAIN_DESCRIPTOR_STATS = {
  baseCount: BASE_PAIN_DESCRIPTORS.length,
  totalCount: PAIN_DESCRIPTOR_CATALOG.length,
  categories: Object.keys(DESCRIPTOR_CATEGORY_LABELS).length,
};

const byId = new Map(PAIN_DESCRIPTOR_CATALOG.map((d) => [d.id, d]));

export function getDescriptorById(id: string): PainDescriptor | undefined {
  return byId.get(id) || BASE_PAIN_DESCRIPTORS.find((d) => d.id === id);
}

export function getDescriptorsByIds(ids: string[]): PainDescriptor[] {
  return ids.map((id) => getDescriptorById(id)).filter(Boolean) as PainDescriptor[];
}

export function searchPainDescriptors(opts: {
  query?: string;
  category?: DescriptorCategory | "all";
  limit?: number;
  basesOnly?: boolean;
}): PainDescriptor[] {
  const source = opts.basesOnly ? BASE_PAIN_DESCRIPTORS : PAIN_DESCRIPTOR_CATALOG;
  const q = opts.query?.toLowerCase().trim();
  const limit = Math.min(opts.limit ?? 80, 200);
  const filtered = source.filter((d) => {
    if (opts.category && opts.category !== "all" && d.category !== opts.category) return false;
    if (!q) return true;
    return d.searchTerms.some((t) => t.includes(q)) || d.label.toLowerCase().includes(q);
  });
  // Prefer base descriptors first
  filtered.sort((a, b) => {
    const ab = a.id.includes("__") ? 1 : 0;
    const bb = b.id.includes("__") ? 1 : 0;
    return ab - bb || a.label.localeCompare(b.label);
  });
  return filtered.slice(0, limit);
}

export interface DescriptorProgramHints {
  effectivePainBoost: number;
  stretchBias: number;
  exerciseBias: number;
  avoidTags: string[];
  preferTags: string[];
  maxDifficulty?: "beginner" | "intermediate" | "advanced";
  biases: ProgramBias[];
  redFlags: string[];
  summaryLines: string[];
  preferKinds: ("stretch" | "exercise")[] | "auto";
}

export function summarizeDescriptors(ids: string[]): DescriptorProgramHints {
  const list = getDescriptorsByIds(ids);
  if (!list.length) {
    return {
      effectivePainBoost: 0,
      stretchBias: 0,
      exerciseBias: 0,
      avoidTags: [],
      preferTags: [],
      biases: [],
      redFlags: [],
      summaryLines: [],
      preferKinds: "auto",
    };
  }

  let stretchBias = 0;
  let exerciseBias = 0;
  let boost = 0;
  const avoid = new Set<string>();
  const prefer = new Set<string>();
  const biases = new Set<ProgramBias>();
  const redFlags: string[] = [];
  let maxDiff: "beginner" | "intermediate" | "advanced" | undefined;

  const rank = { beginner: 1, intermediate: 2, advanced: 3 };

  for (const d of list) {
    stretchBias += d.stretchBias;
    exerciseBias += d.exerciseBias;
    boost += d.irritabilityBoost;
    d.avoidTags.forEach((t) => avoid.add(t));
    d.preferTags.forEach((t) => prefer.add(t));
    d.programBiases.forEach((b) => biases.add(b));
    if (d.redFlagEducation) redFlags.push(`${d.label}: ${d.redFlagEducation}`);
    if (d.maxDifficulty) {
      if (!maxDiff || rank[d.maxDifficulty] < rank[maxDiff]) maxDiff = d.maxDifficulty;
    }
  }

  const n = list.length;
  stretchBias /= n;
  exerciseBias /= n;
  boost = boost / Math.sqrt(n); // dampen stacking slightly

  let preferKinds: ("stretch" | "exercise")[] | "auto" = "auto";
  if (stretchBias - exerciseBias > 0.25) preferKinds = ["stretch", "exercise"];
  else if (exerciseBias - stretchBias > 0.25) preferKinds = ["exercise", "stretch"];

  if (biases.has("defer-to-provider")) {
    preferKinds = ["stretch"];
    maxDiff = "beginner";
  }

  const summaryLines = list.slice(0, 8).map((d) => d.label);

  return {
    effectivePainBoost: boost,
    stretchBias,
    exerciseBias,
    avoidTags: Array.from(avoid),
    preferTags: Array.from(prefer),
    maxDifficulty: maxDiff,
    biases: Array.from(biases),
    redFlags,
    summaryLines,
    preferKinds,
  };
}

/** Extra phrase → descriptor mappings for natural paragraph intake */
const PARAGRAPH_PHRASES: Array<{ phrases: string[]; id: string; weight: number }> = [
  { phrases: ["worse when i sit", "worse with sitting", "hurts when i sit", "pain when sitting", "sitting makes"], id: "pd-worse-sitting", weight: 6 },
  { phrases: ["worse when i stand", "worse with standing", "standing makes", "hurt when standing"], id: "pd-worse-standing", weight: 6 },
  { phrases: ["worse when walking", "worse with walking", "hurts when i walk", "pain when walking"], id: "pd-worse-walking", weight: 6 },
  { phrases: ["worse bending", "hurt when i bend", "bending forward", "can't bend", "cannot bend"], id: "pd-worse-bending", weight: 6 },
  { phrases: ["arching back", "bending backward", "looking up hurts", "extension"], id: "pd-worse-arching", weight: 5 },
  { phrases: ["twisting", "turning my neck", "turning my back", "rotate"], id: "pd-worse-twisting", weight: 5 },
  { phrases: ["lifting", "pick up", "picking up", "carry heavy"], id: "pd-worse-lifting", weight: 5 },
  { phrases: ["overhead", "reaching up", "arms above", "reach up"], id: "pd-worse-overhead", weight: 5 },
  { phrases: ["stairs", "stair climbing", "going up steps"], id: "pd-worse-stairs", weight: 5 },
  { phrases: ["morning stiffness", "stiff in the morning", "stiff when i wake", "worse in the morning", "morning pain"], id: "pd-morning-stiff", weight: 6 },
  { phrases: ["night pain", "wakes me", "can't sleep", "sleep pain", "at night"], id: "pd-night-pain", weight: 5 },
  { phrases: ["all the time", "constant pain", "never goes away", "always hurts"], id: "pd-constant", weight: 5 },
  { phrases: ["comes and goes", "on and off", "intermittent"], id: "pd-intermittent", weight: 4 },
  { phrases: ["after activity", "after workout", "after exercise", "sore after"], id: "pd-after-activity", weight: 5 },
  { phrases: ["during activity", "while working out", "while walking"], id: "pd-during-activity", weight: 4 },
  { phrases: ["end of day", "by evening", "after work"], id: "pd-end-of-day", weight: 4 },
  { phrases: ["burning", "burns", "hot pain"], id: "pd-burning", weight: 6 },
  { phrases: ["sharp pain", "sharp when", "stabbing", "knife"], id: "pd-sharp", weight: 6 },
  { phrases: ["stab"], id: "pd-stabbing", weight: 4 },
  { phrases: ["aching", "dull ache", "ache"], id: "pd-aching", weight: 4 },
  { phrases: ["throbbing", "pulsing"], id: "pd-throbbing", weight: 5 },
  { phrases: ["tight", "tightness", "band around"], id: "pd-tight-band", weight: 4 },
  { phrases: ["stiff", "stiffness", "rigid"], id: "pd-stiff", weight: 4 },
  { phrases: ["sore", "tender"], id: "pd-sore", weight: 3 },
  { phrases: ["cramp", "cramping", "spasm"], id: "pd-cramping", weight: 5 },
  { phrases: ["pressure", "heaviness", "heavy feeling"], id: "pd-pressure", weight: 4 },
  { phrases: ["numb", "numbness", "asleep"], id: "pd-numb", weight: 6 },
  { phrases: ["tingling", "pins and needles", "buzzing"], id: "pd-tingling", weight: 6 },
  { phrases: ["shooting", "radiating", "down my leg", "down my arm", "sciatica"], id: "pd-shooting", weight: 7 },
  { phrases: ["electric", "zapping", "shock"], id: "pd-electric", weight: 6 },
  { phrases: ["weak", "giving way", "gives out", "unstable"], id: "pd-weakness-sense", weight: 5 },
  { phrases: ["desk", "computer", "screen time", "laptop", "office"], id: "pd-desk-related", weight: 5 },
  { phrases: ["tech neck", "forward head", "looking down at phone"], id: "pd-forward-head", weight: 6 },
  { phrases: ["better when i move", "better with movement", "eases when moving", "helps to move"], id: "pd-better-movement", weight: 5 },
  { phrases: ["better with rest", "rest helps", "better when i rest"], id: "pd-better-rest", weight: 4 },
  { phrases: ["heat helps", "better with heat", "warmth helps", "heating pad"], id: "pd-better-heat", weight: 5 },
  { phrases: ["walking helps", "better when walking", "easier after a walk"], id: "pd-better-walking", weight: 5 },
  { phrases: ["swollen", "swelling", "puffy"], id: "pd-swelling-sense", weight: 5 },
  { phrases: ["afraid to move", "scared to move", "fear of movement", "avoid moving"], id: "pd-fear-move", weight: 5 },
  { phrases: ["exhausting", "drains me", "worn out from pain"], id: "pd-exhausting", weight: 4 },
  { phrases: ["spreading", "getting worse area", "moving around more"], id: "pd-spreading", weight: 4 },
  { phrases: ["local", "one spot", "right in one place"], id: "pd-local-only", weight: 3 },
  { phrases: ["mild pain", "slight pain", "a little pain"], id: "pd-aching__mild", weight: 3 },
  { phrases: ["severe pain", "terrible pain", "unbearable"], id: "pd-sharp__severe", weight: 5 },
  { phrases: ["moderate pain"], id: "pd-aching__moderate", weight: 3 },
];

/**
 * Match free-text concern paragraph to clinical pain descriptor IDs.
 * Combines phrase rules + catalog term scoring for paragraph-style intake.
 */
export function matchDescriptorsFromText(text: string, limit = 12): string[] {
  const t = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (t.length < 4) return [];

  const scores = new Map<string, number>();

  const add = (id: string, weight: number) => {
    scores.set(id, (scores.get(id) || 0) + weight);
  };

  for (const rule of PARAGRAPH_PHRASES) {
    for (const phrase of rule.phrases) {
      if (t.includes(phrase)) {
        add(rule.id, rule.weight);
        break;
      }
    }
  }

  for (const d of BASE_PAIN_DESCRIPTORS) {
    let s = 0;
    const label = d.label.toLowerCase();
    if (label.length > 3 && t.includes(label)) s += 5;
    for (const term of d.searchTerms) {
      if (term.length < 4) continue;
      if (t.includes(term)) s += term.includes(" ") ? 3 : 1.5;
    }
    // Clinical term fragments
    const clinical = d.clinicalTerm.toLowerCase();
    if (clinical.length > 5 && t.includes(clinical.split(/[/,—-]/)[0]!.trim())) s += 2;
    if (s > 0) add(d.id, s);
  }

  // Intensity modifiers from free text applied to top sensory hits
  const severe = /\b(severe|unbearable|worst|terrible|excruciating)\b/.test(t);
  const mild = /\b(mild|slight|little|light)\b/.test(t);
  if (severe || mild) {
    const top = Array.from(scores.entries())
      .filter(([id]) => !id.includes("__"))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    for (const [id, sc] of top) {
      const variant = severe ? `${id}__severe` : `${id}__mild`;
      if (getDescriptorById(variant)) add(variant, sc + 1);
    }
  }

  return Array.from(scores.entries())
    .filter(([, s]) => s >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

/** Live paragraph analysis: descriptors + labels for UI */
export function analyzeParagraphDescriptors(text: string, limit = 14) {
  const ids = matchDescriptorsFromText(text, limit);
  const descriptors = getDescriptorsByIds(ids);
  const hints = summarizeDescriptors(ids);
  return { ids, descriptors, hints };
}
