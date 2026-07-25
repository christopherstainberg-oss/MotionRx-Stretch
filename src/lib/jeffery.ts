import type {
  JefferyMessage,
  JefferyThread,
  JournalEntry,
  Routine,
  SessionLog,
  SymptomInput,
} from "@/lib/types";
import { generateHybridPlan, adjustRoutineFromFeedback } from "@/lib/plan-engine";
import { v4 as uuid } from "uuid";
import { getStretchById } from "@/data/stretch-library";
import { getExerciseById } from "@/data/exercise-library";

const OPEN_ENDED = [
  "On a scale of 0–10, what is your pain right now, and what makes it better or worse?",
  "Which daily activity feels hardest this week—and what about it is hard?",
  "When you finish a session, do you feel better, the same, or more irritated 2 hours later?",
  "Are you noticing stiffness more in the morning, after sitting, or after activity?",
  "If we change only one thing next session (easier, shorter, or more control work), what would help most?",
  "What progress would feel meaningful to you over the next two weeks?",
];

function extractPain(text: string): number | undefined {
  const m = text.match(/\b([0-9]|10)\s*\/\s*10\b/) || text.match(/pain\s*(?:is|=|:)?\s*([0-9]|10)\b/i);
  if (m) return Math.min(10, Number(m[1]));
  if (/severe|unbearable|worst/i.test(text)) return 8;
  if (/moderate/i.test(text)) return 4;
  if (/mild|slight|little/i.test(text)) return 2;
  return undefined;
}

function clinicalEducation(topic: string): string {
  const t = topic.toLowerCase();
  if (t.includes("pain")) {
    return "In outpatient PT, we treat pain as useful data—not a score to “push through.” Mild productive discomfort (often ≤3/10) can be OK for mobility; sharp, escalating, or lingering pain (especially if worse hours later) means we modify load, range, or exercise selection.";
  }
  if (t.includes("stretch")) {
    return "Stretching improves comfort with range when dosed well. Static holds often fit after activity or for general flexibility goals; dynamic mobility often fits before activity. More aggressive is not always better—tissue adaptation prefers consistent, tolerable practice.";
  }
  if (t.includes("strength") || t.includes("exercise")) {
    return "Strength and motor-control exercises rebuild capacity so tissues tolerate daily demands. Outpatient progressions typically move from activation → controlled strength → functional tasks (sit-to-stand, steps, carries) while watching form and symptom response.";
  }
  if (t.includes("posture") || t.includes("desk")) {
    return "Posture is less about a perfect pose and more about changing positions often, building mid-back/shoulder endurance, and pairing mobility with strength. Micro-breaks every 30–60 minutes often help more than one long stretch session.";
  }
  return "Rehab standards emphasize graded exposure: enough challenge to adapt, enough recovery to avoid flare-ups. Warm-up, quality technique, pain-aware dosing, and functional goals guide progression—similar to a clinic plan of care.";
}

export interface JefferyContext {
  routines: Routine[];
  sessions: SessionLog[];
  journal: JournalEntry[];
  favorites?: string[];
  thread?: JefferyThread | null;
}

export interface JefferyReply {
  message: JefferyMessage;
  adjustedRoutine?: Routine;
  openEndedQuestion: string;
  clinicalTopics: string[];
}

