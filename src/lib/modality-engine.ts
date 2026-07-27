/**
 * Evidence-informed modality recommendation engine.
 * Scores catalog entries from pain ratings, clinical descriptors, user experience,
 * and visit timing (pre/post-visit, session, flare). Educational adjuncts only.
 */

import {
  MODALITIES,
  getModalityById,
  type Modality,
  type ModalitySetting,
  type ModalityTiming,
} from "@/data/modalities";
import {
  getDescriptorsByIds,
  summarizeDescriptors,
  type ProgramBias,
} from "@/data/pain-descriptors";
import type {
  JournalEntry,
  ModalityPlan,
  ModalityRecommendation,
  SessionLog,
  SymptomInput,
} from "@/lib/types";
import { buildSleepCorrelation } from "@/lib/psqi";
import { v4 as uuid } from "uuid";

export interface ModalityEngineInput {
  /** 0–10 overall or average pain */
  painScore: number;
  /** Clinical descriptor IDs */
  descriptorIds?: string[];
  /** Free-text experience (concern paragraph, notes, journal) */
  experienceText?: string;
  /** Primary timing context for ranking */
  timing: ModalityTiming;
  /** Prefer home-safe vs include clinic education */
  settingPreference?: ModalitySetting | "all";
  /** Recent sessions for post-activity / flare patterns */
  recentSessions?: SessionLog[];
  /** Recent journal for mood/pain trends */
  recentJournal?: JournalEntry[];
  /** Max recommendations per timing bucket */
  limit?: number;
  /** User explicitly preparing for PT visit */
  visitContext?: "pre-visit" | "post-visit" | "none";
  /** When true, force sleep-hygiene / position education boost from PSQI */
  psqiSleepIssue?: boolean;
}

export interface ModalityScored {
  modality: Modality;
  score: number;
  reasons: string[];
  timing: ModalityTiming;
  confidence: "high" | "moderate" | "exploratory";
}

const STIFFNESS_RE =
  /\b(stiff|stiffness|tight|tightness|morning|rusty|locked|desk|sedentary)\b/i;
const INFLAMMATORY_RE =
  /\b(swollen|swelling|hot joint|warm to touch|throbbing|puffy|inflamed)\b/i;
const ACUTE_RE =
  /\b(flare|flared|acute|sharp|stabbing|sudden|after (workout|run|lift)|irritated|irritab)\b/i;
const NEURO_RE =
  /\b(numb|tingl|pins and needles|radiat|shooting|nerve|sciatica|weakness|giving way)\b/i;
const FEAR_RE = /\b(afraid|fear|scared|avoid|anxious about movement|kinesiophob)\b/i;
const SLEEP_RE = /\b(sleep|night pain|wakes? me|insomnia|restless)\b/i;
const DESK_RE = /\b(desk|computer|screen|posture|sitting all day|office)\b/i;
const POST_ACT_RE =
  /\b(after (activity|exercise|session|workout|walk)|sore after|DOMS|next.?day soreness)\b/i;

function textBlob(input: ModalityEngineInput): string {
  const labels = getDescriptorsByIds(input.descriptorIds || [])
    .map((d) => `${d.label} ${d.plainLanguage} ${d.searchTerms.join(" ")}`)
    .join(" ");
  return `${input.experienceText || ""} ${labels}`.toLowerCase();
}

