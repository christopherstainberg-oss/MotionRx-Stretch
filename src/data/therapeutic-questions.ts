/**
 * Therapeutic / clinical interview prompts for MotionRx Journal.
 *
 * Design goals:
 * 1) Clinically specific — region, dose, timing, function, mood constructs.
 * 2) Evidence-informed — maps to constructs used in outpatient PT / behavioral health
 *    intake (pain NRS, PSFS-style function, 24h symptom response / irritability,
 *    fear-avoidance, sleep, self-efficacy, CBT thought appraisal, SFBT goals).
 * 3) Evidence-gathering — each question targets a measurable or classifiable field
 *    the app can use for plan dosing (not vague “how do you feel?” alone).
 *
 * Sources synthesized for educational self-journal use:
 * - Best Questions Therapists & Counselors Ask Clients (intake / CBT / Gestalt / SFBT frames)
 * - Common outpatient PT subjective exam structure
 * - Common counselor evidence-gathering prompts (coping, sleep, safety, values)
 *
 * Educational only — not therapy, diagnosis, crisis care, or a validated PRO battery.
 */

export type TherapeuticQuestionCategory =
  | "intake"
  | "first-session"
  | "coping"
  | "cbt"
  | "gestalt"
  | "depression"
  | "miracle"
  | "relationships"
  | "values"
  | "safety"
  | "sleep-stress"
  | "body-mind"
  | "group"
  | "family"
  | "resistance"
  | "strengths"
  | "pain-nrs"
  | "function"
  | "irritability"
  | "fear-avoidance"
  | "self-efficacy";

/** What clinical field(s) the answer should help populate */
export type EvidenceField =
  | "chief-complaint"
  | "pain-nrs-now"
  | "pain-nrs-worst"
  | "pain-quality"
  | "aggravators"
  | "easers"
  | "irritability-24h"
  | "function-psfs"
  | "fear-avoidance"
  | "self-efficacy"
  | "sleep-hours"
  | "sleep-quality"
  | "mood"
  | "stress-load"
  | "coping-strategy"
  | "coping-effectiveness"
  | "social-support"
  | "goals"
  | "session-response"
  | "red-flags"
  | "strengths"
  | "values"
  | "thought-appraisal"
  | "body-map"
  | "energy"
  | "medication-context"
  | "safety";

export type TherapeuticQuestion = {
  id: string;
  /** Short chip label */
  label: string;
  /** Full open-ended question for free-text journal */
  question: string;
  category: TherapeuticQuestionCategory;
  /** Source tag for transparency */
  source: "pdf-guide" | "counselor-common" | "outpatient-pt" | "motionrx" | "evidence-synthesis";
  /** Themes this question helps cover in journal intelligence */
  themes: string[];
  /** Clinical constructs / fields this question is designed to gather */
  gathers: EvidenceField[];
  /** Brief educational rationale (why this question matters clinically) */
  clinicalRationale: string;
  priority: number;
};

/** Soft safety language for journal UI (not a crisis line product) */
export const JOURNAL_SAFETY_NOTE =
  "If you are in crisis, having thoughts of harming yourself, or feel unsafe, contact local emergency services or a crisis line right away. This journal is educational reflection—not therapy or emergency care.";

/**
 * Evidence-gathering interview bank — clinically specific, construct-mapped.
 * Order is not load order; consumers sort by priority.
 */
