/**
 * Assessment adjective / qualifier analysis.
 * Every descriptive word in free-text intake is mapped to clinically significant
 * program biases, avoid/prefer tags, and dosing hints (educational synthesis).
 */

import type { Difficulty } from "@/lib/types";
import type { ProgramBias } from "@/data/pain-descriptors";

export type AdjectiveHit = {
  word: string;
  clinicalMeaning: string;
  programBiases: ProgramBias[];
  avoidTags: string[];
  preferTags: string[];
  stretchBias: number;
  exerciseBias: number;
  irritabilityBoost: number;
  maxDifficulty?: Difficulty;
  minutesScale: number;
  outcomeHint: string;
};

/** Multi-word phrases checked first (longer wins) */
const PHRASE_RULES: Array<{
  pattern: RegExp;
  hit: Omit<AdjectiveHit, "word">;
}> = [
  {
    pattern: /\b(excruciating|unbearable|agonizing)\b/i,
    hit: {
      clinicalMeaning: "Very high symptom intensity — prioritize protection and professional review",
      programBiases: ["short-volume", "gentle-mobility", "defer-to-provider"],
      avoidTags: ["end-range", "impact", "heavy-load", "vigorous"],
      preferTags: ["gentle", "supported", "short-hold"],
      stretchBias: 0.4,
      exerciseBias: -0.4,
      irritabilityBoost: 2.5,
      maxDifficulty: "beginner",
      minutesScale: 0.55,
      outcomeHint: "Stabilize irritability before progressive loading; track pain NRS closely.",
    },
  },
  {
    pattern: /\b(sharp|stabbing|knife-?like)\b/i,
    hit: {
      clinicalMeaning: "Sharp quality — avoid aggressive end-range; motor control bias",
      programBiases: ["gentle-mobility", "motor-control", "avoid-endrange"],
      avoidTags: ["end-range", "ballistic", "bounce"],
      preferTags: ["controlled", "mid-range", "gentle"],
      stretchBias: 0.2,
      exerciseBias: 0.1,
      irritabilityBoost: 1.2,
      maxDifficulty: "beginner",
      minutesScale: 0.75,
      outcomeHint: "Favor mid-range control; sharp pain is a stop signal.",
    },
  },
  {
    pattern: /\b(burning|electric|shooting|zapping)\b/i,
    hit: {
      clinicalMeaning: "Neuropathic-like quality — neural caution",
      programBiases: ["neural-caution", "gentle-mobility", "short-volume"],
      avoidTags: ["neural-tension", "end-range", "aggressive-stretch"],
      preferTags: ["neural-slider-gentle", "supported", "short-hold"],
      stretchBias: 0.15,
      exerciseBias: -0.1,
      irritabilityBoost: 1.4,
      maxDifficulty: "beginner",
      minutesScale: 0.7,
      outcomeHint: "Gentle sliders over tensioners; monitor peripheralization.",
    },
  },
  {
    pattern: /\b(numb|numbness|tingling|pins and needles|paresthesia)\b/i,
    hit: {
      clinicalMeaning: "Sensory change — neurologic screening awareness",
      programBiases: ["neural-caution", "defer-to-provider"],
      avoidTags: ["neural-tension", "sustained-compression"],
      preferTags: ["gentle", "position-change"],
      stretchBias: 0.1,
      exerciseBias: -0.15,
      irritabilityBoost: 1.0,
      maxDifficulty: "beginner",
      minutesScale: 0.7,
      outcomeHint: "Progressive neuro symptoms need licensed evaluation.",
    },
  },
  {
    pattern: /\b(dull|aching|achy|sore)\b/i,
    hit: {
      clinicalMeaning: "Nociceptive-aching pattern — graded mobility + light load often tolerated",
      programBiases: ["gentle-mobility", "controlled-strength"],
      avoidTags: [],
      preferTags: ["mobility", "activation", "warm-up"],
      stretchBias: 0.25,
      exerciseBias: 0.2,
      irritabilityBoost: 0.4,
      minutesScale: 0.95,
      outcomeHint: "Graded exposure with traffic-light pain rules.",
    },
  },
  {
    pattern: /\b(tight|stiff|rigid|locked)\b/i,
    hit: {
      clinicalMeaning: "Stiffness-dominant — warm-up heavy, mobility emphasis",
      programBiases: ["gentle-mobility", "warm-up-heavy"],
      avoidTags: ["cold-start-load"],
      preferTags: ["mobility", "warmup", "desk", "breath-led"],
      stretchBias: 0.45,
      exerciseBias: 0.05,
      irritabilityBoost: 0.3,
      minutesScale: 1.0,
      outcomeHint: "Brief heat/walk then mobility; measure morning stiffness minutes.",
    },
  },
  {
    pattern: /\b(weak|unstable|giving way|buckling)\b/i,
    hit: {
      clinicalMeaning: "Weakness/instability language — motor control + strength bias",
      programBiases: ["controlled-strength", "motor-control", "balance-focus"],
      avoidTags: ["ballistic", "unsupervised-balance"],
      preferTags: ["activation", "motor-control", "balance", "supported"],
      stretchBias: -0.1,
      exerciseBias: 0.5,
      irritabilityBoost: 0.5,
      minutesScale: 0.9,
      outcomeHint: "Quality reps; support surfaces for balance safety.",
    },
  },
  {
    pattern: /\b(swollen|puffy|inflamed|hot to touch)\b/i,
    hit: {
      clinicalMeaning: "Inflammatory/swelling pattern — short volume, avoid aggressive load",
      programBiases: ["short-volume", "gentle-mobility"],
      avoidTags: ["impact", "heavy-load", "end-range"],
      preferTags: ["gentle", "elevation-friendly", "pump"],
      stretchBias: 0.15,
      exerciseBias: -0.2,
      irritabilityBoost: 1.1,
      maxDifficulty: "beginner",
      minutesScale: 0.7,
      outcomeHint: "Relative rest + gentle motion; swelling trend matters.",
    },
  },
  {
    pattern: /\b(worse (when|with) sitting|sitting makes|aggravated by sitting)\b/i,
    hit: {
      clinicalMeaning: "Sitting aggravation — unload, extension bias, microbreaks",
      programBiases: ["prefer-extension", "postural-endurance", "prefer-unloaded"],
      avoidTags: ["prolonged-flexion", "slump"],
      preferTags: ["extension", "desk", "posture", "standing"],
      stretchBias: 0.3,
      exerciseBias: 0.15,
      irritabilityBoost: 0.6,
      minutesScale: 0.9,
      outcomeHint: "Desk microbreaks; track sitting minutes vs pain.",
    },
  },
  {
    pattern: /\b(worse (when|with) standing|standing makes|walking makes it worse)\b/i,
    hit: {
      clinicalMeaning: "Standing/walking aggravation — prefer unloaded or short bouts",
      programBiases: ["prefer-unloaded", "short-volume", "gentle-mobility"],
      avoidTags: ["prolonged-standing", "impact"],
      preferTags: ["seated", "supine", "supported"],
      stretchBias: 0.25,
      exerciseBias: 0.05,
      irritabilityBoost: 0.7,
      minutesScale: 0.8,
      outcomeHint: "Dose standing time; prefer supported positions early.",
    },
  },
  {
    pattern: /\b(morning|first thing|on waking)\b/i,
    hit: {
      clinicalMeaning: "Morning pattern — inflammatory/stiffness dosing",
      programBiases: ["warm-up-heavy", "gentle-mobility"],
      avoidTags: [],
      preferTags: ["morning", "gentle", "warmup"],
      stretchBias: 0.3,
      exerciseBias: 0.0,
      irritabilityBoost: 0.3,
      minutesScale: 0.9,
      outcomeHint: "Gentle AM mobility; track first-hour stiffness.",
    },
  },
  {
    pattern: /\b(night|nighttime|wakes me|cannot sleep)\b/i,
    hit: {
      clinicalMeaning: "Night pain — irritability and load management",
      programBiases: ["short-volume", "cooldown-heavy", "gentle-mobility"],
      avoidTags: ["evening-vigorous"],
      preferTags: ["gentle", "evening", "cooldown"],
      stretchBias: 0.2,
      exerciseBias: -0.15,
      irritabilityBoost: 1.0,
      maxDifficulty: "beginner",
      minutesScale: 0.75,
      outcomeHint: "Avoid late vigorous sessions; position of comfort education.",
    },
  },
  {
    pattern: /\b(constant|always|all day|never goes away)\b/i,
    hit: {
      clinicalMeaning: "Constant symptoms — lower volume, higher monitoring",
      programBiases: ["short-volume", "gentle-mobility"],
      avoidTags: ["high-volume"],
      preferTags: ["short-hold", "gentle"],
      stretchBias: 0.15,
      exerciseBias: -0.1,
      irritabilityBoost: 0.9,
      maxDifficulty: "beginner",
      minutesScale: 0.7,
      outcomeHint: "Small frequent doses; track 24-hour response.",
    },
  },
  {
    pattern: /\b(intermittent|comes and goes|occasional)\b/i,
    hit: {
      clinicalMeaning: "Intermittent pattern — graded activity often appropriate",
      programBiases: ["controlled-strength", "gentle-mobility"],
      avoidTags: [],
      preferTags: ["functional", "graded"],
      stretchBias: 0.15,
      exerciseBias: 0.25,
      irritabilityBoost: 0.2,
      minutesScale: 1.0,
      outcomeHint: "Progress when flare-free 24–48h.",
    },
  },
  {
    pattern: /\b(radiating|travels|down (my )?(leg|arm)|into (my )?(hand|foot))\b/i,
    hit: {
      clinicalMeaning: "Radiating pattern — neural caution",
      programBiases: ["neural-caution", "gentle-mobility", "short-volume"],
      avoidTags: ["neural-tension", "end-range"],
      preferTags: ["neural-slider-gentle", "supported"],
      stretchBias: 0.1,
      exerciseBias: -0.05,
      irritabilityBoost: 1.1,
      maxDifficulty: "beginner",
      minutesScale: 0.75,
      outcomeHint: "Watch centralization vs peripheralization.",
    },
  },
  {
    pattern: /\b(throbbing|pounding|pulsing)\b/i,
    hit: {
      clinicalMeaning: "Throbbing quality — calm load, elevate if limb",
      programBiases: ["short-volume", "gentle-mobility"],
      avoidTags: ["dependency-load", "impact"],
      preferTags: ["gentle", "pump"],
      stretchBias: 0.15,
      exerciseBias: -0.15,
      irritabilityBoost: 0.8,
      maxDifficulty: "beginner",
      minutesScale: 0.75,
      outcomeHint: "Relative rest + gentle motion; medical review if severe/sudden.",
    },
  },
  {
    pattern: /\b(cramping|spasm|knotted|knotty)\b/i,
    hit: {
      clinicalMeaning: "Cramp/spasm language — gentle mobility, hydration/load education",
      programBiases: ["gentle-mobility", "warm-up-heavy"],
      avoidTags: ["ballistic", "cold-stretch"],
      preferTags: ["breath-led", "gentle", "warmup"],
      stretchBias: 0.35,
      exerciseBias: 0.05,
      irritabilityBoost: 0.5,
      minutesScale: 0.9,
      outcomeHint: "Slow holds; avoid forcing through spasm.",
    },
  },
  {
    pattern: /\b(heavy|fatigued|exhausted|tired)\b/i,
    hit: {
      clinicalMeaning: "Fatigue/heaviness — endurance dosing, short volume",
      programBiases: ["short-volume", "controlled-strength"],
      avoidTags: ["high-volume"],
      preferTags: ["activation", "supported", "seated"],
      stretchBias: 0.1,
      exerciseBias: 0.2,
      irritabilityBoost: 0.4,
      minutesScale: 0.8,
      outcomeHint: "Quality over quantity; rest intervals.",
    },
  },
  {
    pattern: /\b(afraid|fearful|scared|anxious|worried|catastroph)\b/i,
    hit: {
      clinicalMeaning: "Fear-avoidance language — graded exposure, education, control",
      programBiases: ["motor-control", "gentle-mobility", "warm-up-heavy"],
      avoidTags: ["surprise-load"],
      preferTags: ["supported", "controlled", "predictable"],
      stretchBias: 0.2,
      exerciseBias: 0.15,
      irritabilityBoost: 0.3,
      minutesScale: 0.85,
      outcomeHint: "Small wins; predictable dosing builds confidence.",
    },
  },
  {
    pattern: /\b(better with (heat|warm|movement|walking)|eases with)\b/i,
    hit: {
      clinicalMeaning: "Easing with movement/heat — mobility and graded activity favored",
      programBiases: ["gentle-mobility", "warm-up-heavy"],
      avoidTags: [],
      preferTags: ["mobility", "walking", "warmup"],
      stretchBias: 0.35,
      exerciseBias: 0.2,
      irritabilityBoost: -0.1,
      minutesScale: 1.0,
      outcomeHint: "Use preferred easing strategies before sessions.",
    },
  },
  {
    pattern: /\b(better with (ice|rest|lying down))\b/i,
    hit: {
      clinicalMeaning: "Easing with rest/ice — irritability management",
      programBiases: ["short-volume", "gentle-mobility"],
      avoidTags: ["high-volume", "impact"],
      preferTags: ["gentle", "short-hold"],
      stretchBias: 0.15,
      exerciseBias: -0.1,
      irritabilityBoost: 0.6,
      minutesScale: 0.8,
      outcomeHint: "Respect rest response; reintroduce load gradually.",
    },
  },
  {
    pattern: /\b(post-?op|after surgery|surgical|replacement|fusion|repair)\b/i,
    hit: {
      clinicalMeaning: "Surgical context — protocol-first, beginner bias",
      programBiases: ["short-volume", "gentle-mobility", "defer-to-provider"],
      avoidTags: ["impact", "end-range", "heavy-load"],
      preferTags: ["protected", "protocol", "gentle"],
      stretchBias: 0.2,
      exerciseBias: 0.1,
      irritabilityBoost: 0.8,
      maxDifficulty: "beginner",
      minutesScale: 0.7,
      outcomeHint: "Surgeon/PT protocol overrides generic HEP suggestions.",
    },
  },
  {
    pattern: /\b(home|apartment|no gym|at home only)\b/i,
    hit: {
      clinicalMeaning: "Home-context preference",
      programBiases: ["gentle-mobility", "controlled-strength"],
      avoidTags: ["machine-only"],
      preferTags: ["home", "minimal-equipment", "bodyweight", "chair", "wall"],
      stretchBias: 0.15,
      exerciseBias: 0.15,
      irritabilityBoost: 0,
      minutesScale: 1.0,
      outcomeHint: "Prefer chair/wall/floor options and bodyweight dosing.",
    },
  },
];