/** Offline-capable clinical coach (always available). Enhanced when XAI_API_KEY is set. */
export function jefferyLocalReply(
  userText: string,
  ctx: JefferyContext
): JefferyReply {
  const pain = extractPain(userText);
  const lower = userText.toLowerCase();
  const topics: string[] = [];
  if (lower.includes("pain")) topics.push("pain");
  if (lower.includes("stretch")) topics.push("stretching");
  if (lower.includes("exercise") || lower.includes("strength")) topics.push("exercise");
  if (lower.includes("desk") || lower.includes("posture")) topics.push("posture");
  if (!topics.length) topics.push("rehab-basics");

  const adjustments = ctx.routines.flatMap((r) =>
    r.selfAdjustHistory.map(
      (a) => `${r.name}: ${a.action} — ${a.details} (${a.source || "system"})`
    )
  );
  const known = [
    ...adjustments.slice(-8),
    ...ctx.journal.slice(0, 3).map((j) => `Journal “${j.title}”: pain ${j.painOverall}/10`),
    ...ctx.sessions.slice(0, 3).map(
      (s) =>
        `Session ${new Date(s.startedAt).toLocaleDateString()}: pain ${s.averagePainBefore}→${s.averagePainAfter}`
    ),
  ];

  let adjustedRoutine: Routine | undefined;
  const active = ctx.routines.find((r) => r.isPersonalized) || ctx.routines[0];

  if (active && (pain !== undefined || /too hard|too easy|flare|worse|easier|progress/i.test(userText))) {
    if (pain !== undefined && pain >= 6) {
      adjustedRoutine = adjustRoutineFromFeedback(active, {
        averagePainBefore: pain,
        averagePainAfter: pain,
        difficultyFelt: 4,
      });
      adjustedRoutine = {
        ...adjustedRoutine,
        selfAdjustHistory: [
          ...adjustedRoutine.selfAdjustHistory,
          {
            at: new Date().toISOString(),
            reason: "Jeffery conversation — elevated pain",
            painFactor: pain,
            action: "jeffery",
            details: `User reported pain ~${pain}/10 in chat with Jeffery. Program regressed toward safer dosing.`,
            source: "jeffery",
          },
        ],
      };
    } else if (/too easy|progress|stronger|more challenge/i.test(userText)) {
      adjustedRoutine = adjustRoutineFromFeedback(active, {
        averagePainBefore: pain ?? 2,
        averagePainAfter: pain ?? 2,
        difficultyFelt: 1,
      });
      adjustedRoutine.selfAdjustHistory.push({
        at: new Date().toISOString(),
        reason: "Jeffery conversation — readiness to progress",
        painFactor: pain ?? 2,
        action: "jeffery",
        details: "User indicated program feels easy; modest clinical progression applied.",
        source: "jeffery",
      });
    } else if (/too hard|flare|worse|irritat/i.test(userText)) {
      adjustedRoutine = adjustRoutineFromFeedback(active, {
        averagePainBefore: pain ?? 5,
        averagePainAfter: (pain ?? 5) + 1,
        difficultyFelt: 5,
      });
      adjustedRoutine.selfAdjustHistory.push({
        at: new Date().toISOString(),
        reason: "Jeffery conversation — symptom flare language",
        painFactor: pain ?? 5,
        action: "jeffery",
        details: "User described aggravation; intensity/volume eased per rehab standards.",
        source: "jeffery",
      });
    }
  }

  // Offer a mini plan if user describes a new problem and has no routine
  if (!active && userText.length > 40) {
    const input: SymptomInput = {
      areas: [],
      symptoms: [],
      painLevels: {},
      goals: [],
      availableMinutes: 15,
      difficulty: "beginner",
      concernParagraph: userText,
      preferKinds: "auto",
    };
    adjustedRoutine = generateHybridPlan(input);
    adjustedRoutine.selfAdjustHistory.push({
      at: new Date().toISOString(),
      reason: "Jeffery created initial plan from discussion",
      painFactor: pain ?? 3,
      action: "jeffery",
      details: "Generated hybrid stretch/exercise plan from conversation narrative.",
      source: "jeffery",
    });
  }

  const openEndedQuestion = OPEN_ENDED[Math.floor(Math.random() * OPEN_ENDED.length)]!;
  const edu = topics.map((t) => clinicalEducation(t)).join("\n\n");

  const routineLines = (adjustedRoutine || active)?.items
    ?.slice(0, 6)
    .map((i) => {
      const m =
        i.kind === "stretch" ? getStretchById(i.movementId) : getExerciseById(i.movementId);
      return m
        ? `• ${m.name} (${i.kind}) — ${m.clinical.whyImportant}`
        : `• ${i.movementId}`;
    })
    .join("\n");

  const content = [
    `Hi, I'm **Jeffery**, your MotionRx Stretch clinical mobility coach.`,
    ``,
    `I read what you shared and connected it with your app data (routines, adjustments, sessions, and journal when available).`,
    known.length
      ? `**What I already know about your program:**\n${known
          .slice(0, 6)
          .map((k) => `• ${k}`)
          .join("\n")}`
      : `I don't have much history yet—we'll build it as you train and journal.`,
    ``,
    `**Clinical education:**\n${edu}`,
    pain !== undefined
      ? `\nYou mentioned pain around **${pain}/10**. We'll treat that as a dosing signal.`
      : "",
    adjustedRoutine
      ? `\n**I adjusted / drafted your program based on this discussion.**\n${routineLines || adjustedRoutine.name}\n\n_Open the Routines or Builder page to review, rotate items, or start a session._`
      : active
        ? `\n**Current focus program:** ${active.name} (${active.items?.length || active.stretchIds.length} movements). Tell me if it's too easy, too hard, or if pain changed.`
        : `\nDescribe your main issue in a short paragraph and I can draft a stretch + exercise plan.`,
    ``,
    `**Question for you:** ${openEndedQuestion}`,
    ``,
    `_Educational support only—not a medical diagnosis. Seek licensed care for red flags (chest pain, progressive weakness, bowel/bladder changes, trauma, fever with back pain)._`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    message: {
      id: uuid(),
      role: "jeffery",
      content,
      createdAt: new Date().toISOString(),
      meta: {
        painMentioned: pain,
        adjustedRoutineId: adjustedRoutine?.id,
        openEndedQuestion,
        clinicalTopics: topics,
      },
    },
    adjustedRoutine,
    openEndedQuestion,
    clinicalTopics: topics,
  };
}

