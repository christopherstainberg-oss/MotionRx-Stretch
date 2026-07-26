/**
 * Journal free-text intelligence — same spirit as Describe Your Issue:
 * data-first extraction, labeled assumptions, evidence ledger style live read,
 * and continuous ▸ interview flow with therapeutic / counselor questions.
 *
 * Educational only — not therapy, diagnosis, or crisis care.
 */

import type { BodyPart } from "@/lib/types";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import {
  ALL_THERAPEUTIC_QUESTIONS,
  JOURNAL_SAFETY_NOTE,
  journalTherapeuticStarters,
  type TherapeuticQuestion,
} from "@/data/therapeutic-questions";
import {
  THERAPEUTIC_QUESTION_CAPACITY,
  sampleTherapeuticQuestions,
  therapeuticCatalogStats,
} from "@/data/therapeutic-question-catalog";
import {
  STORY_Q_MARKER,
  appendFlowQuestion,
  isAnswerComplete,
  parseStoryInterviewTurns,
  type ConversationPrompt,
} from "@/lib/assessment-story-conversation";

export { STORY_Q_MARKER, JOURNAL_SAFETY_NOTE };

export type JournalTheme =
  | "primary"
  | "mood"
  | "pain"
  | "body"
  | "sleep"
  | "stress"
  | "coping"
  | "thoughts"
  | "relationships"
  | "goals"
  | "wins"
  | "fear"
  | "strengths"
  | "needs"
  | "safety"
  | "function"
  | "energy";

export type JournalAdaptiveQuestion = {
  id: string;
  label: string;
  question: string;
  category: string;
  theme: JournalTheme | string;
  reason: string;
  priority: number;
  source?: string;
};

export type JournalAssumption = {
  field: string;
  value: string;
  reason: string;
  confidence: "low" | "medium";
};

export type JournalIntelligence = {
  raw: string;
  wordCount: number;
  richness: "empty" | "thin" | "moderate" | "rich" | "clinical";
  completeness: number;
  intelligenceGrade: "empty" | "signal-poor" | "usable" | "strong" | "flight-ready";
  coveredThemes: JournalTheme[];
  missingThemes: JournalTheme[];
  moodWords: string[];
  copingWords: string[];
  painMentioned: boolean;
  painNow?: number;
  stressMentioned: boolean;
  sleepMentioned: boolean;
  winMentioned: boolean;
  fearMentioned: boolean;
  relationshipMentioned: boolean;
  safetyHints: string[];
  regions: BodyPart[];
  assumptions: JournalAssumption[];
  liveReadLines: string[];
  adaptiveQuestions: JournalAdaptiveQuestion[];
  coachSummary: string;
  priorPrompt: {
    heading: string;
    question: string;
    placeholder: string;
    coachLine: string;
  };
};

const ALL_THEMES: JournalTheme[] = [
  "primary",
  "mood",
  "pain",
  "body",
  "sleep",
  "stress",
  "coping",
  "thoughts",
  "relationships",
  "goals",
  "wins",
  "fear",
  "strengths",
  "needs",
  "safety",
  "function",
  "energy",
];

