/**
 * Offline assessment Q&A + written plan narrative.
 * Educational only — not medical advice or a diagnosis.
 */

import type { BodyPart, Difficulty, MovementKind, Routine } from "@/lib/types";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import { getStretchById } from "@/data/stretch-library";
import { getExerciseById } from "@/data/exercise-library";
import { getConditionById } from "@/data/clinical-conditions";
import { getDescriptorById } from "@/data/pain-descriptors";
import { sexLabel, type SexSelection } from "@/lib/clinical-history";
import {
  answerStoryConversation,
  buildStoryPriorPrompt,
  formatQuestionForStoryBox,
  getStoryIntel,
  nextStoryBoxQuestion,
  selectAutoAppearingQuestions,
  storyEndsWithOpenQuestion,
  suggestedConversationChips,
  type ConversationPrompt,
  type StoryPriorPrompt,
} from "@/lib/assessment-story-conversation";
import {
  analyzeStoryIntelligence,
  type StoryIntelligence,
} from "@/lib/story-intelligence";

export type { ConversationPrompt, StoryPriorPrompt, StoryIntelligence };
export {
  buildStoryPriorPrompt,
  formatQuestionForStoryBox,
  getStoryIntel,
  nextStoryBoxQuestion,
  selectAutoAppearingQuestions,
  storyEndsWithOpenQuestion,
};

export type AssessmentCoachContext = {
  paragraph: string;
  areas: BodyPart[];
  painLevels: Partial<Record<BodyPart, number>>;
  goals: string[];
  symptoms: string[];
  minutes: number;
  difficulty: Difficulty;
  preferKinds: "auto" | MovementKind[];
  descriptorIds: string[];
  conditionIds: string[];
  clinicalSymptomIds: string[];
  medications: Array<{ genericName: string; strength?: string }>;
  precautionIds: string[];
  implantIds: string[];
  homeBasedProgram: boolean;
  preferredName: string;
  sex?: SexSelection;
  pastMedicalHistory?: string;
  currentMedicalHistory?: string;
};

export type CoachExchange = {
  id: string;
  question: string;
  answer: string;
  at: string;
  /** Optional follow-up the coach is asking next */
  followUp?: string;
};

