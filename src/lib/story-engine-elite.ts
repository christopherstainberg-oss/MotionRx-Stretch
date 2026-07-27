/**
 * Elite clinical free-text engine for MotionRx “Describe Your Issue”.
 *
 * Design goals (SpaceX-grade systems engineering, not magic):
 * 1) Evidence ledger — every claim has a quote + confidence; silence ≠ data.
 * 2) Sentence-level causal parsing — not bag-of-words co-occurrence.
 * 3) Information-value interview — next question maximizes missing critical signal.
 * 4) Transparent dose envelope — plan knobs only from stated evidence.
 * 5) Conflict detection — surface inconsistencies; never “fix” them with invention.
 * 6) Provisional pattern labels are hypotheses with low/medium confidence + disclaimer.
 *
 * Educational only — not diagnosis or licensed care.
 */

import type { BodyPart, Difficulty } from "@/lib/types";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import type {
  ActivityResponse,
  AdaptiveStoryQuestion,
  Laterality,
  OnsetType,
  StoryIntelligence,
  StoryIrritability,
  StoryTheme,
} from "@/lib/story-intelligence";

export type EvidenceKind = "explicit" | "stated-qualitative" | "user-ui" | "structural";

export type StoryEvidence = {
  id: string;
  theme: StoryTheme | "meta" | "trajectory" | "dose";
  claim: string;
  value: string;
  quote: string;
  confidence: number;
  kind: EvidenceKind;
};

export type CriticalGap = {
  theme: StoryTheme;
  why: string;
  askNext: string;
  informationValue: number;
};

export type ClinicalHypothesis = {
  label: string;
  support: string[];
  confidence: "low" | "medium";
  disclaimer: string;
};

export type DoseEnvelope = {
  mode: "protect" | "steady" | "build" | "unknown";
  rationale: string[];
  minutesScale: number;
  maxDifficulty: Difficulty;
  phaseBias: StoryIntelligence["planHints"]["phaseBias"];
};

export type StoryEliteAnalysis = {
  sentences: string[];
  evidence: StoryEvidence[];
  completeness: number;
  intelligenceGrade: "empty" | "signal-poor" | "usable" | "strong" | "flight-ready";
  criticalGaps: CriticalGap[];
  trajectory: "improving" | "worsening" | "stable" | "fluctuating" | "unknown";
  trajectoryQuote?: string;
  doseEnvelope: DoseEnvelope;
  conflicts: string[];
  systemsRead: string[];
  clinicalHypotheses: ClinicalHypothesis[];
  liveReadLines: string[];
  adaptiveQuestions: AdaptiveStoryQuestion[];
  evidenceSummaryLine: string;
};

