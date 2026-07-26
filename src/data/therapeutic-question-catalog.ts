/**
 * Virtual therapeutic question catalog — multi-million capacity via
 * clinician bases × context modifiers (same architecture as stretch/exercise catalogs).
 *
 * Stems are written for clinical evidence-gathering (NRS, dose, function, 24h response,
 * fear-avoidance, sleep, mood) then expanded by time/focus/context/lens.
 *
 * Educational reflection only — not therapy, diagnosis, or crisis care.
 */

import type {
  EvidenceField,
  TherapeuticQuestion,
  TherapeuticQuestionCategory,
} from "@/data/therapeutic-questions";
import {
  ALL_THERAPEUTIC_QUESTIONS as CURATED_BASES,
  getTherapeuticQuestionById as getCuratedById,
} from "@/data/therapeutic-questions";

// —— Expansion axes ——

const TIMEFRAMES = [
  { tag: "now", phrase: "right now", label: "now" },
  { tag: "today", phrase: "today", label: "today" },
  { tag: "this-morning", phrase: "this morning", label: "morning" },
  { tag: "this-afternoon", phrase: "this afternoon", label: "afternoon" },
  { tag: "tonight", phrase: "tonight", label: "evening" },
  { tag: "last-night", phrase: "last night", label: "last night" },
  { tag: "this-week", phrase: "this week", label: "this week" },
  { tag: "lately", phrase: "lately", label: "lately" },
  { tag: "after-session", phrase: "after your movement session", label: "post-session" },
  { tag: "before-sleep", phrase: "before sleep", label: "pre-sleep" },
  { tag: "on-hard-days", phrase: "on your hardest days", label: "hard days" },
  { tag: "when-flare", phrase: "when symptoms flare", label: "flare" },
] as const;

const FOCI = [
  { tag: "whole", phrase: "you", label: "whole person" },
  { tag: "body", phrase: "your body", label: "body" },
  { tag: "mood", phrase: "your mood", label: "mood" },
  { tag: "mind", phrase: "your mind", label: "thoughts" },
  { tag: "pain", phrase: "your pain", label: "pain" },
  { tag: "energy", phrase: "your energy", label: "energy" },
  { tag: "sleep", phrase: "your sleep", label: "sleep" },
  { tag: "stress", phrase: "your stress", label: "stress" },
  { tag: "relationships", phrase: "your close relationships", label: "relationships" },
  { tag: "work", phrase: "work or school load", label: "work" },
  { tag: "movement", phrase: "how you move", label: "movement" },
  { tag: "neck", phrase: "your neck", label: "neck" },
  { tag: "back", phrase: "your back", label: "back" },
  { tag: "shoulder", phrase: "your shoulder", label: "shoulder" },
  { tag: "hip", phrase: "your hip", label: "hip" },
  { tag: "knee", phrase: "your knee", label: "knee" },
  { tag: "breath", phrase: "your breathing", label: "breath" },
  { tag: "confidence", phrase: "your confidence to move", label: "confidence" },
] as const;

const EMOTIONS = [
  { tag: "unspec", phrase: "", label: "" },
  { tag: "anxious", phrase: "anxious", label: "anxiety" },
  { tag: "sad", phrase: "sad or down", label: "sadness" },
  { tag: "angry", phrase: "angry or irritable", label: "anger" },
  { tag: "numb", phrase: "numb or flat", label: "numb" },
  { tag: "overwhelmed", phrase: "overwhelmed", label: "overwhelm" },
  { tag: "hopeful", phrase: "hopeful", label: "hope" },
  { tag: "ashamed", phrase: "ashamed or guilty", label: "shame" },
  { tag: "lonely", phrase: "lonely", label: "loneliness" },
  { tag: "afraid", phrase: "afraid", label: "fear" },
  { tag: "grateful", phrase: "grateful", label: "gratitude" },
  { tag: "frustrated", phrase: "frustrated", label: "frustration" },
  { tag: "calm", phrase: "calm", label: "calm" },
  { tag: "exhausted", phrase: "exhausted", label: "exhaustion" },
] as const;

const CONTEXTS = [
  { tag: "general", phrase: "", label: "general" },
  { tag: "home", phrase: "at home", label: "home" },
  { tag: "work", phrase: "at work", label: "work" },
  { tag: "with-family", phrase: "with family", label: "family" },
  { tag: "alone", phrase: "when you are alone", label: "alone" },
  { tag: "rehab", phrase: "during rehab or home exercises", label: "rehab" },
  { tag: "social", phrase: "in social situations", label: "social" },
  { tag: "morning-routine", phrase: "during your morning routine", label: "morning routine" },
  { tag: "after-conflict", phrase: "after a conflict or hard conversation", label: "conflict" },
  { tag: "after-good-news", phrase: "after good news", label: "good news" },
] as const;

