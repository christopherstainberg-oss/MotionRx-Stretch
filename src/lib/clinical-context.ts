/**
 * Cross-app clinical context — Assessment story, Q&A, history, and plan signals
 * correlated for Home, Journal, Jeffery, Insights, Routines, and Modalities.
 */

import type { BodyPart, PainProfile, Routine } from "@/lib/types";
import type { CoachExchange } from "@/lib/assessment-coach";
import {
  clinicalHistorySummary,
  normalizeSex,
  parseMedicalHistoryFromText,
  parseSexFromText,
  type SexSelection,
} from "@/lib/clinical-history";
import { matchDescriptorsFromText } from "@/data/pain-descriptors";
import { matchConditionsFromText } from "@/data/clinical-conditions";
import { matchMedicationsFromText } from "@/data/medications";
import {
  analyzeStoryIntelligence,
  storyIntelCorrelationSummary,
} from "@/lib/story-intelligence";
import {
  buildSleepCorrelation,
  type SleepCorrelationSnapshot,
} from "@/lib/psqi";
import {
  parseInjuryTimeline,
  type InjuryTimeline,
} from "@/lib/injury-timeline";

export const CLINICAL_CONTEXT_KEY = "motionrx-clinical-context";
export const ASSESSMENT_QA_KEY = "motionrx-assessment-qa";
export const CLINICAL_HISTORY_KEY = "clinical-history-profile";
export const PAIN_PROFILE_KEY = "motionrx-pain-profile";

export type AssessmentStoryContext = {
  freeText: string;
  preferredName?: string;
  sex?: SexSelection;
  pastMedicalHistory?: string;
  currentMedicalHistory?: string;
  areas?: BodyPart[];
  overallPain?: number;
  descriptorIds?: string[];
  conditionIds?: string[];
  medicationNames?: string[];
  goals?: string[];
  /** Q&A exchanges from Assessment Story */
  qa: CoachExchange[];
  /** Live clinical read lines from free-text story intelligence */
  storyIntelLines?: string[];
  /** Story irritability / phase hints for Plan correlation */
  storyIrritability?: string;
  storyPhaseBias?: string;
  /** Latest written plan approach */
  writtenApproach?: string;
  routineId?: string;
  updatedAt: string;
};

