/**
 * Clinical safety catalog for Assessment: age/HR/Borg dosing, implanted devices,
 * surgical precautions, orthotics/prosthetics, and assistive devices.
 * Educational synthesis of common outpatient / post-op protocols — not a substitute
 * for surgeon, cardiologist, or PT orders.
 */

import type { BodyPart, Difficulty } from "@/lib/types";

// ─── Age / Max HR / Borg ─────────────────────────────────────────────────────

/** Tanaka formula: 208 − 0.7 × age (common modern estimate; educational) */
export function estimateMaxHr(ageYears: number): number {
  const age = Math.max(5, Math.min(110, Math.round(ageYears)));
  return Math.round(208 - 0.7 * age);
}

/** Simple %HRmax zones (Karvonen-style absolute % of HRmax, educational) */
export function hrZonesFromMax(maxHr: number) {
  return {
    maxHr,
    veryLight: { min: Math.round(maxHr * 0.5), max: Math.round(maxHr * 0.6), label: "Very light (50–60% HRmax)" },
    light: { min: Math.round(maxHr * 0.6), max: Math.round(maxHr * 0.7), label: "Light (60–70% HRmax)" },
    moderate: { min: Math.round(maxHr * 0.7), max: Math.round(maxHr * 0.8), label: "Moderate (70–80% HRmax)" },
    vigorous: { min: Math.round(maxHr * 0.8), max: Math.round(maxHr * 0.9), label: "Vigorous (80–90% HRmax)" },
    nearMax: { min: Math.round(maxHr * 0.9), max: maxHr, label: "Near max (90–100% HRmax)" },
  };
}

export type BorgTarget = {
  id: string;
  label: string;
  /** Classic Borg 6–20 approximate band */
  borg6to20: [number, number];
  /** Modified Borg CR10 */
  cr10: [number, number];
  /** Suggested %HRmax ceiling for this band */
  hrMaxFractionCap: number;
  programBias: string;
  minutesScale: number;
  maxDifficulty: Difficulty;
  education: string;
};

export const BORG_TARGETS: BorgTarget[] = [
  {
    id: "borg-very-light",
    label: "Very light (rest–easy walk)",
    borg6to20: [6, 9],
    cr10: [0, 2],
    hrMaxFractionCap: 0.55,
    programBias: "borg-very-light",
    minutesScale: 0.7,
    maxDifficulty: "beginner",
    education:
      "Borg ~6–9 / CR10 0–2: conversation easy, little effort. Typical for early post-op, high irritability, or deconditioning re-entry.",
  },
  {
    id: "borg-light",
    label: "Light (comfortable activity)",
    borg6to20: [10, 11],
    cr10: [2, 3],
    hrMaxFractionCap: 0.65,
    programBias: "borg-light",
    minutesScale: 0.85,
    maxDifficulty: "beginner",
    education:
      "Borg ~10–11 / CR10 2–3: light effort, can talk comfortably. Common target for general mobility HEP and older adults starting out.",
  },
  {
    id: "borg-moderate",
    label: "Moderate (somewhat hard)",
    borg6to20: [12, 13],
    cr10: [3, 4],
    hrMaxFractionCap: 0.75,
    programBias: "borg-moderate",
    minutesScale: 1.0,
    maxDifficulty: "intermediate",
    education:
      "Borg ~12–13 / CR10 3–4: somewhat hard; can speak in short sentences. Common outpatient conditioning target when cleared.",
  },
  {
    id: "borg-hard",
    label: "Hard (vigorous)",
    borg6to20: [14, 16],
    cr10: [5, 6],
    hrMaxFractionCap: 0.85,
    programBias: "borg-hard",
    minutesScale: 1.05,
    maxDifficulty: "advanced",
    education:
      "Borg ~14–16 / CR10 5–6: hard; talking is difficult. Only when medically cleared and not under strict cardiac/sternal/WB limits.",
  },
  {
    id: "borg-very-hard",
    label: "Very hard (near max) — usually avoid in HEP",
    borg6to20: [17, 20],
    cr10: [7, 10],
    hrMaxFractionCap: 0.92,
    programBias: "borg-cap-hard",
    minutesScale: 0.6,
    maxDifficulty: "beginner",
    education:
      "Borg ≥17 / CR10 ≥7 is near-maximal. Home programs almost always cap below this unless under direct clinician supervision.",
  },
];

export function getBorgTarget(id: string | undefined): BorgTarget {
  return BORG_TARGETS.find((b) => b.id === id) ?? BORG_TARGETS[1]!;
}

export function ageBasedDefaultBorg(age: number | undefined): string {
  if (age == null) return "borg-light";
  if (age >= 75) return "borg-very-light";
  if (age >= 65) return "borg-light";
  if (age >= 40) return "borg-moderate";
  return "borg-moderate";
}

// ─── Precaution protocols ────────────────────────────────────────────────────

export type PrecautionCategory =
  | "weight-bearing"
  | "sternal"
  | "abdominal"
  | "spinal"
  | "hip"
  | "shoulder"
  | "cardiac-activity"
  | "general-surgical";

export type ClinicalPrecaution = {
  id: string;
  category: PrecautionCategory;
  label: string;
  shortLabel: string;
  /** What the precaution means */
  definition: string;
  /** How to adhere (evidence-informed / common protocol language) */
  adherence: string[];
  /** Typical duration education (varies by surgeon) */
  typicalDuration: string;
  /** Movement tags / patterns to avoid */
  avoidTags: string[];
  preferTags: string[];
  maxDifficulty: Difficulty;
  minutesScale: number;
  programBiases: string[];
  /** Auto-suggest when paragraph matches these terms */
  searchTerms: string[];
  redFlagEducation?: string;
  bodyPartsHint?: BodyPart[];
};

export const PRECAUTION_CATEGORY_LABELS: Record<PrecautionCategory, string> = {
  "weight-bearing": "Weight-bearing",
  sternal: "Sternal",
  abdominal: "Abdominal / core",
  spinal: "Spinal",
  hip: "Hip (arthroplasty-style)",
  shoulder: "Shoulder / UE post-op",
  "cardiac-activity": "Cardiac activity limits",
  "general-surgical": "General surgical",
};