/** Optional SpaceXAI enhancement when XAI_API_KEY is present */
export async function jefferyReply(
  userText: string,
  ctx: JefferyContext
): Promise<JefferyReply> {
  const local = jefferyLocalReply(userText, ctx);
  const key = process.env.XAI_API_KEY;
  if (!key) return local;

  try {
    const system = `You are Jeffery, a clinically careful physical therapy education coach inside MotionRx Stretch.
Use outpatient PT standards: pain-aware dosing, warm-up/cool-down, graded exposure, realistic goals.
Never diagnose. Encourage licensed care for red flags.
You know the user's adjustments and history provided in context.
Ask one open-ended question at the end.
Keep answers clear, compassionate, and practical.`;

    const contextBlock = JSON.stringify({
      recentAdjustments: ctx.routines.flatMap((r) => r.selfAdjustHistory).slice(-6),
      sessions: ctx.sessions.slice(0, 5),
      journal: ctx.journal.slice(0, 3).map((j) => ({
        title: j.title,
        pain: j.painOverall,
        body: j.body.slice(0, 200),
      })),
      localDraft: local.message.content.slice(0, 500),
    });

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-4-1-fast-non-reasoning",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Context:\n${contextBlock}\n\nUser message:\n${userText}`,
          },
        ],
        temperature: 0.5,
      }),
    });

    if (!res.ok) return local;
    const data = await res.json();
    const text =
      data.choices?.[0]?.message?.content ||
      data.output_text ||
      local.message.content;

    return {
      ...local,
      message: {
        ...local.message,
        content: String(text),
      },
    };
  } catch {
    return local;
  }
}

export function newThread(userId: string): JefferyThread {
  return {
    id: uuid(),
    userId,
    messages: [
      {
        id: uuid(),
        role: "jeffery",
        content:
          "Hi, I'm **Jeffery**. Tell me what is bothering you (a short paragraph is perfect), how your pain feels today (0–10), and what you want to get back to doing. I can educate you, ask helpful questions, and adjust your stretch/exercise plan based on our discussion.",
        createdAt: new Date().toISOString(),
      },
    ],
    knownAdjustments: [],
    knownCustomItems: [],
    updatedAt: new Date().toISOString(),
  };
}
