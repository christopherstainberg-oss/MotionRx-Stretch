/**
 * Clinically significant symptom catalog for Assessment & Journal.
 * Evidence-informed MSK, neuro, inflammatory, and functional symptoms that
 * change HEP dosing, modality suggestions, and safety messaging.
 */

import type { BodyPart, Difficulty } from "@/lib/types";
import type { ProgramBias } from "@/data/pain-descriptors";

export type SymptomCategory =
  | "msk-mechanical"
  | "neurologic"
  | "inflammatory"
  | "systemic-energy"
  | "sleep-mood"
  | "vestibular-balance"
  | "cardio-resp"
  | "red-flag-screen";

export const SYMPTOM_CATEGORY_LABELS: Record<SymptomCategory, string> = {
  "msk-mechanical": "Mechanical / MSK",
  neurologic: "Nerve-like / neurologic",
  inflammatory: "Inflammatory pattern",
  "systemic-energy": "Energy / systemic load",
  "sleep-mood": "Sleep & mood",
  "vestibular-balance": "Balance / dizziness",
  "cardio-resp": "Heart / breathing (screen)",
  "red-flag-screen": "Urgent screen (seek care)",
};

export interface ClinicalSymptom {
  id: string;
  label: string;
  category: SymptomCategory;
  plainLanguage: string;
  evidenceNote: string;
  relatedBodyParts?: BodyPart[];
  searchTerms: string[];
  programBiases: ProgramBias[];
  /** Extra free-form biases consumed by plan/safety */
  extraBiases?: string[];
  irritabilityBoost: number;
  maxDifficulty?: Difficulty;
  minutesScale?: number;
  stretchBias?: number;
  exerciseBias?: number;
  /** Actionable suggestions shown when selected */
  suggestions: string[];
  redFlag?: boolean;
}