export const CLINICAL_PRECAUTIONS: ClinicalPrecaution[] = [
  // Weight-bearing
  {
    id: "wb-nwb",
    category: "weight-bearing",
    label: "Non–weight-bearing (NWB)",
    shortLabel: "NWB",
    definition:
      "No body weight through the affected limb. Foot/leg may hover or rest lightly only if your surgeon allows “toe-touch” differently—true NWB means zero load through the limb.",
    adherence: [
      "Use prescribed assistive device (crutches, walker) for all transfers and gait.",
      "Keep the limb off the floor during stance; hop/step only on the sound limb as taught.",
      "Avoid single-leg stance, squats, lunges, step-ups, or calf raises on the restricted side.",
      "Log-roll or transfer methods per PT to protect the limb.",
      "Do not progress WB status without written surgeon/PT clearance.",
    ],
    typicalDuration: "Often days to weeks post-fracture/surgery—exact timeline is surgeon-specific.",
    avoidTags: ["unilateral-loading", "impact", "jump", "lunge", "squat", "step-up", "single-leg", "running"],
    preferTags: ["seated", "supine", "NWB-safe", "upper-body", "gentle", "protected"],
    maxDifficulty: "beginner",
    minutesScale: 0.65,
    programBiases: ["nwb", "protect-limb", "short-volume", "assistive-device"],
    searchTerms: ["nwb", "non weight", "non-weight", "nonweight", "no weight bearing", "0% weight"],
    bodyPartsHint: ["knee", "ankles", "foot", "hips"],
  },
  {
    id: "wb-ttwb",
    category: "weight-bearing",
    label: "Toe-touch weight-bearing (TTWB)",
    shortLabel: "TTWB",
    definition:
      "Only the toes may lightly touch the floor for balance—not for supporting body weight (often taught as “eggshell” contact).",
    adherence: [
      "Touch toes for balance only; do not push through the limb.",
      "Keep ≥90% of weight on the arms/assistive device and sound limb.",
      "Avoid stairs unless specifically trained with device.",
      "No standing heel raises, squats, or impact.",
    ],
    typicalDuration: "Common early post-op phase; advance only per protocol.",
    avoidTags: ["impact", "jump", "heavy-load", "single-leg-strength", "running"],
    preferTags: ["protected-gait", "seated", "gentle", "balance-support"],
    maxDifficulty: "beginner",
    minutesScale: 0.7,
    programBiases: ["ttwb", "protect-limb", "short-volume", "assistive-device"],
    searchTerms: ["ttwb", "toe touch", "toe-touch", "touch down weight"],
    bodyPartsHint: ["knee", "ankles", "foot", "hips"],
  },
  {
    id: "wb-tdwb",
    category: "weight-bearing",
    label: "Touch-down weight-bearing (TDWB)",
    shortLabel: "TDWB",
    definition: "Foot may rest on the floor for balance with minimal load—similar spirit to TTWB; follow your exact order wording.",
    adherence: [
      "Rest foot flat only if taught; do not accept full body weight.",
      "Use walker/crutches as prescribed for all ambulation.",
      "Skip loaded closed-chain LE strength until upgraded.",
    ],
    typicalDuration: "Early protective phase; surgeon-specific.",
    avoidTags: ["impact", "squat", "lunge", "jump", "running"],
    preferTags: ["protected-gait", "seated", "open-chain-gentle"],
    maxDifficulty: "beginner",
    minutesScale: 0.72,
    programBiases: ["tdwb", "protect-limb", "assistive-device"],
    searchTerms: ["tdwb", "touch down", "touch-down weight"],
    bodyPartsHint: ["knee", "ankles", "hips"],
  },
  {
    id: "wb-pwb",
    category: "weight-bearing",
    label: "Partial weight-bearing (PWB)",
    shortLabel: "PWB",
    definition:
      "A prescribed fraction of body weight (e.g., 25–50%) may go through the limb—often coached with a scale or “percent” teaching.",
    adherence: [
      "Know your allowed percentage; practice with a bathroom scale if taught.",
      "Use assistive device to offload the remainder.",
      "Avoid deep squats, jumps, running, and single-leg hops.",
      "Stop if pain/swelling spikes with load.",
    ],
    typicalDuration: "Often mid-phase post-fracture/ORIF/cartilage procedures.",
    avoidTags: ["impact", "jump", "running", "deep-squat", "plyometric"],
    preferTags: ["partial-load", "controlled-stance", "gentle-strength"],
    maxDifficulty: "beginner",
    minutesScale: 0.8,
    programBiases: ["pwb", "protect-limb", "assistive-device"],
    searchTerms: ["pwb", "partial weight", "50% weight", "25% weight", "partial weight-bearing"],
    bodyPartsHint: ["knee", "ankles", "hips", "foot"],
  },
  {
    id: "wb-wbat",
    category: "weight-bearing",
    label: "Weight-bearing as tolerated (WBAT)",
    shortLabel: "WBAT",
    definition:
      "Progress load through the limb as pain and swelling allow, usually with an assistive device early and weaning as able.",
    adherence: [
      "Use pain (≤~3–4/10) and swelling as governors—not ego.",
      "Wean device only when gait is safe and ordered/allowed.",
      "Still avoid high-impact until cleared.",
    ],
    typicalDuration: "Common after many joint replacements and stable fractures.",
    avoidTags: ["impact", "jump", "running-early"],
    preferTags: ["gait-training", "functional-strength", "balance"],
    maxDifficulty: "intermediate",
    minutesScale: 0.9,
    programBiases: ["wbat", "functional-gait"],
    searchTerms: ["wbat", "weight bearing as tolerated", "wb as tolerated", "as tolerated weight"],
    bodyPartsHint: ["knee", "hips", "ankles"],
  },
  {
    id: "wb-fwb",
    category: "weight-bearing",
    label: "Full weight-bearing (FWB)",
    shortLabel: "FWB",
    definition: "Full body weight allowed through the limb (still respect pain, swelling, and other precautions).",
    adherence: [
      "Progress strength and balance gradually.",
      "Continue any ROM, scar, or device precautions separately ordered.",
    ],
    typicalDuration: "Later healing or non-restricted status.",
    avoidTags: [],
    preferTags: ["functional-strength", "balance", "gait"],
    maxDifficulty: "advanced",
    minutesScale: 1.0,
    programBiases: ["fwb"],
    searchTerms: ["fwb", "full weight bearing", "full weight-bearing"],
    bodyPartsHint: ["knee", "hips", "ankles"],
  },

  // Sternal
  {
    id: "sternal-standard",
    category: "sternal",
    label: "Sternal precautions (traditional)",
    shortLabel: "Sternal",
    definition:
      "Limits load and stretch across a healing sternotomy (common after open-heart surgery). Exact rules vary; many centers use “move in the tube” or traditional lift limits.",
    adherence: [
      "Avoid pushing/pulling with arms (no pushing up from chair with arms, no heavy doors).",
      "Do not lift more than the prescribed limit (commonly ~5–10 lb / ~2–4.5 kg combined—confirm your order).",
      "Avoid both arms overhead simultaneously or extreme horizontal abduction stretch.",
      "Use log-roll to get out of bed; hug a pillow when coughing/sneezing (splinting).",
      "No driving until cleared; seatbelt still required when riding.",
      "Report clicking, grinding, or increased sternal pain to the care team.",
    ],
    typicalDuration: "Often ~6–8 weeks (surgeon-specific; some use progressive “move in the tube”).",
    avoidTags: ["push-up", "pull-up", "heavy-lift", "rowing", "overhead-load", "plank", "bench"],
    preferTags: ["sternal-safe", "lower-body", "breathing", "gentle-posture", "walking"],
    maxDifficulty: "beginner",
    minutesScale: 0.75,
    programBiases: ["sternal-precautions", "cardiac-safe", "short-volume", "no-ue-load"],
    searchTerms: [
      "sternal precaution",
      "sternal precautions",
      "sternotomy",
      "open heart",
      "cabg",
      "open-heart",
      "bypass surgery",
    ],
    redFlagEducation: "New sternal click, wound drainage, fever, or severe chest pain needs urgent clinical contact.",
    bodyPartsHint: ["chest", "shoulders", "upper-back"],
  },
  {
    id: "sternal-move-in-tube",
    category: "sternal",
    label: "Sternal “move in the tube” (modified)",
    shortLabel: "Sternal (MIT)",
    definition:
      "Keep upper arms close to the body (as if inside an imaginary tube) to limit leverage across the sternum while allowing more functional motion than rigid bans.",
    adherence: [
      "Keep elbows near ribs for daily tasks when possible.",
      "Avoid wide arm stretch/push that loads the sternum.",
      "Still respect lift limits and wound care from your team.",
      "Splint with pillow for cough.",
    ],
    typicalDuration: "Often through early sternal healing; confirm with cardiac rehab/surgeon.",
    avoidTags: ["wide-grip", "heavy-chest-load", "push-up"],
    preferTags: ["sternal-safe", "functional-adl", "walking"],
    maxDifficulty: "beginner",
    minutesScale: 0.8,
    programBiases: ["sternal-precautions", "cardiac-safe", "move-in-tube"],
    searchTerms: ["move in the tube", "move-in-the-tube", "modified sternal"],
    bodyPartsHint: ["chest", "shoulders"],
  },

  // Abdominal
  {
    id: "abdominal-standard",
    category: "abdominal",
    label: "Abdominal / core precautions",
    shortLabel: "Abdominal",
    definition:
      "Protect healing abdominal wall after laparotomy, hernia repair, C-section, or similar procedures by limiting strain that raises intra-abdominal pressure excessively.",
    adherence: [
      "Avoid sit-ups, crunches, Valsalva, and heavy lifting per order (often 5–10+ lb early).",
      "Log-roll to sit up; exhale on effort; do not hold breath.",
      "Support incision with hands/pillow when coughing.",
      "No planks/leg lifts until cleared.",
      "Watch for bulging, wound drainage, fever, or severe pain.",
    ],
    typicalDuration: "Often 4–8+ weeks depending on procedure and surgeon.",
    avoidTags: ["crunch", "sit-up", "plank", "leg-lift", "heavy-lift", "valsalva", "twist-load"],
    preferTags: ["abdominal-safe", "breathing", "gentle-walk", "log-roll", "pelvic-floor-gentle"],
    maxDifficulty: "beginner",
    minutesScale: 0.75,
    programBiases: ["abdominal-precautions", "no-core-strain", "short-volume"],
    searchTerms: [
      "abdominal precaution",
      "abdominal precautions",
      "hernia repair",
      "laparotomy",
      "c-section",
      "cesarean",
      "abdominal surgery",
      "incisional hernia",
    ],
    bodyPartsHint: ["core", "lower-back", "pelvis"],
  },
  {
    id: "abdominal-hernia",
    category: "abdominal",
    label: "Hernia repair precautions",
    shortLabel: "Hernia",
    definition: "Limit activities that stress the repair site (lifting, straining, aggressive core work) per surgical protocol.",
    adherence: [
      "Follow lift limit strictly; ask before gym return.",
      "Avoid constipation/straining; hydrate and fiber as advised.",
      "No heavy resistance core until cleared.",
    ],
    typicalDuration: "Variable—often several weeks with gradual return.",
    avoidTags: ["heavy-lift", "crunch", "plank", "strain"],
    preferTags: ["abdominal-safe", "walking", "breathing"],
    maxDifficulty: "beginner",
    minutesScale: 0.75,
    programBiases: ["abdominal-precautions", "hernia-safe"],
    searchTerms: ["hernia", "inguinal repair", "umbilical hernia"],
    bodyPartsHint: ["core", "groin"],
  },

  // Spinal
  {
    id: "spinal-blts",
    category: "spinal",
    label: "Spinal precautions (BLT: no Bend/Lift/Twist)",
    shortLabel: "Spinal BLT",
    definition:
      "Common lumbar post-op teaching: avoid bending, lifting, and twisting through the spine (exact limits are surgeon-specific).",
    adherence: [
      "Log-roll for bed mobility; keep shoulders and hips aligned.",
      "Hip hinge with neutral spine only if taught and allowed; otherwise avoid flexion.",
      "Do not lift more than ordered (often none or very light early).",
      "Avoid rotation stretches, toes-to-floor bends, and sit-ups.",
      "Wear brace if prescribed for the full daily schedule ordered.",
    ],
    typicalDuration: "Often weeks post-discectomy/fusion/laminectomy—confirm protocol.",
    avoidTags: ["flexion-load", "rotation", "twist", "toe-touch", "sit-up", "heavy-lift", "end-range"],
    preferTags: ["spinal-neutral", "log-roll", "isometric-gentle", "walking", "nerve-glide-gentle"],
    maxDifficulty: "beginner",
    minutesScale: 0.7,
    programBiases: ["spinal-precautions", "blt", "short-volume", "neutral-spine"],
    searchTerms: [
      "spinal precaution",
      "spinal precautions",
      "no bend lift twist",
      "blt precautions",
      "lumbar fusion",
      "discectomy",
      "laminectomy",
      "microdiscectomy",
    ],
    bodyPartsHint: ["lower-back", "pelvis", "core"],
  },
  {
    id: "spinal-cervical",
    category: "spinal",
    label: "Cervical post-op precautions",
    shortLabel: "Cervical",
    definition: "Limit extreme neck motion and heavy UE loading after cervical surgery; collar rules are surgeon-specific.",
    adherence: [
      "Wear cervical collar as prescribed (hours/day matter).",
      "Avoid end-range rotation/extension/flexion unless cleared.",
      "Do not lift heavy objects; avoid overhead loading early.",
      "Log body turns rather than whipping the head.",
    ],
    typicalDuration: "Weeks; ACDF/posterior cervical protocols vary widely.",
    avoidTags: ["end-range-cervical", "overhead-load", "heavy-lift", "contact"],
    preferTags: ["cervical-safe", "posture", "shoulder-blade-gentle", "walking"],
    maxDifficulty: "beginner",
    minutesScale: 0.7,
    programBiases: ["cervical-precautions", "spinal-precautions", "short-volume"],
    searchTerms: ["cervical fusion", "acdf", "cervical discectomy", "neck surgery", "cervical collar"],
    bodyPartsHint: ["neck", "shoulders", "scapular"],
  },
  {
    id: "spinal-brace",
    category: "spinal",
    label: "Spinal brace / TLSO / LSO precautions",
    shortLabel: "Spinal brace",
    definition: "External brace limits motion; donning/doffing and wear schedule are part of the protocol.",
    adherence: [
      "Wear brace per hour schedule (often when upright).",
      "Log-roll to apply/remove if taught.",
      "Do not exercise outside brace rules.",
    ],
    typicalDuration: "Weeks to months per fusion/fracture protocol.",
    avoidTags: ["end-range", "twist", "flexion-load"],
    preferTags: ["brace-compliant", "walking", "isometric-gentle"],
    maxDifficulty: "beginner",
    minutesScale: 0.75,
    programBiases: ["spinal-brace", "spinal-precautions"],
    searchTerms: ["tlso", "lso", "spinal brace", "back brace ordered"],
    bodyPartsHint: ["lower-back", "thoracic"],
  },

  // Hip arthroplasty-style
  {
    id: "hip-posterior",
    category: "hip",
    label: "Posterior hip precautions (classic)",
    shortLabel: "Hip posterior",
    definition:
      "Traditional teaching after posterior approach THA: avoid flexion >90°, adduction past midline, and internal rotation (confirm—many modern protocols are less restrictive).",
    adherence: [
      "Do not cross legs; use pillow between knees if ordered.",
      "Avoid low chairs; use raised toilet seat if prescribed.",
      "Do not pivot on the operated leg.",
      "Sleep positioning per PT (often on back with pillow).",
    ],
    typicalDuration: "Historically ~6–12 weeks; modern enhanced recovery may differ.",
    avoidTags: ["deep-flexion", "cross-leg", "pivot", "low-chair", "internal-rotation"],
    preferTags: ["hip-safe", "abduction-aware", "raised-seat", "walker-gait"],
    maxDifficulty: "beginner",
    minutesScale: 0.8,
    programBiases: ["hip-precautions", "posterior-hip", "assistive-device"],
    searchTerms: ["posterior hip", "hip precautions", "tha", "total hip", "hip replacement"],
    bodyPartsHint: ["hips", "glutes", "knee"],
  },
  {
    id: "hip-anterior",
    category: "hip",
    label: "Anterior hip precautions (if ordered)",
    shortLabel: "Hip anterior",
    definition: "Some anterior THA protocols limit excessive extension and external rotation; many allow freer motion—follow your card.",
    adherence: [
      "Avoid long stride that forces hip extension early if restricted.",
      "No extreme ER stretches unless cleared.",
      "Use assistive device until gait is safe.",
    ],
    typicalDuration: "Surgeon-specific; often shorter than classic posterior lists.",
    avoidTags: ["end-range-extension", "extreme-er"],
    preferTags: ["hip-safe", "gait-training"],
    maxDifficulty: "beginner",
    minutesScale: 0.85,
    programBiases: ["hip-precautions", "anterior-hip"],
    searchTerms: ["anterior hip", "direct anterior", "anterior approach hip"],
    bodyPartsHint: ["hips"],
  },

  // Shoulder
  {
    id: "shoulder-sling",
    category: "shoulder",
    label: "Shoulder sling / post-op UE precautions",
    shortLabel: "Shoulder sling",
    definition: "Protect repair (e.g., rotator cuff, labrum, fracture) with sling wear and limited active motion per protocol.",
    adherence: [
      "Wear sling per schedule (day/night rules matter).",
      "No active elevation/ER beyond ordered ROM.",
      "Elbow/wrist/hand pumps often allowed—confirm.",
      "No lifting, pushing, or pulling with the operated arm.",
    ],
    typicalDuration: "Often 4–6+ weeks sling; ROM phases are protocol-driven.",
    avoidTags: ["overhead", "active-elevation", "load-carry", "push-up", "band-row-heavy"],
    preferTags: ["sling-compliant", "pendulum-if-allowed", "distal-arom", "posture-gentle"],
    maxDifficulty: "beginner",
    minutesScale: 0.7,
    programBiases: ["shoulder-precautions", "sling", "short-volume"],
    searchTerms: [
      "shoulder sling",
      "rotator cuff repair",
      "cuff repair",
      "labral repair",
      "shoulder surgery",
      "abduction pillow",
    ],
    bodyPartsHint: ["shoulders", "scapular", "elbow"],
  },

  // Cardiac activity
  {
    id: "cardiac-phase1",
    category: "cardiac-activity",
    label: "Cardiac rehab Phase I–style activity limits",
    shortLabel: "Cardiac early",
    definition: "Low-intensity activity with symptom and HR monitoring after cardiac event/surgery; coordinate with cardiac rehab.",
    adherence: [
      "Keep effort in light Borg zones unless rehab advances you.",
      "Stop for chest pain, undue dyspnea, dizziness, palpitations.",
      "Respect sternal precautions if post-sternotomy.",
      "Do not chase high HR targets without team clearance.",
    ],
    typicalDuration: "Inpatient to early outpatient cardiac rehab window.",
    avoidTags: ["vigorous", "isometric-heavy", "competition", "breath-hold"],
    preferTags: ["walking", "breathing", "light-rom", "cardiac-safe"],
    maxDifficulty: "beginner",
    minutesScale: 0.65,
    programBiases: ["cardiac-safe", "borg-cap", "short-volume"],
    searchTerms: ["cardiac rehab", "heart attack", "mi ", "myocardial", "chf exacerbation"],
    bodyPartsHint: ["chest", "full-body"],
  },
];