function deriveClinicalFlags(input: ModalityEngineInput) {
  const blob = textBlob(input);
  const hints = summarizeDescriptors(input.descriptorIds || []);
  const pain = Math.max(0, Math.min(10, Number(input.painScore) || 0));
  const effectivePain = Math.min(10, pain + hints.effectivePainBoost);

  const sessionDeltas =
    input.recentSessions
      ?.filter((s) => s.completed)
      .slice(0, 5)
      .map((s) => s.averagePainAfter - s.averagePainBefore) || [];
  const avgDelta =
    sessionDeltas.length > 0
      ? sessionDeltas.reduce((a, b) => a + b, 0) / sessionDeltas.length
      : 0;
  const lastPainAfter = input.recentSessions?.[0]?.averagePainAfter;
  const journalAvg =
    input.recentJournal && input.recentJournal.length
      ? input.recentJournal
          .slice(0, 5)
          .reduce((n, j) => n + j.painOverall, 0) / Math.min(5, input.recentJournal.length)
      : undefined;

  const stiffnessDominant =
    STIFFNESS_RE.test(blob) ||
    hints.biases.includes("warm-up-heavy") ||
    hints.biases.includes("gentle-mobility");
  const inflammatoryPattern = INFLAMMATORY_RE.test(blob);
  const acuteIrritability =
    ACUTE_RE.test(blob) ||
    effectivePain >= 6 ||
    hints.effectivePainBoost >= 1.5 ||
    avgDelta > 0.8;
  const neurologicCaution =
    NEURO_RE.test(blob) ||
    hints.biases.includes("neural-caution") ||
    hints.redFlags.length > 0;
  const postActivitySoreness =
    POST_ACT_RE.test(blob) || avgDelta > 0.3 || (lastPainAfter !== undefined && lastPainAfter >= 5);
  const fearAvoidance = FEAR_RE.test(blob);
  const sleepCorr =
    typeof window !== "undefined" ? buildSleepCorrelation() : null;
  const sleepIssue =
    SLEEP_RE.test(blob) ||
    Boolean(input.psqiSleepIssue) ||
    Boolean(sleepCorr?.hasData && ((sleepCorr.global ?? 0) >= 5 || sleepCorr.painAtNight));
  const deskLoad = DESK_RE.test(blob) || hints.biases.includes("postural-endurance");
  const highIrritability =
    effectivePain >= 7 ||
    hints.redFlags.length > 0 ||
    (sleepCorr?.irritabilityBoost ?? 0) >= 1;
  const redFlags = hints.redFlags.length > 0;

  return {
    pain,
    effectivePain,
    hints,
    stiffnessDominant,
    inflammatoryPattern,
    acuteIrritability,
    neurologicCaution,
    postActivitySoreness,
    fearAvoidance,
    sleepIssue,
    deskLoad,
    highIrritability,
    redFlags,
    avgDelta,
    journalAvg,
    biases: hints.biases as ProgramBias[],
    sleepModalityIds: sleepCorr?.modalityIds || [],
  };
}

function keywordHits(keywords: string[] | undefined, blob: string): number {
  if (!keywords?.length) return 0;
  let n = 0;
  for (const kw of keywords) {
    if (blob.includes(kw.toLowerCase())) n += 1;
  }
  return n;
}

