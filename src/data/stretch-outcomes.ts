/**
 * Evidence-informed functional outcome framing for stretch catalog entries.
 * Educational synthesis of constructs used in common outpatient measures
 * (NDI, ODI, LEFS, QuickDASH, KOOS, FAAM, PSFS, pain NRS)—not a trial database.
 */

import type { BodyPart } from "@/lib/types";

export type FunctionalOutcomeFrame = {
  /** Primary functional domains this stretch supports */
  domains: string[];
  /** Outcome-measure constructs (educational) */
  measures: string[];
  /** Expected direction of change with graded dosing */
  expectedChange: string;
  /** Timeframe language appropriate for HEP education */
  timeframe: string;
  /** How success is observed clinically / at home */
  measureHint: string;
};

const BY_REGION: Partial<Record<BodyPart, FunctionalOutcomeFrame>> = {
  neck: {
    domains: ["cervical mobility", "desk tolerance", "looking over shoulder"],
    measures: ["NDI-oriented items", "pain NRS", "rotation/side-bend ROM"],
    expectedChange:
      "Gradual gains in pain-free cervical motion and lower neck-disability scores when paired with posture and load management.",
    timeframe: "Often noticeable ease within 2–6 weeks of consistent, tolerable dosing",
    measureHint: "Track looking over shoulder while driving and desk pain (0–10).",
  },
  jaw: {
    domains: ["jaw opening comfort", "chewing tolerance"],
    measures: ["pain NRS", "max comfortable opening", "PSFS eating/speaking"],
    expectedChange: "Improved comfortable opening and reduced guarding with gentle mobility.",
    timeframe: "Days to a few weeks with gentle daily dosing",
    measureHint: "Track finger-width opening comfort and meal-related pain.",
  },
  shoulders: {
    domains: ["reach overhead", "dressing", "reaching behind back"],
    measures: ["QuickDASH-oriented items", "pain-free elevation", "PSFS"],
    expectedChange: "Better functional reach and lower arm-disability impact with graded mobility.",
    timeframe: "2–8 weeks depending on irritability",
    measureHint: "Track overhead reach and dressing ease.",
  },
  scapular: {
    domains: ["scapular control", "posture endurance", "overhead prep"],
    measures: ["QuickDASH reach items", "posture tolerance", "pain NRS"],
    expectedChange: "Improved scapular awareness and shoulder comfort with repetitive reach.",
    timeframe: "2–6 weeks of motor-control biased mobility",
    measureHint: "Track scapular fatigue during desk work and light overhead tasks.",
  },
  "upper-back": {
    domains: ["thoracic extension", "breathing ease", "desk posture"],
    measures: ["ODI posture items", "rotation ROM", "PSFS sitting"],
    expectedChange: "Easier upright sitting and rotation with reduced mid-back stiffness.",
    timeframe: "1–4 weeks of daily microdoses",
    measureHint: "Track mid-back stiffness after 30–60 min sitting.",
  },
  thoracic: {
    domains: ["thoracic rotation", "extension", "rib mobility"],
    measures: ["rotation ROM", "ODI/NDI posture items", "breathing comfort"],
    expectedChange: "Improved trunk rotation and extension mobility for ADLs and sport prep.",
    timeframe: "2–6 weeks",
    measureHint: "Track ability to rotate to look behind while seated.",
  },
  chest: {
    domains: ["pectoral length", "posture", "deep breathing"],
    measures: ["shoulder external rotation comfort", "posture PSFS", "pain NRS"],
    expectedChange: "Less rounded-shoulder pull and easier upright posture.",
    timeframe: "2–6 weeks with desk breaks",
    measureHint: "Track doorway stretch ease and posture fatigue.",
  },
  "lower-back": {
    domains: ["bending", "sitting tolerance", "sit-to-stand"],
    measures: ["ODI-oriented items", "pain NRS", "flexion/extension comfort"],
    expectedChange:
      "Improved activity tolerance and lower disability impact when mobility is dosed within a graded lumbar program.",
    timeframe: "2–8 weeks with pacing",
    measureHint: "Track sitting minutes and morning stiffness (0–10).",
  },
  pelvis: {
    domains: ["pelvic mobility", "sit-to-stand", "walking comfort"],
    measures: ["ODI/LEFS items", "pain NRS", "gait comfort"],
    expectedChange: "Smoother pelvic-hip linkage and better walking/sitting comfort.",
    timeframe: "2–6 weeks",
    measureHint: "Track single-leg stance comfort and sit-to-stand ease.",
  },
  hips: {
    domains: ["walking", "stairs", "squatting depth comfort"],
    measures: ["LEFS-oriented items", "hip ROM", "pain NRS"],
    expectedChange: "Improved hip mobility supporting gait and stair function.",
    timeframe: "2–8 weeks",
    measureHint: "Track stairs and deep-sit comfort.",
  },
  groin: {
    domains: ["lateral movement", "stride comfort", "change-of-direction prep"],
    measures: ["LEFS lateral tasks", "adductor length comfort", "pain NRS"],
    expectedChange: "Better adductor length tolerance for walking and lateral tasks.",
    timeframe: "2–6 weeks",
    measureHint: "Track stride width comfort and side-step pain.",
  },
  glutes: {
    domains: ["sitting", "stairs", "single-leg control prep"],
    measures: ["LEFS/ODI items", "posterior hip ROM", "pain NRS"],
    expectedChange: "Improved posterior hip mobility and sitting tolerance.",
    timeframe: "2–6 weeks",
    measureHint: "Track sitting minutes and figure-four comfort.",
  },
  hamstrings: {
    domains: ["forward bend", "sit-to-stand", "gait swing"],
    measures: ["LEFS bend items", "SLR comfort", "pain NRS"],
    expectedChange: "Easier forward bending and long-sitting with tolerable posterior chain mobility.",
    timeframe: "2–8 weeks (avoid aggressive end-range forcing)",
    measureHint: "Track toe-touch comfort and long-sit tolerance.",
  },
  quadriceps: {
    domains: ["kneeling", "stairs", "running prep"],
    measures: ["KOOS/LEFS items", "knee flexion ROM", "pain NRS"],
    expectedChange: "Improved knee flexion comfort for stairs and kneeling tasks.",
    timeframe: "2–6 weeks",
    measureHint: "Track heel-to-glute comfort and stair descent ease.",
  },
  knee: {
    domains: ["stairs", "squat", "walking"],
    measures: ["KOOS-oriented items", "flexion/extension ROM", "pain NRS"],
    expectedChange: "Better knee motion for ADLs when mobility is matched to irritability.",
    timeframe: "2–8 weeks post-irritation or post-op pathways (with clearance)",
    measureHint: "Track stair and sit-to-stand knee comfort.",
  },
  calves: {
    domains: ["walking push-off", "squat depth", "stairs"],
    measures: ["FAAM/LEFS items", "dorsiflexion ROM", "pain NRS"],
    expectedChange: "Improved ankle dorsiflexion supporting gait and squat depth.",
    timeframe: "2–6 weeks",
    measureHint: "Track wall-knee-to-wall dorsiflexion and first-step morning pain.",
  },
  shins: {
    domains: ["ankle mobility", "walking comfort"],
    measures: ["FAAM items", "ankle ROM", "pain NRS"],
    expectedChange: "Reduced anterior shin stiffness with graded ankle mobility.",
    timeframe: "1–4 weeks",
    measureHint: "Track shin tightness after walking.",
  },
  ankles: {
    domains: ["balance", "stairs", "gait"],
    measures: ["FAAM-oriented items", "dorsiflexion/inversion comfort", "pain NRS"],
    expectedChange: "Improved ankle mobility supporting balance and walking tolerance.",
    timeframe: "2–6 weeks",
    measureHint: "Track single-leg balance and uneven-ground confidence.",
  },
  foot: {
    domains: ["first-step comfort", "walking tolerance", "shoe comfort"],
    measures: ["FAAM items", "first-step pain NRS", "walking minutes"],
    expectedChange: "Lower first-step pain and better walking tolerance with load + mobility care.",
    timeframe: "2–8 weeks",
    measureHint: "Track morning first-step pain (0–10) and continuous walking minutes.",
  },
  toes: {
    domains: ["push-off", "balance", "shoe comfort"],
    measures: ["FAAM toe items", "extension ROM", "pain NRS"],
    expectedChange: "Improved great-toe extension supporting push-off.",
    timeframe: "2–6 weeks",
    measureHint: "Track push-off comfort barefoot and in shoes.",
  },
  elbow: {
    domains: ["grip prep", "lifting", "reach"],
    measures: ["QuickDASH items", "elbow ROM", "pain NRS"],
    expectedChange: "Improved elbow motion for ADLs and grip-related tasks.",
    timeframe: "2–6 weeks",
    measureHint: "Track pouring and light carrying comfort.",
  },
  forearm: {
    domains: ["wrist positioning", "tool use", "typing"],
    measures: ["QuickDASH work items", "forearm rotation ROM", "pain NRS"],
    expectedChange: "Better forearm rotation and tool-use comfort.",
    timeframe: "2–6 weeks",
    measureHint: "Track typing and screwdriver-type task comfort.",
  },
  wrists: {
    domains: ["typing", "push-up prep", "grip"],
    measures: ["QuickDASH items", "wrist extension ROM", "pain NRS"],
    expectedChange: "Improved wrist extension/flexion comfort for desk and load tasks.",
    timeframe: "2–6 weeks",
    measureHint: "Track prayer-stretch comfort and keyboard pain.",
  },
  hand: {
    domains: ["grip", "fine motor", "opening jars"],
    measures: ["QuickDASH hand items", "composite fist", "pain NRS"],
    expectedChange: "Improved hand mobility for grip and fine-motor ADLs.",
    timeframe: "2–6 weeks",
    measureHint: "Track fist quality and jar-opening comfort.",
  },
  core: {
    domains: ["trunk control prep", "bending", "lifting education"],
    measures: ["ODI functional items", "endurance comfort", "pain NRS"],
    expectedChange: "Better trunk awareness supporting safe bending and lifting patterns.",
    timeframe: "2–6 weeks",
    measureHint: "Track bending and light lift comfort with neutral spine cues.",
  },
  "full-body": {
    domains: ["general mobility", "warm-up readiness", "activity tolerance"],
    measures: ["PSFS", "global pain NRS", "activity minutes"],
    expectedChange: "Improved general mobility readiness and activity tolerance.",
    timeframe: "1–4 weeks of consistent short sessions",
    measureHint: "Track preferred activity minutes and morning stiffness.",
  },
};

