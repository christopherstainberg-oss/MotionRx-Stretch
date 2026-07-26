/**
 * Jeffery conversation intelligence — Describe Your Issue–grade analysis
 * for the chat coach: evidence-style live read, adaptive follow-ups,
 * therapeutic catalog sampling, and continuous flow decisions.
 *
 * Educational only — not diagnosis, therapy, or crisis care.
 */

import type { BodyPart, JefferyMessage, JefferyThread } from "@/lib/types";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import {
  analyzeStoryIntelligence,
  type StoryIntelligence,
} from "@/lib/story-intelligence";
import {
  analyzeJournalIntelligence,
  type JournalIntelligence,
} from "@/lib/journal-intelligence";
import {
  sampleTherapeuticQuestions,
  THERAPEUTIC_QUESTION_CAPACITY,
} from "@/data/therapeutic-question-catalog";
import { JOURNAL_SAFETY_NOTE } from "@/data/therapeutic-questions";

export type JefferyTheme =
  | "primary"
  | "pain"
  | "function"
  | "aggravators"
  | "activity-response"
  | "mood"
  | "sleep"
  | "stress"
  | "goals"
  | "fear"
  | "plan-feedback"
  | "safety";

export type JefferyAdaptivePrompt = {
  id: string;
  label: string;
  question: string;
  category: string;
  theme: JefferyTheme | string;
  reason: string;
  priority: number;
};

export type JefferyIntelligence = {
  transcript: string;
  turnCount: number;
  userTurnCount: number;
  richness: "empty" | "thin" | "moderate" | "rich" | "clinical";
  completeness: number;
  intelligenceGrade: "empty" | "signal-poor" | "usable" | "strong" | "flight-ready";
  coveredThemes: JefferyTheme[];
  missingThemes: JefferyTheme[];
  story: StoryIntelligence;
  journal: JournalIntelligence;
  painNow?: number;
  regions: BodyPart[];
  planFeedback: "too-hard" | "too-easy" | "flare" | "progress" | "unknown";
  safetyHints: string[];
  liveReadLines: string[];
  adaptiveQuestions: JefferyAdaptivePrompt[];
  coachSummary: string;
  priorPrompt: {
    heading: string;
    question: string;
    coachLine: string;
  };
  nextOpenQuestion: string | null;
  continuousFlowHint: string;
};

