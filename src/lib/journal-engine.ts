/**
 * Daily journal analysis: progression signals, coach feedback, and plan effects.
 * Correlates with pain profile, active routine, sessions, descriptors, and Jeffery.
 */

import type {
  BodyPart,
  JournalEntry,
  JournalProgressionSignal,
  Routine,
  SessionLog,
} from "@/lib/types";
import { adjustRoutineFromFeedback, applyHomeBasedProgram } from "@/lib/plan-engine";
import { analyzeAssessmentAdjectives } from "@/data/assessment-adjectives";
import { matchDescriptorsFromText } from "@/data/pain-descriptors";
import { matchConditionsFromText } from "@/data/clinical-conditions";
import { summarizeClinicalSymptoms } from "@/data/clinical-symptoms";
import { summarizeAdlEntries, type UserAdlEntry } from "@/data/adls";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import { ALL_THERAPEUTIC_QUESTIONS } from "@/data/therapeutic-questions";
import { sampleTherapeuticQuestions } from "@/data/therapeutic-question-catalog";
import { analyzeJournalIntelligence } from "@/lib/journal-intelligence";
import { buildSleepCorrelation } from "@/lib/psqi";
import { parseInjuryTimeline } from "@/lib/injury-timeline";

export type JournalPrompt = {
  id: string;
  label: string;
  text: string;
  category: "morning" | "evening" | "session" | "feelings" | "function";
};

export const JOURNAL_STARTERS: JournalPrompt[] = [
  {
    id: "morning-body",
    label: "Morning check-in",
    category: "morning",
    text: "This morning my body feels… The first thing I noticed when I got up was…",
  },
  {
    id: "evening-close",
    label: "Evening wind-down",
    category: "evening",
    text: "Today I moved by… What stood out about my pain or stiffness was… Tonight I want to remember…",
  },
  {
    id: "after-session",
    label: "After my session",
    category: "session",
    text: "After today's routine I feel… During the session the hardest part was… Two hours later I notice…",
  },
  {
    id: "pain-story",
    label: "Pain story",
    category: "feelings",
    text: "My pain today is about _/10. It feels (words)… It is worse when… It eases when…",
  },
  {
    id: "function-win",
    label: "Function & wins",
    category: "function",
    text: "One daily task that went better was… One task that was still hard was… I am proud that I…",
  },
  {
    id: "stress-sleep",
    label: "Stress, sleep & mood",
    category: "feelings",
    text: "My energy today is… Sleep last night was… Stress showed up as… What helped me cope was…",
  },
  {
    id: "fear-confidence",
    label: "Fear & confidence",
    category: "feelings",
    text: "A movement I felt confident with was… A movement I avoided or feared was… Next time I might try…",
  },
  {
    id: "counselor-style",
    label: "Thoughts & feelings",
    category: "feelings",
    text: "What I need someone to understand about today is… If my therapist asked how I'm coping, I would say…",
  },
];

export const JOURNAL_IMPORTANT_FIELDS = [
  "Overall pain (0–10) and where it is",
  "What you did for movement today (session or daily life)",
  "ADLs that were hard today (stairs, dressing, walking, desk work)",
  "Clinically notable symptoms (swelling, radiating pain, night pain, fatigue)",
  "What went well — even small wins",
  "What still bothers you or what to change next",
  "Mood, energy, and sleep (they change dosing)",
  "Medications, flares, or new medical advice if relevant",
  "Any red-flag symptoms (new weakness, bowel/bladder, chest pain — seek care)",
];

export type JournalAnalysis = {
  signal: JournalProgressionSignal;
  reasons: string[];
  wins: string[];
  improvements: string[];
  jefferySummary: string;
  jefferyQuestion: string;
  /** 1–5 perceived session difficulty for plan engine */
  difficultyFelt: 1 | 2 | 3 | 4 | 5;
  painForPlan: number;
  tags: string[];
  symptomSuggestions: string[];
  adlTips: string[];
  clinicalSymptomIds: string[];
  adlEntries: UserAdlEntry[];
};