export function getPrecautionById(id: string): ClinicalPrecaution | undefined {
  return CLINICAL_PRECAUTIONS.find((p) => p.id === id);
}

// ─── Implanted devices ───────────────────────────────────────────────────────

export type ImplantCategory =
  | "cardiac-electronic"
  | "cardiac-structural"
  | "neurostim"
  | "orthopedic-implant"
  | "infusion-other";

export type ImplantedDevice = {
  id: string;
  category: ImplantCategory;
  label: string;
  plainLanguage: string;
  precautions: string[];
  /** Linked default precaution IDs */
  defaultPrecautionIds: string[];
  avoidTags: string[];
  preferTags: string[];
  maxDifficulty?: Difficulty;
  programBiases: string[];
  searchTerms: string[];
  education: string;
};

export const IMPLANT_CATEGORY_LABELS: Record<ImplantCategory, string> = {
  "cardiac-electronic": "Cardiac electronic devices",
  "cardiac-structural": "Cardiac structural / vascular",
  neurostim: "Neurostimulation",
  "orthopedic-implant": "Orthopedic implants",
  "infusion-other": "Infusion / other implants",
};

export const IMPLANTED_DEVICES: ImplantedDevice[] = [
  {
    id: "ppm",
    category: "cardiac-electronic",
    label: "Permanent pacemaker (PPM)",
    plainLanguage: "Implanted device that paces the heart when beats are too slow.",
    precautions: [
      "Follow post-implant arm restrictions (often limit shoulder elevation/abduction on implant side for weeks).",
      "Avoid MRI unless device is MRI-conditional and protocol cleared.",
      "Keep phones and strong magnets away from generator per manufacturer teaching.",
      "Report shocks are not expected from a pacemaker (that is ICD behavior).",
    ],
    defaultPrecautionIds: ["cardiac-phase1"],
    avoidTags: ["overhead-load-implant-side", "contact-sport", "extreme-ue"],
    preferTags: ["cardiac-safe", "walking", "light-rom"],
    maxDifficulty: "beginner",
    programBiases: ["cardiac-device", "borg-cap", "ue-protect-implant-side"],
    searchTerms: ["pacemaker", "ppm", "permanent pacemaker"],
    education:
      "Early post-implant protocols commonly protect the lead/generator pocket. Long-term activity is individualized; cardiac rehab guidance applies.",
  },
  {
    id: "icd",
    category: "cardiac-electronic",
    label: "Implantable cardioverter-defibrillator (ICD)",
    plainLanguage: "Device that can pace and deliver shocks for life-threatening rhythms.",
    precautions: [
      "Same early arm restrictions as pacemaker on implant side when ordered.",
      "Know your shock plan (when to call EMS).",
      "Avoid strong electromagnetic fields per device clinic.",
      "Keep exercise in prescribed HR/Borg range.",
    ],
    defaultPrecautionIds: ["cardiac-phase1"],
    avoidTags: ["contact-sport", "extreme-isometric", "unsupervised-vigorous"],
    preferTags: ["cardiac-safe", "supervised-progress", "walking"],
    maxDifficulty: "beginner",
    programBiases: ["cardiac-device", "icd", "borg-cap"],
    searchTerms: ["icd", "defibrillator", "implantable cardioverter"],
    education: "ICDs change safety planning for vigorous exercise; coordinate with EP/cardiac rehab.",
  },
  {
    id: "crt",
    category: "cardiac-electronic",
    label: "Cardiac resynchronization therapy (CRT-P / CRT-D)",
    plainLanguage: "Specialized pacing (sometimes with defibrillation) to coordinate heart failure pumping.",
    precautions: [
      "Follow implant-side arm precautions early.",
      "Use light–moderate effort unless rehab advances you.",
      "Monitor for HF symptoms (swelling, orthopnea, rapid weight gain).",
    ],
    defaultPrecautionIds: ["cardiac-phase1"],
    avoidTags: ["vigorous-unsupervised"],
    preferTags: ["cardiac-safe", "walking", "breathing"],
    maxDifficulty: "beginner",
    programBiases: ["cardiac-device", "heart-failure-aware", "borg-cap"],
    searchTerms: ["crt", "crt-d", "crt-p", "biventricular pacemaker", "resynchronization"],
    education: "CRT patients often benefit from structured cardiac rehab and HF self-care education.",
  },
  {
    id: "loop-recorder",
    category: "cardiac-electronic",
    label: "Implantable loop recorder (ILR)",
    plainLanguage: "Small monitor under the skin that records heart rhythm long-term.",
    precautions: [
      "Protect incision until healed; avoid trauma to site early.",
      "Usually fewer long-term activity limits than pacemakers—confirm with clinic.",
    ],
    defaultPrecautionIds: [],
    avoidTags: ["trauma-to-chest-early"],
    preferTags: ["general-mobility"],
    programBiases: ["cardiac-monitor"],
    searchTerms: ["loop recorder", "ilr", "linq", "implantable monitor"],
    education: "Activity limits are usually short-term around implant.",
  },
  {
    id: "lvad",
    category: "cardiac-structural",
    label: "Left ventricular assist device (LVAD)",
    plainLanguage: "Mechanical pump supporting a failing left ventricle; driveline exits the skin.",
    precautions: [
      "Specialized team protocols only—do not start vigorous HEP without LVAD team orders.",
      "Protect driveline; no swimming/hot tubs per protocol.",
      "Battery/controller management always.",
      "Fall prevention is critical.",
    ],
    defaultPrecautionIds: ["cardiac-phase1"],
    avoidTags: ["contact", "water-immersion", "unsupervised-exertion", "prone-pressure-driveline"],
    preferTags: ["lvad-safe", "supervised", "walking-if-allowed"],
    maxDifficulty: "beginner",
    programBiases: ["lvad", "cardiac-device", "defer-to-provider", "fall-prevention"],
    searchTerms: ["lvad", "left ventricular assist", "heart pump", "vad "],
    education: "LVAD exercise is highly protocolized; MotionRx caps intensity and flags specialist oversight.",
  },
  {
    id: "tavr",
    category: "cardiac-structural",
    label: "TAVR / TAVI (valve replacement, catheter)",
    plainLanguage: "Aortic valve replaced via catheter—usually no sternotomy.",
    precautions: [
      "Access-site precautions (groin/arm): avoid heavy load early on access limb.",
      "Watch for bleeding, swelling, neurologic symptoms.",
      "Cardiac rehab often recommended.",
    ],
    defaultPrecautionIds: ["cardiac-phase1", "wb-wbat"],
    avoidTags: ["heavy-lift-early", "valsalva"],
    preferTags: ["walking", "cardiac-safe", "light-rom"],
    maxDifficulty: "beginner",
    programBiases: ["cardiac-safe", "post-valve", "borg-cap"],
    searchTerms: ["tavr", "tavi", "transcatheter aortic", "aortic valve replacement"],
    education: "Less sternal restriction than open AVR, but vascular access and cardiac limits still apply.",
  },
  {
    id: "open-valve-cabg",
    category: "cardiac-structural",
    label: "Sternotomy: CABG / open valve surgery",
    plainLanguage: "Open chest heart surgery with sternal healing.",
    precautions: [
      "Follow sternal precautions strictly.",
      "Cardiac rehab referral is standard of care when available.",
      "Graded walking is usually the cornerstone early.",
    ],
    defaultPrecautionIds: ["sternal-standard", "cardiac-phase1"],
    avoidTags: ["ue-push-pull", "heavy-lift", "overhead-load"],
    preferTags: ["sternal-safe", "walking", "breathing"],
    maxDifficulty: "beginner",
    programBiases: ["sternal-precautions", "cardiac-safe", "borg-cap"],
    searchTerms: ["cabg", "bypass", "open heart", "aortic valve replacement open", "mvr", "avr sternotomy"],
    education: "Sternal healing + cardiac conditioning define early HEP boundaries.",
  },
  {
    id: "coronary-stent",
    category: "cardiac-structural",
    label: "Coronary stent / PCI",
    plainLanguage: "Mesh stent in a coronary artery after angioplasty.",
    precautions: [
      "Access-site care (wrist/groin) early.",
      "Cardiac meds (antiplatelets) adherence is critical—never stop without cardiology advice.",
      "Return-to-exercise guided by cardiology/rehab.",
    ],
    defaultPrecautionIds: ["cardiac-phase1"],
    avoidTags: ["maximal-testing-unsupervised"],
    preferTags: ["walking", "cardiac-safe"],
    maxDifficulty: "beginner",
    programBiases: ["cardiac-safe", "borg-cap"],
    searchTerms: ["stent", "pci", "angioplasty", "coronary stent"],
    education: "After PCI, graded activity and risk-factor rehab matter more than aggressive stretching.",
  },
  {
    id: "scs",
    category: "neurostim",
    label: "Spinal cord stimulator (SCS)",
    plainLanguage: "Implanted leads near the spine with a pulse generator for pain modulation.",
    precautions: [
      "Avoid extreme lumbar flexion/extension or twisting that stresses leads early.",
      "MRI compatibility is device-specific.",
      "Report new shocking, pocket pain, or loss of coverage.",
    ],
    defaultPrecautionIds: ["spinal-blts"],
    avoidTags: ["end-range-spine", "impact", "twist"],
    preferTags: ["spinal-neutral", "walking", "gentle-rom"],
    maxDifficulty: "beginner",
    programBiases: ["neurostim", "spinal-aware"],
    searchTerms: ["spinal cord stimulator", "scs implant", "cord stimulator"],
    education: "Motion restrictions are highest peri-implant; long-term rules come from the implanting team.",
  },
  {
    id: "dbs",
    category: "neurostim",
    label: "Deep brain stimulator (DBS)",
    plainLanguage: "Brain electrodes with chest/abdomen generator for movement disorders.",
    precautions: [
      "Protect hardware; fall prevention essential.",
      "Avoid strong EMI per manufacturer.",
      "Therapy focuses on mobility/balance with neuro team guidance.",
    ],
    defaultPrecautionIds: [],
    avoidTags: ["contact-to-generator", "fall-risk-unsupervised"],
    preferTags: ["balance", "gait", "fall-prevention"],
    maxDifficulty: "beginner",
    programBiases: ["neurostim", "fall-prevention"],
    searchTerms: ["dbs", "deep brain stimulator"],
    education: "DBS changes motor control; PT should align with programming visits.",
  },
  {
    id: "joint-arthroplasty",
    category: "orthopedic-implant",
    label: "Joint replacement implant (hip/knee/shoulder)",
    plainLanguage: "Prosthetic joint components after arthroplasty.",
    precautions: [
      "Follow approach-specific joint precautions if ordered.",
      "WB status and ROM limits are protocol-driven.",
      "Watch for infection signs (fever, wound changes).",
    ],
    defaultPrecautionIds: ["wb-wbat"],
    avoidTags: ["impact-early", "pivot-twist-hip"],
    preferTags: ["arthroplasty-hep", "gait", "rom-protocol"],
    maxDifficulty: "beginner",
    programBiases: ["arthroplasty", "protocol-driven"],
    searchTerms: ["knee replacement", "hip replacement", "tka", "tha", "shoulder replacement", "arthroplasty"],
    education: "Implant presence alone does not define HEP—approach, WB, and phase do.",
  },
  {
    id: "orif-hardware",
    category: "orthopedic-implant",
    label: "ORIF plates/screws/rods",
    plainLanguage: "Metal fixation after fracture repair.",
    precautions: [
      "Respect WB orders exactly.",
      "No high-impact until cleared.",
      "Scar and swelling management matter for ROM.",
    ],
    defaultPrecautionIds: ["wb-pwb"],
    avoidTags: ["impact", "running-early"],
    preferTags: ["protected-rom", "swelling-control"],
    maxDifficulty: "beginner",
    programBiases: ["orif", "protect-limb"],
    searchTerms: ["orif", "plates and screws", "intramedullary rod", "im nail", "fracture fixation"],
    education: "Hardware stabilizes bone; load progression follows radiographic and clinical healing.",
  },
  {
    id: "insulin-pump",
    category: "infusion-other",
    label: "Insulin pump / CGM",
    plainLanguage: "Wearable diabetes technology (not a cardiac implant).",
    precautions: [
      "Protect site during exercise; have hypo treatment available.",
      "Coordinate intensity changes with diabetes care plan.",
    ],
    defaultPrecautionIds: [],
    avoidTags: [],
    preferTags: ["glucose-aware"],
    programBiases: ["diabetes-aware"],
    searchTerms: ["insulin pump", "cgm", "continuous glucose"],
    education: "Exercise can change glucose quickly—safety first.",
  },
];

