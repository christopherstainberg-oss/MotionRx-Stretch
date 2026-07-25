/**
 * Activities of Daily Living (ADL / IADL) catalog for Assessment & Journal.
 * Evidence-informed functional categories used in outpatient PT and rehab scoring
 * (concepts related to Barthel, Katz, Lawton-Brody, AMPAC / CARE items — educational).
 * Selected ADLs and difficulty levels bias routine dosing and home variations.
 */

import type { BodyPart, Difficulty } from "@/lib/types";

export type AdlDomain =
  | "self-care"
  | "transfers"
  | "mobility"
  | "instrumental"
  | "community"
  | "work-desk";

export type AdlAssistanceLevel =
  | "independent"
  | "modified-independent"
  | "supervision"
  | "min-assist"
  | "mod-assist"
  | "max-assist"
  | "dependent"
  | "not-attempting";

export const ADL_ASSISTANCE_LABELS: Record<AdlAssistanceLevel, string> = {
  independent: "Independent",
  "modified-independent": "Modified independent (device/time)",
  supervision: "Supervision / cues only",
  "min-assist": "Minimal assist",
  "mod-assist": "Moderate assist",
  "max-assist": "Maximal assist",
  dependent: "Dependent / total assist",
  "not-attempting": "Not attempting now",
};

export const ADL_DOMAIN_LABELS: Record<AdlDomain, string> = {
  "self-care": "Self-care (BADL)",
  transfers: "Bed, chair & toilet transfers",
  mobility: "Walking, stairs & community mobility",
  instrumental: "Instrumental ADLs (IADL)",
  community: "Community & transport",
  "work-desk": "Work, desk & school function",
};

export interface AdlItem {
  id: string;
  label: string;
  domain: AdlDomain;
  plainLanguage: string;
  /** Why this ADL matters clinically (educational) */
  evidenceNote: string;
  relatedBodyParts: BodyPart[];
  searchTerms: string[];
  /** Biases applied when this ADL is limited (not independent) */
  programBiasesWhenLimited: string[];
  minutesScaleWhenLimited?: number;
  maxDifficultyWhenLimited?: Difficulty;
  preferHomeWhenLimited?: boolean;
  /** Suggested assistive-device ids from clinical-safety when limited */
  suggestDeviceIds?: string[];
  /** Suggestion strings shown to the user */
  coachingTips: string[];
}

export interface UserAdlEntry {
  adlId: string;
  label: string;
  domain: AdlDomain;
  assistance: AdlAssistanceLevel;
  notes?: string;
}