export const CLINICAL_SYMPTOMS: ClinicalSymptom[] = [
  {
    id: "sx-morning-stiffness-gt60",
    label: "Morning stiffness > 60 minutes",
    category: "inflammatory",
    plainLanguage: "Joints or back stay stiff for more than an hour after waking.",
    evidenceNote:
      "Prolonged morning stiffness is more suggestive of inflammatory arthropathy patterns; short stiffness is common in mechanical OA.",
    searchTerms: ["morning stiffness", "stiff in the morning", "hour to loosen"],
    programBiases: ["gentle-mobility", "warm-up-heavy", "short-volume"],
    irritabilityBoost: 0.6,
    maxDifficulty: "beginner",
    stretchBias: 0.4,
    exerciseBias: -0.2,
    suggestions: [
      "Start with a long warm-up before strength work.",
      "Heat before mobility may feel better than cold if stiffness dominates.",
      "Track duration of morning stiffness as an outcome.",
    ],
  },
  {
    id: "sx-night-pain-waking",
    label: "Night pain that wakes you",
    category: "inflammatory",
    plainLanguage: "Pain interrupts sleep or is worst at night.",
    evidenceNote:
      "Night pain can reflect high irritability, inflammatory load, or (rarely) serious pathology—context and red-flag screen matter.",
    searchTerms: ["night pain", "wakes me", "pain at night"],
    programBiases: ["short-volume", "gentle-mobility", "defer-to-provider"],
    irritabilityBoost: 1.0,
    maxDifficulty: "beginner",
    minutesScale: 0.8,
    suggestions: [
      "Keep daytime sessions short and mid-range until night pain settles.",
      "Review sleep position and mattress support.",
      "Tell your clinician if night pain is progressive or with fever/weight loss.",
    ],
  },
  {
    id: "sx-swelling-warmth",
    label: "Swelling or warmth in a joint",
    category: "inflammatory",
    plainLanguage: "Visible puffiness, heat, or tight joint feel.",
    evidenceNote:
      "Effusion and warmth guide load management; aggressive end-range stretch into swollen joints is usually deferred.",
    relatedBodyParts: ["knee", "ankles", "wrists", "elbow", "shoulders"],
    searchTerms: ["swelling", "swollen", "warm joint", "puffy"],
    programBiases: ["prefer-unloaded", "short-volume", "gentle-mobility", "avoid-endrange"],
    irritabilityBoost: 0.8,
    maxDifficulty: "beginner",
    exerciseBias: -0.3,
    suggestions: [
      "Prefer open-chain or unloaded options; elevate after activity if helpful.",
      "Ice after sessions if it eases swelling (as tolerated).",
      "Avoid deep squats/lunges into a hot swollen knee until calmer.",
    ],
  },
  {
    id: "sx-locking-catching",
    label: "Joint locking or catching",
    category: "msk-mechanical",
    plainLanguage: "Joint briefly sticks or catches during movement.",
    evidenceNote:
      "True locking can relate to mechanical blocks (e.g., meniscus). Forced end-range is avoided until assessed.",
    searchTerms: ["locking", "catching", "stuck joint"],
    programBiases: ["avoid-endrange", "gentle-mobility", "motor-control", "defer-to-provider"],
    irritabilityBoost: 0.7,
    maxDifficulty: "beginner",
    suggestions: [
      "Stay in mid-range; do not force through a lock.",
      "Report true locking (cannot unlock) promptly to a clinician.",
    ],
  },
  {
    id: "sx-giving-way",
    label: "Giving way / buckling",
    category: "msk-mechanical",
    plainLanguage: "Leg or knee suddenly feels like it won’t hold you.",
    evidenceNote:
      "Giving way may reflect pain inhibition, weakness, or ligament instability—balance and controlled strength are prioritized.",
    relatedBodyParts: ["knee", "ankles", "hips"],
    searchTerms: ["giving way", "buckling", "gives out"],
    programBiases: ["controlled-strength", "balance-focus", "motor-control"],
    extraBiases: ["fall-prevention", "assistive-device"],
    irritabilityBoost: 0.5,
    suggestions: [
      "Work on controlled sit-to-stand and step-ups before impact.",
      "Consider a temporary assistive device if falls are a concern.",
    ],
  },
  {
    id: "sx-stiffness-after-rest",
    label: "Stiffness after sitting / rest (gels)",
    category: "msk-mechanical",
    plainLanguage: "Stiff when you first stand after sitting, eases with movement.",
    evidenceNote:
      "Gel phenomenon is classic in OA and mechanical back pain; frequent movement snacks help.",
    searchTerms: ["stiff after sitting", "gels", "stiff when I stand"],
    programBiases: ["gentle-mobility", "postural-endurance", "warm-up-heavy"],
    irritabilityBoost: 0.3,
    stretchBias: 0.3,
    suggestions: [
      "Set a 30–45 min sit timer for mobility snacks.",
      "Ease into walking after long sits before lifting or stairs.",
    ],
  },
  {
    id: "sx-pain-with-load",
    label: "Pain increases with load / impact",
    category: "msk-mechanical",
    plainLanguage: "Worse with stairs, jogging, jumping, or heavy carry.",
    evidenceNote:
      "Load-related pain guides graded exposure: reduce impact, rebuild capacity gradually.",
    searchTerms: ["worse with stairs", "impact", "can't run", "load pain"],
    programBiases: ["prefer-unloaded", "controlled-strength", "short-volume"],
    irritabilityBoost: 0.5,
    exerciseBias: 0.2,
    suggestions: [
      "Swap impact for cycling, pool, or step-to patterns temporarily.",
      "Progress one load variable at a time (reps, range, or resistance).",
    ],
  },
  {
    id: "sx-pain-eases-movement",
    label: "Pain eases once you get moving",
    category: "msk-mechanical",
    plainLanguage: "Starts stiff or sore, improves after a few minutes of activity.",
    evidenceNote:
      "Warm-up improvement is typical of mechanical sensitivity and supports graded mobility.",
    searchTerms: ["eases with movement", "better once warm", "loosens up"],
    programBiases: ["warm-up-heavy", "gentle-mobility", "controlled-strength"],
    irritabilityBoost: 0.1,
    stretchBias: 0.2,
    suggestions: ["Invest 5–8 minutes in warm-up before the main set.", "Avoid starting sessions “cold” into hard strength."],
  },
  {
    id: "sx-radiating-arm",
    label: "Pain or tingling into the arm/hand",
    category: "neurologic",
    plainLanguage: "Symptoms travel below the shoulder into arm or fingers.",
    evidenceNote:
      "Radicular or referred upper limb symptoms warrant neural caution and mid-range cervical/thoracic strategies.",
    relatedBodyParts: ["neck", "shoulders", "elbow", "wrists", "hand"],
    searchTerms: ["radiating arm", "tingling arm", "numb fingers", "sciatica arm"],
    programBiases: ["neural-caution", "avoid-endrange", "gentle-mobility", "short-volume"],
    irritabilityBoost: 0.9,
    maxDifficulty: "beginner",
    stretchBias: -0.2,
    suggestions: [
      "Avoid aggressive end-range neck stretches into tingling.",
      "Track arm symptoms during and 2 hours after sessions.",
    ],
  },
  {
    id: "sx-radiating-leg",
    label: "Pain or tingling into the leg/foot",
    category: "neurologic",
    plainLanguage: "Symptoms travel below the buttock into leg or foot.",
    evidenceNote:
      "Lower limb radicular patterns often need neural caution, preference for unloading, and monitoring of progressive weakness.",
    relatedBodyParts: ["lower-back", "hips", "hamstrings", "knee", "calves", "foot"],
    searchTerms: ["radiating leg", "sciatica", "tingling foot", "numb leg"],
    programBiases: ["neural-caution", "prefer-unloaded", "avoid-endrange", "short-volume"],
    irritabilityBoost: 0.9,
    maxDifficulty: "beginner",
    suggestions: [
      "Prefer positions that centralize symptoms (symptoms move toward spine).",
      "Stop and regress if leg weakness or foot drop appears—seek care.",
    ],
  },
  {
    id: "sx-numbness",
    label: "Numbness in a limb",
    category: "neurologic",
    plainLanguage: "Patches of reduced feeling in arm or leg.",
    evidenceNote:
      "Sensory change needs monitoring; progressive neurologic deficit is a medical review trigger.",
    searchTerms: ["numbness", "numb", "can't feel"],
    programBiases: ["neural-caution", "defer-to-provider", "short-volume"],
    irritabilityBoost: 0.7,
    maxDifficulty: "beginner",
    suggestions: ["Document where numbness is and whether it is spreading.", "Avoid end-range neural tension drills unless prescribed."],
  },
  {
    id: "sx-weakness-focal",
    label: "New focal weakness",
    category: "neurologic",
    plainLanguage: "A muscle group feels newly weak (not just pain-limited).",
    evidenceNote:
      "True neurologic weakness (foot drop, grip loss) is higher priority than routine HEP progression.",
    searchTerms: ["weakness", "foot drop", "can't lift foot", "grip weak"],
    programBiases: ["defer-to-provider", "short-volume", "neural-caution"],
    extraBiases: ["fall-prevention"],
    irritabilityBoost: 1.0,
    maxDifficulty: "beginner",
    minutesScale: 0.7,
    redFlag: true,
    suggestions: [
      "Seek prompt clinical review for new focal weakness.",
      "Use assistive devices and avoid balance challenges until cleared.",
    ],
  },
  {
    id: "sx-headache-neck",
    label: "Neck-related headache",
    category: "msk-mechanical",
    plainLanguage: "Headache linked to neck posture or movement.",
    evidenceNote:
      "Cervicogenic headache patterns often respond to posture breaks, deep neck flexor control, and reduced end-range strain.",
    relatedBodyParts: ["neck", "upper-back", "jaw"],
    searchTerms: ["headache", "neck headache", "head pain with neck"],
    programBiases: ["postural-endurance", "motor-control", "gentle-mobility", "short-volume"],
    irritabilityBoost: 0.4,
    suggestions: ["Frequent posture resets; screen height check.", "Avoid aggressive end-range neck circles."],
  },
  {
    id: "sx-dizziness",
    label: "Dizziness with movement",
    category: "vestibular-balance",
    plainLanguage: "Spinning, lightheaded, or off-balance with head/body motion.",
    evidenceNote:
      "Vestibular or orthostatic dizziness changes fall risk; balance dosage should be supervised and progressed carefully.",
    searchTerms: ["dizzy", "dizziness", "vertigo", "lightheaded"],
    programBiases: ["balance-focus", "short-volume"],
    extraBiases: ["fall-prevention", "seated-program"],
    irritabilityBoost: 0.6,
    maxDifficulty: "beginner",
    suggestions: [
      "Prefer seated or supported standing options until dizziness is assessed.",
      "Rise slowly from bed/chair; hydrate if orthostatic symptoms are known.",
    ],
  },
  {
    id: "sx-unsteady-falls",
    label: "Unsteady / near-falls or falls",
    category: "vestibular-balance",
    plainLanguage: "Feeling unstable, near-falls, or actual falls recently.",
    evidenceNote:
      "Fall history is a major dosing modifier—reduce dual-task challenge, add support, and prioritize strength/balance evidence-based programs.",
    searchTerms: ["fall", "fell", "unsteady", "nearly fell", "balance"],
    programBiases: ["balance-focus", "controlled-strength", "short-volume"],
    extraBiases: ["fall-prevention", "assistive-device"],
    irritabilityBoost: 0.5,
    maxDifficulty: "beginner",
    suggestions: [
      "Practice balance near a counter; consider PT-guided fall-prevention program.",
      "Review home hazards and footwear.",
    ],
  },
  {
    id: "sx-fatigue-pem",
    label: "Heavy fatigue after small effort",
    category: "systemic-energy",
    plainLanguage: "Disproportionate tiredness after light activity (payback).",
    evidenceNote:
      "Post-exertional symptom exacerbation patterns need pacing, not push-through grading.",
    searchTerms: ["exhausted", "wiped out", "payback", "crash after", "fatigue"],
    programBiases: ["short-volume", "gentle-mobility"],
    irritabilityBoost: 0.8,
    minutesScale: 0.65,
    maxDifficulty: "beginner",
    exerciseBias: -0.4,
    suggestions: [
      "Use time-contingent pacing; stop before a crash.",
      "Split the plan into two micro-sessions instead of one long bout.",
    ],
  },
  {
    id: "sx-poor-sleep",
    label: "Poor sleep quality",
    category: "sleep-mood",
    plainLanguage: "Trouble falling/staying asleep or non-restorative sleep.",
    evidenceNote:
      "Sleep disruption amplifies pain perception and reduces recovery—often holds progression even when motivation is high.",
    searchTerms: ["insomnia", "poor sleep", "can't sleep", "waking often"],
    programBiases: ["short-volume", "gentle-mobility", "cooldown-heavy"],
    irritabilityBoost: 0.4,
    minutesScale: 0.85,
    suggestions: [
      "Prefer earlier-day sessions if evening exercise disrupts sleep.",
      "Keep wind-down routine; avoid high-intensity late at night.",
    ],
  },
  {
    id: "sx-high-stress",
    label: "High stress / muscle guarding",
    category: "sleep-mood",
    plainLanguage: "Stress shows up as clenching, guarding, or flare-prone days.",
    evidenceNote:
      "Psychosocial load influences nociplastic and myofascial presentations; down-regulation and gentle mobility help.",
    searchTerms: ["stress", "anxious", "guarding", "clenching", "tense"],
    programBiases: ["gentle-mobility", "cooldown-heavy", "short-volume"],
    irritabilityBoost: 0.3,
    stretchBias: 0.2,
    suggestions: ["Add breathing or longer cool-down.", "Lower session ambition on high-stress days."],
  },
  {
    id: "sx-low-mood",
    label: "Low mood affecting movement",
    category: "sleep-mood",
    plainLanguage: "Mood makes it hard to start or finish movement plans.",
    evidenceNote:
      "Behavioral activation with small, achievable sessions is preferred over all-or-nothing workouts.",
    searchTerms: ["depressed", "low mood", "no motivation", "hopeless"],
    programBiases: ["short-volume", "gentle-mobility"],
    irritabilityBoost: 0.2,
    minutesScale: 0.8,
    suggestions: [
      "Shrink the goal to 5–8 minutes of easy movement to protect consistency.",
      "Pair movement with a pleasant cue (music, outdoors, friend).",
    ],
  },
  {
    id: "sx-sob-on-exertion",
    label: "Shortness of breath on light effort",
    category: "cardio-resp",
    plainLanguage: "Breathless sooner than expected with mild activity.",
    evidenceNote:
      "Unexpected dyspnea needs medical context (cardiac/pulmonary). Borg/RPE pacing is safer than HR-only targets.",
    searchTerms: ["short of breath", "breathless", "sob", "can't catch breath"],
    programBiases: ["short-volume", "gentle-mobility"],
    extraBiases: ["borg-light"],
    irritabilityBoost: 0.6,
    maxDifficulty: "beginner",
    minutesScale: 0.75,
    suggestions: [
      "Use light Borg targets; rest before severe breathlessness.",
      "Seek care for new/worsening SOB, chest pressure, or fainting.",
    ],
  },
  {
    id: "sx-chest-pain",
    label: "Chest pain / pressure with activity",
    category: "red-flag-screen",
    plainLanguage: "Chest pressure, tightness, or pain—especially with arm/jaw symptoms.",
    evidenceNote:
      "Possible cardiac symptom—stop exercise testing/HEP progression and seek urgent care pathways as appropriate.",
    searchTerms: ["chest pain", "chest pressure", "crushing chest"],
    programBiases: ["defer-to-provider", "short-volume"],
    irritabilityBoost: 1.2,
    maxDifficulty: "beginner",
    minutesScale: 0.5,
    redFlag: true,
    suggestions: [
      "Stop the session. Seek emergency care for suspected cardiac symptoms.",
      "Do not self-progress a home program until medically cleared.",
    ],
  },
  {
    id: "sx-bowel-bladder",
    label: "New bowel/bladder change with back pain",
    category: "red-flag-screen",
    plainLanguage: "New incontinence, retention, or saddle numbness with back symptoms.",
    evidenceNote:
      "Possible cauda equina red flag—urgent medical evaluation, not routine HEP progression.",
    searchTerms: ["incontinence", "bowel", "bladder", "saddle numb"],
    programBiases: ["defer-to-provider"],
    irritabilityBoost: 1.2,
    redFlag: true,
    maxDifficulty: "beginner",
    minutesScale: 0.5,
    suggestions: ["Seek urgent/emergency care same day.", "Pause aggressive spine loading."],
  },
  {
    id: "sx-fever-unwell",
    label: "Fever / feeling systemically unwell",
    category: "red-flag-screen",
    plainLanguage: "Fever, chills, or flu-like illness with MSK symptoms.",
    evidenceNote:
      "Systemic illness warrants rest and medical advice; exercise can worsen outcomes in febrile states.",
    searchTerms: ["fever", "chills", "flu", "infection", "unwell"],
    programBiases: ["defer-to-provider", "short-volume"],
    redFlag: true,
    maxDifficulty: "beginner",
    minutesScale: 0.5,
    irritabilityBoost: 0.8,
    suggestions: ["Rest and seek medical advice; resume gentle mobility only when cleared and afebrile."],
  },
  {
    id: "sx-post-ex-flare-24h",
    label: "Flare lasting >24h after activity",
    category: "msk-mechanical",
    plainLanguage: "Symptoms stay clearly worse into the next day after exercise.",
    evidenceNote:
      "24-hour rule is a common PT irritability guide for dosing: next-day flare means volume/intensity was too high.",
    searchTerms: ["worse next day", "payback next day", "flare after", "24 hour"],
    programBiases: ["short-volume", "gentle-mobility", "prefer-unloaded"],
    irritabilityBoost: 0.9,
    minutesScale: 0.75,
    maxDifficulty: "beginner",
    suggestions: [
      "Cut next session volume ~30–50% and stay mid-range.",
      "Use the 24-hour rule: if still flared, regress again.",
    ],
  },
  {
    id: "sx-fear-avoidance",
    label: "Fear of certain movements",
    category: "sleep-mood",
    plainLanguage: "Avoiding motions because you expect damage or severe pain.",
    evidenceNote:
      "Fear-avoidance can maintain disability; graded exposure with safety cues is evidence-aligned in chronic pain care.",
    searchTerms: ["afraid to move", "fear", "avoid movement", "worried I'll hurt"],
    programBiases: ["motor-control", "gentle-mobility", "short-volume"],
    irritabilityBoost: 0.3,
    suggestions: [
      "Break feared movements into smaller, safer practice chunks.",
      "Pair with Jeffery/journal reflection on confidence (0–10).",
    ],
  },
  {
    id: "sx-muscle-cramps",
    label: "Muscle cramps / spasms",
    category: "msk-mechanical",
    plainLanguage: "Sudden tight cramps or ongoing muscle spasm.",
    evidenceNote:
      "Cramps may relate to fatigue, load, electrolytes, or neural irritability—gentle mobility and load management help.",
    searchTerms: ["cramp", "spasm", "charley horse", "knot"],
    programBiases: ["gentle-mobility", "cooldown-heavy", "short-volume"],
    stretchBias: 0.3,
    irritabilityBoost: 0.3,
    suggestions: ["Longer cool-down and gentle ROM after sessions.", "Hydration/electrolytes if appropriate for you."],
  },
  {
    id: "sx-crepitus",
    label: "Noisy joints (crepitus) without sharp pain",
    category: "msk-mechanical",
    plainLanguage: "Clicking/grinding that is not sharply painful.",
    evidenceNote:
      "Painless crepitus is often benign; sharp pain with locking needs different care.",
    searchTerms: ["clicking", "grinding", "crepitus", "noisy joint"],
    programBiases: ["controlled-strength", "motor-control"],
    irritabilityBoost: 0.1,
    suggestions: ["Focus on control and strength around the joint rather than forcing end-range."],
  },
];