const ALL_THEMES: JefferyTheme[] = [
  "primary",
  "pain",
  "function",
  "aggravators",
  "activity-response",
  "mood",
  "sleep",
  "stress",
  "goals",
  "fear",
  "plan-feedback",
  "safety",
];

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function snip(text: string, max = 90): string {
  const s = text.trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Flatten chat + assessment story into one clinical narrative for engines */
export function buildJefferyTranscript(
  messages: JefferyMessage[],
  opts?: { assessmentStory?: string; journalBridge?: string }
): string {
  const chat = messages
    .filter((m) => m.role === "user" || m.role === "jeffery")
    .map((m) => {
      const who = m.role === "user" ? "User" : "Jeffery";
      return `${who}: ${m.content}`;
    })
    .join("\n\n");
  const parts = [
    opts?.assessmentStory ? `Assessment story:\n${opts.assessmentStory}` : "",
    opts?.journalBridge ? `Journal bridge:\n${opts.journalBridge}` : "",
    chat,
  ].filter(Boolean);
  return parts.join("\n\n").trim();
}

function detectPlanFeedback(text: string): JefferyIntelligence["planFeedback"] {
  if (/too hard|flare|worse|irritat|overdid|can't finish|cannot finish/i.test(text)) {
    return /flare|worse|irritat|overdid/i.test(text) ? "flare" : "too-hard";
  }
  if (/too easy|progress|stronger|more challenge|ready for more/i.test(text)) return "progress";
  if (/easier|scale back|modify|tone down/i.test(text)) return "too-hard";
  return "unknown";
}

/**
 * Full Jeffery conversation intelligence snapshot.
 */
export function analyzeJefferyIntelligence(
  messages: JefferyMessage[],
  opts?: {
    preferredName?: string;
    assessmentStory?: string;
    journalBridge?: string;
    areas?: BodyPart[];
    painOverall?: number;
    mood?: number;
  }
): JefferyIntelligence {
  const name = (opts?.preferredName || "").trim() || "friend";
  const transcript = buildJefferyTranscript(messages, {
    assessmentStory: opts?.assessmentStory,
    journalBridge: opts?.journalBridge,
  });
  const userTurns = messages.filter((m) => m.role === "user");
  const userBlob = userTurns.map((m) => m.content).join("\n");
  const lastUser = userTurns[userTurns.length - 1]?.content || "";
  const lastJeffery = [...messages].reverse().find((m) => m.role === "jeffery");

  const story = analyzeStoryIntelligence(
    [opts?.assessmentStory, userBlob].filter(Boolean).join("\n\n"),
    {
      preferredName: name,
      areas: opts?.areas,
    }
  );

  const journal = analyzeJournalIntelligence(userBlob || opts?.journalBridge || "", {
    preferredName: name,
    painOverall: opts?.painOverall ?? story.painNow,
    mood: opts?.mood,
    areas: opts?.areas || story.regions,
  });

  const planFeedback = detectPlanFeedback(userBlob);
  const painNow = story.painNow ?? journal.painNow;
  const regions = unique<BodyPart>([...story.regions, ...journal.regions]);
  const safetyHints = unique([
    ...story.redFlagHints,
    ...journal.safetyHints,
  ]);

  const covered: JefferyTheme[] = [];
  if (userBlob.length >= 20 || story.wordCount >= 12) covered.push("primary");
  if (painNow != null || story.coveredThemes.includes("pain-intensity") || journal.painMentioned) {
    covered.push("pain");
  }
  if (story.functionalLimits.length || journal.coveredThemes.includes("function")) {
    covered.push("function");
  }
  if (story.aggravators.length) covered.push("aggravators");
  if (story.activityResponse !== "unknown") covered.push("activity-response");
  if (journal.moodWords.length || journal.coveredThemes.includes("mood")) covered.push("mood");
  if (journal.sleepMentioned || story.sleepImpact) covered.push("sleep");
  if (journal.stressMentioned || story.stressImpact) covered.push("stress");
  if (story.goals.length || journal.coveredThemes.includes("goals")) covered.push("goals");
  if (story.fearAvoidance || journal.fearMentioned) covered.push("fear");
  if (planFeedback !== "unknown") covered.push("plan-feedback");
  if (safetyHints.length) covered.push("safety");

  const coveredThemes = unique(covered);
  const missingThemes = ALL_THEMES.filter((t) => !coveredThemes.includes(t));

  let richness: JefferyIntelligence["richness"] = "empty";
  const words = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;
  if (userTurns.length === 0) richness = "empty";
  else if (words < 40 || userTurns.length < 2) richness = "thin";
  else if (words < 120 || coveredThemes.length < 4) richness = "moderate";
  else if (words < 280 || coveredThemes.length < 7) richness = "rich";
  else richness = "clinical";

  const completeness = Math.min(
    100,
    Math.round((coveredThemes.length / ALL_THEMES.length) * 85 + Math.min(15, userTurns.length * 3))
  );

  let intelligenceGrade: JefferyIntelligence["intelligenceGrade"] = "empty";
  if (userTurns.length === 0) intelligenceGrade = "empty";
  else if (completeness < 25) intelligenceGrade = "signal-poor";
  else if (completeness < 50) intelligenceGrade = "usable";
  else if (completeness < 75) intelligenceGrade = "strong";
  else intelligenceGrade = "flight-ready";

  const adaptiveQuestions = buildJefferyAdaptive({
    name,
    missingThemes,
    coveredThemes,
    story,
    journal,
    planFeedback,
    lastUser,
    safetyHints,
    regions,
  });

  const liveReadLines = buildJefferyLiveRead({
    name,
    richness,
    completeness,
    intelligenceGrade,
    story,
    journal,
    painNow,
    regions,
    planFeedback,
    safetyHints,
    coveredThemes,
    missingThemes,
    userTurnCount: userTurns.length,
  });

  const nextOpenQuestion =
    adaptiveQuestions[0]?.question ||
    extractTrailingQuestion(lastJeffery?.content || "") ||
    null;

  const priorPrompt = {
    heading:
      userTurns.length === 0
        ? "What’s bothering you?"
        : richness === "thin"
          ? "I’m listening — keep going"
          : "Your conversation is driving care",
    question:
      nextOpenQuestion ||
      `${name}, what is bothering you most right now—and how does it show up in your day?`,
    coachLine:
      userTurns.length === 0
        ? "Continuous flow is on: answer below, then I’ll keep the clinical interview moving."
        : `Signal ${intelligenceGrade} (${completeness}/100) · next gap: ${missingThemes[0] || "none major"}.`,
  };

  return {
    transcript,
    turnCount: messages.length,
    userTurnCount: userTurns.length,
    richness,
    completeness,
    intelligenceGrade,
    coveredThemes,
    missingThemes,
    story,
    journal,
    painNow,
    regions,
    planFeedback,
    safetyHints,
    liveReadLines,
    adaptiveQuestions,
    coachSummary: liveReadLines.slice(0, 3).join(" "),
    priorPrompt,
    nextOpenQuestion,
    continuousFlowHint:
      userTurns.length === 0
        ? "Start with what bothers you — I’ll follow up like a careful outpatient eval."
        : nextOpenQuestion
          ? `Continue: ${snip(nextOpenQuestion, 100)}`
          : "Themes look solid — ask about plan dosing, sleep, or a functional goal.",
  };
}

function extractTrailingQuestion(content: string): string | null {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (line.includes("?") && line.length > 12 && line.length < 280) {
      return line.replace(/^\*+\s*Question for you:\*+\s*/i, "").replace(/\*+/g, "").trim();
    }
  }
  return null;
}