const DEFAULT_FRAME: FunctionalOutcomeFrame = {
  domains: ["functional mobility", "activity tolerance"],
  measures: ["PSFS", "pain NRS", "task-specific ROM"],
  expectedChange:
    "Gradual improvements in ease of motion, activity tolerance, and pain ratings with graded dosing.",
  timeframe: "2–6 weeks of consistent, tolerable practice",
  measureHint: "Track a meaningful daily task (0–10 ease) and pain before/after sessions.",
};

export function outcomeFrameForBodyParts(bodyParts: BodyPart[]): FunctionalOutcomeFrame {
  for (const bp of bodyParts) {
    const hit = BY_REGION[bp];
    if (hit) return hit;
  }
  return DEFAULT_FRAME;
}

/** Build clinicalOutcome + evidence appendix strings for a stretch seed */
export function functionalOutcomeNarrative(
  bodyParts: BodyPart[],
  evidenceNotes: string
): {
  clinicalOutcome: string;
  outpatientRationale: string;
  outcomeTags: string[];
} {
  const frame = outcomeFrameForBodyParts(bodyParts);
  return {
    clinicalOutcome: `${evidenceNotes} Functional focus: ${frame.domains.join(", ")}. ${frame.expectedChange} Measures often watched: ${frame.measures.join("; ")}. Timeframe education: ${frame.timeframe}. ${frame.measureHint}`,
    outpatientRationale: `Aligned with outpatient PT standards: warm-up readiness, pain-aware intensity (typically ≤4–5/10), graded progression, and monitoring of positive functional outcomes (${frame.measures[0]}-style constructs, PSFS, pain NRS) rather than forced end-range.`,
    outcomeTags: [
      "functional-outcomes",
      "evidence-informed",
      ...frame.measures.map((m) =>
        m
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 40)
      ),
      ...frame.domains.map((d) =>
        d
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 40)
      ),
    ],
  };
}