const LENSES = [
  {
    tag: "open",
    label: "open",
    category: "coping" as TherapeuticQuestionCategory,
    wrap: (q: string) => q,
    extraGathers: [] as EvidenceField[],
  },
  {
    tag: "cbt",
    label: "CBT",
    category: "cbt" as TherapeuticQuestionCategory,
    wrap: (q: string) =>
      `${q} What automatic thought is attached—and is it based more on observable fact or on fear/prediction?`,
    extraGathers: ["thought-appraisal"] as EvidenceField[],
  },
  {
    tag: "gestalt",
    label: "somatic",
    category: "gestalt" as TherapeuticQuestionCategory,
    wrap: (q: string) =>
      `${q} Where do you notice that in your body right now, and what intensity 0–10?`,
    extraGathers: ["body-map", "pain-nrs-now"] as EvidenceField[],
  },
  {
    tag: "sfbt",
    label: "SFBT",
    category: "miracle" as TherapeuticQuestionCategory,
    wrap: (q: string) =>
      `${q} If it improved 10% overnight, what is the first measurable sign (time, distance, load, or mood 0–10)?`,
    extraGathers: ["goals", "function-psfs"] as EvidenceField[],
  },
  {
    tag: "act",
    label: "ACT",
    category: "values" as TherapeuticQuestionCategory,
    wrap: (q: string) =>
      `${q} If you held that experience lightly, what value-based action (even 2 minutes) could you still take?`,
    extraGathers: ["values", "goals"] as EvidenceField[],
  },
  {
    tag: "mi",
    label: "MI",
    category: "coping" as TherapeuticQuestionCategory,
    wrap: (q: string) =>
      `${q} On 0–10, how important is changing this, and how confident are you (0–10) you could take one step?`,
    extraGathers: ["self-efficacy", "goals"] as EvidenceField[],
  },
  {
    tag: "somatic",
    label: "dose-map",
    category: "body-mind" as TherapeuticQuestionCategory,
    wrap: (q: string) =>
      `${q} Map location, quality (sharp/dull/burning/tight), and time-to-onset with the trigger if known.`,
    extraGathers: ["pain-quality", "aggravators", "body-map"] as EvidenceField[],
  },
  {
    tag: "compassion",
    label: "compassion",
    category: "strengths" as TherapeuticQuestionCategory,
    wrap: (q: string) =>
      `${q} What would you tell a good friend in the same data—and can you use one line of that for yourself?`,
    extraGathers: ["thought-appraisal", "strengths"] as EvidenceField[],
  },
] as const;