export type CrossSectionCorrelation = {
  context: AssessmentStoryContext | null;
  hasStory: boolean;
  summaryLines: string[];
  insights: Array<{
    id: string;
    title: string;
    body: string;
    href: string;
    severity: "info" | "caution" | "action";
  }>;
  storySnippet: string;
  preferredName: string;
  /** Latest PSQI sleep correlation (always loaded when available) */
  sleep: SleepCorrelationSnapshot;
  /** Injury/onset timeline from Assessment free text when stated */
  injuryTimeline: InjuryTimeline;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function emptyStoryContext(): AssessmentStoryContext {
  return {
    freeText: "",
    qa: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Load Assessment Q&A log from device */
export function loadAssessmentQa(): CoachExchange[] {
  if (typeof window === "undefined") return [];
  const raw = safeParse<CoachExchange[]>(localStorage.getItem(ASSESSMENT_QA_KEY));
  return Array.isArray(raw) ? raw.slice(-24) : [];
}

export function saveAssessmentQa(qa: CoachExchange[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ASSESSMENT_QA_KEY, JSON.stringify(qa.slice(-24)));
  } catch {
    /* ignore */
  }
}

/**
 * Build + persist the unified clinical context from Assessment (and optional profile).
 */
export function saveClinicalContext(
  partial: Partial<AssessmentStoryContext> & { freeText?: string }
): AssessmentStoryContext {
  const prev = loadClinicalContext() || emptyStoryContext();
  const freeText = partial.freeText ?? prev.freeText ?? "";
  const hist = freeText.trim().length >= 8 ? parseMedicalHistoryFromText(freeText) : null;
  const parsedSex = freeText.trim().length >= 8 ? parseSexFromText(freeText) : undefined;
  const storyIntel =
    freeText.trim().length >= 8
      ? analyzeStoryIntelligence(freeText, {
          preferredName: partial.preferredName ?? prev.preferredName,
          areas: partial.areas ?? prev.areas,
          sex: normalizeSex(partial.sex) || parsedSex || prev.sex,
          pastMedicalHistory:
            partial.pastMedicalHistory ?? hist?.pastMedicalHistory ?? prev.pastMedicalHistory,
          currentMedicalHistory:
            partial.currentMedicalHistory ??
            hist?.currentMedicalHistory ??
            prev.currentMedicalHistory,
          goals: partial.goals ?? prev.goals,
        })
      : null;

  const next: AssessmentStoryContext = {
    freeText,
    preferredName:
      partial.preferredName ??
      prev.preferredName ??
      (typeof window !== "undefined"
        ? localStorage.getItem("preferredName") || undefined
        : undefined),
    sex: normalizeSex(partial.sex) || parsedSex || prev.sex,
    pastMedicalHistory:
      partial.pastMedicalHistory ??
      hist?.pastMedicalHistory ??
      prev.pastMedicalHistory,
    currentMedicalHistory:
      partial.currentMedicalHistory ??
      hist?.currentMedicalHistory ??
      prev.currentMedicalHistory,
    areas:
      partial.areas ??
      (storyIntel?.regions?.length ? storyIntel.regions : prev.areas),
    overallPain:
      partial.overallPain ?? storyIntel?.painNow ?? prev.overallPain,
    descriptorIds:
      partial.descriptorIds ??
      (storyIntel?.descriptorIds?.length
        ? storyIntel.descriptorIds
        : freeText.trim().length >= 12
          ? matchDescriptorsFromText(freeText, 12)
          : prev.descriptorIds),
    conditionIds:
      partial.conditionIds ??
      (storyIntel?.conditionIds?.length
        ? storyIntel.conditionIds
        : freeText.trim().length >= 12
          ? matchConditionsFromText(freeText, 10)
          : prev.conditionIds),
    medicationNames:
      partial.medicationNames ??
      (freeText.trim().length >= 8
        ? matchMedicationsFromText(freeText, 8)
        : prev.medicationNames),
    goals:
      partial.goals ??
      (storyIntel?.planHints.functionalGoals?.length
        ? storyIntel.planHints.functionalGoals
        : prev.goals),
    qa: partial.qa ?? prev.qa ?? loadAssessmentQa(),
    storyIntelLines: storyIntel
      ? storyIntelCorrelationSummary(storyIntel)
      : prev.storyIntelLines,
    storyIrritability: storyIntel?.irritability ?? prev.storyIrritability,
    storyPhaseBias: storyIntel?.planHints.phaseBias ?? prev.storyPhaseBias,
    writtenApproach: partial.writtenApproach ?? prev.writtenApproach,
    routineId: partial.routineId ?? prev.routineId,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CLINICAL_CONTEXT_KEY, JSON.stringify(next));
      localStorage.setItem(
        CLINICAL_HISTORY_KEY,
        JSON.stringify({
          sex: next.sex,
          pastMedicalHistory: next.pastMedicalHistory,
          currentMedicalHistory: next.currentMedicalHistory,
          freeText: next.freeText,
          preferredName: next.preferredName,
          at: next.updatedAt,
        })
      );
      if (next.qa?.length) saveAssessmentQa(next.qa);
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function loadClinicalContext(): AssessmentStoryContext | null {
  if (typeof window === "undefined") return null;

  const stored = safeParse<AssessmentStoryContext>(
    localStorage.getItem(CLINICAL_CONTEXT_KEY)
  );
  if (stored?.freeText || stored?.qa?.length) {
    return {
      ...emptyStoryContext(),
      ...stored,
      qa: Array.isArray(stored.qa) ? stored.qa : loadAssessmentQa(),
    };
  }

  // Reconstruct from pain profile + history keys (older sessions)
  const profile = safeParse<PainProfile>(localStorage.getItem(PAIN_PROFILE_KEY));
  const hist = safeParse<{
    sex?: SexSelection;
    pastMedicalHistory?: string;
    currentMedicalHistory?: string;
    freeText?: string;
    preferredName?: string;
  }>(localStorage.getItem(CLINICAL_HISTORY_KEY));

  const freeText = profile?.freeText || hist?.freeText || "";
  if (!freeText && !profile && !hist) return null;

  return saveClinicalContext({
    freeText,
    preferredName:
      hist?.preferredName ||
      localStorage.getItem("preferredName") ||
      undefined,
    sex: profile?.sex || hist?.sex,
    pastMedicalHistory: profile?.pastMedicalHistory || hist?.pastMedicalHistory,
    currentMedicalHistory:
      profile?.currentMedicalHistory || hist?.currentMedicalHistory,
    areas: profile?.areas,
    overallPain: profile?.overallPain,
    descriptorIds: profile?.descriptorIds,
    conditionIds: profile?.conditionIds,
    qa: loadAssessmentQa(),
  });
}

/** Merge server pain profile into local correlator (after login/fetch) */
export function mergePainProfileIntoContext(profile: PainProfile | null | undefined) {
  if (!profile) return loadClinicalContext();
  return saveClinicalContext({
    freeText: profile.freeText || "",
    sex: profile.sex,
    pastMedicalHistory: profile.pastMedicalHistory,
    currentMedicalHistory: profile.currentMedicalHistory,
    areas: profile.areas,
    overallPain: profile.overallPain,
    descriptorIds: profile.descriptorIds,
    conditionIds: profile.conditionIds,
  });
}

/**
 * Cross-section insights derived from Assessment story + Q&A + plan.
 */
export function correlateAcrossApp(opts?: {
  routine?: Routine | null;
  sessionCount?: number;
  journalCount?: number;
}): CrossSectionCorrelation {
  const context = loadClinicalContext();
  const sleep = buildSleepCorrelation();
  const injuryTimeline = parseInjuryTimeline(context?.freeText || "");
  const preferredName =
    context?.preferredName?.trim() ||
    (typeof window !== "undefined"
      ? localStorage.getItem("preferredName") || "friend"
      : "friend");

  if (!context || (!context.freeText.trim() && !context.qa.length)) {
    const insights: CrossSectionCorrelation["insights"] = [
      {
        id: "start-assess",
        title: "Start with Assessment",
        body: "Your free-text story drives Plan dosing, Jeffery coaching, Journal prompts, and modality suggestions.",
        href: "/assessment",
        severity: "action",
      },
    ];
    if (!sleep.hasData) {
      insights.push({
        id: "start-sleep",
        title: "Add Sleep (PSQI)",
        body: "A PSQI score correlates into Journal sleep ratings, Jeffery recovery coaching, plan volume, and modality education.",
        href: "/sleep",
        severity: "info",
      });
    } else {
      insights.push({
        id: "sleep-core",
        title: `Sleep PSQI ${sleep.global}/21`,
        body: `${sleep.bandLabel}. ${sleep.summaryLines.slice(1, 3).join(" ")} Opens recovery dosing across the app.`,
        href: "/sleep",
        severity:
          sleep.band === "poor" || sleep.band === "needs-attention"
            ? "caution"
            : "info",
      });
    }
    return {
      context: null,
      hasStory: false,
      preferredName,
      storySnippet: "",
      summaryLines: [
        "No Assessment story yet — complete Story step for full correlation.",
        ...sleep.summaryLines.slice(0, 2),
      ],
      insights,
      sleep,
      injuryTimeline,
    };
  }

  const story = context.freeText.trim();
  const storySnippet =
    story.length > 160 ? `${story.slice(0, 160)}…` : story || "(Q&A only)";

  const summaryLines: string[] = [];
  if (story) summaryLines.push(`Story on file (${story.length} chars).`);
  if (context.storyIrritability) {
    summaryLines.push(
      `Story irritability: ${context.storyIrritability}${
        context.storyPhaseBias ? ` · phase bias ${context.storyPhaseBias}` : ""
      }.`
    );
  }
  if (context.storyIntelLines?.length) {
    summaryLines.push(...context.storyIntelLines.slice(0, 4));
  }
  if (context.sex && context.sex !== "prefer-not-to-say") {
    summaryLines.push(`Sex context: ${context.sex}.`);
  }
  if (context.pastMedicalHistory) {
    summaryLines.push(`PMH: ${context.pastMedicalHistory.slice(0, 100)}.`);
  }
  if (context.currentMedicalHistory) {
    summaryLines.push(`Current: ${context.currentMedicalHistory.slice(0, 100)}.`);
  }
  if (context.descriptorIds?.length) {
    summaryLines.push(`${context.descriptorIds.length} pain descriptor signal(s).`);
  }
  if (context.conditionIds?.length) {
    summaryLines.push(`${context.conditionIds.length} clinical condition match(es).`);
  }
  if (context.qa.length) {
    summaryLines.push(`${context.qa.length} Assessment Q&A exchange(s).`);
  }
  if (sleep.hasData) {
    summaryLines.push(...sleep.summaryLines.slice(0, 3));
  } else {
    summaryLines.push("Sleep PSQI not logged yet.");
  }
  if (injuryTimeline.source === "stated") {
    summaryLines.push(...injuryTimeline.summaryLines.slice(0, 2));
  } else if (story.length >= 20) {
    summaryLines.push("Injury timeline (weeks/months/years) not stated yet.");
  }
  const histLine = clinicalHistorySummary({
    sex: context.sex,
    pastMedicalHistory: context.pastMedicalHistory,
    currentMedicalHistory: context.currentMedicalHistory,
  });
  if (histLine) summaryLines.push(histLine);

  const insights: CrossSectionCorrelation["insights"] = [];

  insights.push({
    id: "story-core",
    title: `${preferredName}'s Assessment story`,
    body: storySnippet,
    href: "/assessment",
    severity: "info",
  });

  if (context.storyIrritability || context.storyIntelLines?.length) {
    insights.push({
      id: "story-intel",
      title: "Free-text clinical intelligence",
      body: [
        context.storyIrritability
          ? `Irritability ${context.storyIrritability}${
              context.storyPhaseBias ? ` → ${context.storyPhaseBias} phase bias` : ""
            }`
          : null,
        ...(context.storyIntelLines || []).slice(0, 3),
      ]
        .filter(Boolean)
        .join(" · "),
      href: "/assessment",
      severity:
        context.storyIrritability === "high" ? "caution" : "info",
    });
  }

  if (context.qa.length) {
    const last = context.qa[context.qa.length - 1]!;
    insights.push({
      id: "qa-latest",
      title: "Latest Assessment Q&A",
      body: `Q: ${last.question.slice(0, 100)}${last.question.length > 100 ? "…" : ""}\nA: ${last.answer.slice(0, 140)}${last.answer.length > 140 ? "…" : ""}`,
      href: "/assessment",
      severity: "info",
    });
  }

  if (context.writtenApproach || opts?.routine?.generatedFrom?.writtenApproach) {
    const approach =
      context.writtenApproach || opts?.routine?.generatedFrom?.writtenApproach || "";
    insights.push({
      id: "plan-approach",
      title: "Written plan of approach",
      body: approach.slice(0, 200) + (approach.length > 200 ? "…" : ""),
      href: "/routines",
      severity: "info",
    });
  } else {
    insights.push({
      id: "generate-plan",
      title: "Generate your plan",
      body: "Finish Assessment to build a plan that inherits your story, history, and Q&A.",
      href: "/assessment",
      severity: "caution",
    });
  }

  insights.push({
    id: "jeffery-bridge",
    title: "Jeffery uses this story",
    body: "Jeffery loads Assessment free text, sex, PMH/CMH, Q&A, and Sleep PSQI so coaching stays consistent.",
    href: "/jeffery",
    severity: "info",
  });

  insights.push({
    id: "journal-bridge",
    title: "Journal reflects Assessment + Sleep",
    body: sleep.hasData
      ? `Journal can seed sleep quality from your latest PSQI (${sleep.global}/21 → rating ${sleep.journalSleepQuality}/5) alongside story descriptors.`
      : "Journal analysis can reference your story descriptors, conditions, and history; add Sleep PSQI to auto-align nightly ratings.",
    href: "/journal",
    severity: "info",
  });

  if (sleep.hasData) {
    insights.push({
      id: "sleep-core",
      title: `Sleep PSQI ${sleep.global}/21 · ${sleep.bandLabel}`,
      body: [
        sleep.summaryLines.slice(1, 3).join(" "),
        sleep.topSuggestion
          ? `Tip: ${sleep.topSuggestion.title}.`
          : null,
        poorSleepHint(sleep),
      ]
        .filter(Boolean)
        .join(" "),
      href: "/sleep",
      severity:
        sleep.band === "poor" || sleep.band === "needs-attention"
          ? "caution"
          : sleep.band === "fair"
            ? "info"
            : "info",
    });
  } else {
    insights.push({
      id: "start-sleep",
      title: "Correlate Sleep (PSQI)",
      body: "Log PSQI so recovery quality shapes plan volume, Jeffery coaching, modalities, and journal sleep ratings.",
      href: "/sleep",
      severity: "action",
    });
  }

  if (context.pastMedicalHistory || context.currentMedicalHistory) {
    insights.push({
      id: "modality-safety",
      title: "Modalities & safety",
      body: "History (e.g. cardiac, clotting, pregnancy, devices) informs conservative modality education and pacing.",
      href: "/modalities",
      severity: "caution",
    });
  }

  if (sleep.hasData && (sleep.painAtNight || (sleep.global ?? 0) >= 5)) {
    insights.push({
      id: "sleep-modalities",
      title: "Sleep-linked modalities",
      body: "PSQI flags favor sleep hygiene, positioning, and calm wind-down education alongside your HEP—not aggressive late-evening load.",
      href: "/modalities",
      severity: "info",
    });
  }

  if (injuryTimeline.source === "stated") {
    const m0 = injuryTimeline.progressOutlook[0];
    insights.push({
      id: "injury-timeline",
      title: `Time since onset: ${injuryTimeline.label}`,
      body: [
        `${injuryTimeline.tissuePhase} framing · phase bias ${injuryTimeline.phaseBias || "n/a"}.`,
        m0
          ? `Progress check (${m0.windowLabel}): ${m0.lookFor} Measures: ${m0.measures.slice(0, 2).join("; ")}.`
          : "",
        injuryTimeline.progressOutlook[1]
          ? `Next: ${injuryTimeline.progressOutlook[1].windowLabel} — ${injuryTimeline.progressOutlook[1].lookFor}`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
      href: "/assessment",
      severity:
        injuryTimeline.tissuePhase === "hyperacute" ||
        injuryTimeline.tissuePhase === "acute"
          ? "caution"
          : "info",
    });
  } else if (story.length >= 40) {
    insights.push({
      id: "injury-timeline-missing",
      title: "Add time since injury/onset",
      body: "State 0–6+ weeks, months, or years since this started so Plan, Journal, and Jeffery can set evidence-informed progress milestones (NPRS, PSFS-style function, 24h response).",
      href: "/assessment",
      severity: "action",
    });
  }

  return {
    context,
    hasStory: Boolean(story || context.qa.length),
    preferredName,
    storySnippet,
    summaryLines,
    insights,
    sleep,
    injuryTimeline,
  };
}

function poorSleepHint(sleep: SleepCorrelationSnapshot): string {
  if ((sleep.global ?? 0) >= 8) {
    return "Plan volume may scale gently until sleep recovers.";
  }
  if (sleep.painAtNight) {
    return "Night pain on PSQI pairs with gentle evening mobility and position education.";
  }
  return "Sleep quality is part of recovery dosing across Plan and Jeffery.";
}

/** Compact string blob for Jeffery / API context injection */
export function clinicalContextPromptBlob(ctx?: AssessmentStoryContext | null): string {
  const c = ctx || loadClinicalContext();
  if (!c) return "";
  const lines: string[] = [];
  if (c.preferredName) lines.push(`Preferred name: ${c.preferredName}`);
  if (c.freeText) lines.push(`Assessment story: ${c.freeText.slice(0, 700)}`);
  if (c.storyIrritability)
    lines.push(
      `Story irritability: ${c.storyIrritability}${
        c.storyPhaseBias ? `; phase bias: ${c.storyPhaseBias}` : ""
      }`
    );
  if (c.storyIntelLines?.length)
    lines.push(`Story intel: ${c.storyIntelLines.slice(0, 5).join(" | ")}`);
  if (c.sex) lines.push(`Sex: ${c.sex}`);
  if (c.pastMedicalHistory) lines.push(`PMH: ${c.pastMedicalHistory.slice(0, 240)}`);
  if (c.currentMedicalHistory) lines.push(`Current Hx: ${c.currentMedicalHistory.slice(0, 240)}`);
  if (c.goals?.length) lines.push(`Goals: ${c.goals.slice(0, 5).join(", ")}`);
  if (c.qa.length) {
    lines.push("Assessment Q&A:");
    for (const ex of c.qa.slice(-6)) {
      lines.push(`- Q: ${ex.question.slice(0, 120)}`);
      lines.push(`  A: ${ex.answer.slice(0, 160)}`);
    }
  }
  if (c.writtenApproach) lines.push(`Plan approach: ${c.writtenApproach.slice(0, 300)}`);
  const sleep = buildSleepCorrelation();
  if (sleep.hasData && sleep.promptBlob) {
    lines.push(sleep.promptBlob);
  } else if (!sleep.hasData) {
    lines.push("Sleep PSQI: not logged yet.");
  }
  const injuryTl = parseInjuryTimeline(c.freeText || "");
  if (injuryTl.source === "stated" && injuryTl.promptBlob) {
    lines.push(injuryTl.promptBlob);
  } else {
    lines.push("Injury timeline: not stated (ask weeks/months/years since onset).");
  }
  return lines.join("\n");
}

/** Convenience: sleep snapshot for any section (client-side). */
export function loadSleepCorrelation(): SleepCorrelationSnapshot {
  return buildSleepCorrelation();
}