const AREA_MAP: Array<{ re: RegExp; part: BodyPart }> = [
  { re: /\b(low(?:er)?\s*back|lumbar)\b/i, part: "lower-back" },
  { re: /\b(neck|cervical)\b/i, part: "neck" },
  { re: /\b(shoulder)\b/i, part: "shoulders" },
  { re: /\b(hip|hips)\b/i, part: "hips" },
  { re: /\b(knee)\b/i, part: "knee" },
  { re: /\b(ankle|foot)\b/i, part: "ankles" },
  { re: /\b(back)\b/i, part: "lower-back" },
];

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function snip(text: string, max = 80): string {
  const s = text.trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function extractList(text: string, patterns: Array<{ re: RegExp; label: string }>): string[] {
  const out: string[] = [];
  for (const p of patterns) if (p.re.test(text)) out.push(p.label);
  return unique(out);
}

function extractPainNumber(text: string): number | undefined {
  const m =
    text.match(/\b(\d{1,2})\s*(?:\/\s*10|out of\s*10)\b/i) ||
    text.match(/\b(?:pain|hurt|mood|stress|energy)\s*(?:is|at|of|around)?\s*(?:a\s+)?(\d{1,2})\b/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n >= 0 && n <= 10 ? n : undefined;
}

/**
 * Analyze journal free text with Describe-Your-Issue-grade rigor (data first + labeled assumptions).
 */
export function analyzeJournalIntelligence(
  body: string,
  opts?: {
    preferredName?: string;
    title?: string;
    painOverall?: number;
    mood?: number;
    energy?: number;
    sleepQuality?: number;
    areas?: BodyPart[];
  }
): JournalIntelligence {
  const raw = (body || "").trim();
  const name = (opts?.preferredName || "").trim() || "friend";
  const words = raw ? raw.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const t = raw.toLowerCase();

  const moodWords = extractList(raw, [
    { re: /\b(anxious|anxiety|worried|panic)\b/i, label: "anxious" },
    { re: /\b(sad|down|depress|hopeless|empty)\b/i, label: "low-mood" },
    { re: /\b(angry|irritable|frustrated|rage)\b/i, label: "irritable" },
    { re: /\b(numb|flat|disconnected)\b/i, label: "numb" },
    { re: /\b(hopeful|grateful|proud|content|calm|peaceful)\b/i, label: "brighter" },
    { re: /\b(overwhelm|stressed|tense)\b/i, label: "overwhelmed" },
    { re: /\b(lonely|isolated)\b/i, label: "lonely" },
    { re: /\b(guilty|shame|ashamed)\b/i, label: "guilt/shame" },
  ]);

  const copingWords = extractList(raw, [
    { re: /\b(breath|breathe|meditation|mindful)\b/i, label: "breath/mindfulness" },
    { re: /\b(walk|stretch|move|exercise|routine)\b/i, label: "movement" },
    { re: /\b(talked|called|friend|partner|family|support)\b/i, label: "social support" },
    { re: /\b(rest|nap|sleep|early night)\b/i, label: "rest" },
    { re: /\b(journal|wrote|writing)\b/i, label: "journaling" },
    { re: /\b(avoid|doomscroll|scroll|numbed|drank|substance)\b/i, label: "avoidance/numbing" },
    { re: /\b(prayer|faith|church|spiritual)\b/i, label: "spiritual" },
    { re: /\b(pace|pacing|boundary|said no)\b/i, label: "pacing/boundaries" },
  ]);

  const regions = unique<BodyPart>([
    ...(opts?.areas || []),
    ...AREA_MAP.filter((m) => m.re.test(raw)).map((m) => m.part),
  ]);

  const painNow = extractPainNumber(raw) ?? (typeof opts?.painOverall === "number" ? undefined : undefined);
  // Prefer explicit text rating; structured score is separate UI field
  const textPain = extractPainNumber(raw);
  const painMentioned =
    textPain != null ||
    /\b(pain|hurt|ache|sore|stiff|flare)\b/i.test(raw) ||
    typeof opts?.painOverall === "number";
  const stressMentioned = /\b(stress|anxious|overwhelm|pressure|deadline)\b/i.test(raw);
  const sleepMentioned = /\b(sleep|insomnia|nightmare|woke|restless night|tired)\b/i.test(raw);
  const winMentioned = /\b(proud|win|better|grateful|managed|showed up|progress)\b/i.test(raw);
  const fearMentioned = /\b(afraid|fear|scared|avoid|worried it will|terrified)\b/i.test(raw);
  const relationshipMentioned =
    /\b(partner|spouse|family|friend|coworker|kids?|mom|dad|relationship)\b/i.test(raw);

  const safetyHints = extractList(raw, [
    {
      re: /\b(suicid|kill myself|end my life|self[- ]?harm|cut myself|want to die|not worth living)\b/i,
      label: "self-harm / suicide language",
    },
    {
      re: /\b(hurt someone|homicid|violence toward)\b/i,
      label: "harm-to-others language",
    },
    {
      re: /\b(unsafe at home|abuse|being hit|threatened)\b/i,
      label: "safety-at-home language",
    },
  ]);

  const covered: JournalTheme[] = [];
  if (raw.length >= 20 || moodWords.length) covered.push("primary");
  if (moodWords.length || (opts?.mood != null && opts.mood !== 3)) covered.push("mood");
  if (painMentioned) covered.push("pain");
  if (regions.length || /\b(body|tight|tension|breath)\b/i.test(raw)) covered.push("body");
  if (sleepMentioned || (opts?.sleepQuality != null && opts.sleepQuality <= 2)) covered.push("sleep");
  if (stressMentioned) covered.push("stress");
  if (copingWords.length) covered.push("coping");
  if (/\b(thought|think|believe|tell myself|critic)\b/i.test(raw)) covered.push("thoughts");
  if (relationshipMentioned) covered.push("relationships");
  if (/\b(goal|hope|want to|tomorrow|plan to)\b/i.test(raw)) covered.push("goals");
  if (winMentioned) covered.push("wins");
  if (fearMentioned) covered.push("fear");
  if (/\b(strength|resilient|capable|proud of myself)\b/i.test(raw)) covered.push("strengths");
  if (/\b(need|support|help|permission)\b/i.test(raw)) covered.push("needs");
  if (safetyHints.length || /\b(safe|unsafe)\b/i.test(raw)) covered.push("safety");
  if (/\b(stairs|work|walk|dress|desk|task|function)\b/i.test(raw)) covered.push("function");
  if (/\b(energy|exhausted|fatigue|wired)\b/i.test(raw) || opts?.energy != null) covered.push("energy");

  const coveredThemes = unique(covered);
  const missingThemes = ALL_THEMES.filter((th) => !coveredThemes.includes(th));

  let richness: JournalIntelligence["richness"] = "empty";
  if (wordCount === 0) richness = "empty";
  else if (wordCount < 20) richness = "thin";
  else if (wordCount < 60 || coveredThemes.length < 4) richness = "moderate";
  else if (wordCount < 140 || coveredThemes.length < 8) richness = "rich";
  else richness = "clinical";

  const completeness = Math.min(
    100,
    Math.round((coveredThemes.length / ALL_THEMES.length) * 100)
  );
  let intelligenceGrade: JournalIntelligence["intelligenceGrade"] = "empty";
  if (wordCount === 0) intelligenceGrade = "empty";
  else if (completeness < 25) intelligenceGrade = "signal-poor";
  else if (completeness < 50) intelligenceGrade = "usable";
  else if (completeness < 75) intelligenceGrade = "strong";
  else intelligenceGrade = "flight-ready";

  // Labeled assumptions (gap-fill only)
  const assumptions: JournalAssumption[] = [];
  if (wordCount >= 3 && !moodWords.length && opts?.mood != null) {
    assumptions.push({
      field: "mood",
      value: String(opts.mood),
      reason: "Using structured mood score until free-text mood language appears",
      confidence: "medium",
    });
  }
  if (painMentioned && textPain == null && typeof opts?.painOverall === "number") {
    assumptions.push({
      field: "pain",
      value: String(opts.painOverall),
      reason: "Using pain scale score; free text has no explicit 0–10",
      confidence: "medium",
    });
  }
  if (wordCount >= 8 && !copingWords.length) {
    assumptions.push({
      field: "coping",
      value: "unknown",
      reason: "Coping strategies not yet described — interview will ask",
      confidence: "low",
    });
  }

  const liveReadLines = buildJournalLiveRead({
    name,
    richness,
    completeness,
    intelligenceGrade,
    moodWords,
    copingWords,
    painMentioned,
    textPain,
    structuredPain: opts?.painOverall,
    stressMentioned,
    sleepMentioned,
    winMentioned,
    fearMentioned,
    regions,
    safetyHints,
    coveredThemes,
    missingThemes,
    assumptions,
  });

  const adaptiveQuestions = buildJournalAdaptiveQuestions({
    name,
    raw,
    missingThemes,
    coveredThemes,
    moodWords,
    painMentioned,
    stressMentioned,
    sleepMentioned,
    fearMentioned,
    winMentioned,
    safetyHints,
    regions,
  });

  const priorPrompt = buildJournalPriorPrompt({
    name,
    richness,
    adaptiveQuestions,
    primarySnippet: raw.length >= 12 ? snip(raw, 100) : undefined,
  });

  return {
    raw,
    wordCount,
    richness,
    completeness,
    intelligenceGrade,
    coveredThemes,
    missingThemes,
    moodWords,
    copingWords,
    painMentioned,
    painNow: textPain,
    stressMentioned,
    sleepMentioned,
    winMentioned,
    fearMentioned,
    relationshipMentioned,
    safetyHints,
    regions,
    assumptions,
    liveReadLines,
    adaptiveQuestions,
    coachSummary: liveReadLines.slice(0, 3).join(" "),
    priorPrompt,
  };
}

function buildJournalLiveRead(s: {
  name: string;
  richness: JournalIntelligence["richness"];
  completeness: number;
  intelligenceGrade: JournalIntelligence["intelligenceGrade"];
  moodWords: string[];
  copingWords: string[];
  painMentioned: boolean;
  textPain?: number;
  structuredPain?: number;
  stressMentioned: boolean;
  sleepMentioned: boolean;
  winMentioned: boolean;
  fearMentioned: boolean;
  regions: BodyPart[];
  safetyHints: string[];
  coveredThemes: JournalTheme[];
  missingThemes: JournalTheme[];
  assumptions: JournalAssumption[];
}): string[] {
  if (s.richness === "empty") {
    return [
      `${s.name}, the journal is ready—start with what you need someone to understand about today.`,
    ];
  }

  const lines: string[] = [];
  const region =
    s.regions.length > 0
      ? s.regions
          .slice(0, 2)
          .map((r) => BODY_PART_LABELS[r] || r)
          .join(" & ")
      : "whole-person day";

  lines.push(
    `Journal read: ${region}${s.moodWords.length ? ` · mood notes: ${s.moodWords.slice(0, 3).join(", ")}` : ""}${
      s.textPain != null
        ? ` · pain ${s.textPain}/10 stated`
        : s.painMentioned
          ? s.structuredPain != null
            ? ` · pain scale ${s.structuredPain}/10 (structured)`
            : " · pain mentioned"
          : " · pain not detailed"
    }.`
  );
  lines.push(
    `Telemetry: ${s.intelligenceGrade} · completeness ${s.completeness}/100 · themes ${s.coveredThemes.length}/${ALL_THEMES.length} · evidence-first interview.`
  );
  if (s.copingWords.length) {
    lines.push(`Coping you named: ${s.copingWords.slice(0, 4).join(", ")}.`);
  } else {
    lines.push("Coping strategies: not specified yet (will ask).");
  }
  if (s.sleepMentioned) lines.push("Sleep is in today’s story.");
  if (s.stressMentioned) lines.push("Stress language present — dosing & recovery matter.");
  if (s.winMentioned) lines.push("Win/strength language present — protect that.");
  if (s.fearMentioned) lines.push("Fear/avoidance language present — graded exposure may help.");
  if (s.safetyHints.length) {
    lines.push(
      `Safety language detected (${s.safetyHints[0]}). ${JOURNAL_SAFETY_NOTE}`
    );
  }
  if (s.assumptions.length) {
    lines.push(`Assumptions active: ${s.assumptions.length} (data-first; gap-fill only).`);
  }
  lines.push(
    `Still open: ${s.missingThemes.slice(0, 5).join(", ") || "none major"}.`
  );
  return lines.slice(0, 9);
}

function buildJournalPriorPrompt(s: {
  name: string;
  richness: JournalIntelligence["richness"];
  adaptiveQuestions: JournalAdaptiveQuestion[];
  primarySnippet?: string;
}): JournalIntelligence["priorPrompt"] {
  const next = s.adaptiveQuestions[0];
  if (s.richness === "empty") {
    return {
      heading: "Clinical evidence gathering",
      question: `${s.name}, what is the main problem today (where, how long)—and if you know it, pain most of the day and at worst on a 0–10 scale?`,
      placeholder:
        "Chief complaint… pain 0–10 now/worst… what worsens/eases it… hardest daily task… sleep hours… mood 0–10…",
      coachLine:
        "Continuous clinical interview: each ▸ question gathers specific evidence (NRS, function, 24h response, coping). Answer under the line; the next gap-fill question follows.",
    };
  }
  if (s.richness === "thin") {
    return {
      heading: "I’m listening — keep going",
      question: s.primarySnippet
        ? `${s.name}, you wrote “${s.primarySnippet}.” What else matters—mood, body, sleep, or what you need next?`
        : `${s.name}, tell me more about how today feels in your body and mind.`,
      placeholder: "Add feelings, body, sleep, coping, a small win…",
      coachLine: next
        ? `Next I’ll ask: ${next.label}. Your answers reshape Jeffery feedback and plan dosing.`
        : "Your answers reshape Jeffery feedback and plan dosing.",
    };
  }
  return {
    heading: "Your journal is driving the interview",
    question:
      next?.question ||
      `${s.name}, what’s the one honest detail a careful therapist would still want before closing today’s note?`,
    placeholder: "Continue under the ▸ questions…",
    coachLine: `Continuous flow on · signal builds with each answer.`,
  };
}

function buildJournalAdaptiveQuestions(s: {
  name: string;
  raw: string;
  missingThemes: JournalTheme[];
  coveredThemes: JournalTheme[];
  moodWords: string[];
  painMentioned: boolean;
  stressMentioned: boolean;
  sleepMentioned: boolean;
  fearMentioned: boolean;
  winMentioned: boolean;
  safetyHints: string[];
  regions: BodyPart[];
}): JournalAdaptiveQuestion[] {
  const q: JournalAdaptiveQuestion[] = [];
  const push = (item: JournalAdaptiveQuestion) => {
    if (q.some((x) => x.id === item.id)) return;
    if (s.raw.includes(item.question.slice(0, Math.min(36, item.question.length)))) return;
    q.push(item);
  };

  if (s.safetyHints.length) {
    push({
      id: "j-safety",
      label: "Safety first",
      question: `${s.name}, some of your words sound heavy. Are you safe right now, and do you have someone or a crisis line you can contact if you need immediate support?`,
      category: "safety",
      theme: "safety",
      reason: "Safety language detected",
      priority: 100,
      source: "motionrx",
    });
  }

  if (!s.raw || s.raw.length < 24) {
    push({
      id: "j-open",
      label: "What needs understanding?",
      question: `${s.name}, what do you most need someone to understand about today?`,
      category: "intake",
      theme: "primary",
      reason: "Start journal interview",
      priority: 99,
      source: "counselor-common",
    });
  }

  // Map missing themes → clinical evidence-gathering questions
  const themeToCatalog: Array<{ theme: JournalTheme; ids: string[] }> = [
    { theme: "primary", ids: ["ev-chief-complaint", "ev-why-now"] },
    { theme: "pain", ids: ["ev-pain-nrs-now-worst", "ev-pain-quality", "ev-aggravators-dose"] },
    { theme: "body", ids: ["ev-body-map-now", "ev-pain-quality"] },
    { theme: "mood", ids: ["ev-mood-0-10", "ev-pain-mood-link"] },
    { theme: "sleep", ids: ["ev-sleep-hours-quality"] },
    { theme: "stress", ids: ["ev-stress-0-10", "ev-energy-budget"] },
    { theme: "coping", ids: ["ev-coping-list", "ev-avoidance-cost", "ev-support-used"] },
    { theme: "thoughts", ids: ["ev-cbt-fact", "ev-cbt-goals-feel", "ev-self-talk"] },
    { theme: "relationships", ids: ["ev-relationships-load", "ev-boundary"] },
    { theme: "goals", ids: ["ev-goal-two-weeks", "ev-miracle-signs", "ev-values-action"] },
    { theme: "wins", ids: ["ev-win-mechanism", "ev-strengths-used"] },
    { theme: "fear", ids: ["ev-fear-avoidance", "ev-self-efficacy", "ev-movement-confidence"] },
    { theme: "strengths", ids: ["ev-strengths-used", "ev-self-compassion"] },
    { theme: "needs", ids: ["ev-boundary", "ev-safety-now"] },
    { theme: "safety", ids: ["ev-safety-now", "ev-red-flag-screen"] },
    { theme: "function", ids: ["ev-psfs-task", "ev-function-baseline", "ev-session-response"] },
    { theme: "energy", ids: ["ev-energy-budget", "ev-sleep-hours-quality"] },
  ];

  for (const miss of s.missingThemes) {
    const map = themeToCatalog.find((x) => x.theme === miss);
    if (!map) continue;
    for (const id of map.ids) {
      const tq = ALL_THERAPEUTIC_QUESTIONS.find((x) => x.id === id);
      if (!tq) continue;
      push({
        id: `j-${tq.id}`,
        label: tq.label,
        question: tq.question,
        category: tq.category,
        theme: miss,
        reason: `Evidence gap: ${tq.gathers.slice(0, 2).join(", ")} · ${tq.clinicalRationale}`,
        priority: tq.priority,
        source: tq.source,
      });
      break;
    }
  }

  // Deepen when data present — still evidence-gathering
  if (s.moodWords.includes("anxious") || s.moodWords.includes("overwhelmed")) {
    push({
      id: "j-anxiety-body",
      label: "Anxiety body map 0–10",
      question: `You named anxiety/overwhelm. Where is it strongest in your body (0–10), what usually drops it ≥2 points, and how long does that help last?`,
      category: "body-mind",
      theme: "body",
      reason: "Gather body-map + coping effectiveness for anxiety",
      priority: 88,
    });
  }
  if (s.fearMentioned) {
    push({
      id: "j-fear-name",
      label: "Fear-avoidance detail",
      question: `Which movement/task do you guard most, feared harm if you do it, and confidence 0–10 to try a smaller version today?`,
      category: "fear-avoidance",
      theme: "fear",
      reason: "Gather fear-avoidance + self-efficacy for graded exposure",
      priority: 86,
    });
  }
  if (s.winMentioned) {
    push({
      id: "j-protect-win",
      label: "Win mechanism",
      question: `You noted something better. What exactly helped (pacing, load, support, mindset), and what 1 repeatable step protects that tomorrow?`,
      category: "strengths",
      theme: "wins",
      reason: "Gather reproducible mechanism behind wins",
      priority: 70,
    });
  }
  if (s.coveredThemes.length >= 5) {
    push({
      id: "j-miracle",
      label: "Measurable miracle sign",
      question: `If symptoms eased overnight, what is the first measurable sign (desk minutes, walk time, sleep hours, confidence 0–10)—and which 10% piece could you test this week?`,
      category: "miracle",
      theme: "goals",
      reason: "SFBT marker made measurable for tracking",
      priority: 55,
      source: "pdf-guide",
    });
  }
  if (s.painMentioned && !/\b\d{1,2}\s*\/\s*10\b/.test(s.raw)) {
    push({
      id: "j-need-nrs",
      label: "Need pain 0–10",
      question: `You mentioned pain/symptoms but no 0–10 yet. What is pain most of the day and at worst (0–10), and where exactly?`,
      category: "pain-nrs",
      theme: "pain",
      reason: "Pain mentioned without NRS — core evidence gap",
      priority: 97,
      source: "outpatient-pt",
    });
  }

  // Fill from curated bank + multi-million virtual catalog sample
  if (q.length < 6) {
    for (const tq of journalTherapeuticStarters(12)) {
      push({
        id: `j-bank-${tq.id}`,
        label: tq.label,
        question: tq.question,
        category: tq.category,
        theme: tq.themes[0] || "primary",
        reason: "Curated therapeutic bank",
        priority: tq.priority - 5,
        source: tq.source,
      });
      if (q.length >= 8) break;
    }
  }
  if (q.length < 8) {
    const themes = s.missingThemes.slice(0, 4);
    const virtual = sampleTherapeuticQuestions(24, `journal:${s.raw.slice(0, 48)}`, {
      themes: themes.length ? themes : undefined,
      preferCurated: false,
    });
    for (const tq of virtual) {
      push({
        id: `j-virt-${tq.id}`,
        label: tq.label,
        question: tq.question,
        category: tq.category,
        theme: tq.themes[0] || "primary",
        reason: `Virtual catalog (${THERAPEUTIC_QUESTION_CAPACITY.toLocaleString()} editions)`,
        priority: Math.max(30, tq.priority - 10),
        source: tq.source,
      });
      if (q.length >= 10) break;
    }
  }

  return q.sort((a, b) => b.priority - a.priority).slice(0, 10);
}

export type JournalFlowAction =
  | { type: "seed"; prompt: ConversationPrompt }
  | { type: "wait"; currentQuestion: string }
  | { type: "advance"; prompt: ConversationPrompt; bridge: string }
  | { type: "idle" }
  | { type: "done" };

function toPrompt(q: JournalAdaptiveQuestion): ConversationPrompt {
  return {
    id: q.id,
    label: q.label,
    question: q.question,
    category: "bother",
    reason: q.reason,
  };
}

/**
 * Continuous conversation decision for the journal free-text box.
 */
export function decideJournalFlow(ctx: {
  body?: string;
  preferredName?: string;
  title?: string;
  painOverall?: number;
  mood?: number;
  energy?: number;
  sleepQuality?: number;
  areas?: BodyPart[];
}): JournalFlowAction {
  const story = (ctx.body || "").replace(/\r/g, "");
  const trimmed = story.trim();
  const intel = analyzeJournalIntelligence(story, ctx);
  const name = (ctx.preferredName || "").trim() || "friend";
  const turns = parseStoryInterviewTurns(story);
  const nextQ = intel.adaptiveQuestions[0];
  const next = nextQ ? toPrompt(nextQ) : null;

  if (!trimmed) {
    return {
      type: "seed",
      prompt:
        next ||
        ({
          id: "j-seed",
          label: "What needs understanding?",
          question: `${name}, what do you most need someone to understand about today?`,
          category: "bother",
          reason: "Start continuous journal interview",
        } satisfies ConversationPrompt),
    };
  }

  const last = turns[turns.length - 1];
  if (last?.open) {
    return {
      type: "wait",
      currentQuestion: last.question || "Keep writing…",
    };
  }

  if (next) {
    const needle = next.question.slice(0, Math.min(36, next.question.length));
    if (!story.includes(needle)) {
      const lastAns = last?.answer || trimmed.slice(0, 80);
      return {
        type: "advance",
        prompt: next,
        bridge: journalBridge(name, lastAns),
      };
    }
    // Find a fresh adaptive question
    for (const aq of intel.adaptiveQuestions.slice(1)) {
      const p = toPrompt(aq);
      const n2 = p.question.slice(0, Math.min(36, p.question.length));
      if (!story.includes(n2)) {
        return {
          type: "advance",
          prompt: p,
          bridge: journalBridge(name, last?.answer || ""),
        };
      }
    }
    return { type: "done" };
  }

  if (!story.includes(STORY_Q_MARKER) && trimmed.length >= 12) {
    const bank = journalTherapeuticStarters(1)[0];
    if (bank) {
      return {
        type: "advance",
        prompt: {
          id: bank.id,
          label: bank.label,
          question: bank.question,
          category: "bother",
          reason: bank.source,
        },
        bridge: journalBridge(name, trimmed.slice(0, 80)),
      };
    }
  }

  return intel.missingThemes.length ? { type: "idle" } : { type: "done" };
}

function journalBridge(name: string, lastAnswer: string): string {
  const s = snip(lastAnswer, 48);
  if (s) return `${name}, thank you — holding “${s}.” Let’s keep going:`;
  return `${name}, thank you — let’s keep the conversation flowing:`;
}

export function appendJournalFlowQuestion(
  body: string,
  prompt: ConversationPrompt,
  bridge?: string
): string {
  return appendFlowQuestion(body, prompt, bridge);
}

export function journalEndsWithOpenQuestion(body: string): boolean {
  const turns = parseStoryInterviewTurns(body);
  if (!turns.length) return false;
  const last = turns[turns.length - 1]!;
  if (!last.question && !body.includes(STORY_Q_MARKER)) return false;
  return last.open;
}

export function currentOpenJournalQuestion(body: string): string | null {
  const turns = parseStoryInterviewTurns(body);
  const last = turns[turns.length - 1];
  if (last?.open && last.question) return last.question;
  return null;
}

export function countCompletedJournalTurns(body: string): number {
  return parseStoryInterviewTurns(body).filter((t) => !t.open && (t.answer || t.question)).length;
}

export function journalAdaptiveAsPrompts(intel: JournalIntelligence): ConversationPrompt[] {
  return intel.adaptiveQuestions.map(toPrompt);
}

/** Therapeutic chip starters for UI — curated + diverse virtual sample */
export function journalQuestionBankChips(limit = 14): TherapeuticQuestion[] {
  const curated = journalTherapeuticStarters(Math.min(10, limit));
  if (curated.length >= limit) return curated.slice(0, limit);
  const virtual = sampleTherapeuticQuestions(limit, "chips", { preferCurated: false });
  const out = [...curated];
  for (const q of virtual) {
    if (out.some((x) => x.id === q.id || x.question === q.question)) continue;
    out.push(q);
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

/** Catalog capacity for UI / tests */
export function journalTherapeuticCatalogInfo() {
  return therapeuticCatalogStats();
}

// Re-export completeness helper used by tests
export { isAnswerComplete };