/** Core stem templates — clinically specific, evidence-gathering. */
const STEM_TEMPLATES: Array<{
  id: string;
  label: string;
  stem: string;
  category: TherapeuticQuestionCategory;
  themes: string[];
  gathers: EvidenceField[];
  clinicalRationale: string;
  priority: number;
  slots: Array<"time" | "focus" | "emotion" | "context">;
}> = [
  {
    id: "stem-nrs",
    label: "NRS 0–10",
    stem: "For {focus} {time}{context_clause}: rate intensity 0–10 now and at worst—where exactly is it?",
    category: "pain-nrs",
    themes: ["pain", "body"],
    gathers: ["pain-nrs-now", "pain-nrs-worst"],
    clinicalRationale: "Numeric pain rating is a standard responsive clinical measure.",
    priority: 96,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-aggravator-dose",
    label: "Aggravator + dose",
    stem: "What makes {focus} worse {time}{context_clause}, and about how long or how much load before it builds?",
    category: "irritability",
    themes: ["pain", "function"],
    gathers: ["aggravators"],
    clinicalRationale: "Time/load dose of aggravators defines mechanical irritability.",
    priority: 95,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-easer-duration",
    label: "Easer + duration",
    stem: "What eases {focus} {time}{context_clause}, and about how long does relief last (minutes/hours)?",
    category: "irritability",
    themes: ["pain", "coping"],
    gathers: ["easers", "coping-effectiveness"],
    clinicalRationale: "Easers with duration show whether self-management is durable.",
    priority: 93,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-24h",
    label: "2–24h response",
    stem: "After activity involving {focus} {time}{context_clause}: better, same, or worse 2–24 hours later—and how long to settle?",
    category: "irritability",
    themes: ["pain", "function"],
    gathers: ["irritability-24h", "session-response"],
    clinicalRationale: "24h symptom response is a primary dosing governor in rehab.",
    priority: 97,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-psfs",
    label: "Function 0–10",
    stem: "Name the key task limited by {focus} {time}{context_clause}. Rate ability 0–10 (0=unable, 10=normal for you) and the main limiter (pain, weakness, fear, stiffness, fatigue).",
    category: "function",
    themes: ["function", "goals"],
    gathers: ["function-psfs"],
    clinicalRationale: "PSFS-style task rating links care to meaningful function.",
    priority: 96,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-fear-avoid",
    label: "Avoided / guarded",
    stem: "What about {focus} did you guard or avoid {time}{context_clause}, and what harm do you fear if you do it?",
    category: "fear-avoidance",
    themes: ["fear", "function"],
    gathers: ["fear-avoidance"],
    clinicalRationale: "Fear-avoidance beliefs track with disability and under-loading.",
    priority: 92,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-self-efficacy",
    label: "Confidence 0–10",
    stem: "How confident are you managing {focus} {time}{context_clause} (0–10), and what would raise that by 1 point?",
    category: "self-efficacy",
    themes: ["fear", "goals"],
    gathers: ["self-efficacy"],
    clinicalRationale: "Self-efficacy predicts adherence and graded exposure success.",
    priority: 90,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-sleep",
    label: "Sleep data",
    stem: "How did sleep affect {focus} {time}{context_clause}? Estimate hours, quality 0–10, and any night pain or racing thoughts.",
    category: "sleep-stress",
    themes: ["sleep", "stress"],
    gathers: ["sleep-hours", "sleep-quality"],
    clinicalRationale: "Sleep is a major modifier of pain sensitivity and recovery.",
    priority: 91,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-stress-nrs",
    label: "Stress 0–10",
    stem: "Rate stress around {focus} {time}{context_clause} 0–10. Main driver? How does it change pain or movement willingness?",
    category: "sleep-stress",
    themes: ["stress", "mood"],
    gathers: ["stress-load", "mood"],
    clinicalRationale: "Quantified stress load guides pacing and coping priorities.",
    priority: 89,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-mood-nrs",
    label: "Mood 0–10",
    stem: "Rate mood related to {focus} {time}{context_clause} 0–10 and name 1–2 emotion words. Where is it felt in the body?",
    category: "gestalt",
    themes: ["mood", "body"],
    gathers: ["mood", "body-map"],
    clinicalRationale: "Mood rating + somatic site supports biopsychosocial tracking.",
    priority: 88,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-coping-effect",
    label: "Coping + effect 0–10",
    stem: "What coping did you use for {focus} {time}{context_clause}? Rate help 0–10 and how long the benefit lasted.",
    category: "coping",
    themes: ["coping"],
    gathers: ["coping-strategy", "coping-effectiveness"],
    clinicalRationale: "Strategy × effectiveness turns coping into actionable data.",
    priority: 94,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-thought-fact",
    label: "Thought: fact vs fear",
    stem: "What heavy thought about {focus} showed up {time}{context_clause}? Fact you could demonstrate, or fear/prediction?",
    category: "cbt",
    themes: ["cbt", "thoughts"],
    gathers: ["thought-appraisal"],
    clinicalRationale: "CBT fact-vs-interpretation check is a core cognitive skill.",
    priority: 87,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-goal-measure",
    label: "Measurable goal",
    stem: "What measurable change in {focus} do you want {time}{context_clause} (time, distance, load, sleep hours, confidence 0–10)?",
    category: "values",
    themes: ["goals"],
    gathers: ["goals", "function-psfs"],
    clinicalRationale: "Specific measurable goals outperform vague ‘feel better’ targets.",
    priority: 90,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-session-rpe",
    label: "Session response",
    stem: "If you trained {focus} {time}{context_clause}: difficulty 1–5, pain during 0–10, and status 2 hours later?",
    category: "irritability",
    themes: ["pain", "function"],
    gathers: ["session-response", "irritability-24h", "pain-nrs-now"],
    clinicalRationale: "Session RPE + delayed response drive progress/hold/regress.",
    priority: 93,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-body-map",
    label: "Location map",
    stem: "Map {focus} {time}{context_clause}: exact location, deep vs surface, spread/radiation, constant vs intermittent.",
    category: "body-mind",
    themes: ["body", "pain"],
    gathers: ["body-map", "pain-quality"],
    clinicalRationale: "Localization and radiation language refine pattern recognition.",
    priority: 92,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-pain-mood",
    label: "Pain↔mood coupling",
    stem: "How did {focus} and mood interact {time}{context_clause}—pain drove mood, mood drove pain, both, or neither? Give one timed example.",
    category: "body-mind",
    themes: ["pain", "mood"],
    gathers: ["mood", "pain-nrs-now"],
    clinicalRationale: "Bidirectional pain–mood coupling yields dual treatment targets.",
    priority: 88,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-trigger-duration",
    label: "Trigger + duration",
    stem: "What triggered a spike in {emotion_or_stress} around {focus} {time}{context_clause}, peak intensity 0–10, and how long until it settled?",
    category: "coping",
    themes: ["stress", "mood"],
    gathers: ["stress-load", "aggravators"],
    clinicalRationale: "Trigger–peak–duration maps support exposure and pacing plans.",
    priority: 86,
    slots: ["time", "focus", "emotion", "context"],
  },
  {
    id: "stem-support-used",
    label: "Support used?",
    stem: "What support for {focus} was available {time}{context_clause}, and did you actually use it (yes/no + how)?",
    category: "coping",
    themes: ["coping", "relationships"],
    gathers: ["social-support", "coping-strategy"],
    clinicalRationale: "Available vs used support is a practical adherence variable.",
    priority: 80,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-win-mechanism",
    label: "Win + mechanism",
    stem: "One win with {focus} {time}{context_clause}: what specifically helped (pacing, load, support, mindset, meds)?",
    category: "strengths",
    themes: ["wins", "coping"],
    gathers: ["strengths", "coping-effectiveness"],
    clinicalRationale: "Mechanism behind wins makes success reproducible.",
    priority: 84,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-energy",
    label: "Energy %",
    stem: "Energy budget for {focus} {time}{context_clause}: % remaining and top energy drain?",
    category: "sleep-stress",
    themes: ["energy", "stress"],
    gathers: ["energy", "stress-load"],
    clinicalRationale: "Energy accounting reduces boom-bust activity cycles.",
    priority: 79,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-safe",
    label: "Safety / readiness",
    stem: "Do you feel safe enough with {focus} {time}{context_clause} to rest, move gently, or seek help? If not, what is needed first?",
    category: "safety",
    themes: ["safety", "needs"],
    gathers: ["safety"],
    clinicalRationale: "Safety and stability precede progressive loading.",
    priority: 94,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-chief",
    label: "Chief complaint",
    stem: "In one line: main problem with {focus} {time}{context_clause}, location, and roughly how long this pattern has lasted.",
    category: "intake",
    themes: ["primary"],
    gathers: ["chief-complaint"],
    clinicalRationale: "Clear chief complaint + timeline is foundational subjective data.",
    priority: 95,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-quality",
    label: "Symptom quality",
    stem: "For {focus} {time}{context_clause}, pick quality words (sharp, dull, burning, tight, numb, tingling, weak) and constant vs intermittent.",
    category: "pain-nrs",
    themes: ["pain", "body"],
    gathers: ["pain-quality"],
    clinicalRationale: "Quality descriptors refine mechanical vs neuro-like language.",
    priority: 91,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-present",
    label: "Present data",
    stem: "Right now regarding {focus}: main sensation 0–10, main thought, and urge (rest / move / withdraw / push)?",
    category: "gestalt",
    themes: ["mood", "body"],
    gathers: ["body-map", "thought-appraisal", "pain-nrs-now"],
    clinicalRationale: "Present-moment triad (sensation–thought–urge) guides next micro-action.",
    priority: 85,
    slots: ["focus"],
  },
  {
    id: "stem-pt-one-line",
    label: "One line for clinician",
    stem: "If your PT had 10 seconds about {focus} {time}{context_clause}, what one evidence-rich sentence would you give (pain, task limit, 24h response)?",
    category: "body-mind",
    themes: ["primary", "pain"],
    gathers: ["chief-complaint", "function-psfs", "irritability-24h"],
    clinicalRationale: "Forces prioritization of highest-yield clinical data.",
    priority: 87,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-values-action",
    label: "Value + action",
    stem: "What value matters around {focus} {time}{context_clause}, and what 2-minute action expressed it (or could)?",
    category: "values",
    themes: ["values", "goals"],
    gathers: ["values", "goals"],
    clinicalRationale: "Values-based micro-actions support living with symptoms.",
    priority: 77,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-miracle-metric",
    label: "Miracle metric",
    stem: "If {focus} improved overnight, what first measurable sign {time}{context_clause} (minutes walked, desk time, sleep hours, confidence 0–10)?",
    category: "miracle",
    themes: ["goals", "hope"],
    gathers: ["goals", "function-psfs"],
    clinicalRationale: "SFBT markers become trackable outcomes when quantified.",
    priority: 82,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-relationship-load",
    label: "Relationship load",
    stem: "How did relationships affect {focus} {time}{context_clause} (supportive/strained)—any change in pain, stress, or rest?",
    category: "relationships",
    themes: ["relationships", "stress"],
    gathers: ["social-support", "stress-load"],
    clinicalRationale: "Interpersonal load moderates pain coping and recovery capacity.",
    priority: 76,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-habit-replace",
    label: "Habit data",
    stem: "What habit around {focus} {time}{context_clause} isn’t serving you, how often, and what replacement habit (with when/where) could you try?",
    category: "group",
    themes: ["goals", "coping"],
    gathers: ["coping-strategy", "goals"],
    clinicalRationale: "Habit frequency + replacement plan is implementable behavior change data.",
    priority: 74,
    slots: ["time", "focus", "context"],
  },
  {
    id: "stem-emotion-under",
    label: "Emotion layers",
    stem: "If surface feeling about {focus} is {emotion_or_any} {time}, what feeling might be underneath—and body intensity 0–10?",
    category: "coping",
    themes: ["mood", "thoughts"],
    gathers: ["mood", "body-map"],
    clinicalRationale: "Layered affect improves emotional granularity for coping plans.",
    priority: 81,
    slots: ["time", "focus", "emotion"],
  },
  {
    id: "stem-flare-first-response",
    label: "Flare first response",
    stem: "When {focus} flares {time}{context_clause}, first response, help ≥1 hour (yes/no), and what you’d try next time?",
    category: "coping",
    themes: ["coping", "pain"],
    gathers: ["coping-strategy", "coping-effectiveness", "aggravators"],
    clinicalRationale: "First-response audit improves flare plans between visits.",
    priority: 89,
    slots: ["time", "focus", "context"],
  },
];