function snip(text: string, max = 72): string {
  const s = text.trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function regionLabel(parts: BodyPart[]): string {
  if (!parts.length) return "the area that bothers you";
  // Conversational mid-sentence form — avoid “Lower Back / Lumbar builds”
  const labels = parts.slice(0, 2).map((a) => {
    const catalog = BODY_PART_LABELS[a] || a;
    return catalog
      .split("/")[0]!
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  });
  return labels.length === 1 ? labels[0]! : labels.join(" and ");
}

/** Split free text into clinical sentences / answer units. */
export function segmentClinicalSentences(raw: string): string[] {
  const cleaned = (raw || "")
    .replace(/\r/g, "")
    .replace(/^▸\s*/gm, "")
    .trim();
  if (!cleaned) return [];

  const chunks = cleaned
    .split(/(?<=[.!?])\s+|\n+|;\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && !s.endsWith("?"));

  // Also keep short clause fragments that look like answers after markers
  if (!chunks.length && cleaned.length >= 3) return [cleaned.replace(/\s+/g, " ")];
  return chunks.map((s) => s.replace(/\s+/g, " "));
}

function quoteFrom(sentence: string, max = 90): string {
  return snip(sentence.replace(/^["'“”]+|["'“”]+$/g, ""), max);
}

function pushEvidence(
  out: StoryEvidence[],
  item: Omit<StoryEvidence, "id"> & { id?: string }
): void {
  const id =
    item.id ||
    `${item.theme}:${item.value}`.toLowerCase().replace(/[^a-z0-9:]+/g, "-").slice(0, 48);
  if (out.some((e) => e.id === id || (e.theme === item.theme && e.value === item.value))) return;
  out.push({
    id,
    theme: item.theme,
    claim: item.claim,
    value: item.value,
    quote: item.quote,
    confidence: Math.max(0, Math.min(1, item.confidence)),
    kind: item.kind,
  });
}

/** Causal frames: extract activity/modality objects only with clear relation verbs. */
function extractCausalFrames(sentences: string[]): {
  aggravators: Array<{ label: string; quote: string; conf: number }>;
  easers: Array<{ label: string; quote: string; conf: number }>;
  limits: Array<{ label: string; quote: string; conf: number }>;
} {
  const aggravators: Array<{ label: string; quote: string; conf: number }> = [];
  const easers: Array<{ label: string; quote: string; conf: number }> = [];
  const limits: Array<{ label: string; quote: string; conf: number }> = [];

  const mapSnippet = (snippet: string): string[] => {
    const s = snippet.toLowerCase();
    const hits: Array<{ re: RegExp; label: string }> = [
      { re: /\b(sit|sitting|desk|computer)\b/, label: "sitting/desk" },
      { re: /\b(stand|standing)\b/, label: "prolonged standing" },
      { re: /\b(walk|walking)\b/, label: "walking" },
      { re: /\b(stairs?|steps)\b/, label: "stairs" },
      { re: /\b(bend|bending|flexion)\b/, label: "bending" },
      { re: /\b(lift|lifting|carry|carrying)\b/, label: "lifting/carrying" },
      { re: /\b(reach|reaching|overhead)\b/, label: "reaching/overhead" },
      { re: /\b(twist|twisting|turn)\b/, label: "twisting" },
      { re: /\b(run|running|jog)\b/, label: "running" },
      { re: /\b(driv|commute)\b/, label: "driving" },
      { re: /\b(squat|kneel|lunge)\b/, label: "squat/kneel" },
      { re: /\b(work|job|shift)\b/, label: "work tasks" },
      { re: /\b(night|lying|in bed|sleep)\b/, label: "night/lying" },
      { re: /\b(morning|first thing)\b/, label: "morning" },
      { re: /\b(heat|hot pack|heating)\b/, label: "heat" },
      { re: /\b(ice|cold pack|icing)\b/, label: "ice/cold" },
      { re: /\b(stretch|yoga|mobility)\b/, label: "stretching" },
      { re: /\b(rest|lie down)\b/, label: "rest/position change" },
      { re: /\b(meds?|ibuprofen|tylenol|naproxen|advil|aleve)\b/, label: "medication" },
      { re: /\b(massage|foam roll)\b/, label: "massage/soft tissue" },
      { re: /\b(brace|tape|support)\b/, label: "brace/support" },
      { re: /\b(dress|socks|shoes)\b/, label: "dressing" },
      { re: /\b(sport|gym|workout)\b/, label: "sport/gym" },
    ];
    const labels: string[] = [];
    for (const h of hits) if (h.re.test(s)) labels.push(h.label);
    if (!labels.length) {
      const cleaned = snippet
        .replace(/\s+/g, " ")
        .replace(/^(the|my|a|an|and|or)\s+/i, "")
        .trim()
        .slice(0, 40);
      if (cleaned.length >= 4 && cleaned.length <= 40) labels.push(cleaned);
    }
    return labels;
  };

  const aggRes = [
    /(?:worse|worsens?|aggravat\w*|flares?|hurts?|pain(?:ful)?|irritat\w*|bothers?)\s+(?:with|when|after|during|from|by|on|whenever)\s+([^.,;!?]{2,70})/i,
    /([^.,;!?]{2,50}?)\s+(?:makes? it worse|aggravates?|flares?(?:\s+it)?|sets? it off|triggers?(?:\s+(?:it|pain))?)/i,
    /(?:pain|hurt|ache|stiff(?:ness)?)\s+(?:with|when|after|during)\s+([^.,;!?]{2,50})/i,
  ];
  const easeRes = [
    /(?:better|easier|eases?|helps?|helped|relief|reliev\w*|improves?|calms?|settles?)\s+(?:with|when|after|from|by|using)\s+([^.,;!?]{2,60})/i,
    /([^.,;!?]{2,50}?)\s+(?:helps?|helped|eases?|relieves?|makes? it better)/i,
  ];
  const limitRes = [
    /(?:hard(?:er)? to|can't|cannot|unable to|struggl\w* (?:to|with)|difficulty|trouble)\s+([^.,;!?]{2,60})/i,
    /([^.,;!?]{2,50}?)\s+(?:is hard|is difficult|is limited|limits? me|stop(?:s|ped)? me)/i,
  ];

  for (const sent of sentences) {
    for (const re of aggRes) {
      const m = sent.match(re);
      if (!m?.[1]) continue;
      for (const label of mapSnippet(m[1])) {
        aggravators.push({ label, quote: quoteFrom(sent), conf: 0.92 });
      }
    }
    for (const re of easeRes) {
      const m = sent.match(re);
      if (!m?.[1]) continue;
      for (const label of mapSnippet(m[1])) {
        easers.push({ label, quote: quoteFrom(sent), conf: 0.9 });
      }
    }
    for (const re of limitRes) {
      const m = sent.match(re);
      if (!m?.[1]) continue;
      for (const label of mapSnippet(m[1])) {
        limits.push({ label, quote: quoteFrom(sent), conf: 0.9 });
      }
    }
  }

  const dedupe = <T extends { label: string }>(arr: T[]): T[] => {
    const seen = new Set<string>();
    return arr.filter((x) => {
      if (seen.has(x.label)) return false;
      seen.add(x.label);
      return true;
    });
  };

  return {
    aggravators: dedupe(aggravators),
    easers: dedupe(easers),
    limits: dedupe(limits),
  };
}

function extractTrajectory(sentences: string[]): {
  trajectory: StoryEliteAnalysis["trajectory"];
  quote?: string;
} {
  for (const sent of sentences) {
    const s = sent.toLowerCase();
    if (/\b(getting better|improving|less pain|settling down|calming down|on the mend)\b/i.test(s)) {
      return { trajectory: "improving", quote: quoteFrom(sent) };
    }
    if (/\b(getting worse|worsening|progressively worse|more painful|spreading|ramping up)\b/i.test(s)) {
      return { trajectory: "worsening", quote: quoteFrom(sent) };
    }
    if (/\b(up and down|comes and goes|fluctuat|some days better|varies day to day)\b/i.test(s)) {
      return { trajectory: "fluctuating", quote: quoteFrom(sent) };
    }
    if (/\b(about the same|unchanged|stable|plateau|not changing|stayed the same)\b/i.test(s)) {
      return { trajectory: "stable", quote: quoteFrom(sent) };
    }
  }
  return { trajectory: "unknown" };
}

function extractPainFromSentences(sentences: string[]): {
  now?: number;
  worst?: number;
  quotes: string[];
} {
  let now: number | undefined;
  let worst: number | undefined;
  const quotes: string[] = [];

  for (const sent of sentences) {
    const s = sent.toLowerCase();
    for (const m of Array.from(s.matchAll(/\b(\d{1,2})\s*(?:\/\s*10|out of\s*10)\b/g))) {
      const n = Number(m[1]);
      if (n < 0 || n > 10) continue;
      const local = s.slice(Math.max(0, (m.index || 0) - 40), (m.index || 0) + 24);
      if (/\b(worst|peak|highest|max|flare|up to)\b/i.test(local)) worst = n;
      else if (/\b(now|current|usual|typical|most of|rest|baseline|average)\b/i.test(local)) now = n;
      else if (now == null) now = n;
      else worst = Math.max(worst ?? n, n);
      quotes.push(quoteFrom(sent));
    }
    const rated = s.match(
      /\b(?:pain|hurt|ache|level|rated?|score|intensity)\s*(?:is|was|at|of|around|about|=|:)?\s*(?:a\s+)?(\d{1,2})\b/i
    );
    if (rated) {
      const after = s.slice((rated.index || 0) + rated[0].length, (rated.index || 0) + rated[0].length + 12);
      if (!/^\s*(weeks?|months?|days?|years?)/i.test(after)) {
        const n = Number(rated[1]);
        if (n >= 0 && n <= 10) {
          if (/\bworst\b/i.test(s)) worst = n;
          else if (now == null) now = n;
          quotes.push(quoteFrom(sent));
        }
      }
    }
  }
  return { now, worst, quotes: Array.from(new Set(quotes)) };
}

function buildHypotheses(base: StoryIntelligence, evidence: StoryEvidence[]): ClinicalHypothesis[] {
  const hyps: ClinicalHypothesis[] = [];
  const support = (pred: (e: StoryEvidence) => boolean) =>
    evidence.filter(pred).map((e) => e.claim);

  const has = (re: RegExp) => evidence.some((e) => re.test(e.value) || re.test(e.claim));
  const disc =
    "Provisional pattern label from stated language only — not a diagnosis; licensed clinician decides.";

  if (base.neuroLanguage || base.radiation) {
    hyps.push({
      label: "Neural / referred-symptom pattern (language-based)",
      support: [
        ...support((e) => e.theme === "radiation-neuro"),
        base.radiation ? "Radiation language present" : "",
        base.neuroLanguage ? "Neuro-symptom language present" : "",
      ].filter(Boolean),
      confidence: base.radiation ? "medium" : "low",
      disclaimer: disc,
    });
  }

  if (has(/sitting|desk/) && base.regions.some((r) => /back|neck|thoracic|scapular/.test(r))) {
    hyps.push({
      label: "Load-sensitive desk / flexion-exposure pattern (stated aggravator)",
      support: support((e) => /sitting|desk/.test(e.value)),
      confidence: "medium",
      disclaimer: disc,
    });
  }

  if (has(/stairs|walking/) && base.regions.some((r) => /knee|hip|ankle|foot|glute/.test(r))) {
    hyps.push({
      label: "Lower-limb load / closed-chain demand pattern (stated limits)",
      support: support((e) => /stairs|walking|squat/.test(e.value)),
      confidence: "medium",
      disclaimer: disc,
    });
  }

  if (has(/reaching|overhead/) || base.regions.includes("shoulders")) {
    if (has(/reaching|overhead/)) {
      hyps.push({
        label: "Shoulder elevation / reach-demand pattern (stated)",
        support: support((e) => /reach|overhead|shoulder/.test(e.value) || /reach|overhead/.test(e.claim)),
        confidence: "medium",
        disclaimer: disc,
      });
    }
  }

  if (base.sensory.includes("stiff/tight") && base.activityResponse === "better") {
    hyps.push({
      label: "Stiffness-dominant, movement-eases pattern (stated)",
      support: ["stiff/tight sensory language", "better after movement (stated)"],
      confidence: "medium",
      disclaimer: disc,
    });
  }

  if (base.onset === "sudden" && (base.timelineHints.includes("post-event") || base.timelineHints.includes("days–week"))) {
    hyps.push({
      label: "Recent sudden-onset / post-event irritability window (stated)",
      support: ["sudden onset language", ...base.timelineHints.slice(0, 2)],
      confidence: "low",
      disclaimer: disc,
    });
  }

  return hyps.slice(0, 4);
}

function buildDoseEnvelope(base: StoryIntelligence): DoseEnvelope {
  const rationale: string[] = [];
  const srcNote =
    base.irritabilitySource === "assumed"
      ? "assumed (confirm with user)"
      : base.irritabilitySource === "stated"
        ? "stated signals"
        : "unknown";

  // Hard protect signals
  if (base.redFlagHints.length || base.activityResponse === "delayed-worse" || base.irritability === "high") {
    rationale.push(
      base.redFlagHints.length
        ? "Red-flag language present — conservative envelope"
        : base.activityResponse === "delayed-worse"
          ? "Delayed post-activity flare stated"
          : `High irritability (${srcNote})`
    );
    return {
      mode: "protect",
      rationale,
      minutesScale: 0.7,
      maxDifficulty: "beginner",
      phaseBias: "protect-calm",
    };
  }

  if (base.irritability === "low" && (base.activityResponse === "better" || base.activityResponse === "same")) {
    rationale.push(`Lower irritability (${srcNote}) with tolerable activity response`);
    return {
      mode: "build",
      rationale,
      minutesScale: 1.05,
      maxDifficulty: "intermediate",
      phaseBias: base.functionalLimits.some((f) => /sport|gym/.test(f))
        ? "capacity-load"
        : "function-return",
    };
  }

  if (base.irritability === "moderate" || base.irritability === "low" || base.activityResponse !== "unknown") {
    rationale.push(
      base.irritabilitySource === "assumed"
        ? `Steady envelope using assumed ${base.irritability} irritability (data-first; confirm)`
        : "Steady envelope from irritability/activity signals"
    );
    return {
      mode: "steady",
      rationale,
      minutesScale: 0.9,
      maxDifficulty: "beginner",
      phaseBias: base.sensory.includes("stiff/tight") ? "mobility-restore" : "motor-control",
    };
  }

  rationale.push("Insufficient signal for dose envelope — neutral defaults");
  return {
    mode: "unknown",
    rationale,
    minutesScale: 1,
    maxDifficulty: "beginner",
    phaseBias: "motor-control",
  };
}

function computeCompleteness(base: StoryIntelligence, evidence: StoryEvidence[]): number {
  // Critical clinical interview axes (weighted like a real eval checklist)
  const axes: Array<{ ok: boolean; w: number }> = [
    { ok: base.regions.length > 0 || base.wordCount >= 12, w: 12 },
    { ok: base.laterality !== "unknown", w: 6 },
    { ok: base.sensory.length > 0, w: 8 },
    { ok: base.onset !== "unknown" || base.timelineHints.length > 0, w: 8 },
    { ok: base.painNow != null || base.painWorst != null, w: 10 },
    { ok: base.aggravators.length > 0, w: 14 },
    { ok: base.easers.length > 0, w: 8 },
    { ok: base.functionalLimits.length > 0, w: 10 },
    { ok: base.activityResponse !== "unknown", w: 10 },
    { ok: base.goals.length > 0, w: 8 },
    { ok: base.coveredThemes.includes("history") || base.coveredThemes.includes("red-flags"), w: 6 },
  ];
  const total = axes.reduce((a, x) => a + x.w, 0);
  const got = axes.reduce((a, x) => a + (x.ok ? x.w : 0), 0);
  const evidenceBoost = Math.min(8, evidence.filter((e) => e.confidence >= 0.85).length);
  return Math.min(100, Math.round((got / total) * 92 + evidenceBoost));
}

function gradeIntelligence(completeness: number, wordCount: number): StoryEliteAnalysis["intelligenceGrade"] {
  if (wordCount === 0) return "empty";
  if (completeness < 25) return "signal-poor";
  if (completeness < 50) return "usable";
  if (completeness < 75) return "strong";
  return "flight-ready";
}

function buildCriticalGaps(base: StoryIntelligence, name: string): CriticalGap[] {
  const region = regionLabel(base.regions);
  const regionPhrase =
    !region || /bothers you|what is bothering/i.test(region)
      ? "this area"
      : region.startsWith("your ")
        ? region
        : `your ${region}`;
  const gaps: CriticalGap[] = [];

  if (!base.aggravators.length) {
    gaps.push({
      theme: "aggravators",
      why: "No positions/actions/activities were stated as causal — cannot dose load without this.",
      askNext: `${name}, what reliably makes ${regionPhrase} worse—specific positions, actions, or activities—and how quickly does it build?`,
      informationValue: 100,
    });
  }
  if (base.painNow == null && base.painWorst == null) {
    gaps.push({
      theme: "pain-intensity",
      why: "No explicit 0–10 rating stated — intensity remains unknown (not assumed).",
      askNext: `On a 0–10 scale, where does ${regionPhrase} sit most of the day, and where does it go at its worst? (Only if you know—don’t guess.)`,
      informationValue: 88,
    });
  }
  if (base.activityResponse === "unknown") {
    gaps.push({
      theme: "activity-response",
      why: "24-hour response after activity is the primary dosing governor and is still unknown.",
      askNext: `After you move, stretch, or do chores, do you feel better, the same, or more irritated later (especially 2–24 hours after)?`,
      informationValue: 92,
    });
  }
  if (!base.functionalLimits.length) {
    gaps.push({
      theme: "function-limits",
      why: "No functional anchor stated — plan cannot target real-world tasks yet.",
      askNext: `Which everyday task is hardest because of this—and what about that task feels limited?`,
      informationValue: 84,
    });
  }
  if (!base.easers.length && base.aggravators.length) {
    gaps.push({
      theme: "easers",
      why: "Aggravators are known but easers are not — incomplete control strategy.",
      askNext: `What reliably eases ${regionPhrase} even a little—and how long does relief last?`,
      informationValue: 78,
    });
  }
  if (base.onset === "unknown" && !base.timelineHints.length) {
    gaps.push({
      theme: "onset-timeline",
      why: "Onset/timeline not stated — phase selection lacks a clock.",
      askNext: `How did this start (sudden vs gradual), and roughly how long has it been going on?`,
      informationValue: 70,
    });
  }
  if (!base.goals.length) {
    gaps.push({
      theme: "goals",
      why: "No stated goal — success criteria undefined.",
      askNext: `If we only improved one thing in the next two weeks, what would feel like a real win?`,
      informationValue: 66,
    });
  }
  if (base.laterality === "unknown" && base.regions.length) {
    gaps.push({
      theme: "laterality",
      why: "Side not specified for named region(s).",
      askNext: `Is ${regionPhrase} mainly left, right, both, or central?`,
      informationValue: 55,
    });
  }
  if (!base.sensory.length && base.wordCount >= 12) {
    gaps.push({
      theme: "location-quality",
      why: "Sensation quality not stated.",
      askNext: `What words fit best for how it feels—sharp, dull, stiff, burning, numb, weak, throbbing?`,
      informationValue: 60,
    });
  }

  return gaps.sort((a, b) => b.informationValue - a.informationValue);
}

function detectConflicts(base: StoryIntelligence, sentences: string[]): string[] {
  const conflicts: string[] = [];
  const blob = sentences.join(" ").toLowerCase();

  if (base.painNow != null && base.painNow <= 3 && /\b(unbearable|excruciating|severe|crippling)\b/i.test(blob)) {
    conflicts.push(
      `Qualitative severity language (“severe/unbearable”) conflicts with stated low number (${base.painNow}/10) — clarify which is accurate.`
    );
  }
  if (base.painNow != null && base.painNow >= 8 && /\b(mild|slight|barely|nuisance)\b/i.test(blob)) {
    conflicts.push(
      `Mild-language conflicts with high stated score (${base.painNow}/10) — clarify current vs worst.`
    );
  }
  if (base.activityResponse === "better" && base.irritability === "high") {
    conflicts.push(
      "You describe movement easing symptoms while other signals read high irritability — specify volume that helps vs volume that spikes."
    );
  }
  if (base.easers.some((e) => /stretch/.test(e)) && base.aggravators.some((a) => /stretch/.test(a))) {
    conflicts.push("Stretching appears as both easer and aggravator — clarify dose, range, or timing.");
  }
  if (base.goals.some((g) => /sport|gym|run/.test(g)) && base.irritability === "high" && base.painNow != null && base.painNow >= 7) {
    conflicts.push(
      "Return-to-sport goal coexists with high stated pain/irritability — plan will protect first unless you clarify readiness."
    );
  }
  return conflicts;
}

function buildSystemsRead(
  base: StoryIntelligence,
  completeness: number,
  grade: StoryEliteAnalysis["intelligenceGrade"],
  dose: DoseEnvelope,
  trajectory: StoryEliteAnalysis["trajectory"]
): string[] {
  const lines: string[] = [];
  lines.push(
    `Signal grade: ${grade} · interview completeness ${completeness}/100 · evidence themes ${base.coveredThemes.length}/${base.coveredThemes.length + base.missingThemes.length}`
  );
  lines.push(
    `Dose envelope: ${dose.mode} (${dose.phaseBias}, ×${dose.minutesScale.toFixed(2)} min, max ${dose.maxDifficulty}) — ${dose.rationale[0] || "n/a"}`
  );
  if (trajectory !== "unknown") lines.push(`Trajectory (stated): ${trajectory}`);
  if (base.irritability === "unknown") {
    lines.push("Irritability: unknown.");
  } else {
    lines.push(
      `Irritability: ${base.irritability} (${base.irritabilitySource || "stated"}; data-first with labeled assumptions when needed).`
    );
  }
  if (!base.aggravators.length) {
    lines.push("Causal load map: empty — no positions/actions/activities locked as aggravators.");
  } else {
    lines.push(`Causal load map: ${base.aggravators.slice(0, 5).join(", ")}`);
  }
  return lines;
}

function buildEliteLiveRead(
  name: string,
  base: StoryIntelligence,
  elite: Omit<StoryEliteAnalysis, "liveReadLines" | "adaptiveQuestions" | "evidenceSummaryLine">
): string[] {
  const lines: string[] = [];
  const region = regionLabel(base.regions);

  if (base.richness === "empty") {
    return [
      `${name}, systems are armed and waiting — state what bothers you; nothing will be invented.`,
    ];
  }

  const painBit =
    base.painNow != null
      ? `${base.painNow}/10${base.painWorst != null && base.painWorst !== base.painNow ? ` (worst ${base.painWorst}/10)` : ""} stated`
      : base.painWorst != null
        ? `worst ${base.painWorst}/10 stated`
        : "0–10 not stated";

  lines.push(
    `Flight read: ${region}${base.laterality !== "unknown" ? ` · ${base.laterality}` : ""}${
      base.sensory.length ? ` · ${base.sensory.slice(0, 3).join(", ")}` : ""
    } · pain ${painBit}.`
  );

  lines.push(
    `Telemetry: completeness ${elite.completeness}/100 (${elite.intelligenceGrade}) · irritability ${
      base.irritability === "unknown" ? "unknown (not assumed)" : base.irritability
    } · dose ${elite.doseEnvelope.mode}${
      elite.trajectory !== "unknown" ? ` · trajectory ${elite.trajectory}` : ""
    }.`
  );

  if (base.aggravators.length) {
    lines.push(`Stated aggravators: ${base.aggravators.slice(0, 5).join(", ")}.`);
  } else {
    lines.push("Stated aggravators: none — positions/actions/activities not specified (not assumed).");
  }

  if (base.easers.length) lines.push(`Stated easers: ${base.easers.slice(0, 4).join(", ")}.`);
  if (base.functionalLimits.length) {
    lines.push(`Stated function limits: ${base.functionalLimits.slice(0, 4).join(", ")}.`);
  }
  if (base.goals.length) lines.push(`Stated goals: ${base.goals.slice(0, 3).join("; ")}.`);

  if (elite.conflicts[0]) lines.push(`Conflict check: ${elite.conflicts[0]}`);
  if (elite.clinicalHypotheses[0]) {
    lines.push(
      `Provisional pattern (${elite.clinicalHypotheses[0].confidence}): ${elite.clinicalHypotheses[0].label}`
    );
  }

  if (elite.criticalGaps[0]) {
    lines.push(`Highest-value gap: ${elite.criticalGaps[0].theme} — ${elite.criticalGaps[0].why}`);
  }

  // Evidence quotes (max 2) for engineer-style traceability
  const topEv = elite.evidence.filter((e) => e.confidence >= 0.85).slice(0, 2);
  for (const e of topEv) {
    lines.push(`Evidence: “${e.quote}” → ${e.claim}`);
  }

  return lines.slice(0, 10);
}

function buildEliteQuestions(
  name: string,
  base: StoryIntelligence,
  gaps: CriticalGap[],
  conflicts: string[]
): AdaptiveStoryQuestion[] {
  const q: AdaptiveStoryQuestion[] = [];
  const region = regionLabel(base.regions);
  const push = (item: AdaptiveStoryQuestion) => {
    if (q.some((x) => x.id === item.id)) return;
    if (base.raw.includes(item.question.slice(0, Math.min(36, item.question.length)))) return;
    q.push(item);
  };

  if (conflicts[0]) {
    push({
      id: "elite-conflict",
      label: "Clarify a conflict",
      question: `${name}, I noticed a possible inconsistency: ${conflicts[0]} Which part should I trust for dosing?`,
      category: "irritability",
      theme: "pain-intensity",
      reason: "Conflict detection — resolve before plan lock",
      priority: 98,
    });
  }

  for (const g of gaps.slice(0, 6)) {
    const cat: AdaptiveStoryQuestion["category"] =
      g.theme === "red-flags" || g.theme === "history"
        ? "safety"
        : g.theme === "goals"
          ? "goals"
          : g.theme === "function-limits"
            ? "function"
            : g.theme === "aggravators" || g.theme === "activity-response" || g.theme === "pain-intensity"
              ? "irritability"
              : g.theme === "fear-avoidance" || g.theme === "easers"
                ? "behavior"
                : "bother";
    push({
      id: `elite-gap-${g.theme}`,
      label:
        g.theme === "aggravators"
          ? "What sets it off?"
          : g.theme === "pain-intensity"
            ? "Pain 0–10 (if known)"
            : g.theme === "activity-response"
              ? "After-activity response?"
              : g.theme === "function-limits"
                ? "Hardest daily task?"
                : g.theme === "easers"
                  ? "What eases it?"
                  : g.theme === "goals"
                    ? "2-week win?"
                    : g.theme === "onset-timeline"
                      ? "Onset & timeline?"
                      : g.theme === "laterality"
                        ? "Left, right, or both?"
                        : "Clinical detail?",
      question: g.askNext,
      category: cat,
      theme: g.theme,
      reason: g.why,
      priority: g.informationValue,
    });
  }

  // Deepen only when evidence exists (probe, don’t invent).
  // Skip re-asking facts already in free text (minutes, up/down, etc.).
  const rawL = base.raw.toLowerCase();
  const sittingDoseKnown =
    /\b(\d{1,3})\s*(min|mins|minutes|hour|hours)\b/.test(rawL) &&
    /\b(sit|sitting|desk)\b/.test(rawL);
  const stairsDirKnown =
    /\b(going\s+)?(up|down|upstairs|downstairs)\b/.test(rawL) &&
    /\b(stair|stairs)\b/.test(rawL);
  const regionSoft = region
    .split("/")[0]!
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const regionPhrase = regionSoft.startsWith("your ")
    ? regionSoft
    : `your ${regionSoft || "symptoms"}`;

  if (base.aggravators.includes("sitting/desk")) {
    if (sittingDoseKnown) {
      push({
        id: "elite-sit-recover",
        label: "What ends the sit flare?",
        question: `You already timed how long sitting builds ${regionPhrase}. What ends that flare faster—standing, a short walk, lumbar support, or something else—and how long until it settles?`,
        category: "irritability",
        theme: "aggravators",
        reason: "Sitting dose already stated — deepen recovery strategy",
        priority: 91,
      });
    } else {
      push({
        id: "elite-sit-dose",
        label: "Sitting dose?",
        question: `You linked symptoms to sitting/desk. About how many minutes before symptoms in ${regionPhrase} build, and does standing or walking settle them?`,
        category: "irritability",
        theme: "aggravators",
        reason: "Deepen stated sitting/desk aggravator",
        priority: 91,
      });
    }
  }
  if (base.aggravators.includes("stairs") || base.functionalLimits.includes("stairs")) {
    if (stairsDirKnown) {
      push({
        id: "elite-stairs-limiter",
        label: "What limits stairs first?",
        question: `You already said which way on stairs is harder. Is the first limit pain, weakness, swelling, stiffness, or a sense of giving way?`,
        category: "function",
        theme: "function-limits",
        reason: "Stairs direction already stated — ask limiter only",
        priority: 90,
      });
    } else {
      push({
        id: "elite-stairs",
        label: "Stairs: up/down?",
        question: `With stairs, is it worse going up, down, or both—and is the first limit pain, weakness, swelling, or giving way?`,
        category: "function",
        theme: "function-limits",
        reason: "Deepen stated stair limitation",
        priority: 90,
      });
    }
  }
  if (base.neuroLanguage || base.radiation) {
    push({
      id: "elite-neuro-map",
      label: "Map the path",
      question: `Trace the nerve-like symptoms you mentioned: where they start, where they travel, constant vs positional, and any weakness with them.`,
      category: "bother",
      theme: "radiation-neuro",
      reason: "Neuro/radiation language stated — map distribution",
      priority: 93,
    });
  }
  if (base.irritability === "high") {
    push({
      id: "elite-safe-motion",
      label: "Any safe motion?",
      question: `With a high-irritability picture from your words—what small range or position still feels relatively safe, and how long do flares last when you overdo it?`,
      category: "irritability",
      theme: "pain-intensity",
      reason: "High irritability from stated evidence",
      priority: 89,
    });
  }

  if (!base.raw || base.raw.length < 24) {
    push({
      id: "elite-start",
      label: "What’s bothering you most?",
      question: `${name}, what is bothering you most right now—and how does it show up in a typical day?`,
      category: "bother",
      theme: "primary-complaint",
      reason: "Cold start — acquire primary signal",
      priority: 100,
    });
  }

  return q.sort((a, b) => b.priority - a.priority).slice(0, 10);
}

/**
 * Run elite analysis on top of base StoryIntelligence (must already be assumption-safe).
 */
export function runEliteStoryEngine(
  base: StoryIntelligence,
  opts?: { preferredName?: string }
): StoryEliteAnalysis {
  const name = (opts?.preferredName || "").trim() || "friend";
  const sentences = segmentClinicalSentences(base.raw);
  const evidence: StoryEvidence[] = [];

  // Fuse base extractions into ledger with quotes when possible
  const frames = extractCausalFrames(sentences);
  const painSent = extractPainFromSentences(sentences);
  const { trajectory, quote: trajectoryQuote } = extractTrajectory(sentences);

  for (const r of base.regions) {
    pushEvidence(evidence, {
      theme: "location-quality",
      claim: `Region named: ${BODY_PART_LABELS[r] || r}`,
      value: r,
      quote: quoteFrom(sentences.find((s) => new RegExp(r.replace(/-/g, "\\s*"), "i").test(s) || s.toLowerCase().includes((BODY_PART_LABELS[r] || r).toLowerCase().split(" ")[0]!)) || base.raw),
      confidence: 0.95,
      kind: "explicit",
    });
  }

  if (base.laterality !== "unknown") {
    pushEvidence(evidence, {
      theme: "laterality",
      claim: `Laterality stated: ${base.laterality}`,
      value: base.laterality,
      quote: quoteFrom(sentences.find((s) => /left|right|both|central|midline/i.test(s)) || base.raw),
      confidence: 0.93,
      kind: "explicit",
    });
  }

  for (const s of base.sensory) {
    pushEvidence(evidence, {
      theme: "location-quality",
      claim: `Sensation stated: ${s}`,
      value: s,
      quote: quoteFrom(sentences.find((x) => x.toLowerCase().includes(s.split("/")[0]!)) || base.raw),
      confidence: 0.9,
      kind: "explicit",
    });
  }

  const painNow = base.painNow ?? painSent.now;
  const painWorst = base.painWorst ?? painSent.worst;
  if (painNow != null) {
    pushEvidence(evidence, {
      theme: "pain-intensity",
      claim: `Pain now ${painNow}/10 (explicit)`,
      value: String(painNow),
      quote: painSent.quotes[0] || quoteFrom(base.raw),
      confidence: 0.98,
      kind: "explicit",
    });
  }
  if (painWorst != null) {
    pushEvidence(evidence, {
      theme: "pain-intensity",
      claim: `Pain worst ${painWorst}/10 (explicit)`,
      value: `worst:${painWorst}`,
      quote: painSent.quotes[1] || painSent.quotes[0] || quoteFrom(base.raw),
      confidence: 0.96,
      kind: "explicit",
    });
  }

  // Prefer frame-extracted aggravators (sentence-causal) intersected with base (assumption-safe)
  const aggLabels = base.aggravators.length
    ? base.aggravators
    : frames.aggravators.map((a) => a.label);
  for (const a of base.aggravators) {
    const fr = frames.aggravators.find((x) => x.label === a);
    pushEvidence(evidence, {
      theme: "aggravators",
      claim: `Aggravator stated: ${a}`,
      value: a,
      quote: fr?.quote || quoteFrom(sentences.find((s) => s.toLowerCase().includes(a.split("/")[0]!)) || base.raw),
      confidence: fr?.conf ?? 0.9,
      kind: "explicit",
    });
  }
  for (const e of base.easers) {
    const fr = frames.easers.find((x) => x.label === e);
    pushEvidence(evidence, {
      theme: "easers",
      claim: `Easer stated: ${e}`,
      value: e,
      quote: fr?.quote || quoteFrom(base.raw),
      confidence: fr?.conf ?? 0.88,
      kind: "explicit",
    });
  }
  for (const f of base.functionalLimits) {
    pushEvidence(evidence, {
      theme: "function-limits",
      claim: `Function limit stated: ${f}`,
      value: f,
      quote: quoteFrom(sentences.find((s) => /can't|cannot|hard|difficult|struggle/i.test(s)) || base.raw),
      confidence: 0.9,
      kind: "explicit",
    });
  }

  if (base.activityResponse !== "unknown") {
    pushEvidence(evidence, {
      theme: "activity-response",
      claim: `Activity response stated: ${base.activityResponse}`,
      value: base.activityResponse,
      quote: quoteFrom(
        sentences.find((s) => /after|next day|better|worse|same/i.test(s)) || base.raw
      ),
      confidence: 0.9,
      kind: "explicit",
    });
  }

  if (base.onset !== "unknown") {
    pushEvidence(evidence, {
      theme: "onset-timeline",
      claim: `Onset stated: ${base.onset}`,
      value: base.onset,
      quote: quoteFrom(sentences.find((s) => /sudden|gradual|nowhere|insidious/i.test(s)) || base.raw),
      confidence: 0.88,
      kind: "explicit",
    });
  }

  for (const g of base.goals) {
    pushEvidence(evidence, {
      theme: "goals",
      claim: `Goal stated: ${g}`,
      value: g,
      quote: quoteFrom(sentences.find((s) => /want|hope|goal|get back|return/i.test(s)) || base.raw),
      confidence: 0.9,
      kind: "explicit",
    });
  }

  for (const rf of base.redFlagHints) {
    pushEvidence(evidence, {
      theme: "red-flags",
      claim: `Red-flag language: ${rf}`,
      value: rf,
      quote: quoteFrom(base.raw),
      confidence: 0.85,
      kind: "stated-qualitative",
    });
  }

  if (trajectory !== "unknown" && trajectoryQuote) {
    pushEvidence(evidence, {
      theme: "trajectory",
      claim: `Trajectory stated: ${trajectory}`,
      value: trajectory,
      quote: trajectoryQuote,
      confidence: 0.87,
      kind: "explicit",
    });
  }

  const completeness = computeCompleteness(base, evidence);
  const intelligenceGrade = gradeIntelligence(completeness, base.wordCount);
  const criticalGaps = base.wordCount === 0 ? [] : buildCriticalGaps(base, name);
  const doseEnvelope = buildDoseEnvelope(base);
  const conflicts = detectConflicts(base, sentences);
  const clinicalHypotheses = buildHypotheses(base, evidence);
  const systemsRead = buildSystemsRead(base, completeness, intelligenceGrade, doseEnvelope, trajectory);

  const partial = {
    sentences,
    evidence,
    completeness,
    intelligenceGrade,
    criticalGaps,
    trajectory,
    trajectoryQuote,
    doseEnvelope,
    conflicts,
    systemsRead,
    clinicalHypotheses,
  };

  const liveReadLines = buildEliteLiveRead(name, base, partial);
  const adaptiveQuestions = buildEliteQuestions(name, base, criticalGaps, conflicts);

  const evidenceSummaryLine =
    evidence.length === 0
      ? "Evidence ledger empty — awaiting user statements."
      : `${evidence.length} evidence items · top: ${evidence
          .slice(0, 3)
          .map((e) => e.claim)
          .join("; ")}`;

  // silence unused aggLabels lint
  void aggLabels;

  return {
    ...partial,
    liveReadLines,
    adaptiveQuestions,
    evidenceSummaryLine,
  };
}

/**
 * Merge elite adaptive questions with base: elite first by priority, then unique base.
 * Near-duplicate questions (same clinical slot) are collapsed — keep higher priority.
 */
export function mergeAdaptiveQuestions(
  elite: AdaptiveStoryQuestion[],
  base: AdaptiveStoryQuestion[],
  cap = 10
): AdaptiveStoryQuestion[] {
  const out: AdaptiveStoryQuestion[] = [];
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();
  const normalizeLabel = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  for (const q of [...elite, ...base].sort((a, b) => b.priority - a.priority)) {
    if (seenIds.has(q.id)) continue;
    const lab = normalizeLabel(q.label);
    // Collapse “Sitting dose?” vs “Sitting tolerance?” / “Stairs: up/down?” vs “Stairs: up, down, or both?”
    const labKey = lab
      .replace(/\btolerance\b/g, "dose")
      .replace(/\bup down or both\b/g, "up down")
      .replace(/\bup\/down\b/g, "up down");
    if (seenLabels.has(labKey)) continue;
    if (
      out.some(
        (x) =>
          x.theme === q.theme &&
          (normalizeLabel(x.label) === lab ||
            questionNearDuplicate(x.question, q.question))
      )
    ) {
      continue;
    }
    seenIds.add(q.id);
    seenLabels.add(labKey);
    out.push(q);
    if (out.length >= cap) break;
  }
  return out;
}

function questionNearDuplicate(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  // Shared distinctive clinical stems
  const stems = (s: string) =>
    new Set(
      s
        .split(" ")
        .filter(
          (w) =>
            w.length >= 4 &&
            /sit|desk|stair|walk|pain|ease|sleep|fear|goal|after|reach|minute|weak|swell|numb|flare/.test(
              w
            )
        )
    );
  const A = stems(na);
  const B = stems(nb);
  if (!A.size || !B.size) return false;
  let inter = 0;
  // Array.from avoids for..of / spread on Set under production TS without downlevelIteration
  const aArr = Array.from(A);
  const bArr = Array.from(B);
  for (let i = 0; i < aArr.length; i++) {
    if (B.has(aArr[i]!)) inter++;
  }
  const union = new Set(aArr.concat(bArr)).size;
  return inter >= 3 && inter / union >= 0.55;
}