const SINGLE_ADJECTIVES: Record<
  string,
  Omit<AdjectiveHit, "word">
> = {
  mild: {
    clinicalMeaning: "Mild intensity — room for progressive dosing",
    programBiases: ["controlled-strength", "gentle-mobility"],
    avoidTags: [],
    preferTags: ["functional", "progressive"],
    stretchBias: 0.1,
    exerciseBias: 0.25,
    irritabilityBoost: -0.2,
    minutesScale: 1.05,
    outcomeHint: "Progress when 24h response is stable.",
  },
  moderate: {
    clinicalMeaning: "Moderate intensity — balanced volume",
    programBiases: ["gentle-mobility", "controlled-strength", "short-volume"],
    avoidTags: [],
    preferTags: ["controlled"],
    stretchBias: 0.15,
    exerciseBias: 0.1,
    irritabilityBoost: 0.5,
    maxDifficulty: "intermediate",
    minutesScale: 0.9,
    outcomeHint: "Hold mid difficulty; modify if pain rises ≥2.",
  },
  severe: {
    clinicalMeaning: "Severe intensity — protect and reduce volume",
    programBiases: ["short-volume", "gentle-mobility", "defer-to-provider"],
    avoidTags: ["end-range", "impact"],
    preferTags: ["gentle", "supported"],
    stretchBias: 0.3,
    exerciseBias: -0.3,
    irritabilityBoost: 2.0,
    maxDifficulty: "beginner",
    minutesScale: 0.6,
    outcomeHint: "Beginner-only dosing until irritability settles.",
  },
  chronic: {
    clinicalMeaning: "Longstanding symptoms — graded, confidence-building plan",
    programBiases: ["motor-control", "controlled-strength", "gentle-mobility"],
    avoidTags: [],
    preferTags: ["graded", "functional", "consistent"],
    stretchBias: 0.15,
    exerciseBias: 0.25,
    irritabilityBoost: 0.2,
    minutesScale: 0.95,
    outcomeHint: "Consistency over intensity; PSFS weekly.",
  },
  acute: {
    clinicalMeaning: "Recent onset — calm irritability first",
    programBiases: ["short-volume", "gentle-mobility", "warm-up-heavy"],
    avoidTags: ["impact", "heavy-load"],
    preferTags: ["gentle", "protected"],
    stretchBias: 0.25,
    exerciseBias: -0.15,
    irritabilityBoost: 1.0,
    maxDifficulty: "beginner",
    minutesScale: 0.7,
    outcomeHint: "Protect early; reassess 48–72h response.",
  },
  sudden: {
    clinicalMeaning: "Sudden onset — screening awareness",
    programBiases: ["short-volume", "defer-to-provider"],
    avoidTags: ["vigorous"],
    preferTags: ["gentle"],
    stretchBias: 0.1,
    exerciseBias: -0.2,
    irritabilityBoost: 1.2,
    maxDifficulty: "beginner",
    minutesScale: 0.65,
    outcomeHint: "Rule out red flags with licensed care when indicated.",
  },
  gradual: {
    clinicalMeaning: "Gradual onset — overuse/load management framing",
    programBiases: ["controlled-strength", "gentle-mobility"],
    avoidTags: [],
    preferTags: ["load-management", "graded"],
    stretchBias: 0.15,
    exerciseBias: 0.25,
    irritabilityBoost: 0.2,
    minutesScale: 0.95,
    outcomeHint: "Address training errors and recovery.",
  },
  stiff: {
    clinicalMeaning: "Stiffness adjective",
    programBiases: ["gentle-mobility", "warm-up-heavy"],
    avoidTags: [],
    preferTags: ["mobility", "warmup"],
    stretchBias: 0.4,
    exerciseBias: 0.0,
    irritabilityBoost: 0.3,
    minutesScale: 1.0,
    outcomeHint: "Warm then mobilize.",
  },
  tight: {
    clinicalMeaning: "Tightness adjective",
    programBiases: ["gentle-mobility"],
    avoidTags: ["ballistic"],
    preferTags: ["mobility", "breath-led"],
    stretchBias: 0.4,
    exerciseBias: 0.0,
    irritabilityBoost: 0.25,
    minutesScale: 1.0,
    outcomeHint: "Mild–moderate stretch only.",
  },
  weak: {
    clinicalMeaning: "Weakness adjective",
    programBiases: ["controlled-strength", "motor-control"],
    avoidTags: [],
    preferTags: ["activation", "strength"],
    stretchBias: -0.1,
    exerciseBias: 0.45,
    irritabilityBoost: 0.3,
    minutesScale: 0.95,
    outcomeHint: "Activation before heavy load.",
  },
  tender: {
    clinicalMeaning: "Tenderness — local irritability",
    programBiases: ["gentle-mobility", "short-volume"],
    avoidTags: ["direct-compression-heavy"],
    preferTags: ["gentle"],
    stretchBias: 0.15,
    exerciseBias: 0.0,
    irritabilityBoost: 0.6,
    minutesScale: 0.85,
    outcomeHint: "Avoid poking irritable tissue aggressively.",
  },
  pinching: {
    clinicalMeaning: "Pinching quality — reduce end-range compression",
    programBiases: ["avoid-endrange", "motor-control"],
    avoidTags: ["end-range", "impingement-provocation"],
    preferTags: ["mid-range", "controlled"],
    stretchBias: 0.1,
    exerciseBias: 0.15,
    irritabilityBoost: 0.8,
    maxDifficulty: "beginner",
    minutesScale: 0.8,
    outcomeHint: "Stay out of pinchy end-range.",
  },
  grinding: {
    clinicalMeaning: "Grinding/crepitus language — control load, avoid forcing",
    programBiases: ["motor-control", "gentle-mobility"],
    avoidTags: ["forced-endrange"],
    preferTags: ["controlled", "mid-range"],
    stretchBias: 0.1,
    exerciseBias: 0.15,
    irritabilityBoost: 0.4,
    minutesScale: 0.9,
    outcomeHint: "Noise alone is not always harmful; pain guides dosing.",
  },
  clicking: {
    clinicalMeaning: "Clicking — monitor with pain/locking",
    programBiases: ["motor-control"],
    avoidTags: [],
    preferTags: ["controlled"],
    stretchBias: 0.05,
    exerciseBias: 0.1,
    irritabilityBoost: 0.2,
    minutesScale: 0.95,
    outcomeHint: "Seek care if locking/true instability.",
  },
  locking: {
    clinicalMeaning: "Locking — protect, avoid forcing ROM",
    programBiases: ["short-volume", "defer-to-provider", "gentle-mobility"],
    avoidTags: ["forced-endrange", "twist-load"],
    preferTags: ["gentle", "supported"],
    stretchBias: 0.1,
    exerciseBias: -0.2,
    irritabilityBoost: 1.3,
    maxDifficulty: "beginner",
    minutesScale: 0.65,
    outcomeHint: "True locking warrants clinical assessment.",
  },
  swollen: {
    clinicalMeaning: "Swelling adjective",
    programBiases: ["short-volume", "gentle-mobility"],
    avoidTags: ["impact", "heavy-load"],
    preferTags: ["gentle", "pump"],
    stretchBias: 0.15,
    exerciseBias: -0.2,
    irritabilityBoost: 1.0,
    maxDifficulty: "beginner",
    minutesScale: 0.7,
    outcomeHint: "Motion as tolerated; monitor girth/symptoms.",
  },
  painful: {
    clinicalMeaning: "General pain adjective — moderate caution",
    programBiases: ["gentle-mobility", "short-volume"],
    avoidTags: [],
    preferTags: ["gentle"],
    stretchBias: 0.15,
    exerciseBias: 0.05,
    irritabilityBoost: 0.5,
    minutesScale: 0.9,
    outcomeHint: "Traffic-light pain rules.",
  },
  limited: {
    clinicalMeaning: "Limited motion — mobility priority",
    programBiases: ["gentle-mobility"],
    avoidTags: [],
    preferTags: ["mobility", "rom"],
    stretchBias: 0.4,
    exerciseBias: 0.05,
    irritabilityBoost: 0.2,
    minutesScale: 1.0,
    outcomeHint: "ROM first, then strength in new range.",
  },
  stuck: {
    clinicalMeaning: "Stuck sensation — gentle mobility + control",
    programBiases: ["gentle-mobility", "motor-control"],
    avoidTags: ["ballistic"],
    preferTags: ["mobility", "controlled"],
    stretchBias: 0.35,
    exerciseBias: 0.1,
    irritabilityBoost: 0.3,
    minutesScale: 0.95,
    outcomeHint: "Oscillations over forcing.",
  },
};