/** Extra free-standing clinical evidence-gathering bases (expand by lens only) */
const STANDALONE_STEMS: Array<{
  id: string;
  label: string;
  question: string;
  category: TherapeuticQuestionCategory;
  themes: string[];
  gathers: EvidenceField[];
  clinicalRationale: string;
  priority: number;
}> = [
  {
    id: "solo-red-flags",
    label: "Red-flag screen",
    question:
      "Any new progressive weakness, saddle numbness, bowel/bladder change, fever with severe pain, chest pain/shortness of breath, or major trauma pain that needs urgent clinician review?",
    category: "safety",
    themes: ["safety"],
    gathers: ["red-flags", "safety"],
    clinicalRationale: "Standard musculoskeletal red-flag screen language.",
    priority: 98,
  },
  {
    id: "solo-meds-context",
    label: "Meds / advice today",
    question:
      "Any medication timing, missed doses, new clinician advice, or medical visits that should change how hard you push movement today?",
    category: "intake",
    themes: ["primary"],
    gathers: ["medication-context"],
    clinicalRationale: "Medical/medication context is a critical dosing modifier (document only).",
    priority: 72,
  },
  {
    id: "solo-treatment-history",
    label: "What helped ≥50% before",
    question:
      "What have you tried for this problem (PT, rest, meds, injections, mindfulness)? What helped ≥50% and what did not?",
    category: "first-session",
    themes: ["coping", "history"],
    gathers: ["coping-strategy", "coping-effectiveness"],
    clinicalRationale: "Prior treatment response guides strategy selection.",
    priority: 80,
  },
  {
    id: "solo-psfs-compare",
    label: "Function vs before",
    question:
      "Compared with before this problem, name one task you did better then—and quantify the gap (time, distance, load, or 0–10 ability).",
    category: "function",
    themes: ["function"],
    gathers: ["function-psfs", "chief-complaint"],
    clinicalRationale: "Pre-morbid function baseline defines meaningful change.",
    priority: 84,
  },
  {
    id: "solo-friend-test",
    label: "Friend test",
    question:
      "If a good friend had your exact symptoms and scores today, what would you advise them—and can you use one line of that for yourself?",
    category: "strengths",
    themes: ["strengths", "coping"],
    gathers: ["thought-appraisal", "strengths"],
    clinicalRationale: "Self-compassion reframes punitive self-talk that harms adherence.",
    priority: 70,
  },
  {
    id: "solo-three-strengths",
    label: "Three strengths used",
    question:
      "List three strengths you used today (even quiet ones) with one concrete example each tied to symptoms or stress.",
    category: "strengths",
    themes: ["strengths"],
    gathers: ["strengths"],
    clinicalRationale: "Strengths inventory builds self-efficacy data.",
    priority: 68,
  },
  {
    id: "solo-expect-timeline",
    label: "Expectation + timeline",
    question:
      "What do you expect from your plan in 2 weeks and 6 weeks—for pain 0–10, a key task, and confidence 0–10?",
    category: "first-session",
    themes: ["goals"],
    gathers: ["goals", "self-efficacy", "pain-nrs-now"],
    clinicalRationale: "Aligned expectations improve adherence and reduce frustration.",
    priority: 76,
  },
  {
    id: "solo-boundary-dose",
    label: "Boundary with when/where",
    question:
      "Name one boundary you need (work, family, training, screens): exact ask, when/where, and what makes it hard.",
    category: "relationships",
    themes: ["relationships", "needs"],
    gathers: ["coping-strategy", "stress-load"],
    clinicalRationale: "Specific boundaries reduce load that maintains flares.",
    priority: 69,
  },
];