export function getImplantById(id: string): ImplantedDevice | undefined {
  return IMPLANTED_DEVICES.find((d) => d.id === id);
}

// ─── Orthotics ───────────────────────────────────────────────────────────────

export type OrthoticDevice = {
  id: string;
  label: string;
  category: string;
  plainLanguage: string;
  wearGuidance: string[];
  exerciseNotes: string[];
  searchTerms: string[];
  bodyPartsHint?: BodyPart[];
  programBiases: string[];
};

export const ORTHOTIC_DEVICES: OrthoticDevice[] = [
  {
    id: "afo",
    label: "Ankle-foot orthosis (AFO)",
    category: "Lower limb",
    plainLanguage: "Brace supporting ankle/foot for drop foot, instability, or post-op control.",
    wearGuidance: ["Don/doff per PT; check skin daily", "Wear schedule may be progressive"],
    exerciseNotes: ["May perform some AROM out of brace if allowed", "Gait training often in AFO"],
    searchTerms: ["afo", "ankle foot orthosis", "foot drop brace"],
    bodyPartsHint: ["ankles", "foot"],
    programBiases: ["orthotic", "gait-device"],
  },
  {
    id: "kafo",
    label: "Knee-ankle-foot orthosis (KAFO)",
    category: "Lower limb",
    plainLanguage: "Long brace controlling knee and ankle.",
    wearGuidance: ["Skin checks at all contact points", "Lock/unlock knee per training"],
    exerciseNotes: ["Respect knee lock rules during gait", "Hip/core work often emphasized"],
    searchTerms: ["kafo", "knee ankle foot orthosis"],
    bodyPartsHint: ["knee", "ankles"],
    programBiases: ["orthotic", "gait-device"],
  },
  {
    id: "knee-immobilizer",
    label: "Knee immobilizer",
    category: "Lower limb",
    plainLanguage: "Straight-leg brace limiting knee flexion after injury/surgery.",
    wearGuidance: ["Wear per hour schedule", "Watch for calf swelling/DVT symptoms"],
    exerciseNotes: ["Quad sets/SLR often allowed in immobilizer", "No knee flexion beyond order"],
    searchTerms: ["knee immobilizer", "knee immob"],
    bodyPartsHint: ["knee"],
    programBiases: ["orthotic", "knee-protect"],
  },
  {
    id: "hinged-knee",
    label: "Hinged knee brace / ACL brace",
    category: "Lower limb",
    plainLanguage: "Brace allowing controlled knee motion with collateral support.",
    wearGuidance: ["Set flexion stops as ordered", "Wear for higher-risk activity if prescribed"],
    exerciseNotes: ["Train with brace if return-to-sport protocol requires it"],
    searchTerms: ["acl brace", "hinged knee", "functional knee brace"],
    bodyPartsHint: ["knee"],
    programBiases: ["orthotic", "knee-protect"],
  },
  {
    id: "cam-boot",
    label: "CAM walker boot",
    category: "Lower limb",
    plainLanguage: "Removable rigid boot for foot/ankle fractures or tendon protection.",
    wearGuidance: ["Wear for all ambulation if ordered", "Use even shoe height on other side if needed"],
    exerciseNotes: ["NWB/PWB rules still apply inside boot", "Toe/intrinsic work if allowed out of boot"],
    searchTerms: ["cam boot", "walking boot", "fracture boot"],
    bodyPartsHint: ["ankles", "foot"],
    programBiases: ["orthotic", "protect-limb"],
  },
  {
    id: "post-op-shoe",
    label: "Post-op shoe / heel wedge shoe",
    category: "Lower limb",
    plainLanguage: "Stiff-soled shoe protecting foot surgeries.",
    wearGuidance: ["Wear indoors/outdoors per order", "No barefoot walking if restricted"],
    exerciseNotes: ["Avoid push-off intensive drills"],
    searchTerms: ["post op shoe", "surgical shoe", "darco", "heel wedge"],
    bodyPartsHint: ["foot", "toes"],
    programBiases: ["orthotic"],
  },
  {
    id: "wrist-cockup",
    label: "Wrist cock-up splint",
    category: "Upper limb",
    plainLanguage: "Keeps wrist extended for tendon/nerve conditions.",
    wearGuidance: ["Night vs day schedule matters", "Allow finger motion if ordered"],
    exerciseNotes: ["Tendon glides often done out of splint as prescribed"],
    searchTerms: ["cock-up", "wrist splint", "carpal tunnel splint"],
    bodyPartsHint: ["wrists", "hand"],
    programBiases: ["orthotic", "ue-protect"],
  },
  {
    id: "thumb-spica",
    label: "Thumb spica splint",
    category: "Upper limb",
    plainLanguage: "Stabilizes CMC/scaphoid/De Quervain-related conditions.",
    wearGuidance: ["Keep thumb IP free if design allows", "Skin checks in first web space"],
    exerciseNotes: ["Avoid pinch loading if restricted"],
    searchTerms: ["thumb spica", "spica splint", "cmc brace"],
    bodyPartsHint: ["hand", "wrists"],
    programBiases: ["orthotic", "ue-protect"],
  },
  {
    id: "shoulder-abduction-sling",
    label: "Abduction sling / pillow sling",
    category: "Upper limb",
    plainLanguage: "Holds shoulder slightly away from body after cuff repair.",
    wearGuidance: ["Sleeping in sling often required", "Axilla hygiene as taught"],
    exerciseNotes: ["Pendulums only if protocol allows"],
    searchTerms: ["abduction pillow", "abduction sling", "ultrasling"],
    bodyPartsHint: ["shoulders"],
    programBiases: ["orthotic", "shoulder-precautions"],
  },
  {
    id: "cervical-collar",
    label: "Cervical collar (soft/hard)",
    category: "Spine",
    plainLanguage: "Limits neck motion after injury or surgery.",
    wearGuidance: ["Know hours/day and shower rules", "Skin under chin/occiput"],
    exerciseNotes: ["UE exercise may be limited by collar"],
    searchTerms: ["cervical collar", "aspén collar", "miami j", "soft collar"],
    bodyPartsHint: ["neck"],
    programBiases: ["orthotic", "cervical-precautions"],
  },
  {
    id: "tlso",
    label: "TLSO / LSO spinal orthosis",
    category: "Spine",
    plainLanguage: "Trunk brace after fusion/fracture.",
    wearGuidance: ["Apply in bed via log-roll if taught", "Wear when upright if ordered"],
    exerciseNotes: ["No BLT motions outside brace rules"],
    searchTerms: ["tlso", "lso", "spinal orthosis", "back brace"],
    bodyPartsHint: ["lower-back", "thoracic"],
    programBiases: ["orthotic", "spinal-precautions"],
  },
  {
    id: "sacroiliac-belt",
    label: "SI belt / pelvic belt",
    category: "Spine/pelvis",
    plainLanguage: "Compression belt for pelvic girdle support.",
    wearGuidance: ["Position over greater trochanters as fit", "Not a substitute for red-flag care"],
    exerciseNotes: ["Pair with motor control rather than aggressive stretching early"],
    searchTerms: ["si belt", "sacroiliac belt", "pelvic belt"],
    bodyPartsHint: ["pelvis", "lower-back"],
    programBiases: ["orthotic"],
  },
  {
    id: "custom-foot-orthotic",
    label: "Custom foot orthotic / insole",
    category: "Lower limb",
    plainLanguage: "In-shoe device for alignment, plantar load, or post-op support.",
    wearGuidance: ["Break-in schedule", "Use in supportive shoes"],
    exerciseNotes: ["Train in the shoes/orthoses you will wear daily"],
    searchTerms: ["foot orthotic", "orthotics", "insoles", "custom insert"],
    bodyPartsHint: ["foot", "ankles"],
    programBiases: ["orthotic"],
  },
  {
    id: "patellar-strap",
    label: "Patellar tendon strap / knee sleeve",
    category: "Lower limb",
    plainLanguage: "Counterforce or compression for anterior knee symptoms.",
    wearGuidance: ["Not for unstable fractures", "Skin irritation check"],
    exerciseNotes: ["Does not replace load management for tendinopathy"],
    searchTerms: ["cho-pat", "patellar strap", "knee sleeve"],
    bodyPartsHint: ["knee"],
    programBiases: ["orthotic"],
  },
  {
    id: "tennis-elbow-strap",
    label: "Counterforce elbow strap",
    category: "Upper limb",
    plainLanguage: "Reduces load on wrist extensors in lateral elbow pain.",
    wearGuidance: ["Place distal to elbow crease as fit", "Loosen if numbness"],
    exerciseNotes: ["Pair with progressive tendon loading when appropriate"],
    searchTerms: ["tennis elbow strap", "counterforce brace", "lateral epicondylitis brace"],
    bodyPartsHint: ["elbow", "forearm"],
    programBiases: ["orthotic"],
  },
];