function scoreModality(
  m: Modality,
  input: ModalityEngineInput,
  flags: ReturnType<typeof deriveClinicalFlags>,
  timing: ModalityTiming
): ModalityScored | null {
  if (!m.timings.includes(timing)) return null;

  if (input.settingPreference && input.settingPreference !== "all") {
    if (m.setting !== "either" && m.setting !== input.settingPreference) {
      // Still allow clinic education on pre/post visit for awareness
      if (
        !(
          m.setting === "clinic" &&
          (timing === "pre-visit" || timing === "post-visit") &&
          input.settingPreference === "home"
        )
      ) {
        // When user prefers home, still show clinic as lower-priority education on visit timings
        if (input.settingPreference === "home" && m.setting === "clinic") {
          // keep but penalize later
        } else if (m.setting !== input.settingPreference) {
          return null;
        }
      }
    }
  }

  const blob = textBlob(input);
  let score = 10; // base
  const reasons: string[] = [];

  // Timing fit
  if (m.timings[0] === timing) {
    score += 8;
    reasons.push(`Primary fit for ${timing.replace(/-/g, " ")}`);
  } else {
    score += 4;
    reasons.push(`Also used ${timing.replace(/-/g, " ")}`);
  }

  // Pain band
  const pw = m.preferWhen;
  const aw = m.avoidWhen;
  if (pw.minPain !== undefined && flags.effectivePain >= pw.minPain) {
    score += 6;
    reasons.push(`Pain ~${flags.pain}/10 (effective ${flags.effectivePain.toFixed(1)}) fits min band`);
  } else if (pw.minPain !== undefined && flags.effectivePain < pw.minPain) {
    score -= 8;
  }
  if (pw.maxPain !== undefined && flags.effectivePain <= pw.maxPain) {
    score += 5;
    reasons.push("Within preferred pain range");
  } else if (pw.maxPain !== undefined && flags.effectivePain > pw.maxPain) {
    score -= 10;
    reasons.push("Pain above preferred range for this modality");
  }

  // Clinical pattern flags
  if (pw.stiffnessDominant && flags.stiffnessDominant) {
    score += 12;
    reasons.push("Stiffness-dominant pattern");
  }
  if (pw.inflammatoryPattern && flags.inflammatoryPattern) {
    score += 12;
    reasons.push("Inflammatory / swelling language");
  }
  if (pw.acuteIrritability && flags.acuteIrritability) {
    score += 12;
    reasons.push("Higher irritability / flare pattern");
  }
  if (pw.neurologicCaution && flags.neurologicCaution) {
    score += 10;
    reasons.push("Nerve-like symptom caution");
  }
  if (pw.postActivitySoreness && flags.postActivitySoreness) {
    score += 10;
    reasons.push("Post-activity soreness pattern");
  }

  // Descriptor keyword matching
  const hits = keywordHits(pw.descriptorKeywords, blob);
  if (hits) {
    score += hits * 5;
    reasons.push(`Matches ${hits} symptom keyword(s)`);
  }

  // Program biases from descriptors
  if (pw.programBiases?.length && flags.biases.length) {
    const overlap = pw.programBiases.filter((b) =>
      flags.biases.includes(b as ProgramBias)
    );
    if (overlap.length) {
      score += overlap.length * 6;
      reasons.push(`Aligns with program biases: ${overlap.slice(0, 3).join(", ")}`);
    }
  }

  // Avoid rules
  if (aw.highIrritability && flags.highIrritability) {
    score -= 18;
    reasons.push("Caution: high irritability — lower priority");
  }
  if (aw.redFlags && flags.redFlags) {
    score -= 40;
    reasons.push("Screening flags present — deprioritized");
  }
  const avoidHits = keywordHits(aw.descriptorKeywords, blob);
  if (avoidHits) {
    score -= avoidHits * 8;
    reasons.push("Avoid keywords present in your description");
  }

  // Experience-specific boosts
  if (flags.sleepIssue && m.tags.includes("sleep")) {
    score += 10;
    reasons.push("Sleep-related concerns noted");
  }
  if (
    flags.sleepModalityIds?.length &&
    flags.sleepModalityIds.includes(m.id)
  ) {
    score += 14;
    reasons.push("Prioritized from your Sleep PSQI correlation");
  }
  if (flags.deskLoad && (m.tags.includes("desk") || m.tags.includes("ergonomics"))) {
    score += 10;
    reasons.push("Desk / postural load pattern");
  }
  if (flags.fearAvoidance && m.tags.includes("fear")) {
    score += 12;
    reasons.push("Fear-avoidance language — graded exposure fit");
  }
  if (flags.journalAvg !== undefined && flags.journalAvg >= 5 && m.category === "load-management") {
    score += 4;
  }
  if (flags.avgDelta > 0.5 && (m.category === "cryotherapy" || m.tags.includes("flare"))) {
    score += 8;
    reasons.push("Recent sessions leave pain higher — recovery modalities prioritized");
  }
  if (flags.avgDelta < -0.5 && m.category === "movement-based") {
    score += 4;
    reasons.push("Sessions tend to help — keep active recovery");
  }

  // Home preference slight boost for adherence realism
  if (m.setting === "home") {
    score += 3;
  } else if (m.setting === "clinic") {
    score -= 2;
    if (!reasons.some((r) => r.includes("clinic"))) {
      reasons.push("Clinic-delivered — discuss with your PT");
    }
  }

  // Visit context boosts for prep/follow-through modalities
  if (input.visitContext === "pre-visit" && timing === "pre-visit") {
    if (m.tags.includes("pre-visit") || m.id.includes("previsit")) score += 10;
  }
  if (input.visitContext === "post-visit" && timing === "post-visit") {
    if (m.tags.includes("post-visit") || m.id.includes("postvisit") || m.tags.includes("hep"))
      score += 10;
  }

  // Floor: drop clearly bad fits
  if (score < 8) return null;

  const confidence: ModalityScored["confidence"] =
    score >= 36 ? "high" : score >= 22 ? "moderate" : "exploratory";

  if (!reasons.length) reasons.push("General clinical adjunct for this timing");

  return { modality: m, score, reasons: reasons.slice(0, 5), timing, confidence };
}