// —— Capacity math ——
// stems × time × focus × emotion × context × lens  +  standalone × lens  +  curated bases

const STEM_AXIS_COUNT =
  STEM_TEMPLATES.length *
  TIMEFRAMES.length *
  FOCI.length *
  EMOTIONS.length *
  CONTEXTS.length *
  LENSES.length;

const STANDALONE_AXIS_COUNT = STANDALONE_STEMS.length * LENSES.length;

/** Curated PDF/counselor bases remain first-class (not multiplied to avoid nonsense) */
export const CURATED_THERAPEUTIC_COUNT = CURATED_BASES.length;

/**
 * Full virtual catalog capacity (~150,000× original 51-item bank).
 * Original: 51 → target ≥ 7,650,000 addressable editions.
 */
export const THERAPEUTIC_QUESTION_CAPACITY =
  STEM_AXIS_COUNT + STANDALONE_AXIS_COUNT + CURATED_THERAPEUTIC_COUNT;

export const THERAPEUTIC_CATALOG_META = {
  curatedBases: CURATED_THERAPEUTIC_COUNT,
  stemTemplates: STEM_TEMPLATES.length,
  standaloneStems: STANDALONE_STEMS.length,
  timeframes: TIMEFRAMES.length,
  foci: FOCI.length,
  emotions: EMOTIONS.length,
  contexts: CONTEXTS.length,
  lenses: LENSES.length,
  stemEditions: STEM_AXIS_COUNT,
  standaloneEditions: STANDALONE_AXIS_COUNT,
  capacity: THERAPEUTIC_QUESTION_CAPACITY,
  expansionFactorVsOriginal51: Math.round(THERAPEUTIC_QUESTION_CAPACITY / 51),
  note:
    "Virtual catalog: clinician stems × time × focus × emotion × context × therapy lens. Materialized on demand—not loaded as millions of objects.",
} as const;