export function getClinicalSymptomById(id: string): ClinicalSymptom | undefined {
  return CLINICAL_SYMPTOMS.find((s) => s.id === id);
}

export function matchSymptomsFromText(text: string, limit = 10): string[] {
  const t = text.toLowerCase();
  if (t.length < 6) return [];
  const hits: Array<{ id: string; score: number }> = [];
  for (const sx of CLINICAL_SYMPTOMS) {
    let score = 0;
    for (const term of sx.searchTerms) {
      if (t.includes(term)) score += term.length >= 6 ? 4 : 2;
    }
    if (score) hits.push({ id: sx.id, score: score + (sx.redFlag ? 2 : 0) });
  }
  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((h) => h.id);
}

export function suggestSymptomsFromFindings(input: {
  areas?: BodyPart[];
  concernParagraph?: string;
  limit?: number;
}): ClinicalSymptom[] {
  const limit = input.limit ?? 10;
  const fromText = matchSymptomsFromText(input.concernParagraph || "", limit);
  const areas = input.areas || [];
  const scored = CLINICAL_SYMPTOMS.map((sx) => {
    let score = fromText.includes(sx.id) ? 10 : 0;
    if (sx.relatedBodyParts?.some((bp) => areas.includes(bp))) score += 3;
    // Always surface a few high-utility common symptoms lightly
    if (
      [
        "sx-stiffness-after-rest",
        "sx-pain-with-load",
        "sx-morning-stiffness-gt60",
        "sx-post-ex-flare-24h",
      ].includes(sx.id)
    )
      score += 1;
    return { sx, score };
  })
    .filter((x) => x.score > 0 && !x.sx.redFlag)
    .sort((a, b) => b.score - a.score);

  const out = scored.slice(0, limit).map((x) => x.sx);
  // Always append red flags as optional screens (not auto-selected)
  return out;
}