function buildJefferyLiveRead(s: {
  name: string;
  richness: JefferyIntelligence["richness"];
  completeness: number;
  intelligenceGrade: JefferyIntelligence["intelligenceGrade"];
  story: StoryIntelligence;
  journal: JournalIntelligence;
  painNow?: number;
  regions: BodyPart[];
  planFeedback: JefferyIntelligence["planFeedback"];
  safetyHints: string[];
  coveredThemes: JefferyTheme[];
  missingThemes: JefferyTheme[];
  userTurnCount: number;
}): string[] {
  if (s.richness === "empty") {
    return [
      `${s.name}, I’m ready — tell me what bothers you, pain 0–10 if you know it, and what you want back.`,
    ];
  }

  const region =
    s.regions.length > 0
      ? s.regions
          .slice(0, 2)
          .map((r) => BODY_PART_LABELS[r] || r)
          .join(" & ")
      : "your concerns";

  const lines: string[] = [];
  lines.push(
    `Jeffery read: ${region}${s.story.laterality !== "unknown" ? ` · ${s.story.laterality}` : ""}${
      s.story.sensory.length ? ` · ${s.story.sensory.slice(0, 3).join(", ")}` : ""
    }${
      s.painNow != null
        ? ` · pain ${s.painNow}/10 stated`
        : " · pain 0–10 not stated in chat"
    }.`
  );
  lines.push(
    `Telemetry: ${s.intelligenceGrade} · ${s.completeness}/100 · ${s.userTurnCount} user turns · irritability ${
      s.story.irritability
    }${s.story.irritabilitySource === "assumed" ? " (assumed)" : ""}.`
  );
  if (s.story.aggravators.length) {
    lines.push(`Stated aggravators: ${s.story.aggravators.slice(0, 4).join(", ")}.`);
  } else if (s.story.assumedAggravators?.length) {
    lines.push(
      `Assumed context (not confirmed causes): ${s.story.assumedAggravators.slice(0, 3).join(", ")}.`
    );
  }
  if (s.journal.moodWords.length) {
    lines.push(`Mood language: ${s.journal.moodWords.slice(0, 3).join(", ")}.`);
  }
  if (s.journal.copingWords.length) {
    lines.push(`Coping named: ${s.journal.copingWords.slice(0, 3).join(", ")}.`);
  }
  if (s.planFeedback !== "unknown") {
    lines.push(`Plan feedback signal: ${s.planFeedback}.`);
  }
  if (s.story.activityResponse !== "unknown") {
    lines.push(`After-activity response: ${s.story.activityResponse}.`);
  }
  if (s.safetyHints.length) {
    lines.push(`Safety language: ${s.safetyHints[0]}. ${JOURNAL_SAFETY_NOTE}`);
  }
  lines.push(
    `Still open: ${s.missingThemes.slice(0, 5).join(", ") || "none major"}.`
  );
  return lines.slice(0, 9);
}

