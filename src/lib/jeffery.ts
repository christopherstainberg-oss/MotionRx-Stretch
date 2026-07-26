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
import {
  getDescriptorsByIds,
  matchDescriptorsFromText,
  summarizeDescriptors,
} from "@/data/pain-descriptors";
import {
  matchConditionsFromText,
  summarizeConditions,
} from "@/data/clinical-conditions";
import {
  buildVisitModalityPlan,
  modalityCoachBlurb,
} from "@/lib/modality-engine";
import {
  analyzeJefferyIntelligence,
  enrichJefferyLocalContent,
} from "@/lib/jeffery-intelligence";
import { sampleTherapeuticQuestions } from "@/data/therapeutic-question-catalog";

const OPEN_ENDED = [
  "On a scale of 0–10, what is your pain right now, and what makes it better or worse?",
  "Which daily activity feels hardest this week—and what about it is hard?",
  "When you finish a session, do you feel better, the same, or more irritated 2 hours later?",
  "Are you noticing stiffness more in the morning, after sitting, or after activity?",
  "If we change only one thing next session (easier, shorter, or more control work), what would help most?",
  "What progress would feel meaningful to you over the next two weeks?",
  "If you told your PT or counselor one honest sentence about today, what would it be?",
  "What is one win from this week—even a small one—that we should protect in your plan?",
  "Is fear of movement, sleep, or stress shaping whether you feel ready to progress?",
  "What support (pacing, rest, people, environment) helped most when symptoms rose?",
  ...sampleTherapeuticQuestions(12, "jeffery-open", { preferCurated: true }).map((q) => q.question),
];

/**
 * Explicit 0–10 only. Never invent scores from “severe/moderate/mild” language.
 */
function extractPain(text: string): number | undefined {
  const t = text.toLowerCase();
  const scale = t.match(/\b(\d{1,2})\s*(?:\/\s*10|out of\s*10)\b/);
  if (scale) {
    const n = Number(scale[1]);
    if (n >= 0 && n <= 10) return n;
  }
  const rated = t.match(
    /\b(?:pain|hurt|ache|level|rated?|score|intensity)\s*(?:is|was|at|of|around|about|=|:)?\s*(?:a\s+)?(\d{1,2})\b/i
  );
  if (rated) {
    const idx = rated.index ?? 0;
    const after = t.slice(idx + rated[0].length, idx + rated[0].length + 16);
    if (/^\s*(?:weeks?|months?|days?|years?|hrs?|hours?)\b/i.test(after)) return undefined;
    const n = Number(rated[1]);
    if (n >= 0 && n <= 10) return n;
  }
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
  if (t.includes("modalit")) {
    return "Modalities (heat, ice, TENS education, soft-tissue tools, pacing, pre/post-visit prep) are short-term adjuncts. Outpatient PT standards use them to enable movement—not replace progressive loading. Stiffness often pairs with brief heat then mobility; irritable/post-load flares often pair with relative rest, traffic-light pain rules, and optional short cold. Clinic procedures (ultrasound, manual therapy, needling) should be PT-directed and always paired with a home exercise plan.";
  }
  return "Rehab standards emphasize graded exposure: enough challenge to adapt, enough recovery to avoid flare-ups. Warm-up, quality technique, pain-aware dosing, and functional goals guide progression—similar to a clinic plan of care.";
}

export interface JefferyContext {
  routines: Routine[];
  sessions: SessionLog[];
  journal: JournalEntry[];
  favorites?: string[];
  thread?: JefferyThread | null;
  painDescriptorIds?: string[];
  /** Correlated clinical intake from Assessment */
  sex?: string;
  pastMedicalHistory?: string;
  currentMedicalHistory?: string;
  freeText?: string;
  preferredName?: string;
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
  if (
    /heat|ice|modalit|tens|ultrasound|flare|pre-?visit|post-?visit|foam roll|pacing|compression/i.test(
      lower
    )
  ) {
    topics.push("modalities");
  }
  if (!topics.length) topics.push("rehab-basics");