function cleanSpaces(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/\s+([?,.!])/g, "$1")
    .replace(/\?\?/g, "?")
    .trim();
}

function fillStem(
  stem: string,
  parts: {
    time: (typeof TIMEFRAMES)[number];
    focus: (typeof FOCI)[number];
    emotion: (typeof EMOTIONS)[number];
    context: (typeof CONTEXTS)[number];
  }
): string {
  const contextClause =
    parts.context.tag === "general" ? "" : ` ${parts.context.phrase}`;
  const emotionOrAny =
    parts.emotion.tag === "unspec" ? "whatever you feel most" : parts.emotion.phrase;
  const emotionOrStress =
    parts.emotion.tag === "unspec" ? "stress or emotion" : parts.emotion.phrase;

  return cleanSpaces(
    stem
      .replace(/\{time\}/g, parts.time.phrase)
      .replace(/\{focus\}/g, parts.focus.phrase)
      .replace(/\{emotion_or_any\}/g, emotionOrAny)
      .replace(/\{emotion_or_stress\}/g, emotionOrStress)
      .replace(/\{emotion\}/g, parts.emotion.phrase || "your feelings")
      .replace(/\{context_clause\}/g, contextClause)
      .replace(/\{context\}/g, parts.context.phrase)
  );
}

function decodeStemIndex(index: number): {
  stemI: number;
  timeI: number;
  focusI: number;
  emotionI: number;
  contextI: number;
  lensI: number;
} {
  const L = LENSES.length;
  const C = CONTEXTS.length;
  const E = EMOTIONS.length;
  const F = FOCI.length;
  const T = TIMEFRAMES.length;
  const S = STEM_TEMPLATES.length;

  let i = index;
  const lensI = i % L;
  i = Math.floor(i / L);
  const contextI = i % C;
  i = Math.floor(i / C);
  const emotionI = i % E;
  i = Math.floor(i / E);
  const focusI = i % F;
  i = Math.floor(i / F);
  const timeI = i % T;
  i = Math.floor(i / T);
  const stemI = i % S;
  return { stemI, timeI, focusI, emotionI, contextI, lensI };
}

