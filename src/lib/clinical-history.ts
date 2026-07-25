/**
 * Sex / past & current medical history — parse from free text and correlate
 * across Assessment, plan generation, Q&A, and coaching.
 * Educational use only; not a diagnosis.
 */

export type BiologicalSex = "female" | "male" | "intersex" | "unspecified";

export type SexSelection = BiologicalSex | "prefer-not-to-say";

export const SEX_OPTIONS: Array<{ id: SexSelection; label: string; hint: string }> = [
  { id: "female", label: "Female", hint: "Shapes pelvic-floor, pregnancy, and bone-health Q&A" },
  { id: "male", label: "Male", hint: "Shapes prostate/pelvic and cardiac risk framing in Q&A" },
  {
    id: "intersex",
    label: "Intersex / differences of sex development",
    hint: "Inclusive coaching; avoid binary-only assumptions",
  },
  { id: "unspecified", label: "Unspecified / non-binary", hint: "Neutral clinical language" },
  { id: "prefer-not-to-say", label: "Prefer not to say", hint: "No sex-specific Q&A prompts" },
];

export function sexLabel(sex?: SexSelection | null): string {
  if (!sex) return "not specified";
  return SEX_OPTIONS.find((o) => o.id === sex)?.label || sex;
}

/** Normalize stored values */
export function normalizeSex(raw: unknown): SexSelection | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (
    s === "female" ||
    s === "male" ||
    s === "intersex" ||
    s === "unspecified" ||
    s === "prefer-not-to-say"
  ) {
    return s;
  }
  if (s === "f" || s === "woman" || s === "girl") return "female";
  if (s === "m" || s === "man" || s === "boy") return "male";
  if (s === "non-binary" || s === "nonbinary" || s === "nb" || s === "other") return "unspecified";
  if (s === "pnts" || s === "prefer-not" || s === "decline") return "prefer-not-to-say";
  return undefined;
}

/**
 * Detect sex / gender cues from free-text assessment story.
 * Conservative: only clear self-identification phrases.
 */