/** Score and rank modalities for a single timing */
export function recommendModalities(input: ModalityEngineInput): ModalityScored[] {
  const flags = deriveClinicalFlags(input);
  const limit = input.limit ?? 8;
  const scored: ModalityScored[] = [];

  for (const m of MODALITIES) {
    const s = scoreModality(m, input, flags, input.timing);
    if (s) scored.push(s);
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/** Pre-visit + post-visit + acute/between suggestions from one intake snapshot */
export function buildVisitModalityPlan(input: {
  painScore: number;
  descriptorIds?: string[];
  experienceText?: string;
  recentSessions?: SessionLog[];
  recentJournal?: JournalEntry[];
  settingPreference?: ModalitySetting | "all";
}): ModalityPlan {
  const base = {
    painScore: input.painScore,
    descriptorIds: input.descriptorIds,
    experienceText: input.experienceText,
    recentSessions: input.recentSessions,
    recentJournal: input.recentJournal,
    settingPreference: input.settingPreference ?? "all",
  };

  const pre = recommendModalities({
    ...base,
    timing: "pre-visit",
    visitContext: "pre-visit",
    limit: 6,
  });
  const post = recommendModalities({
    ...base,
    timing: "post-visit",
    visitContext: "post-visit",
    limit: 6,
  });
  const flare = recommendModalities({
    ...base,
    timing: "acute-flare",
    limit: 4,
  });
  const between = recommendModalities({
    ...base,
    timing: "between-visits",
    limit: 5,
  });
  const preSession = recommendModalities({
    ...base,
    timing: "pre-session",
    limit: 4,
  });
  const postSession = recommendModalities({
    ...base,
    timing: "post-session",
    limit: 4,
  });

  const toRec = (s: ModalityScored): ModalityRecommendation => ({
    modalityId: s.modality.id,
    name: s.modality.name,
    category: s.modality.category,
    setting: s.modality.setting,
    timing: s.timing,
    score: Math.round(s.score * 10) / 10,
    confidence: s.confidence,
    reasons: s.reasons,
    plainLanguage: s.modality.plainLanguage,
    howTo: s.modality.howTo,
    evidenceNotes: s.modality.evidenceNotes,
    durationMinutes: s.modality.durationMinutes,
    frequency: s.modality.frequency,
    precautions: s.modality.precautions,
    contraindications: s.modality.contraindications,
    outcomeLinks: s.modality.outcomeLinks,
    homeSafe: s.modality.setting === "home" || s.modality.setting === "either",
  });

  const flags = deriveClinicalFlags({
    painScore: input.painScore,
    descriptorIds: input.descriptorIds,
    experienceText: input.experienceText,
    timing: "between-visits",
    recentSessions: input.recentSessions,
    recentJournal: input.recentJournal,
  });

  const narrativeParts: string[] = [];
  narrativeParts.push(
    `Based on pain ~${flags.pain}/10` +
      (flags.effectivePain !== flags.pain
        ? ` (descriptor-adjusted ~${flags.effectivePain.toFixed(1)})`
        : "") +
      `, your symptom language, and recent experience patterns.`
  );
  if (flags.stiffnessDominant) {
    narrativeParts.push(
      "Stiffness-dominant cues favor gentle heat and mobility prep before visits/sessions."
    );
  }
  if (flags.acuteIrritability || flags.inflammatoryPattern) {
    narrativeParts.push(
      "Higher irritability or swelling language favors short cold, pacing, and relative rest over aggressive passive heat."
    );
  }
  if (flags.neurologicCaution) {
    narrativeParts.push(
      "Nerve-like symptoms: prioritize calm load management and discuss clinic options with your PT—avoid aggressive self-stretch into symptoms."
    );
  }
  if (flags.redFlags) {
    narrativeParts.push(
      "Screening descriptors need professional evaluation; modalities below are comfort/education only, not treatment for urgent issues."
    );
  }
  narrativeParts.push(
    "Modalities are short-term adjuncts. Active exercise and graded function drive long-term outcomes in outpatient PT."
  );

  return {
    id: uuid(),
    createdAt: new Date().toISOString(),
    painScore: flags.pain,
    effectivePain: flags.effectivePain,
    descriptorIds: input.descriptorIds || [],
    experienceSummary: (input.experienceText || "").slice(0, 400),
    clinicalFlags: {
      stiffnessDominant: flags.stiffnessDominant,
      inflammatoryPattern: flags.inflammatoryPattern,
      acuteIrritability: flags.acuteIrritability,
      neurologicCaution: flags.neurologicCaution,
      postActivitySoreness: flags.postActivitySoreness,
      highIrritability: flags.highIrritability,
      redFlags: flags.redFlags,
      programBiases: flags.biases,
    },
    narrative: narrativeParts.join(" "),
    preVisit: pre.map(toRec),
    postVisit: post.map(toRec),
    acuteFlare: flare.map(toRec),
    betweenVisits: between.map(toRec),
    preSession: preSession.map(toRec),
    postSession: postSession.map(toRec),
  };
}

/** Quick suggestions from SymptomInput (Assess flow) */
export function planFromSymptomInput(
  input: SymptomInput,
  extras?: {
    recentSessions?: SessionLog[];
    recentJournal?: JournalEntry[];
  }
): ModalityPlan {
  const levels = Object.values(input.painLevels || {});
  const avg =
    levels.length > 0
      ? levels.reduce((a, b) => a + b, 0) / levels.length
      : 3;
  return buildVisitModalityPlan({
    painScore: avg,
    descriptorIds: input.painDescriptorIds,
    experienceText: [input.concernParagraph, ...(input.symptoms || []), ...(input.goals || [])]
      .filter(Boolean)
      .join(" "),
    recentSessions: extras?.recentSessions,
    recentJournal: extras?.recentJournal,
  });
}

/** Post-session recovery suggestions */
export function postSessionModalitySuggestions(opts: {
  painBefore: number;
  painAfter: number;
  difficultyFelt: number;
  descriptorIds?: string[];
  notes?: string;
}): ModalityRecommendation[] {
  const delta = opts.painAfter - opts.painBefore;
  const timing: ModalityTiming =
    opts.painAfter >= 6 || delta >= 2 ? "acute-flare" : "post-session";
  const scored = recommendModalities({
    painScore: opts.painAfter,
    descriptorIds: opts.descriptorIds,
    experienceText: opts.notes,
    timing,
    limit: 5,
    recentSessions: [
      {
        id: "temp",
        userId: "temp",
        stretchIds: [],
        startedAt: new Date().toISOString(),
        durationMinutes: 0,
        averagePainBefore: opts.painBefore,
        averagePainAfter: opts.painAfter,
        painByArea: {},
        difficultyFelt: opts.difficultyFelt as 1 | 2 | 3 | 4 | 5,
        completed: true,
      },
    ],
  });
  return scored.map((s) => ({
    modalityId: s.modality.id,
    name: s.modality.name,
    category: s.modality.category,
    setting: s.modality.setting,
    timing: s.timing,
    score: Math.round(s.score * 10) / 10,
    confidence: s.confidence,
    reasons: s.reasons,
    plainLanguage: s.modality.plainLanguage,
    howTo: s.modality.howTo,
    evidenceNotes: s.modality.evidenceNotes,
    durationMinutes: s.modality.durationMinutes,
    frequency: s.modality.frequency,
    precautions: s.modality.precautions,
    contraindications: s.modality.contraindications,
    outcomeLinks: s.modality.outcomeLinks,
    homeSafe: s.modality.setting === "home" || s.modality.setting === "either",
  }));
}

export function enrichRecommendations(
  recs: ModalityRecommendation[]
): Array<ModalityRecommendation & { modality?: Modality }> {
  return recs.map((r) => ({
    ...r,
    modality: getModalityById(r.modalityId),
  }));
}

/** Short Jeffery-facing summary of top modalities */
export function modalityCoachBlurb(plan: ModalityPlan): string {
  const topPre = plan.preVisit.slice(0, 3).map((m) => m.name);
  const topPost = plan.postVisit.slice(0, 3).map((m) => m.name);
  const topFlare = plan.acuteFlare.slice(0, 2).map((m) => m.name);
  const lines = [
    `**Modality suggestions (adjuncts, not replacements for your exercise plan):**`,
    topPre.length ? `• Pre-visit: ${topPre.join("; ")}` : "",
    topPost.length ? `• Post-visit / HEP support: ${topPost.join("; ")}` : "",
    topFlare.length ? `• If flare: ${topFlare.join("; ")}` : "",
    plan.narrative ? `\n_${plan.narrative.slice(0, 280)}${plan.narrative.length > 280 ? "…" : ""}_` : "",
    `\nOpen **Modalities** in the app for full how-to, precautions, and evidence notes.`,
  ];
  return lines.filter(Boolean).join("\n");
}