function materializeStemEdition(index: number): TherapeuticQuestion {
  const { stemI, timeI, focusI, emotionI, contextI, lensI } = decodeStemIndex(index);
  const stem = STEM_TEMPLATES[stemI]!;
  const time = TIMEFRAMES[timeI]!;
  const focus = FOCI[focusI]!;
  const emotion = EMOTIONS[emotionI]!;
  const context = CONTEXTS[contextI]!;
  const lens = LENSES[lensI]!;

  const filled = fillStem(stem.stem, { time, focus, emotion, context });
  const question = lens.wrap(filled);
  const id = `tq-v-${stem.id}-${time.tag}-${focus.tag}-${emotion.tag}-${context.tag}-${lens.tag}`;

  const labelParts = [stem.label];
  if (focus.tag !== "whole") labelParts.push(focus.label);
  if (time.tag !== "today" && time.tag !== "now") labelParts.push(time.label);
  if (lens.tag !== "open") labelParts.push(lens.label);

  return {
    id,
    label: labelParts.slice(0, 3).join(" · ").slice(0, 48),
    question,
    category: lens.tag === "open" ? stem.category : lens.category,
    source: "motionrx",
    themes: uniqueThemes([
      ...stem.themes,
      focus.tag,
      time.tag,
      emotion.tag !== "unspec" ? emotion.tag : "",
      lens.tag,
    ]),
    gathers: uniqueThemes([...stem.gathers, ...lens.extraGathers]) as EvidenceField[],
    clinicalRationale: stem.clinicalRationale,
    priority: Math.max(
      20,
      stem.priority -
        (emotion.tag === "unspec" ? 0 : 1) -
        (context.tag === "general" ? 0 : 1) -
        (lens.tag === "open" ? 0 : 2)
    ),
  };
}

function materializeStandaloneEdition(index: number): TherapeuticQuestion {
  const lensI = index % LENSES.length;
  const stemI = Math.floor(index / LENSES.length) % STANDALONE_STEMS.length;
  const stem = STANDALONE_STEMS[stemI]!;
  const lens = LENSES[lensI]!;
  const question = lens.wrap(stem.question);
  return {
    id: `tq-s-${stem.id}-${lens.tag}`,
    label: lens.tag === "open" ? stem.label : `${stem.label} · ${lens.label}`,
    question,
    category: lens.tag === "open" ? stem.category : lens.category,
    source: "motionrx",
    themes: uniqueThemes([...stem.themes, lens.tag]),
    gathers: uniqueThemes([...stem.gathers, ...lens.extraGathers]) as EvidenceField[],
    clinicalRationale: stem.clinicalRationale,
    priority: stem.priority - (lens.tag === "open" ? 0 : 2),
  };
}

function uniqueThemes(xs: string[]): string[] {
  return Array.from(new Set(xs.filter(Boolean)));
}

/**
 * Materialize any catalog index in [0, THERAPEUTIC_QUESTION_CAPACITY).
 * Layout: [stem editions | standalone editions | curated bases]
 */
export function getTherapeuticQuestionByIndex(index: number): TherapeuticQuestion {
  const n = ((index % THERAPEUTIC_QUESTION_CAPACITY) + THERAPEUTIC_QUESTION_CAPACITY) %
    THERAPEUTIC_QUESTION_CAPACITY;

  if (n < STEM_AXIS_COUNT) {
    return materializeStemEdition(n);
  }
  const n2 = n - STEM_AXIS_COUNT;
  if (n2 < STANDALONE_AXIS_COUNT) {
    return materializeStandaloneEdition(n2);
  }
  const n3 = n2 - STANDALONE_AXIS_COUNT;
  return CURATED_BASES[n3 % CURATED_BASES.length]!;
}

