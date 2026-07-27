/**
 * Friendly, medically specific Assessment Story conversation engine.
 * Open-ended PT-style intake questions tailored to what bothers the user.
 * Prior prompt + auto-appearing questions for the Describe Your Issue free-text box.
 * Educational only — not diagnosis or licensed care.
 */

import type { BodyPart } from "@/lib/types";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import { getConditionById } from "@/data/clinical-conditions";
import { getDescriptorById } from "@/data/pain-descriptors";
import type { SexSelection } from "@/lib/clinical-history";
import { sexLabel } from "@/lib/clinical-history";
import type { AssessmentCoachContext } from "@/lib/assessment-coach";
import {
  analyzeStoryIntelligence,
  type AdaptiveStoryQuestion,
  type StoryIntelligence,
} from "@/lib/story-intelligence";

/** Local name helper — avoid circular import with assessment-coach */
function displayPreferredName(preferredName?: string | null): string {
  const p = (preferredName || "").trim();
  if (p) return p;
  return "friend";
}

export type ConversationPrompt = {
  id: string;
  /** Short chip label */
  label: string;
  /** Full open-ended question shown when selected / asked */
  question: string;
  category: "bother" | "behavior" | "irritability" | "function" | "history" | "goals" | "safety";
  /** Why this question appeared (answer-adaptive) */
  reason?: string;
};

/** Opening prior prompt for the free-text “Describe your issue” box */
export type StoryPriorPrompt = {
  id: string;
  /** Short heading above the box */
  heading: string;
  /** Full open-ended interview question */
  question: string;
  /** Shorter placeholder inside the textarea */
  placeholder: string;
  /** One-line coach tone */
  coachLine: string;
};

/** Marker prefix when a guided question is written into the free-text story */
export const STORY_Q_MARKER = "▸";

/** One interview turn: guided question + optional user answer text */
export type StoryInterviewTurn = {
  question: string;
  answer: string;
  open: boolean;
};

function areaPhrase(areas: BodyPart[]): string {
  if (!areas.length) return "what is bothering you";
  const labels = areas.slice(0, 2).map((a) => BODY_PART_LABELS[a] || a);
  if (labels.length === 1) return `your ${labels[0]}`;
  return `your ${labels.join(" and ")}`;
}