export function summarizeClinicalSymptoms(ids: string[]): {
  summaryLines: string[];
  programBiases: ProgramBias[];
  extraBiases: string[];
  irritabilityBoost: number;
  maxDifficulty?: Difficulty;
  minutesScale: number;
  stretchBias: number;
  exerciseBias: number;
  suggestions: string[];
  redFlags: string[];
  labels: string[];
} {
  const items = ids
    .map((id) => getClinicalSymptomById(id))
    .filter(Boolean) as ClinicalSymptom[];

  const biases = new Set<ProgramBias>();
  const extra = new Set<string>();
  let irritabilityBoost = 0;
  let minutesScale = 1;
  let stretchBias = 0;
  let exerciseBias = 0;
  let maxDifficulty: Difficulty | undefined;
  const rank: Record<Difficulty, number> = { beginner: 1, intermediate: 2, advanced: 3 };
  const suggestions: string[] = [];
  const redFlags: string[] = [];

  for (const sx of items) {
    sx.programBiases.forEach((b) => biases.add(b));
    sx.extraBiases?.forEach((b) => extra.add(b));
    irritabilityBoost += sx.irritabilityBoost;
    if (sx.minutesScale) minutesScale = Math.min(minutesScale, sx.minutesScale);
    stretchBias += sx.stretchBias ?? 0;
    exerciseBias += sx.exerciseBias ?? 0;
    if (sx.maxDifficulty) {
      if (!maxDifficulty || rank[sx.maxDifficulty] < rank[maxDifficulty]) {
        maxDifficulty = sx.maxDifficulty;
      }
    }
    suggestions.push(...sx.suggestions.slice(0, 2));
    if (sx.redFlag) redFlags.push(sx.label);
  }

  return {
    summaryLines: items.map((s) => s.label),
    programBiases: Array.from(biases),
    extraBiases: Array.from(extra),
    irritabilityBoost,
    maxDifficulty,
    minutesScale,
    stretchBias: items.length ? stretchBias / items.length : 0,
    exerciseBias: items.length ? exerciseBias / items.length : 0,
    suggestions: Array.from(new Set(suggestions)).slice(0, 10),
    redFlags,
    labels: items.map((s) => s.label),
  };
}

export function buildSymptomParagraphSnippet(ids: string[]): string {
  const labels = ids
    .map((id) => getClinicalSymptomById(id)?.label)
    .filter(Boolean) as string[];
  if (!labels.length) return "";
  return `Clinically notable symptoms I experience include: ${labels.join("; ")}.`;
}

export const CLINICAL_SYMPTOM_STATS = {
  total: CLINICAL_SYMPTOMS.length,
  categories: Object.keys(SYMPTOM_CATEGORY_LABELS).length,
  note: "Educational symptom inventory for HEP dosing—not a diagnosis.",
};