/** Open-ended conversational prompts for Assessment Story Q&A */
export function suggestedAssessmentConversation(ctx: {
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
  return suggestedConversationChips(ctx);
}

/** @deprecated Prefer suggestedAssessmentConversation for full prompt objects */
export function suggestedAssessmentQuestions(
  sex?: SexSelection | null,
  opts?: {
    pastMedicalHistory?: string;
    currentMedicalHistory?: string;
    paragraph?: string;
    areas?: BodyPart[];
    preferredName?: string;
    descriptorIds?: string[];
    conditionIds?: string[];
    goals?: string[];
  }
): string[] {
  return suggestedAssessmentConversation({
    sex,
    paragraph: opts?.paragraph,
    pastMedicalHistory: opts?.pastMedicalHistory,
    currentMedicalHistory: opts?.currentMedicalHistory,
    areas: opts?.areas,
    preferredName: opts?.preferredName,
    descriptorIds: opts?.descriptorIds,
    conditionIds: opts?.conditionIds,
    goals: opts?.goals,
  }).map((p) => p.question);
}

export function displayPreferredName(
  preferredName?: string | null,
  fallbackName?: string | null
): string {
  const p = (preferredName || "").trim();
  if (p) return p;
  const n = (fallbackName || "").trim();
  if (n) return n.split(/\s+/)[0] || n;
  return "friend";
}

function areaLabels(areas: BodyPart[]): string {
  if (!areas.length) return "the areas you care about most";
  return areas
    .slice(0, 4)
    .map((a) => BODY_PART_LABELS[a] || a)
    .join(", ");
}

function topPain(ctx: AssessmentCoachContext): { area?: string; level?: number } {
  let best: BodyPart | undefined;
  let level = -1;
  for (const [k, v] of Object.entries(ctx.painLevels)) {
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
    .slice(0, 6)
    .map((id) => getDescriptorById(id)?.label)
    .filter(Boolean) as string[];
}

function conditionLabels(ids: string[]): string[] {
  return ids
    .slice(0, 5)
    .map((id) => getConditionById(id)?.label)
    .filter(Boolean) as string[];
}

/**
 * Answer a free-text question or story reply using conversational clinical coaching.
 * Returns a friendly, medically specific reply that ends with an open-ended follow-up.
 */
export function answerAssessmentQuestion(
  question: string,
  ctx: AssessmentCoachContext
): string {
  return answerStoryConversation(question, ctx).answer;
}

/** Structured answer + follow-up for richer UI */
export function answerAssessmentConversation(
  question: string,
  ctx: AssessmentCoachContext
): { answer: string; followUp: string } {
  return answerStoryConversation(question, ctx);
}

/**
 * Written plan of care narrative for the Plan step — personalized approach.
 */
export function buildWrittenPlanApproach(
  routine: Routine,
  ctx: AssessmentCoachContext
): string {
  const name = displayPreferredName(ctx.preferredName);
  const regions = areaLabels(
    ctx.areas.length ? ctx.areas : routine.focusAreas || []
  );
  const pain = topPain(ctx);
  const descs = descriptorLabels(
    ctx.descriptorIds.length
      ? ctx.descriptorIds
      : routine.generatedFrom?.painDescriptorIds || []
  );
  const conds = conditionLabels(
    ctx.conditionIds.length
      ? ctx.conditionIds
      : routine.generatedFrom?.conditionIds || []
  );
  const goals =
    ctx.goals.length > 0
      ? ctx.goals.slice(0, 4).join(", ")
      : (routine.generatedFrom?.goals || []).slice(0, 4).join(", ") ||
        "move with more ease and confidence";

  const stretchItems = routine.items.filter((i) => i.kind === "stretch");
  const exerciseItems = routine.items.filter((i) => i.kind === "exercise");
  const sampleMoves = routine.items
    .slice(0, 5)
    .map((item) => {
      const m =
        item.kind === "stretch"
          ? getStretchById(item.movementId)
          : getExerciseById(item.movementId);
      return m?.name || item.movementId;
    })
    .filter(Boolean);

  const paragraphs: string[] = [];

  paragraphs.push(
    `${name}, here is your written plan of approach based on your assessment.`
  );

  const problemBits: string[] = [];
  if (ctx.paragraph.trim()) {
    problemBits.push(
      `You described: “${ctx.paragraph.trim().slice(0, 220)}${
        ctx.paragraph.trim().length > 220 ? "…" : ""
      }”`
    );
  }
  problemBits.push(`Priority regions: ${regions}.`);
  if (pain.level != null) {
    problemBits.push(
      `Highest reported pain is about ${pain.level}/10${
        pain.area ? ` (${pain.area})` : ""
      }.`
    );
  }
  if (descs.length) problemBits.push(`Sensation themes: ${descs.join(", ")}.`);
  if (conds.length) problemBits.push(`Clinical themes matched: ${conds.join(", ")}.`);
  if (ctx.sex && ctx.sex !== "prefer-not-to-say") {
    problemBits.push(`Sex context: ${sexLabel(ctx.sex)}.`);
  }
  if (ctx.pastMedicalHistory?.trim()) {
    problemBits.push(`Past medical history: ${ctx.pastMedicalHistory.trim().slice(0, 200)}.`);
  }
  if (ctx.currentMedicalHistory?.trim()) {
    problemBits.push(
      `Current medical history: ${ctx.currentMedicalHistory.trim().slice(0, 200)}.`
    );
  }
  paragraphs.push(problemBits.join(" "));

  const storyIntel = ctx.paragraph.trim()
    ? analyzeStoryIntelligence(ctx.paragraph, {
        preferredName: ctx.preferredName,
        areas: ctx.areas,
        sex: ctx.sex,
        pastMedicalHistory: ctx.pastMedicalHistory,
        currentMedicalHistory: ctx.currentMedicalHistory,
        goals: ctx.goals,
      })
    : null;

  paragraphs.push(
    `Goal of care: support “${goals}” with a ${routine.difficulty} home program of about ${routine.estimatedMinutes} minutes (${routine.items.length} movements: ${stretchItems.length} mobility, ${exerciseItems.length} strength/control)${
      routine.homeBasedProgram ? ", using home-friendly variations" : ""
    }. Your free-text story${
      storyIntel
        ? ` (${storyIntel.irritability} irritability${
            storyIntel.activityResponse !== "unknown"
              ? `, activity ${storyIntel.activityResponse}`
              : ""
          }${
            storyIntel.functionalLimits.length
              ? `; function: ${storyIntel.functionalLimits.slice(0, 3).join(", ")}`
              : ""
          } → ${storyIntel.planHints.phaseBias} dosing bias)`
        : ""
    }, sex context, and medical history are correlated so dosing stays realistic across Assessment, Plan, Journal, and Jeffery.`
  );
  if (storyIntel?.planHints.evidenceLines[0]) {
    paragraphs.push(`Story-driven dosing note: ${storyIntel.planHints.evidenceLines[0]}`);
  }

  const blueprint =
    routine.generatedFrom?.safetyEducation?.find((b) =>
      /blueprint|evidence-informed session/i.test(b.title)
    )?.body ||
    routine.generatedFrom?.safetySummary?.find((s) => /phase|pattern/i.test(s));
  paragraphs.push(
    blueprint
      ? `Approach to attack the issue (evidence-informed session blueprint): ${blueprint}. Progress only when symptoms settle within ~24 hours; respect systemic history with conservative dosing; use pain traffic lights (green proceed / yellow modify / red stop).`
      : `Approach to attack the issue: (1) calm irritable tissues and restore comfortable range in ${regions}; (2) rebuild motor control so daily tasks feel safer; (3) progress load only when symptoms settle within ~24 hours; (4) respect systemic history with conservative progressions; (5) pair movement with pacing and optional heat/ice rather than pushing through red-flag pain.`
  );

  if (sampleMoves.length) {
    paragraphs.push(
      `Session outline starts with: ${sampleMoves.join(" → ")}. Open any item to see step-by-step cues and institutional video guidance.`
    );
  }

  const safety = routine.generatedFrom?.safetySummary?.slice(0, 3) || [];
  if (safety.length) {
    paragraphs.push(`Safety dosing notes: ${safety.join(" ")}`);
  }

  paragraphs.push(
    `${name}, protect consistency over intensity this week. Re-run Assessment or Journal if pain patterns change, and talk with your PT or clinician for personal medical decisions. Educational use only—not medical advice.`
  );

  return paragraphs.join("\n\n");
}