export type AdjectiveAnalysis = {
  hits: AdjectiveHit[];
  programBiases: ProgramBias[];
  avoidTags: string[];
  preferTags: string[];
  stretchBias: number;
  exerciseBias: number;
  irritabilityBoost: number;
  maxDifficulty?: Difficulty;
  minutesScale: number;
  summaryLines: string[];
  wordsFound: string[];
};

export function analyzeAssessmentAdjectives(text: string): AdjectiveAnalysis {
  const raw = text || "";
  const hits: AdjectiveHit[] = [];
  const used = new Set<string>();

  for (const rule of PHRASE_RULES) {
    const m = raw.match(rule.pattern);
    if (m) {
      const word = m[0]!.toLowerCase();
      if (!used.has(word)) {
        used.add(word);
        hits.push({ word, ...rule.hit });
      }
    }
  }

  // Tokenize adjectives-like words
  const tokens = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const tok of tokens) {
    const key = tok.replace(/[^a-z]/g, "");
    if (!key || used.has(key)) continue;
    const rule = SINGLE_ADJECTIVES[key];
    if (rule) {
      used.add(key);
      hits.push({ word: key, ...rule });
    }
  }

  const programBiases = new Set<ProgramBias>();
  const avoidTags = new Set<string>();
  const preferTags = new Set<string>();
  let stretchBias = 0;
  let exerciseBias = 0;
  let irritabilityBoost = 0;
  let minutesScale = 1;
  let maxDifficulty: Difficulty | undefined;

  const rank = { beginner: 1, intermediate: 2, advanced: 3 };
  for (const h of hits) {
    h.programBiases.forEach((b) => programBiases.add(b));
    h.avoidTags.forEach((t) => avoidTags.add(t));
    h.preferTags.forEach((t) => preferTags.add(t));
    stretchBias += h.stretchBias;
    exerciseBias += h.exerciseBias;
    irritabilityBoost += h.irritabilityBoost;
    minutesScale *= h.minutesScale;
    if (h.maxDifficulty) {
      if (!maxDifficulty || rank[h.maxDifficulty] < rank[maxDifficulty]) {
        maxDifficulty = h.maxDifficulty;
      }
    }
  }

  const n = Math.max(hits.length, 1);
  stretchBias /= n;
  exerciseBias /= n;
  minutesScale = Math.max(0.45, Math.min(1.15, minutesScale));

  return {
    hits,
    programBiases: Array.from(programBiases),
    avoidTags: Array.from(avoidTags),
    preferTags: Array.from(preferTags),
    stretchBias,
    exerciseBias,
    irritabilityBoost: Math.min(4, irritabilityBoost),
    maxDifficulty,
    minutesScale,
    wordsFound: hits.map((h) => h.word),
    summaryLines: hits.slice(0, 12).map((h) => `"${h.word}" → ${h.clinicalMeaning}`),
  };
}