export const ADL_CATALOG: AdlItem[] = [
  {
    id: "adl-bathing",
    label: "Bathing / showering",
    domain: "self-care",
    plainLanguage: "Getting in/out of tub or shower and washing body safely.",
    evidenceNote:
      "Bathing is a high-fall-risk BADL. Shower chairs, grab bars, and seated washing are standard fall-prevention adaptations in geriatric and post-op rehab.",
    relatedBodyParts: ["hips", "knee", "ankles", "shoulders", "lower-back", "full-body"],
    searchTerms: ["bath", "shower", "washing", "tub"],
    programBiasesWhenLimited: ["fall-prevention", "seated-program", "short-volume", "balance-focus"],
    minutesScaleWhenLimited: 0.85,
    maxDifficultyWhenLimited: "beginner",
    preferHomeWhenLimited: true,
    suggestDeviceIds: ["rw", "spc"],
    coachingTips: [
      "Practice sit-to-stand and step strategies before long showers.",
      "Consider a shower chair and non-slip mat if balance or LE strength is limited.",
      "Avoid overhead reaching under fatigue if shoulder or sternal precautions apply.",
    ],
  },
  {
    id: "adl-dressing-upper",
    label: "Dressing — upper body",
    domain: "self-care",
    plainLanguage: "Putting on shirts, bras, jackets, and overhead garments.",
    evidenceNote:
      "Upper-body dressing taxes shoulder ROM, scapular control, and sometimes sternal/spine precautions. Adaptive techniques (button hooks, dressing sticks) preserve independence.",
    relatedBodyParts: ["shoulders", "scapular", "elbow", "wrists", "chest", "neck"],
    searchTerms: ["dressing", "shirt", "buttons", "jacket"],
    programBiasesWhenLimited: ["gentle-mobility", "motor-control", "short-volume"],
    maxDifficultyWhenLimited: "beginner",
    coachingTips: [
      "Thread the painful arm first when dressing; undress that arm last.",
      "Use table-supported reach if overhead motion irritates symptoms.",
    ],
  },
  {
    id: "adl-dressing-lower",
    label: "Dressing — lower body",
    domain: "self-care",
    plainLanguage: "Pants, socks, shoes, and underwear—often while standing or seated.",
    evidenceNote:
      "Lower-body dressing links to hip/knee flexion ROM, single-leg balance, and post-op hip precautions. Seated dressing is a common energy-conservation strategy.",
    relatedBodyParts: ["hips", "knee", "ankles", "lower-back", "pelvis"],
    searchTerms: ["pants", "socks", "shoes", "dressing lower"],
    programBiasesWhenLimited: ["seated-program", "balance-focus", "fall-prevention", "gentle-mobility"],
    preferHomeWhenLimited: true,
    suggestDeviceIds: ["rw", "spc"],
    coachingTips: [
      "Dress sitting on a firm chair; use a reacher or sock aid if bend is limited.",
      "Hip-precaution patients should follow surgeon rules for crossing legs and deep bend.",
    ],
  },
  {
    id: "adl-toileting",
    label: "Toileting & hygiene",
    domain: "self-care",
    plainLanguage: "Getting on/off toilet and managing clothing and hygiene.",
    evidenceNote:
      "Toilet transfers are core BADLs in Barthel/Katz frameworks. Raised seats and grab bars reduce fall risk and protect post-op hips/knees.",
    relatedBodyParts: ["hips", "knee", "lower-back", "pelvis"],
    searchTerms: ["toilet", "toileting", "bathroom", "commode"],
    programBiasesWhenLimited: ["fall-prevention", "seated-program", "short-volume"],
    preferHomeWhenLimited: true,
    suggestDeviceIds: ["rw", "spc"],
    coachingTips: [
      "Practice sit-to-stand from a higher surface first if knee or hip pain is high.",
      "Night-time toileting: clear paths, night light, and non-slip footwear.",
    ],
  },
  {
    id: "adl-grooming",
    label: "Grooming / oral care",
    domain: "self-care",
    plainLanguage: "Hair, face, teeth, shaving—often at a sink with standing tolerance.",
    evidenceNote:
      "Standing endurance and UE fine motor control limit grooming. Seated sink tasks are used in energy conservation (OT/PT joint practice).",
    relatedBodyParts: ["shoulders", "elbow", "wrists", "hand", "neck", "core"],
    searchTerms: ["grooming", "brush teeth", "hair", "shave"],
    programBiasesWhenLimited: ["seated-program", "postural-endurance", "short-volume"],
    coachingTips: ["Sit for grooming if standing tolerance is under 5–10 minutes.", "Support elbows on the counter for shoulder irritability."],
  },
  {
    id: "adl-feeding",
    label: "Feeding / eating setup",
    domain: "self-care",
    plainLanguage: "Bringing food to mouth and setting up a meal (not cooking).",
    evidenceNote:
      "Feeding independence is a core Katz BADL. UE pain, tremor, or fatigue may need adaptive utensils or setup help.",
    relatedBodyParts: ["shoulders", "elbow", "forearm", "wrists", "hand", "neck"],
    searchTerms: ["feeding", "eating", "utensils", "meal"],
    programBiasesWhenLimited: ["gentle-mobility", "motor-control", "short-volume"],
    coachingTips: ["Forearm support on table reduces shoulder load while eating.", "Pace meals if fatigue or post-exertional symptoms appear."],
  },
  {
    id: "adl-bed-mobility",
    label: "Bed mobility (roll, scoot, sit edge)",
    domain: "transfers",
    plainLanguage: "Rolling, scooting, and moving from lying to sitting on the bed edge.",
    evidenceNote:
      "Bed mobility is foundational before sit-to-stand and gait. Log-roll and bridge strategies are standard spine/hip post-op education.",
    relatedBodyParts: ["lower-back", "thoracic", "hips", "core", "shoulders", "full-body"],
    searchTerms: ["bed", "rolling", "supine to sit", "log roll"],
    programBiasesWhenLimited: ["gentle-mobility", "motor-control", "short-volume", "prefer-unloaded"],
    maxDifficultyWhenLimited: "beginner",
    preferHomeWhenLimited: true,
    coachingTips: [
      "Use log-roll if spine precautions or high lumbar irritability.",
      "Practice edge-of-bed sitting balance before full stand attempts.",
    ],
  },
  {
    id: "adl-sit-to-stand",
    label: "Sit-to-stand (chair / bed / toilet)",
    domain: "transfers",
    plainLanguage: "Rising from sitting without (or with) arm push and device help.",
    evidenceNote:
      "Sit-to-stand is a strong predictor of independence and fall risk; trained in almost every post-op and geriatric pathway.",
    relatedBodyParts: ["hips", "knee", "ankles", "core", "lower-back"],
    searchTerms: ["sit to stand", "stand up", "chair rise", "transfer"],
    programBiasesWhenLimited: ["controlled-strength", "balance-focus", "fall-prevention", "short-volume"],
    preferHomeWhenLimited: true,
    suggestDeviceIds: ["rw", "spc", "quad-cane"],
    coachingTips: [
      "Scoot forward, nose-over-toes cue, push through legs; use armrests if needed.",
      "Raise seat height temporarily if pain or strength limits full depth.",
    ],
  },
  {
    id: "adl-car-transfer",
    label: "Car transfers",
    domain: "transfers",
    plainLanguage: "Getting in and out of a vehicle safely.",
    evidenceNote:
      "Car transfers combine hip flexion, trunk rotation, and height mismatch—common post-op and low-back barriers. Slide-board or swivel techniques are taught in PT/OT.",
    relatedBodyParts: ["hips", "knee", "lower-back", "thoracic", "shoulders"],
    searchTerms: ["car", "vehicle", "transfer car", "driving seat"],
    programBiasesWhenLimited: ["gentle-mobility", "motor-control", "short-volume", "fall-prevention"],
    coachingTips: ["Back up to seat, sit first, then swing legs in (protect spine/hip precautions).", "Use a plastic bag on the seat to reduce friction if allowed."],
  },
  {
    id: "adl-walking-home",
    label: "Walking inside the home",
    domain: "mobility",
    plainLanguage: "Short household walking with or without a device.",
    evidenceNote:
      "Household ambulation is a CARE/GG-style mobility item. Distance, device, and supervision level guide progression and fall-risk planning.",
    relatedBodyParts: ["hips", "knee", "ankles", "lower-back", "full-body"],
    searchTerms: ["walking", "ambulation", "household walk", "gait"],
    programBiasesWhenLimited: ["assistive-device", "fall-prevention", "balance-focus", "short-volume"],
    minutesScaleWhenLimited: 0.9,
    suggestDeviceIds: ["rw", "spc", "crutches-axillary"],
    coachingTips: [
      "Clear clutter and cords; good lighting reduces falls more than “trying harder.”",
      "Match device to weight-bearing status from your care team.",
    ],
  },
  {
    id: "adl-stairs",
    label: "Stairs / steps",
    domain: "mobility",
    plainLanguage: "Up and down steps or a full flight.",
    evidenceNote:
      "Stair negotiation is a high-demand mobility skill and common discharge criterion after LE surgery. Rail use and step-to patterns are evidence-based progressions.",
    relatedBodyParts: ["hips", "knee", "ankles", "quadriceps", "glutes", "lower-back"],
    searchTerms: ["stairs", "steps", "stair climbing"],
    programBiasesWhenLimited: ["controlled-strength", "balance-focus", "fall-prevention", "short-volume"],
    maxDifficultyWhenLimited: "beginner",
    coachingTips: [
      "Up with the stronger/less painful leg first; down with the weaker/painful leg first (common ortho cue).",
      "Use a rail; avoid carrying loads on stairs during recovery.",
    ],
  },
  {
    id: "adl-community-walk",
    label: "Community walking / uneven ground",
    domain: "community",
    plainLanguage: "Walking outdoors, curbs, ramps, or longer community distances.",
    evidenceNote:
      "Community ambulation requires endurance, dual-task balance, and surface adaptability—key for participation outcomes (ICF activity/participation).",
    relatedBodyParts: ["full-body", "hips", "knee", "ankles", "core"],
    searchTerms: ["community", "outdoor walk", "curb", "uneven"],
    programBiasesWhenLimited: ["balance-focus", "fall-prevention", "short-volume", "assistive-device"],
    minutesScaleWhenLimited: 0.85,
    coachingTips: ["Build distance in short bouts with rests (activity pacing).", "Practice curb stepping only when household gait is stable."],
  },
  {
    id: "adl-meal-prep",
    label: "Meal preparation",
    domain: "instrumental",
    plainLanguage: "Cooking, carrying light items, standing at a counter.",
    evidenceNote:
      "Meal prep is a Lawton IADL combining standing tolerance, lifting, and safety judgment. Energy conservation and cart use are standard OT strategies.",
    relatedBodyParts: ["shoulders", "lower-back", "hips", "knee", "wrists", "full-body"],
    searchTerms: ["cooking", "meal prep", "kitchen", "stove"],
    programBiasesWhenLimited: ["short-volume", "seated-program", "postural-endurance", "gentle-mobility"],
    preferHomeWhenLimited: true,
    coachingTips: ["Sit for chopping; slide heavy pots rather than lift.", "Plan 1–2 rest breaks during longer kitchen tasks."],
  },
  {
    id: "adl-housekeeping",
    label: "Light housekeeping",
    domain: "instrumental",
    plainLanguage: "Dusting, dishes, light laundry, making the bed.",
    evidenceNote:
      "Housekeeping IADLs often reproduce spinal flexion/rotation and UE overhead load—common flare triggers. Task simplification is evidence-aligned pacing.",
    relatedBodyParts: ["lower-back", "shoulders", "neck", "hips", "full-body"],
    searchTerms: ["housework", "cleaning", "laundry", "dishes"],
    programBiasesWhenLimited: ["short-volume", "gentle-mobility", "postural-endurance", "avoid-endrange"],
    coachingTips: ["Break chores into 10-minute blocks with movement snacks between.", "Avoid vacuuming/mopping long bouts during high irritability weeks."],
  },
  {
    id: "adl-shopping",
    label: "Shopping / carrying bags",
    domain: "instrumental",
    plainLanguage: "Store walking, cart use, lifting bags into car.",
    evidenceNote:
      "Shopping combines endurance, lifting, and dual-task demand. Carts can act as informal walkers; bag weight is a common post-op limiter.",
    relatedBodyParts: ["full-body", "shoulders", "lower-back", "hips", "knee"],
    searchTerms: ["shopping", "grocery", "bags", "cart"],
    programBiasesWhenLimited: ["short-volume", "assistive-device", "fall-prevention", "controlled-strength"],
    coachingTips: ["Use a cart for support; split loads between trips.", "Park closer and plan a short route on high-pain days."],
  },
  {
    id: "adl-med-management",
    label: "Managing medications",
    domain: "instrumental",
    plainLanguage: "Remembering, opening bottles, and taking meds as prescribed.",
    evidenceNote:
      "Medication management is a Lawton IADL with safety implications. Pill organizers and routines reduce errors; fine-motor limits may need bottle openers.",
    relatedBodyParts: ["hand", "wrists", "shoulders"],
    searchTerms: ["medications", "pills", "pharmacy", "organizer"],
    programBiasesWhenLimited: ["motor-control", "short-volume"],
    coachingTips: ["Ask pharmacy for easy-open caps if grip is limited (when safe).", "Link meds to a daily habit (breakfast, bedtime routine)."],
  },
  {
    id: "adl-desk-work",
    label: "Desk / computer work tolerance",
    domain: "work-desk",
    plainLanguage: "Sitting and working at a computer or desk without major flare.",
    evidenceNote:
      "Prolonged sitting is a major aggravator for neck/back pain. Micro-breaks and postural endurance training are supported in office ergonomics literature.",
    relatedBodyParts: ["neck", "upper-back", "thoracic", "lower-back", "shoulders", "wrists"],
    searchTerms: ["desk", "computer", "sitting", "office", "work"],
    programBiasesWhenLimited: ["postural-endurance", "gentle-mobility", "short-volume", "warm-up-heavy"],
    coachingTips: [
      "30–45 minute sit timer: stand, walk, or mobility snack.",
      "Screen at eye height; shoulders relaxed; change positions often.",
    ],
  },
  {
    id: "adl-lifting-chores",
    label: "Lifting / carrying household loads",
    domain: "instrumental",
    plainLanguage: "Laundry baskets, kids, groceries, or boxes within home.",
    evidenceNote:
      "Lift technique and load management are core spine rehab education. Sternal and spinal precautions redefine safe load limits.",
    relatedBodyParts: ["lower-back", "hips", "shoulders", "core", "full-body"],
    searchTerms: ["lifting", "carrying", "load", "basket"],
    programBiasesWhenLimited: ["controlled-strength", "motor-control", "short-volume", "avoid-endrange"],
    maxDifficultyWhenLimited: "beginner",
    coachingTips: ["Keep load close; hinge at hips; avoid twist under load.", "Split loads; push/slide when possible."],
  },
  {
    id: "adl-sleep-position",
    label: "Sleep positioning & bed comfort",
    domain: "self-care",
    plainLanguage: "Finding positions that allow rest without major morning flare.",
    evidenceNote:
      "Sleep quality modulates pain facilitation and next-day irritability. Position education (side-lying with pillow, reclined) is common in MSK PT.",
    relatedBodyParts: ["neck", "lower-back", "shoulders", "hips", "full-body"],
    searchTerms: ["sleep", "night pain", "bed position", "morning stiffness"],
    programBiasesWhenLimited: ["gentle-mobility", "short-volume", "warm-up-heavy", "cooldown-heavy"],
    coachingTips: ["Support the painful region with pillows; avoid stomach sleeping if neck/low back flares.", "Gentle morning mobility before full ADLs."],
  },
  {
    id: "adl-childcare",
    label: "Childcare / caregiving lifts",
    domain: "instrumental",
    plainLanguage: "Lifting children, car seats, strollers, or assisting another adult.",
    evidenceNote:
      "Caregiving loads are a frequent flare source. Task modification and partner strategies are used in postpartum and MSK rehab.",
    relatedBodyParts: ["lower-back", "shoulders", "hips", "core", "full-body"],
    searchTerms: ["childcare", "baby", "caregiving", "car seat"],
    programBiasesWhenLimited: ["short-volume", "motor-control", "controlled-strength", "gentle-mobility"],
    coachingTips: ["Kneel or sit to the child’s level when possible.", "Use stroller/carrier weight limits that match your precautions."],
  },
];