function buildJefferyAdaptive(s: {
  name: string;
  missingThemes: JefferyTheme[];
  coveredThemes: JefferyTheme[];
  story: StoryIntelligence;
  journal: JournalIntelligence;
  planFeedback: JefferyIntelligence["planFeedback"];
  lastUser: string;
  safetyHints: string[];
  regions: BodyPart[];
}): JefferyAdaptivePrompt[] {
  const q: JefferyAdaptivePrompt[] = [];
  const region =
    s.regions.length > 0
      ? s.regions
          .slice(0, 2)
          .map((r) => BODY_PART_LABELS[r] || r)
          .join(" and ")
      : "what bothers you";

  const push = (item: JefferyAdaptivePrompt) => {
    if (q.some((x) => x.id === item.id)) return;
    if (s.lastUser.includes(item.question.slice(0, Math.min(32, item.question.length)))) return;
    q.push(item);
  };

  if (s.safetyHints.length) {
    push({
      id: "jf-safety",
      label: "Safety check",
      question: `${s.name}, some of your words sound heavy. Are you safe right now, and do you have urgent medical or crisis support if you need it?`,
      category: "safety",
      theme: "safety",
      reason: "Safety / red-flag language",
      priority: 100,
    });
  }

  if (!s.coveredThemes.includes("primary")) {
    push({
      id: "jf-primary",
      label: "What’s bothering you?",
      question: `${s.name}, what is bothering you most right now—and how does it show up from morning to night?`,
      category: "bother",
      theme: "primary",
      reason: "Start clinical interview",
      priority: 98,
    });
  }

  if (!s.coveredThemes.includes("pain")) {
    push({
      id: "jf-pain",
      label: "Pain 0–10",
      question: `On a 0–10 scale, where does ${region} sit most of the day, and where does it go at its worst?`,
      category: "irritability",
      theme: "pain",
      reason: "No pain number yet",
      priority: 92,
    });
  }

  if (!s.coveredThemes.includes("aggravators")) {
    push({
      id: "jf-agg",
      label: "What makes it worse?",
      question: `What positions, actions, or activities reliably make ${region} worse—and how quickly does it build?`,
      category: "irritability",
      theme: "aggravators",
      reason: "Need causal load map",
      priority: 94,
    });
  }

  if (!s.coveredThemes.includes("activity-response")) {
    push({
      id: "jf-after",
      label: "After activity?",
      question: `After you move, stretch, or do chores, do you feel better, the same, or more irritated later (especially 2–24 hours after)?`,
      category: "irritability",
      theme: "activity-response",
      reason: "24h response drives dosing",
      priority: 93,
    });
  }

  if (!s.coveredThemes.includes("function")) {
    push({
      id: "jf-function",
      label: "Hardest daily task?",
      question: `Which everyday task is hardest because of this—and what about that task feels limited?`,
      category: "function",
      theme: "function",
      reason: "Need functional anchor",
      priority: 88,
    });
  }

  if (!s.coveredThemes.includes("plan-feedback") && s.coveredThemes.includes("primary")) {
    push({
      id: "jf-plan",
      label: "How is the program feeling?",
      question: `Is your current program too easy, about right, or too hard—and how does pain behave during and after sessions?`,
      category: "plan",
      theme: "plan-feedback",
      reason: "Plan dosing feedback gap",
      priority: 86,
    });
  }

  if (!s.coveredThemes.includes("sleep") && s.coveredThemes.length >= 2) {
    push({
      id: "jf-sleep",
      label: "Sleep link?",
      question: `How was sleep last night, and do you notice ${region} changing when you’re tired?`,
      category: "function",
      theme: "sleep",
      reason: "Sleep not covered",
      priority: 72,
    });
  }

  if (!s.coveredThemes.includes("mood") && s.coveredThemes.length >= 2) {
    push({
      id: "jf-mood",
      label: "Mood & stress?",
      question: `How are mood and stress today—and do they change your pain, stiffness, or willingness to move?`,
      category: "feelings",
      theme: "mood",
      reason: "Mood/stress gap",
      priority: 74,
    });
  }

  if (!s.coveredThemes.includes("goals")) {
    push({
      id: "jf-goal",
      label: "2-week win?",
      question: `If we only improved one thing in the next two weeks, what would feel like a real win?`,
      category: "goals",
      theme: "goals",
      reason: "Goal not stated",
      priority: 80,
    });
  }

  if (!s.coveredThemes.includes("fear") && (s.story.irritability === "high" || s.planFeedback === "flare")) {
    push({
      id: "jf-fear",
      label: "Any guarding?",
      question: `Are there moves you guard against or avoid because you’re worried they’ll set you back?`,
      category: "behavior",
      theme: "fear",
      reason: "High irritability / flare without fear map",
      priority: 78,
    });
  }

  // Deepen stated data
  if (s.story.aggravators.includes("sitting/desk")) {
    push({
      id: "jf-sit-dose",
      label: "Sitting tolerance?",
      question: `About how many minutes of sitting before symptoms build, and does standing or walking settle them?`,
      category: "irritability",
      theme: "aggravators",
      reason: "Sitting/desk stated",
      priority: 90,
    });
  }

  if (s.planFeedback === "too-hard" || s.planFeedback === "flare") {
    push({
      id: "jf-modify",
      label: "What to ease?",
      question: `Which part of the program feels hardest—range, reps, load, or duration—and what would a 30% easier version look like?`,
      category: "plan",
      theme: "plan-feedback",
      reason: "Program aggravation language",
      priority: 91,
    });
  }

  if (s.planFeedback === "progress" || s.planFeedback === "too-easy") {
    push({
      id: "jf-progress-one",
      label: "One variable to progress?",
      question: `If we progress only one variable next (reps, hold time, or one harder variation), which would help most?`,
      category: "plan",
      theme: "plan-feedback",
      reason: "Readiness to progress",
      priority: 89,
    });
  }

  // Therapeutic virtual catalog fill
  if (q.length < 6) {
    const themes = s.missingThemes.slice(0, 4).map(String);
    const sample = sampleTherapeuticQuestions(20, `jeffery:${s.lastUser.slice(0, 40)}`, {
      themes: themes.length ? themes : undefined,
      preferCurated: true,
    });
    for (const tq of sample) {
      push({
        id: `jf-tq-${tq.id}`,
        label: tq.label,
        question: tq.question,
        category: tq.category,
        theme: tq.themes[0] || "primary",
        reason: `Therapeutic catalog (${THERAPEUTIC_QUESTION_CAPACITY.toLocaleString()} editions)`,
        priority: Math.max(40, tq.priority - 15),
      });
      if (q.length >= 10) break;
    }
  }

  // Prefer story adaptive when available
  for (const aq of s.story.adaptiveQuestions.slice(0, 4)) {
    push({
      id: `jf-story-${aq.id}`,
      label: aq.label,
      question: aq.question,
      category: aq.category,
      theme: aq.theme,
      reason: aq.reason,
      priority: aq.priority - 5,
    });
  }

  return q.sort((a, b) => b.priority - a.priority).slice(0, 10);
}