const CLINICAL_EVIDENCE_BANK: TherapeuticQuestion[] = [
  // —— Chief complaint / intake ——
  {
    id: "ev-chief-complaint",
    label: "Main problem today",
    question:
      "In one or two sentences: what is the main body or mind problem today, where is it, and how long has this flare or pattern been going on?",
    category: "intake",
    source: "outpatient-pt",
    themes: ["primary", "pain", "body"],
    gathers: ["chief-complaint"],
    clinicalRationale:
      "Subjective exam opens with a clear chief complaint + location + timeline for triage and dosing.",
    priority: 100,
  },
  {
    id: "ev-why-now",
    label: "Why document this now?",
    question:
      "What changed recently that made this worth writing down now—new pain, worse function, worse sleep/mood, or a goal you care about?",
    category: "first-session",
    source: "pdf-guide",
    themes: ["primary", "goals"],
    gathers: ["chief-complaint", "goals"],
    clinicalRationale: "‘Why now’ clarifies acuity and motivation—key for engagement and plan priority.",
    priority: 88,
  },

  // —— Pain NRS / quality (core PT outcome) ——
  {
    id: "ev-pain-nrs-now-worst",
    label: "Pain 0–10 now & worst",
    question:
      "On a 0–10 scale (0 = no pain, 10 = worst imaginable): what is pain most of today, and what is it at its worst today? Where exactly do you feel it?",
    category: "pain-nrs",
    source: "outpatient-pt",
    themes: ["pain", "body"],
    gathers: ["pain-nrs-now", "pain-nrs-worst", "chief-complaint"],
    clinicalRationale:
      "0–10 numeric pain rating (NRS) is a standard, responsive clinical measure for dosing and tracking.",
    priority: 99,
  },
  {
    id: "ev-pain-quality",
    label: "Pain quality words",
    question:
      "Which words fit the sensation best—sharp, dull/achy, burning, throbbing, tight/stiff, numb, tingling, weak/giving-way—and is it constant or intermittent?",
    category: "pain-nrs",
    source: "outpatient-pt",
    themes: ["pain", "body"],
    gathers: ["pain-quality"],
    clinicalRationale:
      "Sensory quality helps pattern irritability and neuro/mechanical language without inventing a diagnosis.",
    priority: 91,
  },
  {
    id: "ev-aggravators-dose",
    label: "What worsens it (with dose)",
    question:
      "What positions, actions, or activities make symptoms worse—and about how long or how much load before they build (e.g. 15 min sitting, 1 flight of stairs)?",
    category: "irritability",
    source: "outpatient-pt",
    themes: ["pain", "function"],
    gathers: ["aggravators"],
    clinicalRationale:
      "Aggravators with time/load dose define mechanical irritability and safe exposure windows.",
    priority: 98,
  },
  {
    id: "ev-easers-duration",
    label: "What eases it (how long)",
    question:
      "What eases symptoms even a little (position change, walk, heat, ice, rest, meds, breath)—and about how long does relief last?",
    category: "irritability",
    source: "outpatient-pt",
    themes: ["pain", "coping"],
    gathers: ["easers", "coping-effectiveness"],
    clinicalRationale:
      "Easers + duration of relief guide self-management and whether strategies are durable.",
    priority: 94,
  },
  {
    id: "ev-irritability-24h",
    label: "2–24h after activity",
    question:
      "After movement, chores, or your home program: do you feel better, the same, or more irritated later—especially 2–24 hours after? How long until it settles?",
    category: "irritability",
    source: "outpatient-pt",
    themes: ["pain", "function"],
    gathers: ["irritability-24h", "session-response"],
    clinicalRationale:
      "24-hour symptom response is a primary irritability marker for progress vs protect dosing in rehab.",
    priority: 97,
  },

  // —— Function (PSFS-style) ——
  {
    id: "ev-psfs-task",
    label: "Hardest daily task (0–10)",
    question:
      "Name the one everyday task that matters most and is hardest right now (stairs, desk hour, walk, sleep, dressing, lifting). Rate ability 0–10 (0 = unable, 10 = normal for you) and what limits it—pain, weakness, fear, fatigue, or stiffness?",
    category: "function",
    source: "outpatient-pt",
    themes: ["function", "goals"],
    gathers: ["function-psfs", "goals"],
    clinicalRationale:
      "Patient-Specific Functional Scale (PSFS)–style anchoring links care to meaningful function, not only pain.",
    priority: 96,
  },
  {
    id: "ev-function-baseline",
    label: "What you could do before",
    question:
      "Compared with before this problem, what could you do then that you cannot do as well now (distance, time, load, reps)? Be as specific as you can.",
    category: "function",
    source: "outpatient-pt",
    themes: ["function"],
    gathers: ["function-psfs", "chief-complaint"],
    clinicalRationale: "Functional baseline defines meaningful change and return-to-activity targets.",
    priority: 82,
  },

  // —— Fear-avoidance / self-efficacy ——
  {
    id: "ev-fear-avoidance",
    label: "Guarded or avoided moves",
    question:
      "Which movements or tasks do you guard against or avoid because you worry they will make things worse? What do you imagine could go wrong?",
    category: "fear-avoidance",
    source: "evidence-synthesis",
    themes: ["fear", "function"],
    gathers: ["fear-avoidance"],
    clinicalRationale:
      "Fear-avoidance beliefs strongly influence disability and progression; naming them enables graded exposure.",
    priority: 90,
  },
  {
    id: "ev-self-efficacy",
    label: "Confidence with home program",
    question:
      "On a 0–10 scale, how confident are you doing your home program or daily mobility without supervision—and what would raise that number by 1 point?",
    category: "self-efficacy",
    source: "evidence-synthesis",
    themes: ["fear", "function", "goals"],
    gathers: ["self-efficacy", "goals"],
    clinicalRationale:
      "Self-efficacy predicts adherence and outcomes; small confidence gains are actionable plan targets.",
    priority: 89,
  },
  {
    id: "ev-movement-confidence",
    label: "Movement confidence 0–10",
    question:
      "How confident did you feel moving today (0–10)? What fear or hope is attached to that number?",
    category: "self-efficacy",
    source: "motionrx",
    themes: ["fear", "body", "function"],
    gathers: ["self-efficacy", "fear-avoidance"],
    clinicalRationale: "Single-item confidence ratings track readiness to load and psychological barriers.",
    priority: 84,
  },

  // —— Sleep / stress (modifiers of pain & recovery) ——
  {
    id: "ev-sleep-hours-quality",
    label: "Sleep hours + quality",
    question:
      "About how many hours did you sleep last night, and quality 0–10? Any night pain, racing thoughts, or waking that disrupted sleep?",
    category: "sleep-stress",
    source: "evidence-synthesis",
    themes: ["sleep", "stress"],
    gathers: ["sleep-hours", "sleep-quality"],
    clinicalRationale:
      "Sleep duration/quality are strong modifiers of pain sensitivity, mood, and next-day capacity.",
    priority: 93,
  },
  {
    id: "ev-stress-0-10",
    label: "Stress load 0–10",
    question:
      "On a 0–10 scale, what is your stress load today, what is the main driver, and how does stress change your pain, stiffness, or willingness to move?",
    category: "sleep-stress",
    source: "counselor-common",
    themes: ["stress", "pain", "mood"],
    gathers: ["stress-load", "mood"],
    clinicalRationale:
      "Perceived stress couples with pain amplification and coping load; quantifying it guides pacing advice.",
    priority: 92,
  },
  {
    id: "ev-energy-budget",
    label: "Energy budget %",
    question:
      "If energy were a budget (0–100%), how much do you have left today—and what spent most of it (pain, work, stress, poor sleep, caregiving)?",
    category: "sleep-stress",
    source: "counselor-common",
    themes: ["energy", "stress"],
    gathers: ["energy", "stress-load"],
    clinicalRationale: "Energy accounting supports pacing and prevents boom-bust activity cycles.",
    priority: 78,
  },

  // —— Mood / CBT constructs ——
  {
    id: "ev-mood-0-10",
    label: "Mood 0–10 + body site",
    question:
      "Rate overall mood 0–10 today (0 = worst, 10 = best). What emotion words fit, and where do you feel that emotion in your body?",
    category: "gestalt",
    source: "evidence-synthesis",
    themes: ["mood", "body"],
    gathers: ["mood", "body-map"],
    clinicalRationale:
      "Mood + somatic location supports integrated biopsychosocial tracking without over-pathologizing.",
    priority: 91,
  },
  {
    id: "ev-cbt-fact",
    label: "Is the thought fact-based?",
    question:
      "Name one heavy thought about your pain or day. Is that thought based mainly on clear facts you could show someone, or more on fear, habit, or a story your mind is telling?",
    category: "cbt",
    source: "pdf-guide",
    themes: ["thoughts", "cbt"],
    gathers: ["thought-appraisal"],
    clinicalRationale:
      "CBT-style thought appraisal (fact vs interpretation) is a core evidence-based cognitive skill.",
    priority: 86,
  },
  {
    id: "ev-cbt-goals-feel",
    label: "Does the thought help goals/feelings?",
    question:
      "Does that thought help you move toward your goals, and does it help you feel the way you want to feel? If not, what is a more useful balanced thought?",
    category: "cbt",
    source: "pdf-guide",
    themes: ["cbt", "goals", "mood"],
    gathers: ["thought-appraisal", "goals"],
    clinicalRationale: "Rational-response checks link cognition to behavior and affect regulation.",
    priority: 80,
  },
  {
    id: "ev-self-talk",
    label: "Inner critic vs coach",
    question:
      "What has your inner critic said about your body or progress today—and what would a skilled, kind coach say instead in one sentence?",
    category: "cbt",
    source: "counselor-common",
    themes: ["thoughts", "cbt"],
    gathers: ["thought-appraisal", "strengths"],
    clinicalRationale: "Self-talk patterns influence adherence, fear, and recovery expectations.",
    priority: 76,
  },

  // —— Coping effectiveness ——
  {
    id: "ev-coping-list",
    label: "Coping used + effect",
    question:
      "What did you try to cope today (movement, rest, heat/ice, breath, talking, distraction, meds)? Rate how much each helped 0–10 and for how long.",
    category: "coping",
    source: "counselor-common",
    themes: ["coping"],
    gathers: ["coping-strategy", "coping-effectiveness", "easers"],
    clinicalRationale:
      "Listing strategies with effectiveness turns vague ‘I tried stuff’ into usable self-management data.",
    priority: 95,
  },
  {
    id: "ev-avoidance-cost",
    label: "Avoidance & cost",
    question:
      "What did you avoid today (task, feeling, conversation, exercise)? What short-term relief did it give, and what longer-term cost might it have?",
    category: "coping",
    source: "evidence-synthesis",
    themes: ["coping", "fear"],
    gathers: ["fear-avoidance", "coping-strategy"],
    clinicalRationale:
      "Avoidance can reduce short-term distress while maintaining long-term disability—key exposure target.",
    priority: 87,
  },
  {
    id: "ev-support-used",
    label: "Support used?",
    question:
      "Who or what supported you today (people, pet, nature, faith, tools)? Did you actually use that support, or only know it exists?",
    category: "coping",
    source: "counselor-common",
    themes: ["coping", "relationships"],
    gathers: ["social-support", "coping-strategy"],
    clinicalRationale: "Social support is a protective factor; ‘available vs used’ guides realistic plans.",
    priority: 74,
  },

  // —— Session / plan response ——
  {
    id: "ev-session-response",
    label: "Session response",
    question:
      "If you did a movement session: how hard did it feel (1–5), pain during (0–10), and how do you feel now vs 2 hours later?",
    category: "irritability",
    source: "outpatient-pt",
    themes: ["pain", "function"],
    gathers: ["session-response", "irritability-24h", "pain-nrs-now"],
    clinicalRationale:
      "In-session difficulty + delayed response are primary signals for progress / hold / regress.",
    priority: 94,
  },
  {
    id: "ev-plan-feedback",
    label: "Program too easy/hard?",
    question:
      "Is your current program too easy, about right, or too hard—and which variable is the problem (range, reps, load, duration, or fear)?",
    category: "function",
    source: "outpatient-pt",
    themes: ["function", "goals"],
    gathers: ["session-response", "self-efficacy"],
    clinicalRationale: "Explicit plan feedback prevents silent under- or over-dosing between visits.",
    priority: 85,
  },

  // —— Goals / SFBT (solution-focused, still measurable) ——
  {
    id: "ev-goal-two-weeks",
    label: "2-week functional win",
    question:
      "If only one thing improved in two weeks, what functional win would matter most (e.g. sleep 6 hours, desk 45 min, walk 10 min)? How would you measure it?",
    category: "miracle",
    source: "evidence-synthesis",
    themes: ["goals", "function"],
    gathers: ["goals", "function-psfs"],
    clinicalRationale:
      "Specific, measurable short-horizon goals outperform vague ‘feel better’ targets for adherence.",
    priority: 90,
  },
  {
    id: "ev-miracle-signs",
    label: "Miracle: first signs",
    question:
      "Imagine overnight symptoms eased meaningfully. When you wake up, what is the first small sign it happened—in body, mood, or a daily task?",
    category: "miracle",
    source: "pdf-guide",
    themes: ["goals", "hope"],
    gathers: ["goals", "function-psfs"],
    clinicalRationale:
      "SFBT miracle questions generate concrete behavioral markers for progress without forcing false positivity.",
    priority: 79,
  },
  {
    id: "ev-values-action",
    label: "Value + one action",
    question:
      "What value matters most today (kindness, courage, rest, honesty, steadiness)? Name one small action you took—or could take—that expresses it despite symptoms.",
    category: "values",
    source: "counselor-common",
    themes: ["values", "goals"],
    gathers: ["values", "goals"],
    clinicalRationale:
      "Values-based action (ACT-informed) supports living well with symptoms, not only reducing them.",
    priority: 77,
  },

  // —— Relationships / context ——
  {
    id: "ev-relationships-load",
    label: "Relationship load",
    question:
      "How are key relationships today (supportive, strained, distant)? Do they change your pain, stress, or ability to rest and move?",
    category: "relationships",
    source: "pdf-guide",
    themes: ["relationships", "stress"],
    gathers: ["social-support", "stress-load"],
    clinicalRationale: "Interpersonal context is a known moderator of pain coping and recovery load.",
    priority: 72,
  },
  {
    id: "ev-boundary",
    label: "Boundary needed",
    question:
      "Is there a boundary you need (work, family, training, screens)? What makes setting it hard, and what is the smallest clear ask?",
    category: "relationships",
    source: "counselor-common",
    themes: ["relationships", "needs"],
    gathers: ["coping-strategy", "stress-load"],
    clinicalRationale: "Boundaries reduce allostatic load that often maintains symptom flares.",
    priority: 70,
  },

  // —— Strengths / wins (protective factors) ——
  {
    id: "ev-win-mechanism",
    label: "Win + what helped",
    question:
      "Name one small win today (even surviving a hard hour). What specifically helped—pacing, support, meds, mindset, movement, luck?",
    category: "strengths",
    source: "counselor-common",
    themes: ["wins", "strengths", "coping"],
    gathers: ["strengths", "coping-strategy", "coping-effectiveness"],
    clinicalRationale:
      "Capturing mechanisms behind wins makes success reproducible in the next plan day.",
    priority: 83,
  },
  {
    id: "ev-strengths-used",
    label: "Strengths used",
    question:
      "What personal strengths did you use today (patience, humor, discipline, asking for help)? Give one concrete example.",
    category: "strengths",
    source: "pdf-guide",
    themes: ["strengths"],
    gathers: ["strengths"],
    clinicalRationale: "Strengths-based inquiry builds self-efficacy and balanced clinical narrative.",
    priority: 71,
  },
  {
    id: "ev-self-compassion",
    label: "Friend test",
    question:
      "If a good friend had your exact symptoms and day, what would you say to them—and can you offer yourself any of that in one sentence?",
    category: "strengths",
    source: "counselor-common",
    themes: ["strengths", "coping"],
    gathers: ["thought-appraisal", "strengths"],
    clinicalRationale: "Self-compassion practices associate with lower distress and better coping flexibility.",
    priority: 73,
  },

  // —— Body map / present moment (Gestalt-informed assessment) ——
  {
    id: "ev-body-map-now",
    label: "Body scan now",
    question:
      "Right now: scan jaw, neck, chest, belly, low back, hips, legs. Where is tension, pain, or ease strongest—and intensity 0–10?",
    category: "gestalt",
    source: "pdf-guide",
    themes: ["body", "pain"],
    gathers: ["body-map", "pain-nrs-now"],
    clinicalRationale:
      "Present-moment body mapping gathers localization data and interoceptive awareness for pacing.",
    priority: 88,
  },
  {
    id: "ev-present-thought-urge",
    label: "Thought + urge now",
    question:
      "In this moment, what thought is loudest, what urge do you have (rest, push, withdraw, move), and what would a wise next 10 minutes look like?",
    category: "gestalt",
    source: "evidence-synthesis",
    themes: ["thoughts", "coping"],
    gathers: ["thought-appraisal", "coping-strategy"],
    clinicalRationale: "Linking thought–urge–action is core to behavioral activation and relapse prevention.",
    priority: 75,
  },

  // —— Safety / red flags (screening language) ——
  {
    id: "ev-red-flag-screen",
    label: "Urgent symptoms screen",
    question:
      "Besides the main issue: any new progressive weakness, numbness in the saddle area, bowel/bladder change, fever with severe pain, chest pain, or pain after a major fall that a clinician should hear about urgently?",
    category: "safety",
    source: "outpatient-pt",
    themes: ["safety"],
    gathers: ["red-flags", "safety"],
    clinicalRationale:
      "Standard musculoskeletal red-flag screening language; positive answers warrant licensed evaluation, not app dosing.",
    priority: 96,
  },
  {
    id: "ev-safety-now",
    label: "Safe enough now?",
    question:
      "Do you feel emotionally and physically safe enough right now to rest, move gently, or contact support if needed? If not, what help do you need first?",
    category: "safety",
    source: "counselor-common",
    themes: ["safety", "needs"],
    gathers: ["safety"],
    clinicalRationale: "Safety and stability come before progressive loading or deep emotional work.",
    priority: 95,
  },

  // —— Meds / medical context (documentation, not prescribing) ——
  {
    id: "ev-meds-flare",
    label: "Meds or new advice",
    question:
      "Any medication timing, missed doses, new clinician advice, or medical visits today that should shape how hard you push movement?",
    category: "intake",
    source: "outpatient-pt",
    themes: ["primary"],
    gathers: ["medication-context"],
    clinicalRationale:
      "Medication and medical advice are critical dosing modifiers; the app documents only, never prescribes.",
    priority: 68,
  },

  // —— Pain–mood coupling ——
  {
    id: "ev-pain-mood-link",
    label: "Pain ↔ mood link",
    question:
      "How did pain/stiffness and mood interact today—did pain drive mood, mood drive pain, both, or neither? Give one example with approximate times.",
    category: "body-mind",
    source: "evidence-synthesis",
    themes: ["pain", "mood"],
    gathers: ["pain-nrs-now", "mood"],
    clinicalRationale:
      "Bidirectional pain–mood coupling is well described; examples yield targets for both load and coping.",
    priority: 89,
  },

  // —— PDF-adapted clinical intake ——
  {
    id: "ev-coping-history",
    label: "What worked before",
    question:
      "What have you tried for this problem before (PT, rest, meds, injections, mindfulness, nothing)? What helped ≥50% and what did not?",
    category: "first-session",
    source: "pdf-guide",
    themes: ["coping", "history"],
    gathers: ["coping-strategy", "coping-effectiveness"],
    clinicalRationale: "Treatment history prevents repeating failed strategies and builds on prior response.",
    priority: 81,
  },
  {
    id: "ev-expect-from-plan",
    label: "What you expect",
    question:
      "What do you expect from your home program or from journaling this way in the next month—be specific about function, pain, or confidence?",
    category: "first-session",
    source: "pdf-guide",
    themes: ["goals"],
    gathers: ["goals", "self-efficacy"],
    clinicalRationale: "Expectation alignment improves adherence and reduces frustration with realistic timelines.",
    priority: 74,
  },
];