// ─── Prosthetics ─────────────────────────────────────────────────────────────

export type ProstheticDevice = {
  id: string;
  label: string;
  level: string;
  plainLanguage: string;
  careNotes: string[];
  exerciseNotes: string[];
  searchTerms: string[];
  programBiases: string[];
};

export const PROSTHETIC_DEVICES: ProstheticDevice[] = [
  {
    id: "tt-prosthesis",
    label: "Transtibial (below-knee) prosthesis",
    level: "Lower limb",
    plainLanguage: "Prosthesis after below-knee amputation.",
    careNotes: ["Skin/sock ply management", "Volume changes affect fit"],
    exerciseNotes: ["Socket comfort limits progression", "Core/hip strength critical"],
    searchTerms: ["below knee prosthesis", "transtibial", "bk prosthesis", "tt prosthesis"],
    programBiases: ["prosthetic", "gait-device", "fall-prevention"],
  },
  {
    id: "tf-prosthesis",
    label: "Transfemoral (above-knee) prosthesis",
    level: "Lower limb",
    plainLanguage: "Prosthesis after above-knee amputation.",
    careNotes: ["Knee component mode awareness", "Sit-stand training essential"],
    exerciseNotes: ["Hip extensor/abductor capacity", "Energy cost of gait is high—dose carefully"],
    searchTerms: ["above knee prosthesis", "transfemoral", "ak prosthesis", "tf prosthesis"],
    programBiases: ["prosthetic", "gait-device", "fall-prevention", "short-volume"],
  },
  {
    id: "syme-prosthesis",
    label: "Syme / ankle disarticulation prosthesis",
    level: "Lower limb",
    plainLanguage: "Prosthesis after Syme-level amputation.",
    careNotes: ["Heel pad skin integrity", "Shoe cosmesis/fit"],
    exerciseNotes: ["Progress stance control gradually"],
    searchTerms: ["syme prosthesis", "ankle disarticulation"],
    programBiases: ["prosthetic", "gait-device"],
  },
  {
    id: "hip-disartic-prosthesis",
    label: "Hip disarticulation / hemipelvectomy prosthesis",
    level: "Lower limb",
    plainLanguage: "High-level lower-limb prosthetic system.",
    careNotes: ["Specialized prosthetic team required", "Sitting pan/socket care"],
    exerciseNotes: ["Transfer training priority", "Low endurance initially"],
    searchTerms: ["hip disarticulation prosthesis", "hemipelvectomy"],
    programBiases: ["prosthetic", "defer-to-provider", "fall-prevention"],
  },
  {
    id: "ue-body-powered",
    label: "Upper-limb body-powered prosthesis",
    level: "Upper limb",
    plainLanguage: "Cable-operated terminal device.",
    careNotes: ["Harness fit", "Cable tension education"],
    exerciseNotes: ["Scapular/shoulder endurance", "Bimanual task practice"],
    searchTerms: ["body powered prosthesis", "hook prosthesis", "upper limb prosthesis"],
    programBiases: ["prosthetic", "ue-function"],
  },
  {
    id: "ue-myoelectric",
    label: "Myoelectric upper-limb prosthesis",
    level: "Upper limb",
    plainLanguage: "Electrode-controlled terminal device.",
    careNotes: ["Electrode contact/skin", "Battery management"],
    exerciseNotes: ["Signal training + pattern recognition practice as prescribed"],
    searchTerms: ["myoelectric", "bionic arm", "myo prosthesis"],
    programBiases: ["prosthetic", "ue-function"],
  },
  {
    id: "partial-foot-prosthesis",
    label: "Partial foot prosthesis / filler",
    level: "Lower limb",
    plainLanguage: "Device restoring foot lever after partial foot amputation.",
    careNotes: ["Skin on residual foot", "Shoe selection"],
    exerciseNotes: ["Push-off mechanics training", "Balance work"],
    searchTerms: ["partial foot prosthesis", "toe filler", "transmetatarsal prosthesis"],
    programBiases: ["prosthetic", "foot-protect"],
  },
];