export type JefferyFlowAction =
  | { type: "seed"; prompt: JefferyAdaptivePrompt }
  | { type: "wait"; currentQuestion: string }
  | { type: "advance"; prompt: JefferyAdaptivePrompt; bridge: string }
  | { type: "idle" }
  | { type: "done" };

/**
 * Continuous flow for Jeffery chat:
 * - seed: empty thread → opening question
 * - wait: Jeffery just asked; user hasn't answered
 * - advance: user answered → next high-value prompt (chips / auto-fill input)
 */
export function decideJefferyFlow(
  messages: JefferyMessage[],
  intel?: JefferyIntelligence
): JefferyFlowAction {
  const analysis =
    intel ||
    analyzeJefferyIntelligence(messages, {});
  const users = messages.filter((m) => m.role === "user");
  const last = messages[messages.length - 1];

  if (users.length === 0) {
    const p = analysis.adaptiveQuestions[0] || {
      id: "jf-seed",
      label: "What’s bothering you?",
      question: analysis.priorPrompt.question,
      category: "bother",
      theme: "primary",
      reason: "Start continuous interview",
      priority: 100,
    };
    return { type: "seed", prompt: p };
  }

  // If last message is Jeffery with a question, wait for user
  if (last?.role === "jeffery") {
    const q = extractTrailingQuestion(last.content) || analysis.nextOpenQuestion;
    if (q) return { type: "wait", currentQuestion: q };
  }

  // User just spoke — advance to next gap question
  if (last?.role === "user") {
    const next = analysis.adaptiveQuestions[0];
    if (next) {
      return {
        type: "advance",
        prompt: next,
        bridge: jefferyBridge(analysis, last.content),
      };
    }
    return analysis.missingThemes.length ? { type: "idle" } : { type: "done" };
  }

  return { type: "idle" };
}