/** Jeffery follow-ups: curated + virtual catalog sample + PT classics */
const THERAPIST_QUESTIONS = [
  ...ALL_THERAPEUTIC_QUESTIONS.slice(0, 20).map((q) => q.question),
  ...sampleTherapeuticQuestions(40, "jeffery-bank", { preferCurated: false }).map((q) => q.question),
  "If you described today to your PT in one sentence, what would you want them to know first?",
  "What activity do you most want to return to, and what about it still feels out of reach?",
  "When symptoms flare, what is your usual first response—and does it help for more than an hour?",
  "On a scale of 0–10, how confident do you feel doing your home program without supervision?",
  "Is there a fear about movement we should name out loud so we can plan around it safely?",
  "What support (rest, pacing, people, environment) made the biggest difference this week?",
  "If pain were a messenger, what do you think it is asking you to change for the next 48 hours?",
  "How is your sleep or stress affecting whether you feel ready to progress or need to hold?",
];

function hashPick<T>(items: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997;
  return items[h % items.length]!;
}

export function analyzeJournalEntry(input: {
  title: string;
  body: string;
  painOverall: number;
  mood: number;
  energy?: number;
  sleepQuality?: number;
  didWell?: string;
  improveNext?: string;
  flexibilityNote?: string;
  sessionCompleted?: boolean;
  previousEntries?: JournalEntry[];
  recentSessions?: SessionLog[];
  clinicalSymptomIds?: string[];
  adlEntries?: UserAdlEntry[];
}): JournalAnalysis {
  const text = `${input.title} ${input.body} ${input.didWell || ""} ${input.improveNext || ""} ${input.flexibilityNote || ""}`;
  const lower = text.toLowerCase();
  const adj = analyzeAssessmentAdjectives(text);
  const sx = summarizeClinicalSymptoms(input.clinicalSymptomIds || []);
  const adl = summarizeAdlEntries(input.adlEntries || []);
  const reasons: string[] = [];
  let signal: JournalProgressionSignal = "maintain";
  let difficultyFelt: 1 | 2 | 3 | 4 | 5 = 3;

  const prevPain =
    input.previousEntries?.[0]?.painOverall ??
    input.recentSessions?.[0]?.averagePainAfter ??
    input.painOverall;
  const painDelta = input.painOverall - prevPain;

  if (
    input.painOverall >= 7 ||
    /flare|much worse|can't|cannot|severe|unbearable|emergency|chest pain/i.test(lower)
  ) {
    signal = "flare";
    difficultyFelt = 5;
    reasons.push("High pain or flare language → protect and regress dosing.");
  } else if (
    input.painOverall >= 5 ||
    painDelta >= 2 ||
    /worse|irritat|too hard|overdid|aggravat/i.test(lower) ||
    (input.mood <= 2 && input.painOverall >= 4)
  ) {
    signal = "regress";
    difficultyFelt = 4;
    reasons.push("Rising pain, irritability, or hard effort language → ease volume/intensity.");
  } else if (
    (input.painOverall <= 3 &&
      (input.mood >= 4 || (input.energy ?? 3) >= 4 || input.sessionCompleted) &&
      /better|easier|stronger|progress|improved|proud|win/i.test(lower)) ||
    (/too easy|ready for more|progress/i.test(lower) && input.painOverall <= 4)
  ) {
    signal = "progress";
    difficultyFelt = 2;
    reasons.push("Lower pain with positive function/mood language → modest progression may fit.");
  } else {
    signal = "maintain";
    difficultyFelt = 3;
    reasons.push("Stable pattern → hold current dosing and build consistency.");
  }

  if ((input.sleepQuality ?? 3) <= 2) {
    reasons.push("Poor sleep noted → prefer maintain/short volume even if motivation is high.");
    if (signal === "progress") signal = "maintain";
  }
  if ((input.energy ?? 3) <= 2 && signal === "progress") {
    signal = "maintain";
    reasons.push("Low energy → hold progression until readiness improves.");
  }

  if (adj.irritabilityBoost >= 1.5 && signal === "progress") {
    signal = "maintain";
    reasons.push("Irritable descriptive language → avoid aggressive progression today.");
  }

  if (sx.redFlags.length) {
    signal = "flare";
    difficultyFelt = 5;
    reasons.push(
      `Urgent symptom screen (${sx.redFlags.join(", ")}) → protective dosing and medical review.`
    );
  } else if (sx.irritabilityBoost >= 1.2 || sx.minutesScale <= 0.75) {
    if (signal === "progress") signal = "maintain";
    if (signal === "maintain" && (input.painOverall >= 4 || sx.irritabilityBoost >= 1.5)) {
      signal = "regress";
      difficultyFelt = 4;
    }
    reasons.push("Selected clinical symptoms raise irritability → ease volume/intensity.");
  }

  if (adl.limitedCount >= 3) {
    if (signal === "progress") signal = "maintain";
    reasons.push(
      `${adl.limitedCount} limited ADLs → prefer functional, shorter, home-safe dosing.`
    );
    if (difficultyFelt < 4 && input.painOverall >= 5) difficultyFelt = 4;
  } else if (adl.limitedCount >= 1 && signal === "progress") {
    signal = "maintain";
    reasons.push("ADL limitations present → hold progression while function rebuilds.");
  }

  const wins: string[] = [];
  if (input.sessionCompleted) wins.push("You showed up for movement today—that consistency drives adaptation.");
  if (input.didWell?.trim()) wins.push(`You named a win: “${input.didWell.trim().slice(0, 120)}”.`);
  if (input.painOverall <= 3) wins.push("Pain stayed in a manageable range for graded practice.");
  if (input.mood >= 4) wins.push("Mood looks supportive of engagement and recovery habits.");
  if (/walk|stretch|breath|pace|rest|hydrate|session|routine/i.test(lower)) {
    wins.push("You connected symptoms with real behaviors (movement, pacing, or recovery).");
  }
  if (!wins.length) {
    wins.push("Writing a reflection is itself a clinical skill—tracking patterns helps your plan.");
  }

  const improvements: string[] = [];
  if (input.improveNext?.trim()) {
    improvements.push(`You already set a focus: “${input.improveNext.trim().slice(0, 120)}”.`);
  }
  if (signal === "flare" || signal === "regress") {
    improvements.push("Shorten next session, stay mid-range, and recheck symptoms 2 hours after.");
    improvements.push("Use traffic-light pain rules: green ≤3, yellow 4–5 modify, red ≥6 stop/regress.");
  } else if (signal === "progress") {
    improvements.push("Progress one variable only (reps, hold time, or one harder variation)—not all at once.");
  } else {
    improvements.push("Aim for the same short session tomorrow; consistency beats intensity this week.");
  }
  if ((input.sleepQuality ?? 3) <= 2) {
    improvements.push("Protect a wind-down routine tonight—sleep quality changes next-day irritability.");
  }
  if (!input.sessionCompleted && signal !== "flare") {
    improvements.push("If able, schedule a brief mobility bout (even 5–8 minutes) to keep the plan alive.");
  }
  improvements.push("Note one functional task (stairs, desk hour, walk) to track like a mini outcome measure.");
  for (const tip of sx.suggestions.slice(0, 2)) improvements.push(tip);
  for (const tip of adl.coachingTips.slice(0, 2)) improvements.push(tip);

  const jIntel = analyzeJournalIntelligence(input.body || "", {
    painOverall: input.painOverall,
    mood: input.mood,
    energy: input.energy,
    sleepQuality: input.sleepQuality,
  });

  const jefferyQuestion =
    jIntel.adaptiveQuestions[0]?.question ||
    hashPick(THERAPIST_QUESTIONS, text.slice(0, 40) + String(input.painOverall));

  // Sync PSQI + injury timeline correlation for Jeffery bridge
  let psqiLine = "";
  if (typeof window !== "undefined") {
    const sleep = buildSleepCorrelation();
    if (sleep.hasData) {
      psqiLine = `Sleep PSQI ${sleep.global}/21 (${sleep.bandLabel}) correlated; journal sleep ${input.sleepQuality ?? sleep.journalSleepQuality}/5.`;
    } else if (input.sleepQuality != null) {
      psqiLine = `Journal sleep quality ${input.sleepQuality}/5 (no PSQI yet).`;
    }
  } else if (input.sleepQuality != null) {
    psqiLine = `Journal sleep quality ${input.sleepQuality}/5.`;
  }
  const injuryTl = parseInjuryTimeline(input.body || "");
  const timelineLine =
    injuryTl.source === "stated"
      ? `Injury timeline: ${injuryTl.label} (${injuryTl.tissuePhase}). Progress window: ${injuryTl.progressOutlook[0]?.windowLabel || "n/a"} — ${injuryTl.progressOutlook[0]?.lookFor || ""}.`
      : "";

  const jefferySummary = [
    `I hear you. From today's journal, the plan signal is **${signal}**.`,
    reasons.slice(0, 2).join(" "),
    `Pain logged at **${input.painOverall}/10** (mood ${input.mood}/5${input.energy ? `, energy ${input.energy}/5` : ""}${
      input.sleepQuality != null ? `, sleep ${input.sleepQuality}/5` : ""
    }).`,
    psqiLine,
    timelineLine,
    jIntel.moodWords.length
      ? `Mood language: ${jIntel.moodWords.slice(0, 3).join(", ")}.`
      : "",
    jIntel.copingWords.length
      ? `Coping you named: ${jIntel.copingWords.slice(0, 3).join(", ")}.`
      : "",
    sx.labels.length
      ? `Symptoms noted: ${sx.labels.slice(0, 4).join(", ")}.`
      : "",
    adl.limitedCount
      ? `ADL load: ${adl.limitedCount} limited daily activit${adl.limitedCount === 1 ? "y" : "ies"}.`
      : "",
    jIntel.safetyHints.length
      ? `Safety note: please seek emergency/crisis support if you are in danger — this app is not crisis care.`
      : "",
    signal === "flare"
      ? "We'll treat this as a protective day: easier mobility, less load, and check-in with licensed care if red flags appear."
      : signal === "regress"
        ? "We'll ease dosing so symptoms can settle while you stay gently active."
        : signal === "progress"
          ? "You're showing readiness cues—we can nudge challenge carefully if the next 24 hours stay calm."
          : "Holding steady is a valid clinical choice; maintenance builds durable capacity.",
    jIntel.liveReadLines[1] ? `Journal intel: ${jIntel.liveReadLines[1]}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const tags = [
    signal,
    input.sessionCompleted ? "session-day" : "reflection-day",
    input.painOverall >= 6 ? "high-pain" : input.painOverall <= 2 ? "low-pain" : "mod-pain",
    ...(sx.labels.length ? ["symptoms-logged"] : []),
    ...(adl.limitedCount ? ["adl-limited"] : []),
  ];

  return {
    signal,
    reasons,
    wins: wins.slice(0, 4),
    improvements: Array.from(new Set(improvements)).slice(0, 6),
    jefferySummary,
    jefferyQuestion,
    difficultyFelt,
    painForPlan: input.painOverall,
    tags,
    symptomSuggestions: sx.suggestions.slice(0, 6),
    adlTips: adl.coachingTips.slice(0, 4),
    clinicalSymptomIds: input.clinicalSymptomIds || [],
    adlEntries: input.adlEntries || [],
  };
}

/** Apply journal-derived dosing to the active routine */
export function applyJournalToRoutine(
  routine: Routine,
  analysis: JournalAnalysis,
  entryTitle: string
): { routine: Routine; note: string } | null {
  if (analysis.signal === "maintain") {
    return {
      routine: {
        ...routine,
        selfAdjustHistory: [
          ...routine.selfAdjustHistory,
          {
            at: new Date().toISOString(),
            reason: `Journal “${entryTitle}” — maintain`,
            painFactor: analysis.painForPlan,
            action: "hold",
            details: analysis.reasons.join(" "),
            source: "journal",
          },
        ],
        updatedAt: new Date().toISOString(),
      },
      note: "Plan held steady based on today's journal (maintain).",
    };
  }

  const before =
    analysis.signal === "progress"
      ? Math.max(0, analysis.painForPlan)
      : analysis.painForPlan;
  const after =
    analysis.signal === "flare"
      ? Math.min(10, analysis.painForPlan + 1)
      : analysis.signal === "regress"
        ? Math.min(10, analysis.painForPlan + 0.5)
        : Math.max(0, analysis.painForPlan - 0.5);

  let next = adjustRoutineFromFeedback(routine, {
    averagePainBefore: before,
    averagePainAfter: after,
    difficultyFelt: analysis.difficultyFelt,
  });

  const action =
    analysis.signal === "progress"
      ? ("progress" as const)
      : analysis.signal === "flare" || analysis.signal === "regress"
        ? ("regress" as const)
        : ("hold" as const);

  next = {
    ...next,
    // Prefer home variations when journal ADLs show functional limits
    homeBasedProgram:
      next.homeBasedProgram ||
      analysis.adlEntries.some((e) => e.assistance !== "independent") ||
      undefined,
    generatedFrom: next.generatedFrom
      ? {
          ...next.generatedFrom,
          clinicalSymptomIds: analysis.clinicalSymptomIds,
          clinicalSymptomSummary: analysis.symptomSuggestions.slice(0, 4),
          adlEntries: analysis.adlEntries,
          adlSummary: analysis.adlEntries.map(
            (e) => `${e.label}: ${e.assistance}`
          ),
          homeBasedProgram:
            next.homeBasedProgram ||
            analysis.adlEntries.some((e) => e.assistance !== "independent"),
        }
      : next.generatedFrom,
    selfAdjustHistory: [
      ...next.selfAdjustHistory,
      {
        at: new Date().toISOString(),
        reason: `Journal “${entryTitle}” — ${analysis.signal}`,
        painFactor: analysis.painForPlan,
        action: action === "hold" ? "hold" : action === "progress" ? "progress" : "regress",
        details: `${analysis.jefferySummary} ${analysis.reasons.join(" ")}`,
        source: "journal",
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  if (analysis.adlEntries.some((e) => e.assistance !== "independent")) {
    next = applyHomeBasedProgram(next, true);
  }

  const note =
    analysis.signal === "progress"
      ? "Active plan nudged toward slight progression from journal readiness cues."
      : analysis.signal === "flare"
        ? "Active plan regressed for flare protection based on journal pain/language."
        : "Active plan eased (regress) based on journal symptom load.";

  return { routine: next, note };
}

export function buildJournalJefferyReply(input: {
  entry: Pick<
    JournalEntry,
    | "title"
    | "body"
    | "painOverall"
    | "mood"
    | "didWell"
    | "improveNext"
    | "energy"
    | "sleepQuality"
  >;
  analysis: JournalAnalysis;
  areas: BodyPart[];
  activeRoutineName?: string;
  recentPainTrend?: string;
}): string {
  const areaLabel = input.areas.length
    ? input.areas.map((a) => BODY_PART_LABELS[a] || a).join(", ")
    : "not specified";
  const desc = matchDescriptorsFromText(`${input.entry.title} ${input.entry.body}`, 4);
  const cond = matchConditionsFromText(`${input.entry.title} ${input.entry.body}`, 3);

  return [
    `**Jeffery here — I'm listening.**`,
    ``,
    input.analysis.jefferySummary,
    ``,
    `**What you're doing well**`,
    ...input.analysis.wins.map((w) => `• ${w}`),
    ``,
    `**Gentle ways to improve**`,
    ...input.analysis.improvements.map((w) => `• ${w}`),
    ``,
    input.activeRoutineName
      ? `I'm holding your active plan **${input.activeRoutineName}** in mind${input.analysis.signal !== "maintain" ? " and adjusted dosing from this entry" : ""}.`
      : `When you generate or open a routine, I'll keep correlating these journal patterns with it.`,
    input.recentPainTrend ? `Recent pain trend: ${input.recentPainTrend}.` : "",
    `Areas in focus: ${areaLabel}.`,
    desc.length ? `Descriptor cues matched from your words (${desc.length}).` : "",
    cond.length ? `Condition-related language detected (${cond.length})—educational only.` : "",
    ``,
    `**A therapist/counselor-style question for you:**`,
    `*${input.analysis.jefferyQuestion}*`,
    ``,
    `You don't have to answer perfectly—just honestly. I'm here in Journal and on the Jeffery page with your full app context (sessions, plan, pain profile, modalities).`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function painTrendLabel(entries: JournalEntry[]): string | undefined {
  if (entries.length < 2) return undefined;
  const a = entries[0]!.painOverall;
  const b = entries[1]!.painOverall;
  const d = a - b;
  if (d <= -2) return `improving (was ${b}/10 → ${a}/10)`;
  if (d >= 2) return `worsening (was ${b}/10 → ${a}/10)`;
  return `stable around ${a}/10`;
}