// ─── Assistive devices ───────────────────────────────────────────────────────

export type AssistiveDevice = {
  id: string;
  label: string;
  category: string;
  plainLanguage: string;
  fitCues: string[];
  safetyTips: string[];
  whenSuggested: string[];
  searchTerms: string[];
  programBiases: string[];
  pairsWithPrecautionIds?: string[];
};

export const ASSISTIVE_DEVICES: AssistiveDevice[] = [
  {
    id: "rw",
    label: "Rolling walker (2-wheel / 4-wheel)",
    category: "Gait",
    plainLanguage: "Frame with wheels for balance and offloading.",
    fitCues: ["Handgrips at wrist crease", "Elbows soft ~20–30°"],
    safetyTips: ["Lock wheels for sit-stand if equipped", "Do not pull up on walker from chair"],
    whenSuggested: ["WB limits", "balance impairment", "post-op LE"],
    searchTerms: ["rolling walker", "rollator", "2ww", "4ww", "wheeled walker"],
    programBiases: ["assistive-device", "fall-prevention"],
    pairsWithPrecautionIds: ["wb-nwb", "wb-ttwb", "wb-pwb", "wb-wbat", "hip-posterior"],
  },
  {
    id: "sw",
    label: "Standard walker (pickup)",
    category: "Gait",
    plainLanguage: "No-wheel walker for maximum stability.",
    fitCues: ["Same height rules as rolling walker"],
    safetyTips: ["All four tips down before stepping", "Sequence: walker → affected → sound (as taught)"],
    whenSuggested: ["NWB/TTWB", "high fall risk"],
    searchTerms: ["standard walker", "pickup walker", "zimmer frame"],
    programBiases: ["assistive-device", "fall-prevention"],
    pairsWithPrecautionIds: ["wb-nwb", "wb-ttwb"],
  },
  {
    id: "crutches-axillary",
    label: "Axillary crutches",
    category: "Gait",
    plainLanguage: "Underarm crutches for NWB/PWB gait.",
    fitCues: ["2–3 finger widths below axilla", "Handgrip at wrist crease"],
    safetyTips: ["Weight through hands—not armpits", "Dry tips; careful on wet floors"],
    whenSuggested: ["NWB", "TTWB", "PWB"],
    searchTerms: ["crutches", "axillary crutches", "underarm crutches"],
    programBiases: ["assistive-device"],
    pairsWithPrecautionIds: ["wb-nwb", "wb-ttwb", "wb-pwb"],
  },
  {
    id: "crutches-forearm",
    label: "Forearm (Lofstrand) crutches",
    category: "Gait",
    plainLanguage: "Cuff crutches for longer-term gait aid use.",
    fitCues: ["Cuff below elbow", "Grip height correct"],
    safetyTips: ["Practice sit-stand carefully", "Not ideal for full NWB beginners without training"],
    whenSuggested: ["Longer-term neuro/ortho gait aid"],
    searchTerms: ["forearm crutches", "lofstrand", "canadian crutches"],
    programBiases: ["assistive-device"],
  },
  {
    id: "spc",
    label: "Single-point cane",
    category: "Gait",
    plainLanguage: "Light balance aid; usually opposite the weak/painful LE.",
    fitCues: ["Handle at wrist crease", "Slight elbow bend"],
    safetyTips: ["Cane opposite affected leg for most ortho patterns", "Not enough for NWB"],
    whenSuggested: ["Mild balance deficit", "WBAT late phase"],
    searchTerms: ["cane", "single point cane", "walking stick"],
    programBiases: ["assistive-device"],
    pairsWithPrecautionIds: ["wb-wbat", "wb-fwb"],
  },
  {
    id: "quad-cane",
    label: "Quad cane",
    category: "Gait",
    plainLanguage: "Four-tip cane for more stability than SPC.",
    fitCues: ["Flat side parallel to body as designed"],
    safetyTips: ["All tips contact floor", "Slower but more stable"],
    whenSuggested: ["Moderate balance needs"],
    searchTerms: ["quad cane", "4-point cane"],
    programBiases: ["assistive-device", "fall-prevention"],
  },
  {
    id: "hemiwalker",
    label: "Hemi-walker / walk-cane",
    category: "Gait",
    plainLanguage: "One-sided broad base aid after stroke or unilateral limitation.",
    fitCues: ["Height at wrist crease on strong side"],
    safetyTips: ["Train sequencing with PT", "Watch for tipping on turns"],
    whenSuggested: ["Hemiparesis", "one UE available"],
    searchTerms: ["hemiwalker", "hemi walker", "walk cane"],
    programBiases: ["assistive-device", "neuro-gait"],
  },
  {
    id: "wheelchair",
    label: "Manual wheelchair",
    category: "Wheeled mobility",
    plainLanguage: "Seated mobility when walking is unsafe or restricted.",
    fitCues: ["Seat width/depth", "Footrest clearance"],
    safetyTips: ["Lock brakes for transfers", "Pressure relief schedule"],
    whenSuggested: ["NWB bilateral issues", "endurance limits", "safety"],
    searchTerms: ["wheelchair", "manual wheelchair", "wc "],
    programBiases: ["assistive-device", "seated-program", "pressure-relief"],
  },
  {
    id: "rollator",
    label: "Rollator (seat + brakes)",
    category: "Gait",
    plainLanguage: "Four-wheel walker with seat for rest breaks.",
    fitCues: ["Brake reach", "Seat height for rest"],
    safetyTips: ["Never sit without brakes locked", "Not for NWB typically"],
    whenSuggested: ["Community ambulation with rest need"],
    searchTerms: ["rollator", "4 wheel walker with seat"],
    programBiases: ["assistive-device"],
  },
  {
    id: "gait-belt",
    label: "Gait belt (caregiver-assisted)",
    category: "Safety",
    plainLanguage: "Belt for supervised gait/transfers by trained helpers.",
    fitCues: ["Snug at waist/pelvis per training"],
    safetyTips: ["Not a lifting harness for dependent lifts", "Trained assistance only"],
    whenSuggested: ["High fall risk with helper"],
    searchTerms: ["gait belt", "transfer belt"],
    programBiases: ["fall-prevention"],
  },
  {
    id: "reacher",
    label: "Reacher / grabber",
    category: "ADL",
    plainLanguage: "Extends reach to avoid bending under spinal/hip precautions.",
    fitCues: ["Lightweight; store within safe reach"],
    safetyTips: ["Still avoid twisting", "Do not stand on unstable stools"],
    whenSuggested: ["Spinal BLT", "hip precautions", "sternal limits"],
    searchTerms: ["reacher", "grabber", "grabber tool"],
    programBiases: ["adl-aid"],
    pairsWithPrecautionIds: ["spinal-blts", "hip-posterior", "sternal-standard"],
  },
  {
    id: "sock-aid",
    label: "Sock aid / long-handle shoe horn",
    category: "ADL",
    plainLanguage: "Dressing aids when hip/spine flexion is limited.",
    fitCues: ["Practice seated"],
    safetyTips: ["Do not force end-range to dress"],
    whenSuggested: ["Hip precautions", "spinal precautions"],
    searchTerms: ["sock aid", "shoe horn", "dressing stick"],
    programBiases: ["adl-aid"],
    pairsWithPrecautionIds: ["hip-posterior", "spinal-blts"],
  },
  {
    id: "raised-toilet",
    label: "Raised toilet seat / commode",
    category: "ADL",
    plainLanguage: "Reduces hip flexion demand and push-off force.",
    fitCues: ["Secure attachment", "Height match precautions"],
    safetyTips: ["Non-slip; grab bars if prescribed"],
    whenSuggested: ["THA", "sternal (less push)", "weak LE"],
    searchTerms: ["raised toilet", "toilet riser", "bedside commode"],
    programBiases: ["adl-aid"],
    pairsWithPrecautionIds: ["hip-posterior", "sternal-standard"],
  },
  {
    id: "shower-chair",
    label: "Shower chair / tub bench",
    category: "ADL",
    plainLanguage: "Seated bathing to reduce fall and WB stress.",
    fitCues: ["Rubber tips dry", "Correct seat height"],
    safetyTips: ["Hand-held shower helps", "Never use soap-slick surfaces without care"],
    whenSuggested: ["NWB", "balance risk", "sternal energy conservation"],
    searchTerms: ["shower chair", "tub bench", "bath bench"],
    programBiases: ["adl-aid", "fall-prevention"],
  },
  {
    id: "grab-bars",
    label: "Grab bars (bathroom)",
    category: "Home safety",
    plainLanguage: "Fixed bars for sit-stand and tub transfers.",
    fitCues: ["Professionally installed into studs"],
    safetyTips: ["Towel bars are not grab bars"],
    whenSuggested: ["Fall risk", "post-op home"],
    searchTerms: ["grab bar", "grab bars"],
    programBiases: ["fall-prevention", "home-safety"],
  },
];