/**
 * After the user replies, only surface the next question — no “holding …” bridge text.
 */
function jefferyBridge(_intel: JefferyIntelligence, _lastAnswer: string): string {
  return "";
}

/** Enrich local Jeffery reply content with intelligence telemetry + better follow-up */
export function enrichJefferyLocalContent(
  baseContent: string,
  intel: JefferyIntelligence,
  preferredName?: string
): { content: string; openEndedQuestion: string } {
  const name = (preferredName || "").trim() || "friend";
  const next =
    intel.adaptiveQuestions[0]?.question ||
    extractTrailingQuestion(baseContent) ||
    `${name}, what else should I know before we lock today’s dosing?`;

  // Replace random trailing question with intelligence-driven one when present
  let content = baseContent;
  if (/\*\*Question for you:\*\*/i.test(content)) {
    content = content.replace(
      /\*\*Question for you:\*\*[^\n]*/i,
      `**Question for you:** ${next}`
    );
  } else if (!content.trim().endsWith("?")) {
    content = `${content.trim()}\n\n**Question for you:** ${next}`;
  }

  // Inject compact live read if not already dense
  if (intel.userTurnCount >= 1 && intel.liveReadLines.length) {
    const block = [
      ``,
      `**Live clinical read (data-first):**`,
      ...intel.liveReadLines.slice(0, 4).map((l) => `• ${l}`),
    ].join("\n");
    if (!content.includes("Live clinical read")) {
      content = content.replace(
        /\*\*Clinical education:\*\*/i,
        `${block}\n\n**Clinical education:**`
      );
      if (!content.includes("Live clinical read")) {
        content = `${content.trim()}\n${block}`;
      }
    }
  }

  return { content, openEndedQuestion: next };
}

export function countJefferyUserTurns(messages: JefferyMessage[]): number {
  return messages.filter((m) => m.role === "user").length;
}

export type { JefferyThread };