function storySnippet(story: string, max = 90): string {
  const s = story.trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/**
 * Parse free-text into interview turns (▸ question + following answer lines).
 * Free narrative before the first ▸ is a synthetic “opening” turn.
 */
export function parseStoryInterviewTurns(story: string): StoryInterviewTurn[] {
  const raw = (story || "").replace(/\r/g, "");
  if (!raw.trim()) return [];

  const parts = raw.split(new RegExp(`(?=\\n?\\s*${escapeRegExp(STORY_Q_MARKER)}\\s)`));
  const turns: StoryInterviewTurn[] = [];

  for (const part of parts) {
    const chunk = part.trim();
    if (!chunk) continue;

    if (chunk.startsWith(STORY_Q_MARKER)) {
      const lines = chunk.split("\n");
      const qLine = (lines[0] || "").replace(new RegExp(`^\\s*${escapeRegExp(STORY_Q_MARKER)}\\s*`), "").trim();
      const answer = lines
        .slice(1)
        .join("\n")
        .trim();
      turns.push({
        question: qLine,
        answer,
        open: !isAnswerComplete(answer),
      });
    } else {
      // Opening free narrative (no marker yet)
      turns.push({
        question: "",
        answer: chunk,
        open: !isAnswerComplete(chunk),
      });
    }
  }
  return turns;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * User can skip an interview question by typing "Skip" (case-insensitive).
 * Also accepts a few common pass variants so continuous flow can advance.
 */
export function isSkipAnswer(answer: string): boolean {
  const a = (answer || "").trim().toLowerCase();
  if (!a) return false;
  // Whole-line skip only (not "I skip steps" mid-sentence)
  if (/^skip[.!?…]*$/i.test(a)) return true;
  if (
    /^(skip (this|question|it|for now)|pass|n\/a|n\.a\.|na|no answer|prefer not to say)[.!?…]*$/i.test(
      a
    )
  ) {
    return true;
  }
  return false;
}

/** Enough substance to treat a reply as a finished turn and advance the interview. */
export function isAnswerComplete(answer: string): boolean {
  const a = (answer || "").trim();
  if (!a) return false;
  // Explicit skip advances immediately
  if (isSkipAnswer(a)) return true;
  // Very short ack still counts if multi-word or has meaningful tokens
  const words = a.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return true;
  if (words.length === 1 && words[0]!.length >= 4) return true;
  // Single short token — wait
  return a.length >= 12;
}

/**
 * Continuous-flow decision for the free-text box.
 * - seed: empty box should get opening question
 * - wait: open question awaiting answer
 * - advance: last answer complete → append next Q
 * - done: no more questions
 */
export type StoryFlowAction =
  | { type: "seed"; prompt: ConversationPrompt }
  | { type: "wait"; currentQuestion: string }
  | { type: "advance"; prompt: ConversationPrompt; bridge: string }
  | { type: "idle" }
  | { type: "done" };

export function decideStoryFlow(ctx: {
  paragraph?: string;
  areas?: BodyPart[];
  preferredName?: string;
  sex?: SexSelection | null;
  pastMedicalHistory?: string;
  currentMedicalHistory?: string;
  descriptorIds?: string[];
  conditionIds?: string[];
  goals?: string[];
}): StoryFlowAction {
  const story = (ctx.paragraph || "").replace(/\r/g, "");
  const trimmed = story.trim();
  const turns = parseStoryInterviewTurns(story);
  const next = nextStoryBoxQuestion(ctx);
  const name = displayPreferredName(ctx.preferredName);

  // Empty → seed opening question so conversation starts immediately
  if (!trimmed) {
    const open =
      next ||
      ({
        id: "flow-open",
        label: "What’s bothering you?",
        question: `${name}, what is bothering you most right now—and how does it show up in a typical day?`,
        category: "bother" as const,
        reason: "Start continuous interview",
      } satisfies ConversationPrompt);
    return { type: "seed", prompt: open };
  }

  const last = turns[turns.length - 1];
  if (last?.open) {
    return {
      type: "wait",
      currentQuestion: last.question || "Keep writing…",
    };
  }

  // Has content, last turn complete — advance if we have a new Q not already present
  if (next) {
    const needle = next.question.slice(0, Math.min(36, next.question.length));
    if (story.includes(needle)) {
      // Next Q already in box but maybe answered — try second in list
      const more = selectAutoAppearingQuestions(ctx, 4);
      const fresh = more.find((p) => !story.includes(p.question.slice(0, Math.min(36, p.question.length))));
      if (fresh) {
        return {
          type: "advance",
          prompt: fresh,
          bridge: continuousBridge(name, last?.answer || ""),
        };
      }
      return { type: "done" };
    }
    return {
      type: "advance",
      prompt: next,
      bridge: continuousBridge(name, last?.answer || ""),
    };
  }

  // Free text without markers and no adaptive Q — still keep flow with catalog
  if (!story.includes(STORY_Q_MARKER) && trimmed.length >= 12) {
    const catalog = selectAutoAppearingQuestions(ctx, 3);
    if (catalog[0]) {
      return {
        type: "advance",
        prompt: catalog[0],
        bridge: continuousBridge(name, trimmed.slice(0, 80)),
      };
    }
  }

  return next ? { type: "idle" } : { type: "done" };
}

/**
 * After the user replies, do not inject “thanks — holding …” filler.
 * Continuous flow should only append the next ▸ question.
 * Bridge kept as "" so Skip and normal answers both advance cleanly.
 */
function continuousBridge(_name: string, _lastAnswer: string): string {
  return "";
}

/**
 * Append the next guided question (with optional bridge) for continuous conversation.
 */
export function appendFlowQuestion(
  story: string,
  prompt: ConversationPrompt,
  bridge?: string
): string {
  const needle = prompt.question.slice(0, Math.min(40, prompt.question.length));
  if (story.includes(needle)) return story;
  const base = story.trimEnd();
  const bridgeLine = bridge ? `\n\n${bridge}` : "";
  const block = formatQuestionForStoryBox(prompt);
  if (!base) return `${bridgeLine}${block}`.trimStart();
  return `${base}${bridgeLine}${block}`;
}

/**
 * Opening prior prompt for Describe Your Issue — answer-adaptive via story intelligence.
 */
export function buildStoryPriorPrompt(ctx: {
  paragraph?: string;
  areas?: BodyPart[];
  preferredName?: string;
  sex?: SexSelection | null;
  pastMedicalHistory?: string;
  currentMedicalHistory?: string;
  goals?: string[];
}): StoryPriorPrompt {
  const intel = getStoryIntel(ctx);
  return {
    id: `prior-${intel.richness}`,
    heading: intel.priorPrompt.heading,
    question: intel.priorPrompt.question,
    placeholder: intel.priorPrompt.placeholder,
    coachLine: intel.priorPrompt.coachLine,
  };
}

/** Full story intelligence snapshot for UI + engines */
export function getStoryIntel(ctx: {
  paragraph?: string;
  areas?: BodyPart[];
  preferredName?: string;
  sex?: SexSelection | null;
  pastMedicalHistory?: string;
  currentMedicalHistory?: string;
  goals?: string[];
}): StoryIntelligence {
  return analyzeStoryIntelligence(ctx.paragraph || "", {
    preferredName: ctx.preferredName,
    areas: ctx.areas,
    sex: ctx.sex,
    pastMedicalHistory: ctx.pastMedicalHistory,
    currentMedicalHistory: ctx.currentMedicalHistory,
    goals: ctx.goals,
  });
}

function adaptiveToPrompt(q: AdaptiveStoryQuestion): ConversationPrompt {
  return {
    id: q.id,
    label: q.label,
    question: q.question,
    category: q.category,
    reason: q.reason,
  };
}

/**
 * Detect which conversation prompt themes are already covered in free text
 * (including questions already inserted with the story marker).
 */
export function detectCoveredPromptIds(
  story: string,
  prompts: ConversationPrompt[]
): Set<string> {
  const t = story.toLowerCase();
  const covered = new Set<string>();

  for (const p of prompts) {
    // Already inserted as a guided line in the free-text box
    if (story.includes(p.question.slice(0, Math.min(48, p.question.length)))) {
      covered.add(p.id);
      continue;
    }
    if (story.includes(`${STORY_Q_MARKER} ${p.label}`)) {
      covered.add(p.id);
      continue;
    }
  }

  // Heuristic theme coverage from free-text content
  const themeHits: Array<{ id: string; re: RegExp }> = [
    { id: "bother-main", re: /\b(bother|hurts?|pain|stiff|ache|worst part|main issue)\b/i },
    {
      id: "bother-when",
      re: /\b(morning|night|after sitting|after activity|worse when|flares?|end of day)\b/i,
    },
    {
      id: "bother-better",
      re: /\b(eases?|helps?|relief|heat|ice|rest|meds?|better when|improves)\b/i,
    },
    {
      id: "function-hardest",
      re: /\b(stairs?|sitting|standing|walking|dressing|reaching|sleep|work|lifting)\b/i,
    },
    { id: "pain-scale-story", re: /\b([0-9]|10)\s*\/\s*10\b|\bpain\s*(is\s*)?[0-9]/i },
    {
      id: "onset-story",
      re: /\b(started|onset|gradual|sudden|injury|fall|lift|workout|weeks? ago|months? ago)\b/i,
    },
    {
      id: "after-activity",
      re: /\b(after (i )?(move|stretch|exercise)|next day|2.?24 hour|irritated later|sore after)\b/i,
    },
    {
      id: "goal-two-weeks",
      re: /\b(want to|goal|hope to|get back|return to|two weeks|wish i could)\b/i,
    },
    {
      id: "fear-or-guarding",
      re: /\b(afraid|fear|avoid|scared|don'?t want to make it worse|guarding)\b/i,
    },
    { id: "sleep-stress", re: /\b(sleep|stress|anxious|tense|tired|insomnia)\b/i },
    {
      id: "lb-sitting",
      re: /\b(sit|desk|bend|tie shoes|stand up from|catching)\b/i,
    },
    { id: "neck-desk", re: /\b(desk|screen|driving|posture|look over)\b/i },
    { id: "le-stairs", re: /\b(stairs?|hills?|walk|giving way|swelling)\b/i },
    {
      id: "hist-past",
      re: /\b(surgery|fracture|old injury|arthroscopy|past:|pmh|years? ago)\b/i,
    },
    {
      id: "hist-current",
      re: /\b(currently|diabetes|hypertension|arthritis|heart|lung|cmh|manage)\b/i,
    },
    {
      id: "red-flag-soft",
      re: /\b(numbness|weakness|bowel|bladder|fever|saddle|red flag)\b/i,
    },
  ];

  for (const hit of themeHits) {
    if (hit.re.test(t)) covered.add(hit.id);
  }

  // If story is empty, nothing is covered
  if (!story.trim()) {
    return new Set();
  }

  return covered;
}

/**
 * Format a conversation prompt for insertion into the free-text story box.
 * User answers on the following line(s).
 */
export function formatQuestionForStoryBox(prompt: ConversationPrompt): string {
  return `\n\n${STORY_Q_MARKER} ${prompt.question}\n`;
}

/**
 * Auto-appearing open-ended questions for the free-text box.
 * Primary path: answer-adaptive questions from story intelligence.
 * Fallback: classic prompt catalog with coverage filtering.
 */
export function selectAutoAppearingQuestions(
  ctx: {
    paragraph?: string;
    areas?: BodyPart[];
    preferredName?: string;
    sex?: SexSelection | null;
    pastMedicalHistory?: string;
    currentMedicalHistory?: string;
    descriptorIds?: string[];
    conditionIds?: string[];
    goals?: string[];
  },
  limit = 6
): ConversationPrompt[] {
  const intel = getStoryIntel(ctx);
  const adaptive = intel.adaptiveQuestions.map(adaptiveToPrompt);

  if (adaptive.length >= 2) {
    return adaptive.slice(0, limit);
  }

  // Merge adaptive + classic uncovered catalog
  const story = (ctx.paragraph || "").trim();
  const all = buildConversationPrompts(ctx);
  const covered = detectCoveredPromptIds(story, all);
  const uncovered = all.filter((p) => !covered.has(p.id));
  const seen = new Set(adaptive.map((p) => p.id));
  const merged = [...adaptive];
  for (const p of uncovered) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
    if (merged.length >= limit) break;
  }
  return merged.slice(0, limit);
}

/** Next single guided question to drop into free text (progressive interview). */
export function nextStoryBoxQuestion(ctx: {
  paragraph?: string;
  areas?: BodyPart[];
  preferredName?: string;
  sex?: SexSelection | null;
  pastMedicalHistory?: string;
  currentMedicalHistory?: string;
  descriptorIds?: string[];
  conditionIds?: string[];
  goals?: string[];
}): ConversationPrompt | null {
  const list = selectAutoAppearingQuestions(ctx, 1);
  return list[0] || null;
}

/**
 * Whether the free-text story already ends with an unanswered guided question line.
 */
export function storyEndsWithOpenQuestion(story: string): boolean {
  const turns = parseStoryInterviewTurns(story);
  if (!turns.length) return false;
  const last = turns[turns.length - 1]!;
  // Only “waiting on answer” when there is a guided question marker turn still open
  if (!last.question && !story.includes(STORY_Q_MARKER)) return false;
  return last.open;
}

/** Count completed interview turns (for UI progress). */
export function countCompletedStoryTurns(story: string): number {
  return parseStoryInterviewTurns(story).filter((t) => !t.open && (t.answer || t.question)).length;
}

/** Last open question text, if any. */
export function currentOpenStoryQuestion(story: string): string | null {
  const turns = parseStoryInterviewTurns(story);
  const last = turns[turns.length - 1];
  if (last?.open && last.question) return last.question;
  return null;
}

/**
 * Build open-ended, context-aware conversation prompts from the Assessment story.
 * Expands “what is bothering you?” into a friendly clinical interview.
 */
export function buildConversationPrompts(ctx: {
  paragraph?: string;
  areas?: BodyPart[];
  preferredName?: string;
  sex?: SexSelection | null;
  pastMedicalHistory?: string;
  currentMedicalHistory?: string;
  descriptorIds?: string[];
  conditionIds?: string[];
  goals?: string[];
}): ConversationPrompt[] {
  const name = displayPreferredName(ctx.preferredName);
  const story = (ctx.paragraph || "").trim();
  const areas = ctx.areas || [];
  const region = areaPhrase(areas);
  const snip = storySnippet(story);
  const prompts: ConversationPrompt[] = [];

  // —— Core “what’s bothering you” family (always) ——
  prompts.push({
    id: "bother-main",
    label: "What’s bothering you most?",
    question: snip
      ? `${name}, you mentioned “${snip}.” What bothers you most about that day to day—pain, stiffness, fear of moving, or something else?`
      : `${name}, what is bothering you most right now in your body—and how does it show up in a typical day?`,
    category: "bother",
  });

  prompts.push({
    id: "bother-when",
    label: "When is it worst?",
    question: `When is ${region} at its worst—first thing in the morning, after sitting, after activity, or at night—and what are you usually doing when it flares?`,
    category: "irritability",
  });

  prompts.push({
    id: "bother-better",
    label: "What eases it?",
    question: `What reliably eases ${region} even a little—changing position, walking, heat, rest, meds, or something else—and how long does that relief last?`,
    category: "behavior",
  });

  prompts.push({
    id: "function-hardest",
    label: "Hardest daily task?",
    question: `Which everyday task is hardest because of this—sitting, standing up, walking, stairs, reaching, dressing, sleep—and what about that task feels limited?`,
    category: "function",
  });

  prompts.push({
    id: "pain-scale-story",
    label: "Pain 0–10 + pattern",
    question: `On a 0–10 scale, where is the pain most of the day, and where does it go at its worst? Does it stay local, or travel (for example down a leg or arm)?`,
    category: "irritability",
  });

  prompts.push({
    id: "onset-story",
    label: "How did it start?",
    question: `How did this start—suddenly after a lift, fall, or workout, or gradually over weeks—and has it been getting better, worse, or staying about the same?`,
    category: "bother",
  });

  prompts.push({
    id: "after-activity",
    label: "How do you feel after?",
    question: `After you move or stretch, do you feel better, the same, or more irritated later (especially 2–24 hours after)—and what does that tell you about how hard to push?`,
    category: "irritability",
  });

  prompts.push({
    id: "goal-two-weeks",
    label: "Meaningful 2-week win?",
    question: `If we only improved one thing in the next two weeks, what would feel like a real win for you (less pain sitting, easier sleep, stairs, work, sport)?`,
    category: "goals",
  });

  prompts.push({
    id: "fear-or-guarding",
    label: "Any fear of movement?",
    question: `Is there any movement you avoid because you’re afraid it will “make it worse,” and what do you notice in your body when you think about that movement?`,
    category: "behavior",
  });

  prompts.push({
    id: "sleep-stress",
    label: "Sleep or stress link?",
    question: `How are sleep and stress right now—and do you notice ${region} changing when you’re tired, tense, or under pressure?`,
    category: "function",
  });

  // —— Region-specific open-ended follow-ups ——
  if (areas.some((a) => ["lower-back", "pelvis", "hips"].includes(a)) || /back|lumbar|hip/i.test(story)) {
    prompts.push({
      id: "lb-sitting",
      label: "Sitting & bending?",
      question: `With your back or hip symptoms, what happens when you sit longer than 20–30 minutes, bend to tie shoes, or stand up from a chair—any catching, stiffness, or referred pain?`,
      category: "function",
    });
  }
  if (areas.some((a) => ["neck", "shoulders", "thoracic", "scapular"].includes(a)) || /neck|shoulder|desk|posture/i.test(story)) {
    prompts.push({
      id: "neck-desk",
      label: "Desk & looking around?",
      question: `How does screen time, driving, or looking over your shoulder affect your neck or shoulders—and what posture or break pattern helps most?`,
      category: "function",
    });
  }
  if (areas.some((a) => ["knee", "ankles", "foot", "calves"].includes(a)) || /knee|ankle|foot|stair/i.test(story)) {
    prompts.push({
      id: "le-stairs",
      label: "Stairs & walking?",
      question: `On stairs, hills, or longer walks, what bothers you first—pain, weakness, swelling, giving way—and on the way up, down, or both?`,
      category: "function",
    });
  }

  // —— History gaps (friendly clinical) ——
  if (!ctx.pastMedicalHistory?.trim() && story.length >= 20) {
    prompts.push({
      id: "hist-past",
      label: "Past injuries/surgery?",
      question: `${name}, have you had any past surgeries, fractures, or old injuries that still influence how you move—and when did they happen?`,
      category: "history",
    });
  }
  if (!ctx.currentMedicalHistory?.trim() && story.length >= 20) {
    prompts.push({
      id: "hist-current",
      label: "Current conditions?",
      question: `Are you managing any ongoing conditions (for example blood pressure, diabetes, arthritis, heart or lung issues)—and how do they affect your energy or exercise tolerance?`,
      category: "history",
    });
  }
  if (ctx.conditionIds?.length) {
    const labels = ctx.conditionIds
      .slice(0, 2)
      .map((id) => getConditionById(id)?.label)
      .filter(Boolean);
    if (labels.length) {
      prompts.push({
        id: "cond-follow",
        label: "About matched themes",
        question: `Your story touches themes like ${labels.join(" and ")}. What has your clinician (if any) told you so far about restrictions, timeline, or what “good recovery” looks like?`,
        category: "history",
      });
    }
  }
  if (ctx.descriptorIds?.length) {
    const d = ctx.descriptorIds
      .slice(0, 3)
      .map((id) => getDescriptorById(id)?.label)
      .filter(Boolean);
    if (d.length) {
      prompts.push({
        id: "desc-follow",
        label: "Describe the sensation",
        question: `You seem to be describing sensations like ${d.join(", ")}. Can you walk me through one recent episode from start to finish—what you were doing, how it felt, and how long it took to settle?`,
        category: "bother",
      });
    }
  }

  // —— Sex-aware open-ended (inclusive, optional) ——
  if (ctx.sex === "female") {
    prompts.push({
      id: "sex-f",
      label: "Pelvic / bone health context?",
      question: `Is there anything about pregnancy, postpartum recovery, pelvic comfort, or bone health that you want the plan to respect?`,
      category: "safety",
    });
  } else if (ctx.sex === "male") {
    prompts.push({
      id: "sex-m",
      label: "Load & heart context?",
      question: `When you lift, strain, or get winded, is there anything about blood pressure, heart history, or pelvic pressure that we should keep gentle?`,
      category: "safety",
    });
  } else if (!ctx.sex || ctx.sex === "prefer-not-to-say") {
    prompts.push({
      id: "sex-open",
      label: "Any body-specific cautions?",
      question: `Is there any part of your body history or identity-related caution you want this plan to honor so recommendations stay respectful and safe?`,
      category: "safety",
    });
  }

  prompts.push({
    id: "red-flag-soft",
    label: "Anything concerning?",
    question: `Besides the main bother, have you noticed anything more concerning—unexplained weakness, numbness in the saddle area, bowel/bladder changes, fever with severe pain, or pain after a bad fall—that a licensed clinician should hear about urgently?`,
    category: "safety",
  });

  prompts.push({
    id: "one-sentence-pt",
    label: "One sentence for your PT",
    question: `If you had 10 seconds with a physical therapist, what one honest sentence would you say about what is bothering you and what you want back?`,
    category: "goals",
  });

  // De-dupe by id, prefer story-context prompts first
  const seen = new Set<string>();
  const ordered = prompts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // If story is thin, lead with bother + onset; if rich, lead with contextual follow-ups
  if (story.length < 40) {
    return ordered.slice(0, 14);
  }
  // Put context-heavy ones first after main bother
  const priority = ["bother-main", "desc-follow", "cond-follow", "bother-when", "function-hardest"];
  ordered.sort((a, b) => {
    const ai = priority.indexOf(a.id);
    const bi = priority.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return ordered.slice(0, 14);
}

/** Chip labels + full questions for UI (answer-adaptive first) */
export function suggestedConversationChips(ctx: {
  paragraph?: string;
  areas?: BodyPart[];
  preferredName?: string;
  sex?: SexSelection | null;
  pastMedicalHistory?: string;
  currentMedicalHistory?: string;
  descriptorIds?: string[];
  conditionIds?: string[];
  goals?: string[];
}): ConversationPrompt[] {
  return selectAutoAppearingQuestions(ctx, 12);
}

/**
 * Friendly, medically specific answer + always one open-ended follow-up question.
 * Follow-ups adapt to combined story + latest answer via story intelligence.
 */
export function answerStoryConversation(
  userText: string,
  ctx: AssessmentCoachContext
): { answer: string; followUp: string } {
  const name = displayPreferredName(ctx.preferredName);
  const q = userText.trim();
  const combinedStory = [ctx.paragraph, q].filter(Boolean).join("\n\n");
  const intel = analyzeStoryIntelligence(combinedStory, {
    preferredName: ctx.preferredName,
    areas: ctx.areas,
    sex: ctx.sex,
    pastMedicalHistory: ctx.pastMedicalHistory,
    currentMedicalHistory: ctx.currentMedicalHistory,
    goals: ctx.goals,
  });
  const regions =
    intel.regions.length > 0
      ? intel.regions
          .slice(0, 3)
          .map((a) => BODY_PART_LABELS[a] || a)
          .join(", ")
      : areaLabels(ctx.areas);
  const pain = topPain(ctx);
  const descs = descriptorLabels(
    intel.descriptorIds.length ? intel.descriptorIds : ctx.descriptorIds
  );
  const conds = conditionLabels(
    intel.conditionIds.length ? intel.conditionIds : ctx.conditionIds
  );
  const t = q.toLowerCase();

  const disclaimer =
    " This is friendly educational guidance—not a diagnosis. A licensed PT or physician should evaluate red-flag symptoms or personal medical decisions.";

  let core = "";
  if (!q) {
    core = `${name}, I’m here with you. Start with what is bothering you most—we’ll adapt every next question to your answers.`;
  } else if (/okay to (move|exercise)|safe to|should i (stop|rest|exercise)/i.test(t)) {
    core = `${name}, with ${regions}${
      intel.painNow != null
        ? ` (${intel.painNow}/10 as you stated)`
        : pain.level != null
          ? ` (pain ${pain.level}/10 from your scale)`
          : " (no 0–10 stated — not assumed)"
    }${
      intel.irritability !== "unknown"
        ? ` and ${intel.irritability} irritability from your story`
        : " (irritability not determined yet — not assumed)"
    }, mild productive discomfort (often ≤3/10 that settles within about a day) can be okay during gentle mobility. Sharp, spreading, or “worse for more than a day” pain is a yellow/red light—ease range and volume.`;
  } else if (/how often|frequency|how many days|schedule/i.test(t)) {
    const mins = Math.max(8, Math.round(ctx.minutes * intel.planHints.minutesScale));
    core = `${name}, ${
      intel.irritability !== "unknown"
        ? `with your story’s ${intel.irritability} irritability, `
        : "without assuming irritability, "
    }short practice most days (~${mins} min) beats rare long sessions. If you flare more than a day, cut volume ~30–50% but keep gentle motion when you can.`;
  } else if (/avoid|don'?t|contraindic|surgery|implant|precaution/i.test(t)) {
    core = `${name}, prioritize avoiding end-range forcing, ballistic bouncing, and breath-holding under heavy strain. ${
      intel.planHints.avoidTags.slice(0, 4).length
        ? `From your story I’m also cautious about: ${intel.planHints.avoidTags.slice(0, 4).join(", ")}.`
        : ""
    } Your clinician’s protocol always wins over the app.`;
  } else if (/heat|ice|cold|modalit/i.test(t)) {
    core = `${name}, ${
      intel.easers.includes("heat")
        ? "you already noted heat helps—"
        : intel.sensory.includes("stiff/tight")
          ? "stiffness language often pairs with brief heat then easy mobility—"
          : "irritable or post-load flares often pair with relative rest and optional short cold—"
    } modalities should help you move better, not replace progressive practice.`;
  } else {
    core = buildStoryIntelReflection(name, q, intel, {
      regions,
      pain,
      descs,
      conds,
      sex: ctx.sex,
      pmh: ctx.pastMedicalHistory,
      cmh: ctx.currentMedicalHistory,
    });
  }

  const followUp =
    intel.adaptiveQuestions[0]?.question ||
    pickFollowUpQuestion({ ...ctx, paragraph: combinedStory }, t);
  const readBits = intel.liveReadLines.slice(0, 2).join(" ");
  const answer = `${core}${
    readBits ? `\n\n_${readBits}_` : ""
  }${disclaimer}\n\n**I’m curious:** ${followUp}`;
  return { answer, followUp };
}

function areaLabels(areas: BodyPart[]): string {
  if (!areas.length) return "the areas you care about";
  return areas
    .slice(0, 3)
    .map((a) => BODY_PART_LABELS[a] || a)
    .join(", ");
}

function topPain(ctx: AssessmentCoachContext): { area?: string; level?: number } {
  let best: BodyPart | undefined;
  let level = -1;
  for (const [k, v] of Object.entries(ctx.painLevels || {})) {
    if (typeof v === "number" && v > level) {
      level = v;
      best = k as BodyPart;
    }
  }
  if (!best || level < 0) return {};
  return { area: BODY_PART_LABELS[best] || best, level };
}

function descriptorLabels(ids: string[]): string[] {
  return ids
    .slice(0, 5)
    .map((id) => getDescriptorById(id)?.label)
    .filter(Boolean) as string[];
}

function conditionLabels(ids: string[]): string[] {
  return ids
    .slice(0, 4)
    .map((id) => getConditionById(id)?.label)
    .filter(Boolean) as string[];
}

function buildStoryIntelReflection(
  name: string,
  userText: string,
  intel: StoryIntelligence,
  ctx: {
    regions: string;
    pain: { area?: string; level?: number };
    descs: string[];
    conds: string[];
    sex?: SexSelection | null;
    pmh?: string;
    cmh?: string;
  }
): string {
  const bits: string[] = [];
  bits.push(
    `${name}, thank you—I’m listening the way a careful outpatient PT would in the first minutes of an eval.`
  );
  bits.push(
    `You said: “${userText.trim().slice(0, 220)}${userText.trim().length > 220 ? "…" : ""}.”`
  );
  bits.push(
    `Putting that together with your free-text story: ${ctx.regions}${
      intel.laterality !== "unknown" ? ` (${intel.laterality})` : ""
    }${intel.sensory.length ? `; sensations like ${intel.sensory.slice(0, 3).join(", ")}` : ""}${
      intel.painNow != null
        ? `; ${intel.painNow}/10 as you stated`
        : ctx.pain.level != null
          ? `; ${ctx.pain.level}/10 from your pain scale`
          : `; no 0–10 pain number stated yet (I will not invent one)`
    }. ${
      intel.irritability !== "unknown"
        ? `Irritability: **${intel.irritability}** (${
            intel.irritabilitySource === "assumed"
              ? "assumed for dosing until more detail"
              : "from your signals"
          })`
        : `Irritability: **unknown**`
    }${
      intel.activityResponse !== "unknown"
        ? ` with activity response “${intel.activityResponse}”`
        : ""
    }.`
  );
  if (intel.aggravators.length) {
    bits.push(`Aggravators you actually described: ${intel.aggravators.slice(0, 4).join(", ")}.`);
  } else if (intel.assumedAggravators?.length) {
    bits.push(
      `You have not confirmed causes yet—I'm holding soft context only: ${intel.assumedAggravators
        .slice(0, 3)
        .join(", ")} (assumed, not stated as aggravators).`
    );
  } else {
    bits.push(
      `You have not yet named which positions, actions, or activities make it worse.`
    );
  }
  if (intel.easers.length) {
    bits.push(`Easers you described: ${intel.easers.slice(0, 3).join(", ")}.`);
  }
  if (intel.functionalLimits.length) {
    bits.push(
      `Function limits you described: ${intel.functionalLimits.slice(0, 4).join(", ")}.`
    );
  }
  if (intel.planHints.evidenceLines[0]) {
    bits.push(intel.planHints.evidenceLines[0]);
  }
  if (ctx.conds.length) bits.push(`Clinical themes: ${ctx.conds.slice(0, 3).join(", ")}.`);
  if (ctx.descs.length) bits.push(`Descriptor themes: ${ctx.descs.slice(0, 3).join(", ")}.`);
  if (ctx.sex && ctx.sex !== "prefer-not-to-say") {
    bits.push(`I’ll keep ${sexLabel(ctx.sex)}-related cautions in mind where relevant.`);
  }
  if (ctx.pmh || ctx.cmh) {
    bits.push(`Medical history is part of dosing so we don’t rush rehab into flares.`);
  }
  if (intel.redFlagHints.length) {
    bits.push(
      `You used language that deserves clinician attention (${intel.redFlagHints[0]}). The app stays conservative and educational.`
    );
  }
  bits.push(
    `Next we translate this into a routine that targets your real-world tasks—not just a generic body-region template.`
  );
  return bits.join(" ");
}

function pickFollowUpQuestion(ctx: AssessmentCoachContext, lastUserLower: string): string {
  const adaptive = selectAutoAppearingQuestions(
    {
      paragraph: ctx.paragraph,
      areas: ctx.areas,
      preferredName: ctx.preferredName,
      sex: ctx.sex,
      pastMedicalHistory: ctx.pastMedicalHistory,
      currentMedicalHistory: ctx.currentMedicalHistory,
      descriptorIds: ctx.descriptorIds,
      conditionIds: ctx.conditionIds,
      goals: ctx.goals,
    },
    10
  );

  // Prefer questions not already answered; story intelligence already refined for partial facts
  const candidates = adaptive.filter((p) => {
    const qL = p.question.toLowerCase();
    const lab = p.label.toLowerCase();
    if (lastUserLower.includes(lab.slice(0, 12))) return false;
    if (lastUserLower.includes(qL.slice(0, 28))) return false;
    // Skip pure NRS re-ask if user just gave numbers
    if (
      /0\s*[-–/]\s*10|pain scale/.test(qL) &&
      /\b([0-9]|10)\s*\/\s*10\b/.test(lastUserLower)
    ) {
      return false;
    }
    return true;
  });
  const pool = candidates.length ? candidates : adaptive;
  return (
    pool[0]?.question ||
    "What else about this bother should a careful PT still understand before we lock a plan?"
  );
}