/** @deprecated alias kept for imports that expect PDF/counselor split */
const FROM_PDF = CLINICAL_EVIDENCE_BANK.filter((q) => q.source === "pdf-guide");
const COUNSELOR_COMMON = CLINICAL_EVIDENCE_BANK.filter(
  (q) => q.source === "counselor-common" || q.source === "evidence-synthesis"
);

/** Curated high-quality bases (clinical evidence-gathering). */
export const ALL_THERAPEUTIC_QUESTIONS: TherapeuticQuestion[] = [...CLINICAL_EVIDENCE_BANK].sort(
  (a, b) => b.priority - a.priority
);

export function getTherapeuticQuestionById(id: string): TherapeuticQuestion | undefined {
  return ALL_THERAPEUTIC_QUESTIONS.find((q) => q.id === id);
}

export function therapeuticQuestionsByCategory(
  category: TherapeuticQuestionCategory
): TherapeuticQuestion[] {
  return ALL_THERAPEUTIC_QUESTIONS.filter((q) => q.category === category);
}

export function therapeuticQuestionsByEvidenceField(field: EvidenceField): TherapeuticQuestion[] {
  return ALL_THERAPEUTIC_QUESTIONS.filter((q) => q.gathers.includes(field));
}

/** Evidence-gathering priority order for journal continuous interview */
export const EVIDENCE_GATHERING_SEQUENCE: EvidenceField[] = [
  "safety",
  "red-flags",
  "chief-complaint",
  "pain-nrs-now",
  "pain-nrs-worst",
  "pain-quality",
  "aggravators",
  "easers",
  "irritability-24h",
  "function-psfs",
  "session-response",
  "fear-avoidance",
  "self-efficacy",
  "sleep-hours",
  "sleep-quality",
  "mood",
  "stress-load",
  "coping-strategy",
  "coping-effectiveness",
  "goals",
  "social-support",
  "strengths",
];