  const chatDesc = matchDescriptorsFromText(userText, 6);
  const profileDesc = ctx.painDescriptorIds || ctx.thread?.lastDescriptorIds || [];
  const routineDesc = ctx.routines.flatMap((r) => r.generatedFrom?.painDescriptorIds || []);
  const descIds = Array.from(new Set([...chatDesc, ...profileDesc, ...routineDesc])).slice(0, 16);
  const descHints = summarizeDescriptors(descIds);
  const descLabels = getDescriptorsByIds(descIds)
    .map((d) => d.label)
    .slice(0, 8);

  const chatCond = matchConditionsFromText(userText, 8);
  const routineCond = ctx.routines.flatMap((r) => r.generatedFrom?.conditionIds || []);
  const condIds = Array.from(new Set([...chatCond, ...routineCond])).slice(0, 12);
  const condHints = summarizeConditions(condIds);

  const adjustments = ctx.routines.flatMap((r) =>
    r.selfAdjustHistory.map(
      (a) => `${r.name}: ${a.action} — ${a.details} (${a.source || "system"})`
    )
  );
  let journalBridge: {
    summary?: string;
    question?: string;
    signal?: string;
    pain?: number;
  } | null = null;
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    try {
      const raw = (globalThis as unknown as { localStorage?: Storage }).localStorage?.getItem(
        "jeffery-journal-bridge"
      );
      if (raw) journalBridge = JSON.parse(raw);
    } catch {
      journalBridge = null;
    }
  }

  let historyBridge: {
    sex?: string;
    pastMedicalHistory?: string;
    currentMedicalHistory?: string;
    freeText?: string;
    preferredName?: string;
  } | null = null;
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    try {
      const raw = (globalThis as unknown as { localStorage?: Storage }).localStorage?.getItem(
        "clinical-history-profile"
      );
      if (raw) historyBridge = JSON.parse(raw);
    } catch {
      historyBridge = null;
    }
  }
  const sex = ctx.sex || historyBridge?.sex;
  const pmh = ctx.pastMedicalHistory || historyBridge?.pastMedicalHistory;
  const cmh = ctx.currentMedicalHistory || historyBridge?.currentMedicalHistory;
  const story = ctx.freeText || historyBridge?.freeText;
  const preferred =
    ctx.preferredName ||
    historyBridge?.preferredName ||
    (typeof globalThis !== "undefined" && "localStorage" in globalThis
      ? (globalThis as unknown as { localStorage?: Storage }).localStorage?.getItem(
          "preferredName"
        ) || undefined
      : undefined);

  const known = [
    ...adjustments.slice(-8),
    ...ctx.journal.slice(0, 5).map((j) => {
      const bits = [
        `Journal “${j.title}”: pain ${j.painOverall}/10`,
        j.mood != null ? `mood ${j.mood}/5` : null,
        j.progressionSignal ? `signal ${j.progressionSignal}` : null,
        j.didWell ? `win: ${j.didWell.slice(0, 60)}` : null,
        j.planAdjusted ? "adjusted plan" : null,
      ].filter(Boolean);
      return bits.join(" · ");
    }),
    ...ctx.sessions.slice(0, 3).map(
      (s) =>
        `Session ${new Date(s.startedAt).toLocaleDateString()}: pain ${s.averagePainBefore}→${s.averagePainAfter}`
    ),
    ...(descLabels.length
      ? [`Pain descriptors in your record: ${descLabels.join(", ")}`]
      : []),
    ...(journalBridge?.summary
      ? [`Latest journal bridge: ${journalBridge.summary.slice(0, 180)}`]
      : []),
    ...(journalBridge?.question
      ? [`Open journal question: ${journalBridge.question}`]
      : []),
    ...(preferred ? [`Preferred name: ${preferred}`] : []),
    ...(sex ? [`Sex context: ${sex}`] : []),
    ...(pmh ? [`Past medical history: ${pmh.slice(0, 160)}`] : []),
    ...(cmh ? [`Current medical history: ${cmh.slice(0, 160)}`] : []),
    ...(story ? [`Assessment story: ${story.slice(0, 160)}`] : []),
    ...ctx.routines
      .slice(0, 2)
      .flatMap((r) => {
        const g = r.generatedFrom;
        if (!g) return [] as string[];
        const bits: string[] = [];
        if (g.writtenApproach) bits.push(`Plan approach: ${g.writtenApproach.slice(0, 140)}`);
        if (g.pastMedicalHistory) bits.push(`Plan PMH: ${g.pastMedicalHistory.slice(0, 100)}`);
        if (g.currentMedicalHistory)
          bits.push(`Plan current Hx: ${g.currentMedicalHistory.slice(0, 100)}`);
        return bits;
      }),
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
      painDescriptorIds: descIds,
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

  // Describe Your Issue–grade intelligence over chat + assessment story
  const priorMsgs = ctx.thread?.messages || [];
  const threadForIntel = [
    ...priorMsgs,
    {
      id: "live-user",
      role: "user" as const,
      content: userText,
      createdAt: new Date().toISOString(),
    },
  ];
  const intel = analyzeJefferyIntelligence(threadForIntel, {
    preferredName: preferred || undefined,
    assessmentStory: story || undefined,
    journalBridge: journalBridge?.summary,
    painOverall: pain ?? ctx.journal[0]?.painOverall,
    mood: ctx.journal[0]?.mood,
  });

  const intelQuestion =
    intel.adaptiveQuestions[0]?.question ||
    OPEN_ENDED[Math.floor(Math.random() * OPEN_ENDED.length)]!;

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

  const painForMods =
    pain ??
    intel.painNow ??
    ctx.sessions[0]?.averagePainAfter ??
    ctx.journal[0]?.painOverall ??
    3;
  const modalityPlan = buildVisitModalityPlan({
    painScore: painForMods,
    descriptorIds: descIds,
    experienceText: userText,
    recentSessions: ctx.sessions,
    recentJournal: ctx.journal,
  });
  const modalityBlurb = modalityCoachBlurb(modalityPlan);

  const greeting = preferred
    ? `Hi **${preferred}**, I'm **Jeffery**, your MotionRx Stretch clinical mobility coach.`
    : `Hi, I'm **Jeffery**, your MotionRx Stretch clinical mobility coach.`;

  const irrNote =
    intel.story.irritability !== "unknown"
      ? `Story irritability: **${intel.story.irritability}**${
          intel.story.irritabilitySource === "assumed" ? " (assumed until more detail)" : ""
        }.`
      : "";

  let content = [
    greeting,
    ``,
    `I read what you shared and correlated it with your Assessment story, sex/medical history (when provided), routines, sessions, journal, pain descriptors, and modality suggestions.`,
    known.length
      ? `**What I already know about your program:**\n${known
          .slice(0, 12)
          .map((k) => `• ${k}`)
          .join("\n")}`
      : `I don't have much history yet—complete Assessment (including sex & medical history) and Journal so I can personalize more.`,
    `\n**Conversation intel:** ${intel.intelligenceGrade} (${intel.completeness}/100) · themes ${intel.coveredThemes.length}/12${
      intel.planFeedback !== "unknown" ? ` · plan feedback: ${intel.planFeedback}` : ""
    }. ${irrNote}`,
    descLabels.length
      ? `\n**Descriptor-driven dosing hints:** stretch bias ${descHints.stretchBias.toFixed(2)}, exercise bias ${descHints.exerciseBias.toFixed(2)}, irritability boost +${descHints.effectivePainBoost.toFixed(1)}.${descHints.biases.length ? ` Biases: ${descHints.biases.slice(0, 5).join(", ")}.` : ""}`
      : "",
    condIds.length
      ? `\n**Clinical conditions detected:** ${condHints.summaryLines.slice(0, 6).join("; ")}.${condHints.subcategories.length ? ` Sub-categories: ${condHints.subcategories.slice(0, 4).join(", ")}.` : ""}${condHints.clearanceRequired ? " Clearance-sensitive: keep volume conservative and follow licensed clinician guidance." : ""}`
      : "",
    condHints.clinicalOutcomes.length
      ? `\n**Realistic outcome targets for your program:**\n${condHints.clinicalOutcomes
          .slice(0, 4)
          .map(
            (o) =>
              `• **${o.label}** (${o.timeframe}) — ${o.evidenceNote} _Track: ${o.measureHint}_`
          )
          .join("\n")}`
      : "",
    descHints.redFlags.length || condHints.redFlags.length || intel.safetyHints.length
      ? `\n**Safety notes:** ${
          [...descHints.redFlags, ...condHints.redFlags, ...intel.safetyHints][0]
        }`
      : "",
    ``,
    `**Clinical education:**\n${edu}`,
    pain !== undefined
      ? `\nYou mentioned pain around **${pain}/10**. We'll treat that as a dosing signal alongside your descriptors.`
      : intel.painNow != null
        ? `\nFrom your conversation/story, pain **${intel.painNow}/10** is on record as stated.`
        : "",
    adjustedRoutine
      ? `\n**I adjusted / drafted your program based on this discussion.**\n${routineLines || adjustedRoutine.name}\n\n_Open the Routines or Builder page to review, rotate items, or start a session._`
      : active
        ? `\n**Current focus program:** ${active.name} (${active.items?.length || active.stretchIds.length} movements). Tell me if it's too easy, too hard, or if pain changed.`
        : `\nDescribe your main issue in a short paragraph and I can draft a stretch + exercise plan.`,
    ``,
    modalityBlurb,
    ``,
    `**Question for you:** ${intelQuestion}`,
    ``,
    `_Educational support only—not a medical diagnosis. Seek licensed care for red flags (chest pain, progressive weakness, bowel/bladder changes, trauma, fever with back pain)._`,
  ]
    .filter(Boolean)
    .join("\n");

  const enriched = enrichJefferyLocalContent(content, intel, preferred || undefined);
  content = enriched.content;
  const openEndedQuestion = enriched.openEndedQuestion;

  return {
    message: {
      id: uuid(),
      role: "jeffery",
      content,
      createdAt: new Date().toISOString(),
      meta: {
        painMentioned: pain ?? intel.painNow,
        adjustedRoutineId: adjustedRoutine?.id,
        openEndedQuestion,
        clinicalTopics: topics,
        suggestedModalityIds: [
          ...modalityPlan.preVisit.slice(0, 3),
          ...modalityPlan.postVisit.slice(0, 3),
        ].map((m) => m.modalityId),
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
        content: [
          "Hi, I'm **Jeffery** — your continuous clinical coach.",
          "",
          "I'll interview you like a careful outpatient eval (same intelligence style as **Describe Your Issue**):",
          "• What bothers you most",
          "• Pain 0–10 only if you state it (I won't invent a score)",
          "• What makes it worse / better",
          "• How you feel 2–24 hours after activity",
          "• Goals, sleep, stress, and plan dosing feedback",
          "",
          "**Question for you:** What is bothering you most right now—and how does it show up in a typical day?",
          "",
          "_Educational support only—not a diagnosis. Seek urgent care for red-flag symptoms._",
        ].join("\n"),
        createdAt: new Date().toISOString(),
        meta: {
          openEndedQuestion:
            "What is bothering you most right now—and how does it show up in a typical day?",
        },
      },
    ],
    knownAdjustments: [],
    knownCustomItems: [],
    updatedAt: new Date().toISOString(),
  };
}