export function getTherapeuticQuestionByVirtualId(id: string): TherapeuticQuestion | undefined {
  if (id.startsWith("tq-v-") || id.startsWith("tq-s-")) {
    // Linear search is impossible at multi-million scale; re-derive from id parts for stems
    if (id.startsWith("tq-v-")) {
      const rest = id.slice("tq-v-".length);
      // id: tq-v-{stem.id}-{time}-{focus}-{emotion}-{context}-{lens}
      // stem.id may contain hyphens — match from known tables
      for (let si = 0; si < STEM_TEMPLATES.length; si++) {
        const stem = STEM_TEMPLATES[si]!;
        const prefix = `${stem.id}-`;
        if (!rest.startsWith(prefix)) continue;
        const tail = rest.slice(prefix.length);
        const parts = tail.split("-");
        // time, focus, emotion, context, lens — but tags themselves may have hyphens
        // Our tags use single tokens or known multi-part: this-morning, after-session, etc.
        // Parse by matching against tables greedily from the end (lens, context, emotion, focus, time)
        const lens = LENSES.find((l) => tail.endsWith(`-${l.tag}`) || tail === l.tag);
        if (!lens) continue;
        let rem = tail.endsWith(`-${lens.tag}`)
          ? tail.slice(0, -(lens.tag.length + 1))
          : "";
        const context = [...CONTEXTS].reverse().find((c) => rem.endsWith(`-${c.tag}`) || rem === c.tag);
        if (!context) continue;
        rem = rem.endsWith(`-${context.tag}`) ? rem.slice(0, -(context.tag.length + 1)) : "";
        const emotion = [...EMOTIONS].reverse().find((e) => rem.endsWith(`-${e.tag}`) || rem === e.tag);
        if (!emotion) continue;
        rem = rem.endsWith(`-${emotion.tag}`) ? rem.slice(0, -(emotion.tag.length + 1)) : "";
        const focus = [...FOCI].reverse().find((f) => rem.endsWith(`-${f.tag}`) || rem === f.tag);
        if (!focus) continue;
        rem = rem.endsWith(`-${focus.tag}`) ? rem.slice(0, -(focus.tag.length + 1)) : "";
        const time = TIMEFRAMES.find((t) => t.tag === rem);
        if (!time) continue;

        const filled = fillStem(stem.stem, { time, focus, emotion, context });
        return {
          id,
          label: [stem.label, focus.label, lens.label].filter(Boolean).join(" · ").slice(0, 48),
          question: lens.wrap(filled),
          category: lens.tag === "open" ? stem.category : lens.category,
          source: "motionrx",
          themes: uniqueThemes([...stem.themes, focus.tag, time.tag, emotion.tag, lens.tag]),
          gathers: uniqueThemes([...stem.gathers, ...lens.extraGathers]) as EvidenceField[],
          clinicalRationale: stem.clinicalRationale,
          priority: stem.priority,
        };
      }
    }
    if (id.startsWith("tq-s-")) {
      const rest = id.slice("tq-s-".length);
      for (const stem of STANDALONE_STEMS) {
        for (const lens of LENSES) {
          if (rest === `${stem.id}-${lens.tag}`) {
            return {
              id,
              label: lens.tag === "open" ? stem.label : `${stem.label} · ${lens.label}`,
              question: lens.wrap(stem.question),
              category: lens.tag === "open" ? stem.category : lens.category,
              source: "motionrx",
              themes: uniqueThemes([...stem.themes, lens.tag]),
              gathers: uniqueThemes([...stem.gathers, ...lens.extraGathers]) as EvidenceField[],
              clinicalRationale: stem.clinicalRationale,
              priority: stem.priority,
            };
          }
        }
      }
    }
    return undefined;
  }
  return getCuratedById(id);
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic sample of virtual catalog (for UI chips, Jeffery, adaptive fill). */
export function sampleTherapeuticQuestions(
  count: number,
  seed = "journal",
  opts?: {
    categories?: TherapeuticQuestionCategory[];
    themes?: string[];
    preferCurated?: boolean;
  }
): TherapeuticQuestion[] {
  const out: TherapeuticQuestion[] = [];
  const seen = new Set<string>();

  if (opts?.preferCurated !== false) {
    for (const q of CURATED_BASES) {
      if (opts?.categories && !opts.categories.includes(q.category)) continue;
      if (opts?.themes && !opts.themes.some((t) => q.themes.includes(t))) continue;
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      out.push(q);
      if (out.length >= count) return out;
    }
  }

  let h = hashSeed(seed);
  let guard = 0;
  while (out.length < count && guard < count * 40) {
    guard++;
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const q = getTherapeuticQuestionByIndex(h);
    if (opts?.categories && !opts.categories.includes(q.category)) continue;
    if (opts?.themes && !opts.themes.some((t) => q.themes.includes(t) || q.themes.includes(t))) {
      // also match focus tags in themes
      const hit = opts.themes.some(
        (t) => q.themes.includes(t) || q.question.toLowerCase().includes(t.toLowerCase())
      );
      if (!hit) continue;
    }
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
  }
  return out;
}

/** Lightweight search over curated + sampled virtual editions */
export function searchTherapeuticQuestions(
  query: string,
  limit = 24
): TherapeuticQuestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return sampleTherapeuticQuestions(limit, "search-empty");

  const hits: TherapeuticQuestion[] = [];
  for (const item of CURATED_BASES) {
    if (
      item.question.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q) ||
      item.themes.some((t) => t.includes(q)) ||
      item.category.includes(q)
    ) {
      hits.push(item);
      if (hits.length >= limit) return hits;
    }
  }

  // Seed virtual samples from query tokens
  const more = sampleTherapeuticQuestions(limit * 3, `search:${q}`, { preferCurated: false });
  for (const item of more) {
    if (
      item.question.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q) ||
      item.themes.some((t) => t.includes(q))
    ) {
      if (!hits.some((h) => h.id === item.id)) hits.push(item);
      if (hits.length >= limit) break;
    }
  }
  return hits.slice(0, limit);
}

export function therapeuticCatalogStats() {
  return { ...THERAPEUTIC_CATALOG_META };
}