/** Starter chips for journal — high-yield evidence-gathering subset */
export function journalTherapeuticStarters(limit = 12): TherapeuticQuestion[] {
  const prefer = [
    "ev-chief-complaint",
    "ev-pain-nrs-now-worst",
    "ev-aggravators-dose",
    "ev-irritability-24h",
    "ev-psfs-task",
    "ev-easers-duration",
    "ev-sleep-hours-quality",
    "ev-stress-0-10",
    "ev-mood-0-10",
    "ev-coping-list",
    "ev-fear-avoidance",
    "ev-self-efficacy",
    "ev-session-response",
    "ev-goal-two-weeks",
    "ev-pain-mood-link",
    "ev-red-flag-screen",
    "ev-win-mechanism",
    "ev-body-map-now",
  ];
  const picked: TherapeuticQuestion[] = [];
  for (const id of prefer) {
    const q = getTherapeuticQuestionById(id);
    if (q) picked.push(q);
    if (picked.length >= limit) break;
  }
  if (picked.length < limit) {
    for (const q of ALL_THERAPEUTIC_QUESTIONS) {
      if (picked.some((p) => p.id === q.id)) continue;
      picked.push(q);
      if (picked.length >= limit) break;
    }
  }
  return picked.slice(0, limit);
}

export { FROM_PDF, COUNSELOR_COMMON };
