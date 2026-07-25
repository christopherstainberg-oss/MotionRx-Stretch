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
import { displayPreferredName } from "@/lib/assessment-coach";

export type ConversationPrompt = {
  id: string;
  /** Short chip label */
  label: string;
  /** Full open-ended question shown when selected / asked */
  question: string;
  category: "bother" | "behavior" | "irritability" | "function" | "history" | "goals" | "safety";
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
 * Opening prior prompt for Describe Your Issue — expands “what’s bothering you?”
 * into a friendly, medically specific invitation to write freely.
 */
export function buildStoryPriorPrompt(ctx: {
  paragraph?: string;
  areas?: BodyPart[];
  preferredName?: string;
  sex?: SexSelection | null;
}): StoryPriorPrompt {
  const name = displayPreferredName(ctx.preferredName);
  const story = (ctx.paragraph || "").trim();
  const region = areaPhrase(ctx.areas || []);
  const snip = storySnippet(story, 70);

  if (!story) {
    return {
      id: "prior-empty",
      heading: "What’s bothering you?",
      question: `${name}, what is bothering you most right now in your body—and how does it show up in a typical day?`,
      placeholder: `${name}, describe what’s bothering you in your own words… Where is it? How does it feel (sharp, dull, stiff, numb)? When is it worst? Which daily tasks get harder? Any past injuries, surgeries, or current conditions that matter?`,
      coachLine:
        "Write like you’re talking to a friendly outpatient PT. Open-ended is best—there are no wrong answers.",
    };
  }

  if (story.length < 60) {
    return {
      id: "prior-thin",
      heading: "Keep going — paint the full picture",
      question: snip
        ? `${name}, you started with “${snip}.” What else should I understand about how this feels, when it flares, and what tasks suffer?`
        : `${name}, what else about ${region} should I understand before we build a plan?`,
      placeholder: `Add more: onset (sudden vs gradual), pain 0–10, what eases it, hardest daily task, sleep impact, past surgery or current conditions…`,
      coachLine:
        "A few more clinical details help the plan match irritability, not just a body-region label.",
    };
  }

  return {
    id: "prior-rich",
    heading: "Your story so far — refine or go deeper",
    question: `${name}, reading your story about ${region}, what still feels incomplete—timing of flares, fear of a certain move, history, or the one thing you most want back?`,
    placeholder: `Continue your story, or answer the guided questions that appear below. Each answer deepens Plan, Jeffery, and modalities.`,
    coachLine:
      "Your free text is the interview. Guided questions below auto-appear from what you wrote—tap one to drop it into this box and answer in place.",
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
 * Filters out themes already covered; prioritizes interview flow.
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
  const story = (ctx.paragraph || "").trim();
  const all = buildConversationPrompts(ctx);
  const covered = detectCoveredPromptIds(story, all);

  const uncovered = all.filter((p) => !covered.has(p.id));

  // Interview order: expand “what’s bothering you” then deepen
  const order: ConversationPrompt["category"][] = [
    "bother",
    "irritability",
    "function",
    "behavior",
    "history",
    "goals",
    "safety",
  ];

  const sorted = [...uncovered].sort((a, b) => {
    const ai = order.indexOf(a.category);
    const bi = order.indexOf(b.category);
    if (ai !== bi) return ai - bi;
    return 0;
  });

  // Always surface main bother first if story is empty
  if (!story) {
    const main = all.find((p) => p.id === "bother-main");
    const rest = sorted.filter((p) => p.id !== "bother-main");
    return (main ? [main, ...rest] : sorted).slice(0, limit);
  }

  return sorted.slice(0, limit);
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
  const s = story.trimEnd();
  if (!s.includes(STORY_Q_MARKER)) return false;
  const lastMarker = s.lastIndexOf(STORY_Q_MARKER);
  const after = s.slice(lastMarker);
  // Marker line present; if little/no answer text after the question line, still open
  const lines = after.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return true;
  // Second line is very short → still open
  if (lines.length === 2 && lines[1].length < 12) return true;
  return false;
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

/** Chip labels + full questions for UI */
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
  return buildConversationPrompts(ctx);
}

/**
 * Friendly, medically specific answer + always one open-ended follow-up question.
 */
export function answerStoryConversation(
  userText: string,
  ctx: AssessmentCoachContext
): { answer: string; followUp: string } {
  const name = displayPreferredName(ctx.preferredName);
  const q = userText.trim();
  const story = ctx.paragraph.trim();
  const regions = areaLabels(ctx.areas);
  const pain = topPain(ctx);
  const descs = descriptorLabels(ctx.descriptorIds);
  const conds = conditionLabels(ctx.conditionIds);
  const t = q.toLowerCase();

  const disclaimer =
    " This is friendly educational guidance—not a diagnosis. A licensed PT or physician should evaluate red-flag symptoms or personal medical decisions.";

  // Detect if user is answering vs asking
  const isQuestion = /\?$/.test(q) || /^(what|how|why|when|where|should|can|is|do|does|will)\b/i.test(q);

  let core = "";
  if (!q) {
    core = `${name}, I’m here with you. Start with what is bothering you most, or pick a prompt below—we’ll build a clear picture the way a careful PT interview would.`;
  } else if (/bother|worst|main issue|hurts|pain|stiff|afraid|fear/i.test(t) || !isQuestion) {
    core = buildEmpathicClinicalReflection(name, q, {
      regions,
      pain,
      descs,
      conds,
      story,
      sex: ctx.sex,
      pmh: ctx.pastMedicalHistory,
      cmh: ctx.currentMedicalHistory,
    });
  } else if (/okay to (move|exercise)|safe to|should i (stop|rest|exercise)/i.test(t)) {
    core = `${name}, with what you’ve shared about ${regions}${
      pain.level != null ? ` (pain ~${pain.level}/10${pain.area ? ` in the ${pain.area}` : ""})` : ""
    }, mild productive discomfort (often ≤3/10 that settles within about a day) can be okay during gentle mobility. Sharp, spreading, or “worse for more than a day” pain is a yellow/red light—ease range and volume. Think traffic lights: green proceed, yellow modify, red stop that move.`;
  } else if (/how often|frequency|how many days|schedule/i.test(t)) {
    core = `${name}, most recovery-friendly plans work best as short practice most days (about ${ctx.minutes} minutes) rather than rare long sessions. Consistency beats heroics. If you flare more than a day, cut volume ~30–50% but keep gentle motion when you can.`;
  } else if (/avoid|don'?t|contraindic|surgery|implant|precaution/i.test(t)) {
    core = `${name}, for now prioritize avoiding end-range forcing, ballistic bouncing, and breath-holding under heavy strain. ${
      ctx.precautionIds.length || ctx.implantIds.length
        ? "Honor any post-op, weight-bearing, or device precautions you listed."
        : "If you have surgical or device limits, add them to your story so we can respect them."
    } Your clinician’s protocol always wins over the app.`;
  } else if (/heat|ice|cold|modalit/i.test(t)) {
    core = `${name}, stiffness often pairs with brief heat then easy mobility; irritable or post-load flares often pair with relative rest and optional short cold. Modalities should help you move better—not replace progressive practice.`;
  } else if (/medical history|pmh|diagnos|condition|surgery/i.test(t)) {
    const pmh = ctx.pastMedicalHistory?.trim();
    const cmh = ctx.currentMedicalHistory?.trim();
    core =
      pmh || cmh
        ? `${name}, I’m holding your history in mind${pmh ? ` (past: ${pmh.slice(0, 120)})` : ""}${
            cmh ? ` (current: ${cmh.slice(0, 120)})` : ""
          }. Systemic issues (heart, lungs, clotting, bone density, pregnancy, devices) keep us more conservative and outcome-focused rather than aggressive.`
        : `${name}, I don’t have much medical history yet. Anything about surgeries, fractures, heart/lung issues, diabetes, or clotting helps me dose safer.`;
  } else if (/focus|first|priority|start/i.test(t)) {
    const focus =
      pain.area && pain.level != null
        ? `${pain.area} (~${pain.level}/10)`
        : regions;
    core = `${name}, first we calm and control ${focus}: easy motion, good form, and tasks you care about—before hard stretching or heavy loading. That approach usually protects recovery time better than “push through.”`;
  } else {
    core = buildEmpathicClinicalReflection(name, q, {
      regions,
      pain,
      descs,
      conds,
      story,
      sex: ctx.sex,
      pmh: ctx.pastMedicalHistory,
      cmh: ctx.currentMedicalHistory,
    });
  }

  const followUp = pickFollowUpQuestion(ctx, t);
  const answer = `${core}${disclaimer}\n\n**I’m curious:** ${followUp}`;
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

function buildEmpathicClinicalReflection(
  name: string,
  userText: string,
  ctx: {
    regions: string;
    pain: { area?: string; level?: number };
    descs: string[];
    conds: string[];
    story: string;
    sex?: SexSelection | null;
    pmh?: string;
    cmh?: string;
  }
): string {
  const bits: string[] = [];
  bits.push(
    `${name}, thank you for sharing that—I’m listening the way a careful outpatient PT would in the first minutes of an eval.`
  );
  bits.push(`You said: “${userText.trim().slice(0, 220)}${userText.trim().length > 220 ? "…" : ""}.”`);

  if (ctx.story) {
    bits.push(
      `Together with your story about ${ctx.regions}${
        ctx.descs.length ? ` (${ctx.descs.slice(0, 3).join(", ")} sensations)` : ""
      }, that helps us map irritability and function—not just a single pain number.`
    );
  } else {
    bits.push(
      `If you add a short story above (where it is, what it feels like, what tasks suffer), I can get even more specific.`
    );
  }

  if (ctx.pain.level != null) {
    bits.push(
      `With pain around ${ctx.pain.level}/10${ctx.pain.area ? ` in the ${ctx.pain.area}` : ""}, we’ll bias toward calm control and graded exposure rather than forcing end-range.`
    );
  }
  if (ctx.conds.length) {
    bits.push(`Clinical themes in play: ${ctx.conds.slice(0, 3).join(", ")}.`);
  }
  if (ctx.sex && ctx.sex !== "prefer-not-to-say") {
    bits.push(`I’ll keep ${sexLabel(ctx.sex)}-related cautions in mind where relevant.`);
  }
  if (ctx.pmh || ctx.cmh) {
    bits.push(`Your medical history is part of the dosing picture so we don’t rush rehab at the cost of flares.`);
  }

  bits.push(
    `Next we translate this into a plan that aims to ease pain interference and restore a daily task you care about—usually more effective than chasing zero pain overnight.`
  );

  return bits.join(" ");
}

function pickFollowUpQuestion(ctx: AssessmentCoachContext, lastUserLower: string): string {
  const prompts = buildConversationPrompts({
    paragraph: ctx.paragraph,
    areas: ctx.areas,
    preferredName: ctx.preferredName,
    sex: ctx.sex,
    pastMedicalHistory: ctx.pastMedicalHistory,
    currentMedicalHistory: ctx.currentMedicalHistory,
    descriptorIds: ctx.descriptorIds,
    conditionIds: ctx.conditionIds,
    goals: ctx.goals,
  });

  // Avoid repeating a prompt that matches what they just asked
  const candidates = prompts.filter(
    (p) =>
      !lastUserLower.includes(p.label.toLowerCase().slice(0, 12)) &&
      !lastUserLower.includes(p.question.toLowerCase().slice(0, 24))
  );
  const pool = candidates.length ? candidates : prompts;
  // Prefer unanswered categories for interview flow
  const order: ConversationPrompt["category"][] = [
    "bother",
    "irritability",
    "function",
    "behavior",
    "history",
    "goals",
    "safety",
  ];
  for (const cat of order) {
    const hit = pool.find((p) => p.category === cat);
    if (hit) return hit.question;
  }
  return (
    pool[0]?.question ||
    "What else about this bother should I understand before we lock a plan?"
  );
}