const LIMITED: AdlAssistanceLevel[] = [
  "supervision",
  "min-assist",
  "mod-assist",
  "max-assist",
  "dependent",
  "not-attempting",
  "modified-independent",
];

export function isAdlLimited(level: AdlAssistanceLevel): boolean {
  return LIMITED.includes(level);
}

export function getAdlById(id: string): AdlItem | undefined {
  return ADL_CATALOG.find((a) => a.id === id);
}

/** Suggest ADLs to review based on body areas, devices, pain, and free text */
export function suggestAdlsFromFindings(input: {
  areas?: BodyPart[];
  painLevels?: Partial<Record<BodyPart, number>>;
  assistiveDeviceIds?: string[];
  concernParagraph?: string;
  clinicalSymptomIds?: string[];
  limit?: number;
}): Array<AdlItem & { reason: string; suggestedLevel: AdlAssistanceLevel }> {
  const limit = input.limit ?? 8;
  const areas = input.areas || [];
  const text = (input.concernParagraph || "").toLowerCase();
  const avgPain =
    areas.length && input.painLevels
      ? areas.reduce((s, a) => s + (input.painLevels?.[a] ?? 0), 0) / areas.length
      : 0;

  const scored = ADL_CATALOG.map((adl) => {
    let score = 0;
    const reasons: string[] = [];
    for (const bp of adl.relatedBodyParts) {
      if (areas.includes(bp)) {
        score += 4;
        reasons.push(`Matches selected area: ${bp.replace(/-/g, " ")}`);
      }
      const p = input.painLevels?.[bp] ?? 0;
      if (p >= 5) {
        score += 3;
        reasons.push(`Higher pain in ${bp.replace(/-/g, " ")}`);
      }
    }
    for (const t of adl.searchTerms) {
      if (text.includes(t)) {
        score += 5;
        reasons.push(`Mentioned in your story (“${t}”)`);
      }
    }
    if (input.assistiveDeviceIds?.length) {
      score += 2;
      reasons.push("Assistive device in use — review related mobility ADLs");
    }
    if (avgPain >= 6) score += 2;
    if (score === 0 && (areas.includes("full-body") || !areas.length)) score = 1;

    let suggestedLevel: AdlAssistanceLevel = "independent";
    if (avgPain >= 7 || input.assistiveDeviceIds?.some((id) => id.includes("wheelchair")))
      suggestedLevel = "mod-assist";
    else if (avgPain >= 5 || input.assistiveDeviceIds?.length)
      suggestedLevel = "modified-independent";
    else if (score >= 8) suggestedLevel = "modified-independent";

    return {
      ...adl,
      score,
      reason: reasons[0] || "Commonly affected with your presentation",
      suggestedLevel,
    };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

export function summarizeAdlEntries(entries: UserAdlEntry[]): {
  summaryLines: string[];
  programBiases: string[];
  minutesScale: number;
  maxDifficulty?: Difficulty;
  preferHome: boolean;
  suggestDeviceIds: string[];
  coachingTips: string[];
  limitedCount: number;
} {
  const biases = new Set<string>();
  let minutesScale = 1;
  let maxDifficulty: Difficulty | undefined;
  let preferHome = false;
  const devices = new Set<string>();
  const tips: string[] = [];
  let limitedCount = 0;

  const rank: Record<Difficulty, number> = { beginner: 1, intermediate: 2, advanced: 3 };

  for (const e of entries) {
    const item = getAdlById(e.adlId);
    if (!item) continue;
    if (!isAdlLimited(e.assistance) && e.assistance !== "modified-independent") continue;
    if (e.assistance !== "independent") limitedCount++;
    if (!isAdlLimited(e.assistance) && e.assistance !== "modified-independent") continue;

    // modified-independent still gets light biases
    const limited =
      isAdlLimited(e.assistance) || e.assistance === "modified-independent";
    if (!limited) continue;

    item.programBiasesWhenLimited.forEach((b) => biases.add(b));
    if (item.minutesScaleWhenLimited)
      minutesScale = Math.min(minutesScale, item.minutesScaleWhenLimited);
    if (item.maxDifficultyWhenLimited) {
      if (!maxDifficulty || rank[item.maxDifficultyWhenLimited] < rank[maxDifficulty]) {
        maxDifficulty = item.maxDifficultyWhenLimited;
      }
    }
    if (item.preferHomeWhenLimited) preferHome = true;
    item.suggestDeviceIds?.forEach((d) => devices.add(d));
    tips.push(...item.coachingTips.slice(0, 1));

    if (e.assistance === "dependent" || e.assistance === "max-assist") {
      biases.add("short-volume");
      biases.add("seated-program");
      minutesScale = Math.min(minutesScale, 0.7);
      maxDifficulty = "beginner";
      preferHome = true;
    }
  }

  const summaryLines = entries.map(
    (e) =>
      `${e.label}: ${ADL_ASSISTANCE_LABELS[e.assistance]}${e.notes ? ` — ${e.notes}` : ""}`
  );

  return {
    summaryLines,
    programBiases: Array.from(biases),
    minutesScale,
    maxDifficulty,
    preferHome,
    suggestDeviceIds: Array.from(devices),
    coachingTips: Array.from(new Set(tips)).slice(0, 8),
    limitedCount,
  };
}

/** Plain sentences to append into Assessment paragraph */
export function buildAdlParagraphSnippet(entries: UserAdlEntry[]): string {
  if (!entries.length) return "";
  const bits = entries.map((e) => {
    const level = ADL_ASSISTANCE_LABELS[e.assistance];
    return `${e.label.toLowerCase()} (${level.toLowerCase()})`;
  });
  return `With daily activities, I currently have difficulty with: ${bits.join("; ")}.`;
}

export function matchAdlsFromText(text: string, limit = 6): string[] {
  const t = text.toLowerCase();
  if (t.length < 8) return [];
  const hits: Array<{ id: string; score: number }> = [];
  for (const adl of ADL_CATALOG) {
    let score = 0;
    for (const term of adl.searchTerms) {
      if (t.includes(term)) score += term.length > 4 ? 3 : 2;
    }
    if (score) hits.push({ id: adl.id, score });
  }
  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((h) => h.id);
}

export const ADL_STATS = {
  total: ADL_CATALOG.length,
  domains: Object.keys(ADL_DOMAIN_LABELS).length,
  note: "Educational ADL/IADL framework aligned with common rehab functional measures—not a formal Barthel/Katz score.",
};