export function getAssistiveById(id: string): AssistiveDevice | undefined {
  return ASSISTIVE_DEVICES.find((d) => d.id === id);
}

export function getOrthoticById(id: string): OrthoticDevice | undefined {
  return ORTHOTIC_DEVICES.find((d) => d.id === id);
}

export function getProstheticById(id: string): ProstheticDevice | undefined {
  return PROSTHETIC_DEVICES.find((d) => d.id === id);
}

// ─── Matching & plan application ─────────────────────────────────────────────

function matchIdsByTerms<T extends { id: string; searchTerms: string[] }>(
  items: T[],
  text: string,
  limit = 12
): string[] {
  const t = text.toLowerCase();
  if (t.length < 3) return [];
  const scored = items
    .map((item) => {
      let score = 0;
      for (const term of item.searchTerms) {
        if (t.includes(term.toLowerCase())) score += term.length;
      }
      return { id: item.id, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.id);
}

export function matchPrecautionsFromText(text: string, limit = 10): string[] {
  return matchIdsByTerms(CLINICAL_PRECAUTIONS, text, limit);
}

export function matchImplantsFromText(text: string, limit = 8): string[] {
  return matchIdsByTerms(IMPLANTED_DEVICES, text, limit);
}

export function matchOrthoticsFromText(text: string, limit = 8): string[] {
  return matchIdsByTerms(ORTHOTIC_DEVICES, text, limit);
}

export function matchProstheticsFromText(text: string, limit = 6): string[] {
  return matchIdsByTerms(PROSTHETIC_DEVICES, text, limit);
}

export function matchAssistiveFromText(text: string, limit = 8): string[] {
  return matchIdsByTerms(ASSISTIVE_DEVICES, text, limit);
}

export type ClinicalSafetyInput = {
  ageYears?: number;
  borgTargetId?: string;
  /** User resting HR if known (optional education) */
  restingHr?: number;
  precautionIds?: string[];
  implantIds?: string[];
  orthoticIds?: string[];
  prostheticIds?: string[];
  assistiveDeviceIds?: string[];
  /** Free-text surgical protocol notes from user */
  protocolNotes?: string;
  concernParagraph?: string;
};

export type ClinicalSafetyPlan = {
  ageYears?: number;
  maxHr?: number;
  hrZones?: ReturnType<typeof hrZonesFromMax>;
  borg: BorgTarget;
  targetHrCap?: number;
  precautionIds: string[];
  implantIds: string[];
  orthoticIds: string[];
  prostheticIds: string[];
  assistiveDeviceIds: string[];
  suggestedAssistiveDeviceIds: string[];
  precautions: ClinicalPrecaution[];
  implants: ImplantedDevice[];
  orthotics: OrthoticDevice[];
  prosthetics: ProstheticDevice[];
  assistiveDevices: AssistiveDevice[];
  avoidTags: string[];
  preferTags: string[];
  programBiases: string[];
  maxDifficulty: Difficulty;
  minutesScale: number;
  educationBlocks: Array<{ title: string; body: string; bullets: string[] }>;
  summaryLines: string[];
  redFlags: string[];
};

function harderDiff(a: Difficulty, b: Difficulty): Difficulty {
  const rank = { beginner: 1, intermediate: 2, advanced: 3 };
  return rank[a] <= rank[b] ? a : b;
}

/** Merge user selections + paragraph auto-detect into a safety plan that doses the routine */
export function buildClinicalSafetyPlan(input: ClinicalSafetyInput): ClinicalSafetyPlan {
  const paragraph = input.concernParagraph || "";
  const autoPrec = matchPrecautionsFromText(paragraph);
  const autoImp = matchImplantsFromText(paragraph);
  const autoOrth = matchOrthoticsFromText(paragraph);
  const autoPros = matchProstheticsFromText(paragraph);
  const autoAd = matchAssistiveFromText(paragraph);

  let precautionIds = Array.from(new Set([...(input.precautionIds || []), ...autoPrec]));
  const implantIds = Array.from(new Set([...(input.implantIds || []), ...autoImp]));
  const orthoticIds = Array.from(new Set([...(input.orthoticIds || []), ...autoOrth]));
  const prostheticIds = Array.from(new Set([...(input.prostheticIds || []), ...autoPros]));
  let assistiveDeviceIds = Array.from(
    new Set([...(input.assistiveDeviceIds || []), ...autoAd])
  );

  // Implants pull default precautions
  for (const id of implantIds) {
    const imp = getImplantById(id);
    if (imp) precautionIds = Array.from(new Set([...precautionIds, ...imp.defaultPrecautionIds]));
  }

  const precautions = precautionIds
    .map(getPrecautionById)
    .filter(Boolean)
    .map((p) => p!);
  const implants = implantIds
    .map(getImplantById)
    .filter(Boolean)
    .map((i) => i!);
  const orthotics = orthoticIds
    .map(getOrthoticById)
    .filter(Boolean)
    .map((o) => o!);
  const prosthetics = prostheticIds
    .map(getProstheticById)
    .filter(Boolean)
    .map((p) => p!);

  // Suggest assistive devices from precautions
  const suggestedAssistiveDeviceIds: string[] = [];
  for (const ad of ASSISTIVE_DEVICES) {
    if (ad.pairsWithPrecautionIds?.some((pid) => precautionIds.includes(pid))) {
      suggestedAssistiveDeviceIds.push(ad.id);
    }
  }
  // NWB/TTWB always suggest walker or crutches
  if (precautionIds.some((id) => ["wb-nwb", "wb-ttwb", "wb-tdwb"].includes(id))) {
    suggestedAssistiveDeviceIds.push("sw", "crutches-axillary", "rw");
  }
  if (precautionIds.includes("wb-pwb")) suggestedAssistiveDeviceIds.push("rw", "crutches-axillary");
  if (precautionIds.some((id) => id.startsWith("hip-"))) {
    suggestedAssistiveDeviceIds.push("rw", "raised-toilet", "reacher", "sock-aid");
  }
  if (precautionIds.some((id) => id.startsWith("spinal"))) {
    suggestedAssistiveDeviceIds.push("reacher", "sock-aid", "grab-bars");
  }
  if (precautionIds.some((id) => id.startsWith("sternal"))) {
    suggestedAssistiveDeviceIds.push("reacher", "raised-toilet");
  }

  const uniqueSuggested = Array.from(new Set(suggestedAssistiveDeviceIds));
  assistiveDeviceIds = Array.from(new Set([...assistiveDeviceIds, ...uniqueSuggested.slice(0, 4)]));

  const assistiveDevices = assistiveDeviceIds
    .map(getAssistiveById)
    .filter(Boolean)
    .map((a) => a!);

  const avoidTags = new Set<string>();
  const preferTags = new Set<string>();
  const programBiases = new Set<string>();
  const redFlags: string[] = [];
  let maxDifficulty: Difficulty = "advanced";
  let minutesScale = 1;

  const age = input.ageYears;
  const borgId = input.borgTargetId || ageBasedDefaultBorg(age);
  const borg = getBorgTarget(borgId);
  programBiases.add(borg.programBias);
  maxDifficulty = harderDiff(maxDifficulty, borg.maxDifficulty);
  minutesScale *= borg.minutesScale;

  if (age != null) {
    if (age >= 75) {
      programBiases.add("older-adult");
      maxDifficulty = harderDiff(maxDifficulty, "beginner");
      minutesScale *= 0.85;
    } else if (age >= 65) {
      programBiases.add("older-adult");
      minutesScale *= 0.92;
    }
  }

  const maxHr = age != null ? estimateMaxHr(age) : undefined;
  const hrZones = maxHr != null ? hrZonesFromMax(maxHr) : undefined;
  const targetHrCap =
    maxHr != null ? Math.round(maxHr * Math.min(borg.hrMaxFractionCap, 0.85)) : undefined;

  for (const p of precautions) {
    p.avoidTags.forEach((t) => avoidTags.add(t));
    p.preferTags.forEach((t) => preferTags.add(t));
    p.programBiases.forEach((b) => programBiases.add(b));
    maxDifficulty = harderDiff(maxDifficulty, p.maxDifficulty);
    minutesScale *= p.minutesScale;
    if (p.redFlagEducation) redFlags.push(p.redFlagEducation);
  }
  for (const imp of implants) {
    imp.avoidTags.forEach((t) => avoidTags.add(t));
    imp.preferTags.forEach((t) => preferTags.add(t));
    imp.programBiases.forEach((b) => programBiases.add(b));
    if (imp.maxDifficulty) maxDifficulty = harderDiff(maxDifficulty, imp.maxDifficulty);
  }
  for (const o of orthotics) o.programBiases.forEach((b) => programBiases.add(b));
  for (const p of prosthetics) p.programBiases.forEach((b) => programBiases.add(b));
  for (const a of assistiveDevices) a.programBiases.forEach((b) => programBiases.add(b));

  // Floor minutes scale
  minutesScale = Math.max(0.45, Math.min(1.15, minutesScale));

  const educationBlocks: ClinicalSafetyPlan["educationBlocks"] = [];

  if (age != null && maxHr != null && hrZones) {
    educationBlocks.push({
      title: `Age ${age}: estimated max HR & effort caps`,
      body: `Estimated HRmax ≈ ${maxHr} bpm (Tanaka 208 − 0.7×age). This is an estimate—medications (beta-blockers), devices, and conditions change targets. Cap home effort near Borg “${borg.label}” (≈${borg.borg6to20[0]}–${borg.borg6to20[1]} on 6–20 scale; CR10 ${borg.cr10[0]}–${borg.cr10[1]}). Suggested HR ceiling for this plan ~${targetHrCap} bpm (~${Math.round(borg.hrMaxFractionCap * 100)}% HRmax) unless your clinician sets a different zone.`,
      bullets: [
        hrZones.veryLight.label + `: ${hrZones.veryLight.min}–${hrZones.veryLight.max} bpm`,
        hrZones.light.label + `: ${hrZones.light.min}–${hrZones.light.max} bpm`,
        hrZones.moderate.label + `: ${hrZones.moderate.min}–${hrZones.moderate.max} bpm`,
        borg.education,
        "Stop for chest pain, severe SOB, dizziness, or palpitations—seek urgent care as appropriate.",
      ],
    });
  } else {
    educationBlocks.push({
      title: "Borg effort dosing",
      body: borg.education,
      bullets: [
        `Target band: Borg 6–20 ≈ ${borg.borg6to20[0]}–${borg.borg6to20[1]}; CR10 ≈ ${borg.cr10[0]}–${borg.cr10[1]}.`,
        "Add your age in Assessment for personalized HRmax estimates.",
      ],
    });
  }

  for (const p of precautions) {
    educationBlocks.push({
      title: `${p.shortLabel}: ${p.label}`,
      body: `${p.definition} Typical duration education: ${p.typicalDuration} Always defer to your surgeon/PT written protocol when it differs.`,
      bullets: p.adherence,
    });
  }
  for (const imp of implants) {
    educationBlocks.push({
      title: `Implant: ${imp.label}`,
      body: `${imp.plainLanguage} ${imp.education}`,
      bullets: imp.precautions,
    });
  }
  for (const o of orthotics) {
    educationBlocks.push({
      title: `Orthotic: ${o.label}`,
      body: o.plainLanguage,
      bullets: [...o.wearGuidance, ...o.exerciseNotes],
    });
  }
  for (const p of prosthetics) {
    educationBlocks.push({
      title: `Prosthetic: ${p.label}`,
      body: p.plainLanguage,
      bullets: [...p.careNotes, ...p.exerciseNotes],
    });
  }
  for (const a of assistiveDevices) {
    educationBlocks.push({
      title: `Assistive device: ${a.label}`,
      body: a.plainLanguage,
      bullets: [...a.fitCues.map((c) => `Fit: ${c}`), ...a.safetyTips.map((s) => `Safety: ${s}`)],
    });
  }
  if (input.protocolNotes?.trim()) {
    educationBlocks.push({
      title: "Your protocol notes (user-entered)",
      body: input.protocolNotes.trim(),
      bullets: ["These notes are stored with your plan—share with your care team as needed."],
    });
  }

  const summaryLines = [
    age != null ? `Age ${age}; est. HRmax ${maxHr} bpm; Borg target ${borg.label}` : `Borg target ${borg.label}`,
    precautions.length
      ? `Precautions: ${precautions.map((p) => p.shortLabel).join(", ")}`
      : "No special surgical precautions selected",
    implants.length ? `Implants: ${implants.map((i) => i.label).join("; ")}` : null,
    orthotics.length ? `Orthotics: ${orthotics.map((o) => o.label).join("; ")}` : null,
    prosthetics.length ? `Prosthetics: ${prosthetics.map((p) => p.label).join("; ")}` : null,
    assistiveDevices.length
      ? `Assistive devices: ${assistiveDevices.map((a) => a.label).join("; ")}`
      : null,
    uniqueSuggested.length
      ? `Suggested assistive devices: ${uniqueSuggested
          .map((id) => getAssistiveById(id)?.label)
          .filter(Boolean)
          .slice(0, 5)
          .join("; ")}`
      : null,
  ].filter(Boolean) as string[];

  return {
    ageYears: age,
    maxHr,
    hrZones,
    borg,
    targetHrCap,
    precautionIds,
    implantIds,
    orthoticIds,
    prostheticIds,
    assistiveDeviceIds,
    suggestedAssistiveDeviceIds: uniqueSuggested,
    precautions,
    implants,
    orthotics,
    prosthetics,
    assistiveDevices,
    avoidTags: Array.from(avoidTags),
    preferTags: Array.from(preferTags),
    programBiases: Array.from(programBiases),
    maxDifficulty,
    minutesScale,
    educationBlocks,
    summaryLines,
    redFlags,
  };
}

export const CLINICAL_SAFETY_STATS = {
  precautions: CLINICAL_PRECAUTIONS.length,
  implants: IMPLANTED_DEVICES.length,
  orthotics: ORTHOTIC_DEVICES.length,
  prosthetics: PROSTHETIC_DEVICES.length,
  assistive: ASSISTIVE_DEVICES.length,
  borgTargets: BORG_TARGETS.length,
};