export function parseSexFromText(text: string): SexSelection | undefined {
  const t = text.toLowerCase();
  if (!t.trim()) return undefined;

  if (
    /\b(prefer not to say|rather not say|decline to (state|share))\b/.test(t) ||
    /\b(sex|gender)\s*[:\-]?\s*(prefer not|decline|n\/?a)\b/.test(t)
  ) {
    return "prefer-not-to-say";
  }

  if (
    /\b(i am|i'm|im)\s+(a\s+)?(female|woman|girl)\b/.test(t) ||
    /\b(sex|gender)\s*[:\-]?\s*(female|f|woman)\b/.test(t) ||
    /\b(as a (woman|female)|female patient)\b/.test(t)
  ) {
    return "female";
  }

  if (
    /\b(i am|i'm|im)\s+(a\s+)?(male|man|boy)\b/.test(t) ||
    /\b(sex|gender)\s*[:\-]?\s*(male|m|man)\b/.test(t) ||
    /\b(as a (man|male)|male patient)\b/.test(t)
  ) {
    return "male";
  }

  if (
    /\b(intersex|difference(s)? of sex development|dsd)\b/.test(t) ||
    /\b(sex|gender)\s*[:\-]?\s*intersex\b/.test(t)
  ) {
    return "intersex";
  }

  if (
    /\b(non[-\s]?binary|enby|genderqueer|agender)\b/.test(t) ||
    /\b(sex|gender)\s*[:\-]?\s*(non[-\s]?binary|unspecified|other)\b/.test(t)
  ) {
    return "unspecified";
  }

  // Pregnancy / postpartum strongly imply female for dosing education (not identity claim alone)
  if (
    /\b(pregnan|post[-\s]?partum|postpartum|breastfeed|lactat|c[-\s]?section|cesarean)\b/.test(t)
  ) {
    return "female";
  }

  return undefined;
}

export type MedicalHistoryParse = {
  pastMedicalHistory: string;
  currentMedicalHistory: string;
  pastItems: string[];
  currentItems: string[];
};

const PAST_MARKERS =
  /\b(past medical history|pmh|history of|previously (had|diagnosed|treated)|s\/p|status post|years? ago|childhood|prior (dx|diagnosis|surgery|injury)|old (injury|fracture)|remote history)\b/i;

const CURRENT_MARKERS =
  /\b(current(ly)?|now|present|active|ongoing|still have|i have|i'm being treated|follow(ing)? for|managed with|today|this year)\b/i;

/** Common chronic / systemic conditions for free-text extraction */
const CONDITION_PHRASES: Array<{ re: RegExp; label: string; bucket: "past" | "current" | "either" }> =
  [
    { re: /\bdiabetes|type\s*[12]\s*dm|t2dm|t1dm|diabetic\b/i, label: "diabetes", bucket: "either" },
    { re: /\bhypertension|high blood pressure|htn\b/i, label: "hypertension", bucket: "either" },
    { re: /\basthma\b/i, label: "asthma", bucket: "either" },
    { re: /\bcopd|emphysema|chronic bronchitis\b/i, label: "COPD", bucket: "either" },
    { re: /\bheart (disease|failure)|chf|cad|coronary|atrial fibrillation|a-?fib|mi\b|heart attack\b/i, label: "cardiac disease", bucket: "either" },
    { re: /\bstroke|cva|tia\b/i, label: "stroke / CVA history", bucket: "past" },
    { re: /\bcancer|chemo|radiation|malignan/i, label: "cancer history", bucket: "either" },
    { re: /\bosteoporosis|osteopenia\b/i, label: "osteoporosis / osteopenia", bucket: "either" },
    { re: /\barthritis|oa\b|rheumatoid|ra\b/i, label: "arthritis", bucket: "either" },
    { re: /\bfibromyalgia\b/i, label: "fibromyalgia", bucket: "either" },
    { re: /\bthyroid|hypothyroid|hyperthyroid\b/i, label: "thyroid disorder", bucket: "either" },
    { re: /\banxiety|depression|ptsd|mental health\b/i, label: "mental health condition", bucket: "either" },
    { re: /\bsleep apnea|osa\b/i, label: "sleep apnea", bucket: "either" },
    { re: /\bkidney (disease|failure)|ckd|dialysis\b/i, label: "kidney disease", bucket: "either" },
    { re: /\bliver (disease|failure)|cirrhosis|hepatitis\b/i, label: "liver disease", bucket: "either" },
    { re: /\bseizure|epilepsy\b/i, label: "seizure disorder", bucket: "either" },
    { re: /\bblood clot|dvt|pe\b|pulmonary embol/i, label: "VTE / clotting history", bucket: "either" },
    { re: /\bautoimmune|lupus|sle\b|ms\b|multiple sclerosis\b/i, label: "autoimmune / neuro condition", bucket: "either" },
    { re: /\bpregnan|post[-\s]?partum|postpartum\b/i, label: "pregnancy / postpartum", bucket: "current" },
    { re: /\bprostate|bph\b/i, label: "prostate condition", bucket: "either" },
    { re: /\bendometriosis|pcos|menopaus|hysterectomy\b/i, label: "gynecologic history", bucket: "either" },
    { re: /\bsurgery|replacement|reconstruction|fusion|fracture|broken\b/i, label: "surgical / fracture history", bucket: "past" },
    { re: /\bpacemaker|defibrillator|icd\b|stent\b/i, label: "cardiac device / stent", bucket: "either" },
    { re: /\ballerg(y|ies)|anaphyla/i, label: "allergies", bucket: "current" },
  ];

/**
 * Pull past vs current medical history from a free-text paragraph.
 */
export function parseMedicalHistoryFromText(text: string): MedicalHistoryParse {
  const raw = text.trim();
  if (!raw) {
    return { pastMedicalHistory: "", currentMedicalHistory: "", pastItems: [], currentItems: [] };
  }

  // Explicit labeled sections if user wrote them
  let pastSection = "";
  let currentSection = "";
  const pmhMatch = raw.match(
    /(?:past medical history|pmh|past history)\s*[:\-–]\s*([^\n]+(?:\n(?!(?:current|pmh|hpi)\b)[^\n]+)*)/i
  );
  const cmhMatch = raw.match(
    /(?:current medical history|current history|active problems|problem list)\s*[:\-–]\s*([^\n]+(?:\n(?!(?:past|pmh|hpi)\b)[^\n]+)*)/i
  );
  if (pmhMatch?.[1]) pastSection = pmhMatch[1].trim();
  if (cmhMatch?.[1]) currentSection = cmhMatch[1].trim();

  const pastItems = new Set<string>();
  const currentItems = new Set<string>();

  for (const item of pastSection.split(/[;,]|\band\b/i).map((s) => s.trim()).filter(Boolean)) {
    if (item.length > 2) pastItems.add(item);
  }
  for (const item of currentSection.split(/[;,]|\band\b/i).map((s) => s.trim()).filter(Boolean)) {
    if (item.length > 2) currentItems.add(item);
  }

  const sentences = raw
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);

  for (const sentence of sentences) {
    const isPast = PAST_MARKERS.test(sentence) || /\b(years? ago|as a child|in \d{4})\b/i.test(sentence);
    const isCurrent = CURRENT_MARKERS.test(sentence) && !/\byears? ago\b/i.test(sentence);

    for (const c of CONDITION_PHRASES) {
      if (!c.re.test(sentence)) continue;
      if (c.bucket === "past" || isPast) pastItems.add(c.label);
      else if (c.bucket === "current" || isCurrent) currentItems.add(c.label);
      else if (isPast) pastItems.add(c.label);
      else currentItems.add(c.label);
    }
  }

  // If only "either" hits and no temporal cue, keep them in current (active problem list style)
  // already handled above

  const pastMedicalHistory =
    pastSection ||
    Array.from(pastItems)
      .slice(0, 20)
      .join("; ");
  const currentMedicalHistory =
    currentSection ||
    Array.from(currentItems)
      .slice(0, 20)
      .join("; ");

  return {
    pastMedicalHistory,
    currentMedicalHistory,
    pastItems: Array.from(pastItems).slice(0, 24),
    currentItems: Array.from(currentItems).slice(0, 24),
  };
}

/** Merge manual + parsed history without losing user edits */
export function mergeHistoryText(manual: string, parsed: string): string {
  const m = manual.trim();
  const p = parsed.trim();
  if (!p) return m;
  if (!m) return p;
  if (m.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(m.toLowerCase())) {
    return m.length >= p.length ? m : p;
  }
  // Append unique fragments
  const parts = new Set(
    [...m.split(/[;,\n]+/), ...p.split(/[;,\n]+/)]
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return Array.from(parts).join("; ");
}

/** Sex-aware + history-gap clarifying Q&A prompts for Assessment */
export function suggestedQuestionsForSex(
  sex?: SexSelection | null,
  opts?: {
    pastMedicalHistory?: string;
    currentMedicalHistory?: string;
    paragraph?: string;
  }
): string[] {
  const base = [
    "What should I focus on first?",
    "Is it okay to exercise with this pain?",
    "How often should I practice?",
    "What should I avoid right now?",
    "How does my medical history change the plan?",
    "Should I use heat or ice?",
    "What does my story suggest clinically?",
  ];

  const clarifying: string[] = [];
  const hasPmh = Boolean(opts?.pastMedicalHistory?.trim());
  const hasCmh = Boolean(opts?.currentMedicalHistory?.trim());
  const storyLen = (opts?.paragraph || "").trim().length;

  if (!hasPmh && storyLen >= 20) {
    clarifying.push("Have you had any past surgeries, fractures, or major diagnoses?");
  }
  if (!hasCmh && storyLen >= 20) {
    clarifying.push("What medical conditions are you currently managing?");
  }
  if (!sex || sex === "prefer-not-to-say") {
    clarifying.push("Should I factor sex-specific precautions into my plan?");
  }
  if (storyLen < 40) {
    clarifying.push("What else should I add to my story for a safer plan?");
  }

  let sexQs: string[] = [];
  if (sex === "female") {
    sexQs = [
      "Any pelvic floor or pregnancy-related precautions?",
      "How should bone health or menopause affect loading?",
      "Is core work safe with my history?",
    ];
  } else if (sex === "male") {
    sexQs = [
      "Any pelvic or prostate-related movement tips?",
      "How should cardiac history change intensity?",
      "What about heavy lifting and blood pressure?",
    ];
  } else if (sex === "intersex" || sex === "unspecified") {
    sexQs = [
      "How do you keep recommendations inclusive of my body?",
      "What universal safety rules still apply to me?",
    ];
  }

  // Clarifying questions first so gaps get filled; then sex-specific; then base
  return Array.from(new Set([...clarifying, ...sexQs, ...base])).slice(0, 12);
}

/** Short coaching blurb for plan / Jeffery */
export function clinicalHistorySummary(opts: {
  sex?: SexSelection | null;
  pastMedicalHistory?: string;
  currentMedicalHistory?: string;
}): string {
  const bits: string[] = [];
  if (opts.sex && opts.sex !== "prefer-not-to-say") {
    bits.push(`sex/gender context: ${sexLabel(opts.sex)}`);
  }
  if (opts.pastMedicalHistory?.trim()) {
    bits.push(`PMH: ${opts.pastMedicalHistory.trim().slice(0, 180)}`);
  }
  if (opts.currentMedicalHistory?.trim()) {
    bits.push(`current: ${opts.currentMedicalHistory.trim().slice(0, 180)}`);
  }
  return bits.join(" · ");
}
