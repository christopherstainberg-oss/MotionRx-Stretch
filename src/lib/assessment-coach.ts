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
};

export type CoachExchange = {
  id: string;
  question: string;
  answer: string;
  at: string;
};

const SUGGESTED_QUESTIONS = [
  "What should I focus on first?",
  "Is it okay to exercise with this pain?",
  "How often should I practice?",
  "What should I avoid right now?",
  "How long until I feel better?",
  "Should I use heat or ice?",
  "What does my story suggest clinically?",
];

export function suggestedAssessmentQuestions(): string[] {
  return [...SUGGESTED_QUESTIONS];
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
 * Answer a free-text question using the current assessment context.
 */
export function answerAssessmentQuestion(
  question: string,
  ctx: AssessmentCoachContext
): string {
  const name = displayPreferredName(ctx.preferredName);
  const q = question.trim();
  if (!q) {
    return `${name}, ask anything about your story, pain, practice schedule, or what the plan should prioritize.`;
  }

  const t = q.toLowerCase();
  const pain = topPain(ctx);
  const regions = areaLabels(ctx.areas);
  const story = ctx.paragraph.trim();
  const descs = descriptorLabels(ctx.descriptorIds);
  const conds = conditionLabels(ctx.conditionIds);
  const meds = ctx.medications
    .slice(0, 4)
    .map((m) => (m.strength ? `${m.genericName} ${m.strength}` : m.genericName))
    .join(", ");

  const disclaimer =
    " This is educational guidance only—not a diagnosis or a substitute for care from your PT or clinician.";

  if (/focus|first|start|priority|priorit/.test(t)) {
    const focus =
      pain.area && pain.level != null
        ? `${pain.area} (about ${pain.level}/10)`
        : regions;
    return `${name}, start with calm control and comfort in ${focus}. Keep sessions near ${ctx.minutes} minutes at a ${ctx.difficulty} effort, protect sharp pain spikes, and build consistency before intensity.${disclaimer}`;
  }

  if (/pain|hurt|sore|okay to (move|exercise)|safe to/.test(t)) {
    const levelNote =
      pain.level != null
        ? `You reported about ${pain.level}/10${pain.area ? ` in the ${pain.area}` : ""}. `
        : "";
    return `${name}, ${levelNote}mild productive discomfort (often ≤3/10 and settling within ~24 hours) can be okay during mobility work. Sharp, escalating, or lingering pain—especially if worse hours later—means ease range, slow the dose, or swap the movement. Traffic-light rule: green = proceed, yellow = modify, red = stop and reassess.${disclaimer}`;
  }

  if (/how often|frequency|schedule|how many|days/.test(t)) {
    return `${name}, most home mobility plans work best with short practice most days (about ${ctx.minutes} minutes). Aim for quality technique over heroic volume. If symptoms flare for more than a day, cut volume by ~30–50% and keep gentle movement rather than full rest when possible.${disclaimer}`;
  }

  if (/avoid|don.?t|contraindic|precaut|surgery|implant/.test(t)) {
    const safetyBits: string[] = [];
    if (ctx.precautionIds.length || ctx.implantIds.length) {
      safetyBits.push(
        "honor any post-op, weight-bearing, or implant precautions you listed"
      );
    }
    if (conds.some((c) => /post|surg|replace|fracture/i.test(c))) {
      safetyBits.push("respect surgical/healing timelines from your care team");
    }
    safetyBits.push("avoid forcing end-range into sharp pain");
    safetyBits.push("skip ballistic bouncing and breath-holding");
    return `${name}, for now: ${safetyBits.join("; ")}. Your clinician’s protocol always overrides this app.${disclaimer}`;
  }

  if (/how long|recover|better|weeks|timeline|progress/.test(t)) {
    return `${name}, meaningful change often shows in 2–6 weeks of consistent, well-dosed practice—not overnight. Track how daily tasks feel (sit, stand, walk, sleep) more than a single session. If red-flag symptoms appear (unexplained weakness, bowel/bladder change, fever with severe pain, trauma with inability to bear weight), seek in-person care promptly.${disclaimer}`;
  }

  if (/heat|ice|cold|modalit|tens|foam/.test(t)) {
    return `${name}, stiffness often pairs with brief heat then mobility; irritable or post-load flares often pair with relative rest and optional short cold. Modalities should enable movement—not replace progressive loading. Check your Modalities hub for timing relative to sessions and visits.${disclaimer}`;
  }

  if (/story|suggest|mean|clinical|what.?s wrong|diagnos/.test(t) || /what does/.test(t)) {
    const parts: string[] = [];
    if (story) {
      parts.push(
        `from your words, we hear a focus on ${regions}${
          descs.length ? ` with sensations like ${descs.slice(0, 3).join(", ")}` : ""
        }`
      );
    } else {
      parts.push(`you have not written much yet—add location, sensations, and goals`);
    }
    if (conds.length) parts.push(`matched themes include ${conds.slice(0, 3).join(", ")}`);
    if (meds) parts.push(`you noted medications such as ${meds}`);
    if (ctx.goals.length) parts.push(`your goals include ${ctx.goals.slice(0, 3).join(", ")}`);
    return `${name}, ${parts.join("; ")}. That guides a graded plan of care—not a medical diagnosis. Complete the body/pain and safety steps so dosing stays realistic.${disclaimer}`;
  }

  if (/stretch|exercise|strength|movement|kinds?/.test(t)) {
    const kinds =
      ctx.preferKinds === "auto"
        ? "a mix of mobility and controlled strength based on your story"
        : ctx.preferKinds.join(" + ");
    return `${name}, this assessment builds ${kinds} around ${regions}, dosed for about ${ctx.minutes} minutes at ${ctx.difficulty} difficulty${
      ctx.homeBasedProgram ? " with home-friendly variations" : ""
    }. Quality form and symptom response matter more than max intensity.${disclaimer}`;
  }

  if (/med|medication|drug|pill/.test(t)) {
    return `${name}, ${
      meds
        ? `you listed ${meds}. `
        : "you can name medications in your story or the medication list. "
    }Medications help the clinical picture (e.g. blood thinners, pain meds) but dosing advice stays with your prescriber. Never change meds based on this app.${disclaimer}`;
  }

  // Generic contextual reply
  const summaryBits = [
    regions !== "the areas you care about most" ? `regions: ${regions}` : null,
    pain.level != null ? `top pain ~${pain.level}/10` : null,
    ctx.goals[0] ? `goal: ${ctx.goals[0]}` : null,
    story ? "story on file" : "add more to your story for richer answers",
  ].filter(Boolean);

  return `${name}, thanks for asking. With what we know (${summaryBits.join(
    "; "
  )}), keep the plan graded, pain-aware, and consistent. Try a suggested question below or rephrase with more detail about what you want to understand.${disclaimer}`;
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
  paragraphs.push(problemBits.join(" "));

  paragraphs.push(
    `Goal of care: support “${goals}” with a ${routine.difficulty} home program of about ${routine.estimatedMinutes} minutes (${routine.items.length} movements: ${stretchItems.length} mobility, ${exerciseItems.length} strength/control)${
      routine.homeBasedProgram ? ", using home-friendly variations" : ""
    }.`
  );

  paragraphs.push(
    `Approach to attack the issue: (1) calm irritable tissues and restore comfortable range in ${regions}; (2) rebuild control and capacity so daily tasks feel safer; (3) progress only when symptoms settle within ~24 hours; (4) pair movement with simple pre/post strategies (pacing, optional heat/ice) rather than pushing through red-flag pain.`
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
