/**
 * Deep free-text story intelligence for Assessment “Describe Your Issue”.
 *
 * Stack:
 * 1) Data-driven extractors — only explicit user statements (authoritative).
 * 2) No clinical assumption fill — missing fields stay unknown/empty until the user writes them.
 * 3) Elite systems layer — evidence ledger, completeness, conflict detection,
 *    info-value adaptive interview (asks; does not invent answers).
 *
 * Free-write first: the text box is the source of truth. We never invent pain
 * scores, aggravators, goals, or irritability from silence or soft guesses.
 *
 * Educational only — not diagnosis or licensed care.
 */

import type { BodyPart, Difficulty, MovementKind } from "@/lib/types";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import { matchDescriptorsFromText } from "@/data/pain-descriptors";
import { matchConditionsFromText } from "@/data/clinical-conditions";
import type { SexSelection } from "@/lib/clinical-history";
import {
  mergeAdaptiveQuestions,
  runEliteStoryEngine,
  type StoryEliteAnalysis,
} from "@/lib/story-engine-elite";
import {
  conversationalRegion,
  refineStoryFollowUps,
} from "@/lib/interview-followups";
import {
  injuryTimelineLiveLines,
  mergePhaseBias,
  parseInjuryTimeline,
  type InjuryTimeline,
} from "@/lib/injury-timeline";
import {
  applyOccupationToPlanTags,
  occupationLiveLines,
  type OccupationProfile,
} from "@/lib/occupation";
import { resolveOccupationProfile } from "@/data/occupations";
import { foldKeyboardPunctuation, stripDangerousInvisible } from "@/lib/input-normalize";

function displayPreferredName(preferredName?: string | null): string {
  const p = (preferredName || "").trim();
  if (p) return p;
  return "friend";
}

export type StoryTheme =
  | "primary-complaint"
  | "location-quality"
  | "onset-timeline"
  | "pain-intensity"
  | "aggravators"
  | "easers"
  | "time-pattern"
  | "function-limits"
  | "activity-response"
  | "fear-avoidance"
  | "sleep-stress"
  | "radiation-neuro"
  | "history"
  | "goals"
  | "red-flags"
  | "laterality"
  | "occupation";

/** “unknown” = insufficient evidence — never treat silence as moderate/low/high. */
export type StoryIrritability = "low" | "moderate" | "high" | "unknown";
export type ActivityResponse = "better" | "worse" | "same" | "delayed-worse" | "unknown";
export type OnsetType = "sudden" | "gradual" | "insidious" | "unknown";
export type Laterality = "left" | "right" | "bilateral" | "central" | "unknown";

export type AdaptiveStoryQuestion = {
  id: string;
  label: string;
  question: string;
  category: "bother" | "behavior" | "irritability" | "function" | "history" | "goals" | "safety";
  theme: StoryTheme;
  /** Why this question appeared (shown in UI) */
  reason: string;
  priority: number;
};

export type StoryPlanHints = {
  phaseBias: "protect-calm" | "mobility-restore" | "motor-control" | "capacity-load" | "function-return";
  preferTags: string[];
  avoidTags: string[];
  stretchBias: number;
  exerciseBias: number;
  minutesScale: number;
  maxDifficulty: Difficulty;
  preferKinds: MovementKind[];
  movementKeywords: string[];
  irritability: StoryIrritability;
  functionalGoals: string[];
  evidenceLines: string[];
  scoringBoost: number;
};

/** Transparent clinical assumption (never mixed into “you stated” fields). */
export type StoryAssumption = {
  field:
    | "irritability"
    | "aggravators"
    | "easers"
    | "goals"
    | "pain-estimate"
    | "activity-response"
    | "region-context"
    | "dose";
  value: string;
  reason: string;
  confidence: "low" | "medium";
};

export type StoryIntelligence = {
  raw: string;
  wordCount: number;
  richness: "empty" | "thin" | "moderate" | "rich" | "clinical";
  primaryComplaint?: string;
  regions: BodyPart[];
  laterality: Laterality;
  sensory: string[];
  onset: OnsetType;
  timelineHints: string[];
  /**
   * Structured time since injury/onset (weeks 0–6+, months, years)
   * + evidence-informed progress outlook. Parsed from free text only.
   */
  injuryTimeline: InjuryTimeline;
  /**
   * Work / school / daily role (desk, labor, healthcare, driving, athlete,
   * student, retired, etc.) parsed from free text for HEP realism.
   */
  occupation: OccupationProfile;
  /** Explicit 0–10 only (never filled from adjectives). */
  painNow?: number;
  painWorst?: number;
  /** Soft qualitative band — may be estimated when no 0–10 given. */
  painEstimate?: { now?: number; worst?: number; source: "stated" | "assumed" };
  /** Causal-framed aggravators only (stated). */
  aggravators: string[];
  /** Soft context activities mentioned without causal framing (assumed for plan tags). */
  assumedAggravators: string[];
  easers: string[];
  assumedEasers: string[];
  timeOfDayWorst: string[];
  functionalLimits: string[];
  fearAvoidance: boolean;
  sleepImpact: boolean;
  stressImpact: boolean;
  activityResponse: ActivityResponse;
  /** Working irritability used for dosing (may be assumed). */
  irritability: StoryIrritability;
  /** Whether working irritability came from stated signals vs default/heuristic. */
  irritabilitySource: "stated" | "assumed" | "unknown";
  directionalCues: string[];
  radiation: boolean;
  neuroLanguage: boolean;
  /** Explicit goal language (stated). */
  goals: string[];
  /** Provisional goals derived from limits/context (assumed). */
  assumedGoals: string[];
  redFlagHints: string[];
  coveredThemes: StoryTheme[];
  missingThemes: StoryTheme[];
  descriptorIds: string[];
  conditionIds: string[];
  answerSnippets: Array<{ theme: StoryTheme; text: string }>;
  planHints: StoryPlanHints;
  coachSummary: string;
  liveReadLines: string[];
  adaptiveQuestions: AdaptiveStoryQuestion[];
  priorPrompt: {
    heading: string;
    question: string;
    placeholder: string;
    coachLine: string;
  };
  /** Labeled assumptions applied for dosing / interview continuity */
  assumptions: StoryAssumption[];
  /** Elite systems layer: evidence ledger, dose envelope, completeness, hypotheses */
  elite?: StoryEliteAnalysis;
  /** 0–100 interview completeness (elite) */
  completeness?: number;
  /** Engineer-facing signal grade */
  intelligenceGrade?: StoryEliteAnalysis["intelligenceGrade"];
  /** Stated trajectory only */
  trajectory?: StoryEliteAnalysis["trajectory"];
  /** Detected inconsistencies (never auto-resolved by invention) */
  conflicts?: string[];
};

const ALL_THEMES: StoryTheme[] = [
  "primary-complaint",
  "location-quality",
  "onset-timeline",
  "pain-intensity",
  "aggravators",
  "easers",
  "time-pattern",
  "function-limits",
  "activity-response",
  "fear-avoidance",
  "sleep-stress",
  "radiation-neuro",
  "history",
  "goals",
  "red-flags",
  "laterality",
  "occupation",
];

/** One stated region → one part. Never expand (e.g. hip must not invent groin+glutes). */
const AREA_MAP: Array<{ re: RegExp; parts: BodyPart[] }> = [
  { re: /\b(low(?:er)?\s*back|lumbar|lumbago)\b/i, parts: ["lower-back"] },
  { re: /\b(mid(?:dle)?\s*back|thoracic)\b/i, parts: ["thoracic"] },
  { re: /\b(upper\s*back)\b/i, parts: ["upper-back"] },
  { re: /\b(neck|cervical|whiplash)\b/i, parts: ["neck"] },
  { re: /\b(shoulder|rotator\s*cuff)\b/i, parts: ["shoulders"] },
  { re: /\b(scapula|shoulder\s*blade)\b/i, parts: ["scapular"] },
  { re: /\b(hip|hips)\b/i, parts: ["hips"] },
  { re: /\b(piriformis)\b/i, parts: ["glutes"] },
  { re: /\b(groin)\b/i, parts: ["groin"] },
  { re: /\b(knee|patell|menisc)\b/i, parts: ["knee"] },
  { re: /\b(acl|mcl|lcl|pcl)\b/i, parts: ["knee"] },
  { re: /\b(ankle)\b/i, parts: ["ankles"] },
  { re: /\b(achilles)\b/i, parts: ["calves"] },
  { re: /\b(foot|plantar|heel|arch)\b/i, parts: ["foot"] },
  { re: /\b(elbow|tennis\s*elbow|golfer.?s\s*elbow)\b/i, parts: ["elbow"] },
  { re: /\b(forearm)\b/i, parts: ["forearm"] },
  { re: /\b(wrist|carpal)\b/i, parts: ["wrists"] },
  { re: /\b(hand|finger)\b/i, parts: ["hand"] },
  { re: /\b(jaw|tmj)\b/i, parts: ["jaw"] },
  { re: /\b(pelvis|si\s*joint|sacroiliac)\b/i, parts: ["pelvis"] },
  { re: /\b(glute|butt(?:ock)?s?)\b/i, parts: ["glutes"] },
  { re: /\b(hamstring)\b/i, parts: ["hamstrings"] },
  { re: /\b(quad(?:riceps)?|thigh)\b/i, parts: ["quadriceps"] },
  { re: /\b(calf|calves)\b/i, parts: ["calves"] },
  { re: /\b(core|abs|abdominal)\b/i, parts: ["core"] },
  { re: /\b(chest|pec(?:toral)?s?)\b/i, parts: ["chest"] },
];

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function regionLabel(parts: BodyPart[]): string {
  if (!parts.length) return "what is bothering you";
  // Conversational mid-sentence form (“your lower back”) — not catalog dual labels
  const labels = parts.slice(0, 2).map((a) => {
    const catalog = BODY_PART_LABELS[a] || a;
    return conversationalRegion(catalog).replace(/^your\s+/i, "");
  });
  if (labels.length === 1) return labels[0]!;
  return labels.join(" and ");
}

function snip(text: string, max = 90): string {
  const s = text.trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function clampPain(n: number): number | undefined {
  if (!Number.isFinite(n) || n < 0 || n > 10) return undefined;
  return Math.round(n);
}

/**
 * Pain numbers ONLY when the user stated an explicit 0–10 rating.
 * Never invent scores from “severe / moderate / sharp / mild” language.
 * Never harvest bare integers from “2 weeks”, “3 months”, age, etc.
 */
function extractPainNumbers(text: string): { now?: number; worst?: number } {
  const t = text.toLowerCase();
  const nowNums: number[] = [];
  const worstNums: number[] = [];
  const generalNums: number[] = [];

  const pushByContext = (n: number, localCtx: string) => {
    const v = clampPain(n);
    if (v == null) return;
    if (/\b(worst|max(?:imum)?|peaks?|highest|at (?:its |the )?worst|flare(?:s|d)? (?:to|at)|up to)\b/i.test(localCtx)) {
      worstNums.push(v);
    } else if (
      /\b(now|current(?:ly)?|at rest|baseline|usual|average|typical(?:ly)?|most of (?:the )?day|resting|present(?:ly)?)\b/i.test(
        localCtx
      )
    ) {
      nowNums.push(v);
    } else {
      generalNums.push(v);
    }
  };

  // Explicit scale: 7/10, 7 out of 10, 7 of 10
  for (const m of Array.from(t.matchAll(/\b(\d{1,2})\s*(?:\/\s*10|out of\s*10|of\s*10)\b/gi))) {
    const idx = m.index ?? 0;
    const local = t.slice(Math.max(0, idx - 48), Math.min(t.length, idx + m[0].length + 24));
    pushByContext(Number(m[1]), local);
  }

  // Explicit pain rating language: pain is 6, rated 4, level of 5, intensity about 3, ache at a 7
  for (const m of Array.from(
    t.matchAll(
      /\b(?:pain|hurt(?:s|ing)?|ache|aching|discomfort|soreness|level|rated?|score|intensity|vas)\s*(?:is|was|at|of|around|about|=|:)?\s*(?:a\s+|an\s+)?(\d{1,2})(?:\s*\/\s*10)?\b/gi
    )
  )) {
    const idx = m.index ?? 0;
    const local = t.slice(Math.max(0, idx - 36), Math.min(t.length, idx + m[0].length + 20));
    // Reject duration masquerading: "pain is 2 weeks" — digit must not be followed by time units
    const after = t.slice(idx + m[0].length, idx + m[0].length + 16);
    if (/^\s*(?:\/\s*10)?\s*(?:weeks?|months?|days?|years?|hrs?|hours?|mins?|minutes?)\b/i.test(after)) {
      continue;
    }
    pushByContext(Number(m[1]), local);
  }

  // “it's a 7” / “about a 4” only when nearby pain/hurt/scale language exists
  for (const m of Array.from(
    t.matchAll(/\b(?:it'?s|its|about|around|roughly|maybe)\s+(?:a\s+|an\s+)?(\d{1,2})\b/gi)
  )) {
    const idx = m.index ?? 0;
    const local = t.slice(Math.max(0, idx - 40), Math.min(t.length, idx + m[0].length + 24));
    if (!/\b(pain|hurt|ache|\/\s*10|out of 10|scale|level|rated?|intensity|vas|sore)\b/i.test(local)) {
      continue;
    }
    const after = t.slice(idx + m[0].length, idx + m[0].length + 16);
    if (/^\s*(?:weeks?|months?|days?|years?|hrs?|hours?)\b/i.test(after)) continue;
    pushByContext(Number(m[1]), local);
  }

  // Qualitative words never become fabricated numbers (SpaceX-grade: unknown stays unknown).
  const now =
    nowNums.length > 0
      ? nowNums[nowNums.length - 1]
      : generalNums.length > 0
        ? generalNums[0]
        : undefined;
  const worst =
    worstNums.length > 0
      ? Math.max(...worstNums)
      : generalNums.length > 1
        ? Math.max(...generalNums)
        : generalNums.length === 1 && nowNums.length > 0
          ? generalNums[0]
          : undefined;

  // If only one explicit number exists, treat as "now" unless context marked worst.
  if (now == null && worst != null && nowNums.length === 0 && generalNums.length === 0) {
    return { worst };
  }
  if (now != null && worst == null && generalNums.length <= 1 && worstNums.length === 0) {
    return { now };
  }
  return { now, worst };
}

/** Qualitative intensity for irritability only — never converted to a fake 0–10. */
function qualitativePainSeverity(text: string): "high" | "moderate" | "low" | "unknown" {
  const t = text.toLowerCase();
  if (/\b(unbearable|excruciating|agoniz|crippling|worst pain|through the roof)\b/i.test(t)) {
    return "high";
  }
  if (/\b(severe|intense|brutal|awful|horrible)\b/i.test(t)) return "high";
  if (/\b(moderate|medium|manageable but)\b/i.test(t)) return "moderate";
  if (/\b(mild|slight|annoying|nuisance|low.?grade|dull annoyance)\b/i.test(t)) return "low";
  // “sharp/stabbing” is sensory quality, NOT intensity — do not upgrade severity from quality alone.
  return "unknown";
}

function extractList(text: string, patterns: Array<{ re: RegExp; label: string }>): string[] {
  const out: string[] = [];
  for (const p of patterns) {
    if (p.re.test(text)) out.push(p.label);
  }
  return unique(out);
}

const ACTIVITY_CATALOG: Array<{ re: RegExp; label: string }> = [
  { re: /\b(sitt(?:ing|s)?|desk|prolonged sit|computer chair)\b/i, label: "sitting/desk" },
  { re: /\b(stand(?:ing)? (?:too )?long|stand(?:ing)? still|prolonged stand)\b/i, label: "prolonged standing" },
  { re: /\b(walk(?:ing|s|ed)?|gait|ambulat)\b/i, label: "walking" },
  { re: /\b(stairs?|steps|step(?:ping)? up)\b/i, label: "stairs" },
  { re: /\b(bend(?:ing|s)?|tie(?:ing)? shoes|put(?:ting)? on socks|flexion)\b/i, label: "bending" },
  { re: /\b(lift(?:ing|s|ed)?|carry(?:ing|ies)?|carried|pick(?:ing)? up)\b/i, label: "lifting/carrying" },
  { re: /\b(reach(?:ing|es)?|overhead|raise(?:s|ing)? (?:my |the )?arm)\b/i, label: "reaching/overhead" },
  { re: /\b(twist(?:ing|s|ed)?|turn(?:ing)? (?:in bed|quickly|to look))\b/i, label: "twisting" },
  { re: /\b(run(?:ning|s)?|jog(?:ging)?)\b/i, label: "running" },
  { re: /\b(driv(?:ing|e|es|en)|commute)\b/i, label: "driving" },
  { re: /\b(squat(?:ting|s)?|kneel(?:ing|s)?|lunge)\b/i, label: "squat/kneel" },
  { re: /\b(work(?:ing)?|job|shift|at work)\b/i, label: "work tasks" },
  { re: /\b(ly(?:ing|e) (?:down|in bed)|in bed|night|sleep(?:ing)?)\b/i, label: "night/lying" },
  { re: /\b(morning|first thing|get(?:ting)? out of bed|wake(?:s|ing)? up)\b/i, label: "morning" },
  { re: /\b(sport|gym|workout|exercise class)\b/i, label: "sport/gym" },
  { re: /\b(dress(?:ing)?|socks|shoes|shirt overhead)\b/i, label: "dressing" },
];

/**
 * Map free-text activity phrases → catalog labels (only what was mentioned).
 */
function labelsFromSnippet(snippet: string): string[] {
  return extractList(snippet, ACTIVITY_CATALOG);
}

/**
 * Causal link must *attach* to the activity mention — not merely co-occur
 * somewhere nearby (“I walk to work… my back hurts” must NOT invent walking as an aggravator).
 */
function windowHasCausalLink(
  text: string,
  matchIndex: number,
  matchLen: number,
  kind: "agg" | "ease" | "limit"
): boolean {
  const before = text.slice(Math.max(0, matchIndex - 56), matchIndex);
  const after = text.slice(matchIndex + matchLen, Math.min(text.length, matchIndex + matchLen + 56));
  const b = before.toLowerCase();
  const a = after.toLowerCase();

  if (kind === "agg") {
    // “… worse when / pain with / hurts after [ACTIVITY]”
    if (
      /\b(worse|worsens?|aggravat\w*|flares?|hurts?|hurting|pain(?:ful)?|ache|aching|stiff(?:ness)?|irritat\w*|bothers?|throbs?|stabs?)\s+(?:with|when|after|during|from|by|on|whenever)\s*(?:i\s+|my\s+|the\s+)?$/i.test(
        b
      )
    ) {
      return true;
    }
    // “[ACTIVITY] makes it worse / hurts / aggravates / flares / causes pain”
    if (
      /^\s*(?:,|\s)*(?:really\s+|always\s+|often\s+)?(makes? (?:it|my|the|this) .{0,24}(?:worse|flare|hurt|pain)|aggravates?|flares?(?:\s+it(?:\s+up)?)?|sets? it off|triggers?(?:\s+(?:it|pain|symptoms?))?|hurts?(?:\s+more)?|is painful|gets? worse|worsens?|causes? (?:pain|symptoms?)|is (?:the )?problem)/i.test(
        a
      )
    ) {
      return true;
    }
    // “hard to / can't [ACTIVITY]” (limitation-as-aggravator signal)
    if (/\b(hard(?:er)? to|can't|cannot|unable to|struggle to)\s*(?:really\s+)?$/i.test(b)) {
      return true;
    }
    return false;
  }

  if (kind === "ease") {
    // “better with / eases with / helps after [ACTIVITY/modality]”
    if (
      /\b(better|easier|eases?|helps?|helped|relief|reliev\w*|improves?|calms?|settles?|reduces?|lessens?|soothes?)\s+(?:with|when|after|from|by|using)\s*(?:i\s+|my\s+|the\s+|a\s+|an\s+)?$/i.test(
        b
      )
    ) {
      return true;
    }
    // “[heat/walk] helps / eases / makes it better”
    if (
      /^\s*(?:,|\s)*(?:really\s+|always\s+|often\s+)?(helps?|helped|eases?|relieves?|makes? it better|calms?(?:\s+it)?|settles?(?:\s+it)?|improves?(?:\s+it)?)/i.test(
        a
      )
    ) {
      return true;
    }
    return false;
  }

  // functional limit: “hard to [ACTIVITY]” or “[ACTIVITY] is hard / limited”
  if (/\b(hard(?:er)? to|can't|cannot|unable to|struggle to|difficulty|trouble|problem)\s*(?:with\s+)?$/i.test(b)) {
    return true;
  }
  if (
    /^\s*(?:,|\s)*(?:is |are |feels? )?(hard|difficult|limited|a problem|painful|impossible)|^\s*(?:limit|stop|prevent)/i.test(
      a
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Extract labeled activities only when causal language is present.
 * Also harvests explicit “worse when X / X makes it worse” clause snippets.
 */
function extractCausalActivities(
  text: string,
  kind: "agg" | "ease" | "limit"
): string[] {
  const out: string[] = [];
  const t = text;

  // Clause-level harvest: “worse when sitting more than 20 min”
  const clauseRes: RegExp[] =
    kind === "agg"
      ? [
          /(?:worse|worsens?|aggravat\w*|flares?|hurts?|pain(?:ful)?|irritat\w*|bothers?)\s+(?:with|when|after|during|from|by|on|whenever)\s+([^.,;!?\n]{2,70})/gi,
          /(?:with|when|after|during)\s+([^.,;!?\n]{2,50}?)\s+(?:it\s+)?(?:hurts?|is worse|gets worse|flares?|aggravat\w*|becomes? painful)/gi,
          /([^.,;!?\n]{2,50}?)\s+(?:makes? it worse|aggravates?(?:\s+it)?|flares?(?:\s+it(?:\s+up)?)?|sets? it off|triggers?(?:\s+(?:it|pain|symptoms?))?)/gi,
          /(?:pain|hurt|ache|stiff(?:ness)?)\s+(?:with|when|after|during)\s+([^.,;!?\n]{2,50})/gi,
        ]
      : kind === "ease"
        ? [
            /(?:better|easier|eases?|helps?|helped|relief|reliev\w*|improves?|calms?|settles?)\s+(?:with|when|after|from|by|using)\s+([^.,;!?\n]{2,60})/gi,
            /([^.,;!?\n]{2,50}?)\s+(?:helps?|helped|eases?|relieves?|makes? it better|calms? it|settles? it)/gi,
          ]
        : [
            /(?:hard(?:er)? to|can't|cannot|unable to|struggl\w* (?:to|with)|difficulty|trouble|problem)\s+([^.,;!?\n]{2,60})/gi,
            /([^.,;!?\n]{2,50}?)\s+(?:is hard|is difficult|is limited|limits? me|stop(?:s|ped)? me)/gi,
          ];

  for (const re of clauseRes) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const snippet = (m[1] || "").trim();
      if (snippet.length < 2) continue;
      const mapped = [
        ...labelsFromSnippet(snippet),
        ...(kind === "ease" ? extractList(snippet, EASER_CATALOG) : []),
      ];
      if (mapped.length) {
        out.push(...mapped);
        continue;
      }
      // Free-text only when it is a real user-stated activity (not a connector fragment)
      const cleaned = snippet
        .replace(/\s+/g, " ")
        .replace(/^(the|my|a|an|and|or|then|also|just|really)\s+/i, "")
        .trim();
      if (
        cleaned.length >= 4 &&
        cleaned.length <= 40 &&
        !/^(it|this|that|them|me|i|and|or|with|when|after)$/i.test(cleaned)
      ) {
        out.push(cleaned.slice(0, 48));
      }
    }
  }

  // Keyword + local causal window (catches “sitting for long periods makes my back angry”)
  for (const cat of ACTIVITY_CATALOG) {
    const re = new RegExp(cat.re.source, cat.re.flags.includes("g") ? cat.re.flags : `${cat.re.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      if (windowHasCausalLink(t, m.index, m[0].length, kind)) {
        out.push(cat.label);
      }
    }
  }

  return unique(out);
}

const EASER_CATALOG: Array<{ re: RegExp; label: string }> = [
  { re: /\b(heat|hot pack|heating pad|warm shower|warmth)\b/i, label: "heat" },
  { re: /\b(ice|cold pack|frozen|icing)\b/i, label: "ice/cold" },
  { re: /\b(rest|lying down|lie down|sit down and rest)\b/i, label: "rest/position change" },
  { re: /\b(gentle walk|walk it off|walking helps|easy walk)\b/i, label: "gentle walking" },
  { re: /\b(stretch(?:ing|es)?|yoga|mobility work)\b/i, label: "stretching" },
  { re: /\b(meds?|medication|ibuprofen|tylenol|naproxen|acetaminophen|pain pill|advil|aleve)\b/i, label: "medication" },
  { re: /\b(massage|foam roll(?:er|ing)?)\b/i, label: "massage/soft tissue" },
  { re: /\b(keep moving|gentle movement|motion is lotion|light activity)\b/i, label: "gentle movement" },
  { re: /\b(brace|support|tape|kinesio)\b/i, label: "brace/support" },
  { re: /\b(position change|change positions?|shift(?:ing)? positions?)\b/i, label: "rest/position change" },
];

function extractEasersStrict(text: string): string[] {
  const out: string[] = [];
  // Catalog items only with ease-context window
  for (const cat of EASER_CATALOG) {
    const re = new RegExp(cat.re.source, cat.re.flags.includes("g") ? cat.re.flags : `${cat.re.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (windowHasCausalLink(text, m.index, m[0].length, "ease")) {
        out.push(cat.label);
      }
    }
  }
  // “better when I walk” etc. may map to activity labels — keep only when ease-framed.
  out.push(...extractCausalActivities(text, "ease"));
  return unique(out);
}

/**
 * Parse free-text Assessment story into structured clinical intelligence.
 */
export function analyzeStoryIntelligence(
  paragraph: string,
  opts?: {
    preferredName?: string;
    areas?: BodyPart[];
    sex?: SexSelection | null;
    pastMedicalHistory?: string;
    currentMedicalHistory?: string;
    goals?: string[];
    /** Selected catalog occupations from Assessment picker */
    selectedOccupations?: import("@/data/occupations-types").UserOccupationEntry[];
  }
): StoryIntelligence {
  // Fold smart quotes/dashes/NBSP from OS keyboards so clinical regex match ASCII patterns
  const raw = foldKeyboardPunctuation(
    stripDangerousInvisible((paragraph || "").trim())
  );
  const t = raw.toLowerCase();
  const name = displayPreferredName(opts?.preferredName);
  const words = raw ? raw.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  const regions = unique<BodyPart>([
    ...(opts?.areas || []),
    ...AREA_MAP.flatMap((m) => (m.re.test(raw) ? m.parts : [])),
  ]);

  // Laterality only with anatomic side language — not bare “I left work” / “right after”.
  let laterality: Laterality = "unknown";
  if (
    /\b(both sides|bilateral|left and right|right and left|both (?:my )?(?:legs?|arms?|shoulders?|hips?|knees?|sides))\b/i.test(
      raw
    )
  ) {
    laterality = "bilateral";
  } else if (
    /\b(left[- ]?(?:side|sided|leg|arm|shoulder|hip|knee|ankle|foot|hand|elbow|wrist|glute|buttock|low(?:er)? back|neck))\b/i.test(
      raw
    ) ||
    /\b(on the left|left[- ]sided|L\.?\s*side)\b/i.test(raw)
  ) {
    laterality = "left";
  } else if (
    /\b(right[- ]?(?:side|sided|leg|arm|shoulder|hip|knee|ankle|foot|hand|elbow|wrist|glute|buttock|low(?:er)? back|neck))\b/i.test(
      raw
    ) ||
    /\b(on the right|right[- ]sided|R\.?\s*side)\b/i.test(raw)
  ) {
    laterality = "right";
  } else if (/\b(central|midline|across the (?:mid(?:line)?|back|spine))\b/i.test(raw)) {
    laterality = "central";
  }

  // Sensory quality: explicit symptom words only — avoid “hot pack”, “weak coffee”, “catch the bus”.
  const sensory = extractList(raw, [
    { re: /\b(sharp|stabbing|knife[- ]?like)\b/i, label: "sharp" },
    { re: /\b(dull|ache|achy|aching)\b/i, label: "dull/achy" },
    { re: /\b(burning|burns?|burn(?:ing)? pain)\b/i, label: "burning" },
    { re: /\b(throbbing|pulsing|pounding)\b/i, label: "throbbing" },
    { re: /\b(tight(?:ness)?|stiff(?:ness)?)\b/i, label: "stiff/tight" },
    { re: /\b(numb(?:ness|ness)?|goes numb)\b/i, label: "numbness" },
    { re: /\b(tingl(?:e|ing)|pins and needles|paresthesia)\b/i, label: "tingling" },
    {
      re: /\b(weakness|feels weak|giving way|gives way|buckl(?:e|es|ing)|leg gives)\b/i,
      label: "weakness/giving-way",
    },
    {
      re: /\b(catch(?:es|ing)?|lock(?:s|ing|ed)?|click(?:s|ing)?|pop(?:s|ping)?)\b.{0,20}\b(joint|knee|hip|shoulder|when i)|(?:joint|knee|hip|shoulder).{0,20}\b(catch|lock|click|pop)/i,
      label: "catching/clicking",
    },
    { re: /\b(swollen|swelling|puff(?:y|iness))\b/i, label: "swelling" },
    { re: /\b(cramp(?:s|ing)?|spasms?)\b/i, label: "cramping" },
  ]);

  // Onset only from clear onset language — not bare “slowly” or “over weeks” without onset framing.
  let onset: OnsetType = "unknown";
  if (
    /\b(sudden(?:ly)?|all of a sudden|immediate(?:ly)?|heard a (?:pop|snap)|came on suddenly|acute onset)\b/i.test(
      raw
    )
  ) {
    onset = "sudden";
  } else if (
    /\b(gradual(?:ly)?|came on gradually|slow onset|crept up|built up over|over (?:the )?(?:past |last )?(?:few )?(?:weeks|months) it)\b/i.test(
      raw
    ) ||
    /\b(started (?:gradually|slowly)|worsened gradually|progressively (?:got|gotten|getting) worse)\b/i.test(
      raw
    )
  ) {
    onset = "gradual";
  } else if (
    /\b(no (?:clear|known) (?:injury|cause)|insidious|came out of nowhere|for no (?:clear )?reason)\b/i.test(
      raw
    )
  ) {
    onset = "insidious";
  }

  // Timeline: duration phrases, not bare calendar words (“today I went to work”).
  const timelineHints = extractList(raw, [
    {
      re: /\b(?:started|began|since|for|pain (?:since|for)|woke up with).{0,20}\b(today|this morning)\b|\b(today|this morning)\b.{0,24}\b(?:started|began|woke|hurt|pain)\b/i,
      label: "today",
    },
    {
      re: /\b(?:for|since|past|last|about|around)\s+(\d+\s*days?|a few days)|(?:for|since)\s+this week\b|\b\d+\s*days?\s+(?:ago|of pain|now)\b/i,
      label: "days–week",
    },
    {
      re: /\b(?:for|since|past|last|about|around)\s+(\d+\s*weeks?|a couple weeks|few weeks)|(?:\d+\s*weeks?\s+ago)\b/i,
      label: "weeks",
    },
    {
      re: /\b(?:for|since|past|last|about|around)\s+(\d+\s*months?|several months)|(?:\d+\s*months?\s+ago)\b/i,
      label: "months",
    },
    {
      re: /\b(?:for|since|past|last)\s+(\d+\s*years?|years)|chronic|long[- ]standing|on and off for\b/i,
      label: "chronic/years",
    },
    {
      re: /\b(?:started|began|after|following)\s+(?:a\s+)?(fall|lift|workout|run|game|accident|surgery|injury)\b|\bafter (?:a )?(fall|lift|workout|run|game|accident|surgery)\b/i,
      label: "post-event",
    },
  ]);

  // Structured weeks / months / years since onset + progress outlook
  const injuryTimeline = parseInjuryTimeline(raw);
  // Work / school / daily role — free-text + 100k occupation catalog match
  const occupation = resolveOccupationProfile({
    freeText: raw,
    selected: opts?.selectedOccupations,
  });

  const { now: painNow, worst: painWorst } = extractPainNumbers(raw);
  const painSeverityQual = qualitativePainSeverity(raw);

  // Positions / actions / activities ONLY when the user frames them as causal — never bare mentions.
  const aggravators = extractCausalActivities(raw, "agg");
  const easers = extractEasersStrict(raw);

  // Time-of-day worst: require worst/pain/stiff framing, not mere “morning” co-occurrence.
  const timeOfDayWorst = extractList(raw, [
    {
      re: /\b(?:worse|worst|hurts?|pain(?:ful)?|stiff(?:ness)?|ache)\b[^.\n]{0,40}\b(morning|first thing)\b|\b(morning|first thing)\b[^.\n]{0,40}\b(?:worse|worst|hurts?|pain|stiff|ache)\b/i,
      label: "morning",
    },
    {
      re: /\b(?:worse|worst|hurts?|pain)\b[^.\n]{0,40}\b(afternoon|midday)\b|\b(afternoon|midday)\b[^.\n]{0,40}\b(?:worse|worst|hurts?|pain)\b/i,
      label: "afternoon",
    },
    {
      re: /\b(?:worse|worst|hurts?|pain)\b[^.\n]{0,40}\b(evening|end of (?:the )?day)\b|\b(evening|end of (?:the )?day)\b[^.\n]{0,40}\b(?:worse|worst|hurts?|pain)\b/i,
      label: "evening",
    },
    {
      re: /\b(?:worse|worst|hurts?|pain|wake(?:s|ing)?)\b[^.\n]{0,40}\b(night|overnight|in bed)\b|\b(night pain|overnight|pain (?:at|in) night|wakes? (?:me )?at night)\b/i,
      label: "night",
    },
    {
      re: /\b(?:worse|worst|hurts?|pain|stiff)\b[^.\n]{0,30}\bafter (?:work|activity|exercise|sitting|load)\b|\bafter (?:work|activity|exercise|sitting)\b[^.\n]{0,30}\b(?:worse|worst|hurts?|pain)\b/i,
      label: "after activity/load",
    },
  ]);

  // Functional limits require limitation language (hard to / can't / struggle), not bare task words.
  const functionalLimits = unique([
    ...extractCausalActivities(raw, "limit"),
    ...extractList(raw, [
      {
        re: /\b(?:hard(?:er)? to|can't|cannot|struggle|difficulty|trouble|limited|unable to).{0,30}\b(stairs?|steps)\b|\b(stairs?|steps)\b.{0,30}\b(?:hard|can't|difficult|limit|problem|painful)\b/i,
        label: "stairs",
      },
      {
        re: /\b(?:hard(?:er)? to|can't|cannot|struggle|difficulty).{0,30}\b(sit to stand|get(?:ting)? up from|stand(?:ing)? up from)\b|\b(sit to stand|get(?:ting)? up from (?:a )?chair)\b.{0,20}\b(?:hard|pain|difficult)\b/i,
        label: "sit-to-stand",
      },
      {
        re: /\b(?:hard(?:er)? to|can't|cannot|struggle|difficulty).{0,30}\b(dress|socks|shoes|shirt)\b|\b(dressing is hard|can't (?:put on|reach) (?:socks|shoes|shirt))\b/i,
        label: "dressing",
      },
      {
        re: /\b(?:can't|cannot|hard to|struggle|trouble|pain (?:keeps?|prevents?) me from)\s+sleep|sleep(?:ing)? (?:is )?(?:hard|poor|broken|limited)|night pain (?:wakes|keeps)|toss and turn (?:from|with) pain|insomnia from/i,
        label: "sleep",
      },
      {
        re: /\b(?:hard(?:er)? to|can't|cannot|struggle|limit(?:s|ed)|interfere).{0,30}\b(work|desk|job|computer)\b|\b(work|desk|job)\b.{0,30}\b(?:hard|pain|limit|can't|difficult)\b/i,
        label: "work/desk",
      },
      {
        re: /\b(?:hard(?:er)? to|can't|cannot|struggle|limited).{0,30}\b(walk|walking|grocery|errands)\b|\b(walk(?:ing)?|errands)\b.{0,30}\b(?:hard|pain|limit|can't|only \d)\b/i,
        label: "walking/errands",
      },
      {
        re: /\b(?:hard(?:er)? to|can't|cannot|struggle|limited|stopped|unable).{0,30}\b(sport|gym|run|bike|swim|golf|tennis)\b|\b(sport|gym|run|bike)\b.{0,30}\b(?:hard|pain|limit|can't|had to stop)\b/i,
        label: "sport/gym",
      },
      {
        re: /\b(?:hard(?:er)? to|can't|cannot|struggle).{0,30}\b(lift|carry|kids?|grandkids?)\b|\b(lift(?:ing)?|carry(?:ing)?)\b.{0,30}\b(?:hard|pain|limit|can't)\b/i,
        label: "lifting/carrying",
      },
      {
        re: /\b(?:hard(?:er)? to|can't|cannot|struggle).{0,30}\b(drive|driving|commute)\b|\b(driv(?:ing|e)|commute)\b.{0,30}\b(?:hard|pain|limit|can't)\b/i,
        label: "driving",
      },
      {
        re: /\b(?:hard(?:er)? to|can't|cannot|struggle).{0,30}\b(reach|overhead|shelves)\b|\b(reach(?:ing)?|overhead)\b.{0,30}\b(?:hard|pain|limit|can't)\b/i,
        label: "reaching",
      },
    ]),
  ]);

  const fearAvoidance =
    /\b(afraid (?:to|of)|fear of|scared (?:to|of)|avoid(?:ing)? (?:because|due|movement|moving)|don'?t want to make it worse|worried (?:it|that) will|guarding|terrified to)\b/i.test(
      raw
    );
  // Sleep impact only with sleep *problem* framing, not bare “I sleep 8 hours”.
  const sleepImpact =
    /\b(insomnia|night pain|can'?t (?:get comfortable|sleep)|cannot sleep|wakes?(?: me)? (?:up )?(?:at night|from pain|with pain)|pain (?:at night|wakes|disrupts sleep)|sleep(?:ing)? (?:is )?(?:poor|broken|limited|hard)|toss and turn.{0,20}pain)\b/i.test(
      raw
    );
  const stressImpact =
    /\b(stress(?:ed|ful)?|anxious|anxiety|tense|tension|overwhelmed).{0,40}\b(pain|worse|flare|tight)|(?:pain|symptoms?).{0,40}\b(stress|anxious|anxiety|tense)\b|\b(stress makes|when i'?m stressed|stress flares)\b/i.test(
      raw
    );

  // Activity response only when user describes post-activity change — never infer from silence.
  let activityResponse: ActivityResponse = "unknown";
  if (
    /\b(worse (?:the )?next day|delayed (?:pain|soreness|flare|spike)|2\s*[-–to]+\s*24\s*hour|pays for it later|sore (?:the )?(?:next day|later)|irritated later|flares? (?:the )?next day|flares? (?:\d+\s*)?hours? later)\b/i.test(
      raw
    )
  ) {
    activityResponse = "delayed-worse";
  } else if (
    /\b(worse after (?:i |I )?(?:move|moving|exercise|activity|stretch|workout|chores)|after (?:activity|exercise|moving|stretching).{0,20}worse|flares? with activity|activity makes it worse)\b/i.test(
      raw
    )
  ) {
    activityResponse = "worse";
  } else if (
    /\b(better after (?:i |I )?(?:move|moving|exercise|activity|stretch)|eases with (?:movement|activity|walking|motion)|loosens (?:up )?after|helps when i move|movement (?:helps|eases))\b/i.test(
      raw
    ) ||
    /\bafter (?:i |I )?(?:exercise|activity|moving|stretch(?:ing)?|workout|walking).{0,40}\b(better|easier|looser|eases|helps)\b/i.test(
      raw
    ) ||
    /\b(feel|feels|feeling) better after (?:i |I )?(?:exercise|activity|moving|stretch(?:ing)?|workout)\b/i.test(
      raw
    )
  ) {
    activityResponse = "better";
  } else if (
    /\b(same after (?:activity|exercise|moving)|no change after (?:activity|exercise|moving)|doesn'?t change (?:with|after) (?:activity|exercise|moving))\b/i.test(
      raw
    )
  ) {
    activityResponse = "same";
  }

  const radiation =
    /\b(radiat(?:es|ing|ion)?|shoots? (?:down|into|to)|travels? (?:down|into|to)|down (?:my )?(?:leg|arm)|sciatic|into (?:the )?(?:foot|hand|butt(?:ock)?|thigh|calf))\b/i.test(
      raw
    );
  // Neuro language: symptom statements only — not bare “nerve” / “weak” as personality words.
  const neuroLanguage =
    radiation ||
    /\b(numb(?:ness)?|tingl(?:e|ing)|pins and needles|nerve pain|neuralgia|drop foot|foot drop|saddle (?:numb|anesthes)|true weakness|feels weak|muscle weakness)\b/i.test(
      raw
    );

  // Goals only from explicit goal language (or structured opts) — never bare activity words.
  const hasGoalLanguage =
    /\b(want to|hope to|goal|goals?|get back to|return to|wish i could|i'?d like to|trying to get back|so i can|in order to)\b/i.test(
      raw
    );
  const goalsFromStory = hasGoalLanguage
    ? extractList(raw, [
        { re: /\b(want to|hope to|goal|get back to|return to|wish i could|i'?d like to)\b/i, label: "stated goal" },
        {
          re: /\b(?:want to|hope to|get back to|return to|wish i could|so i can).{0,40}\b(walk|hiking|steps)\b|\b(walk|hiking).{0,20}\b(?:again|comfortably|without pain)\b/i,
          label: "walk more comfortably",
        },
        {
          re: /\b(?:want to|hope to|goal|wish).{0,30}\bsleep\b|\bsleep (?:better|through the night)\b/i,
          label: "sleep better",
        },
        {
          re: /\b(?:want to|hope to|get back to|return to|so i can).{0,30}\b(work|desk|job)\b|\btolerate (?:work|desk)\b/i,
          label: "tolerate work/desk",
        },
        {
          re: /\b(?:want to|hope to|get back|manage|do).{0,30}\bstairs?\b|\bstairs?\b.{0,20}\b(?:again|without pain)\b/i,
          label: "manage stairs",
        },
        {
          re: /\b(?:want to|hope to|get back to|return to).{0,40}\b(sport|gym|run(?:ning)?|jog(?:ging)?|golf|tennis|bike|cycling)\b|\breturn to (?:sport|gym|running)\b/i,
          label: "return to sport/gym",
        },
        {
          re: /\b(?:want to|hope to|wish|so i can).{0,30}\b(play with|kids?|grandkids?)\b/i,
          label: "play with kids/family",
        },
        {
          re: /\b(pain.?free|less pain|reduce pain|pain under control)\b/i,
          label: "reduce pain interference",
        },
      ])
    : [];
  const goals = unique([...(opts?.goals || []), ...goalsFromStory]);

  // Red-flag *language* only when the phrase is present — still not a diagnosis.
  const redFlagHints = extractList(raw, [
    {
      re: /\b(saddle (?:numb|anesthes|area)|groin numbness|perineal numb|numb(?:ness)? in (?:the )?saddle)\b/i,
      label: "saddle anesthesia language",
    },
    {
      re: /\b(bowel|bladder).{0,24}\b(change|incontinence|retention|loss|control)|incontinence|urinary retention\b/i,
      label: "bowel/bladder change",
    },
    {
      re: /\b(fever with|night sweats|unexplained weight loss|fever and (?:severe )?pain)\b/i,
      label: "systemic fever/weight language",
    },
    {
      re: /\b(bad fall|fell (?:hard|badly)|mva|car accident|motor vehicle|fracture|broken bone|major trauma)\b/i,
      label: "significant trauma",
    },
    {
      re: /\b(progressive weakness|foot drop|drop foot|can'?t lift (?:my )?(?:foot|toes|arm)|rapidly worsen(?:ing)? weakness)\b/i,
      label: "progressive weakness",
    },
    {
      re: /\b(chest pain|short(?:ness)? of breath|can'?t (?:catch my )?breath)\b/i,
      label: "cardio/resp language",
    },
    {
      re: /\b(history of cancer|active cancer|tumor|bone infection|iv drug use|intravenous drug)\b/i,
      label: "red-flag history language",
    },
  ]);

  // Directional cues require sensitivity/ease language — bare “bending forward” is not preference.
  const directionalCues = extractList(raw, [
    {
      re: /\b(?:worse|hurts?|pain(?:ful)?|aggravat\w*).{0,24}\b(flexion|bending forward|touch(?:ing)? toes)|(?:flexion|bending forward|touch(?:ing)? toes).{0,24}\b(?:worse|hurts?|pain)\b/i,
      label: "flexion-sensitive",
    },
    {
      re: /\b(?:worse|hurts?|pain(?:ful)?|aggravat\w*).{0,24}\b(extension|bending back|arching)|(?:extension|bending back|arching).{0,24}\b(?:worse|hurts?|pain)\b/i,
      label: "extension-sensitive",
    },
    { re: /\b(sitting (?:is )?worse|sitting hurts|worse (?:with |when )?sitting)\b/i, label: "sitting-sensitive" },
    { re: /\b(standing (?:is )?worse|standing hurts|worse (?:with |when )?standing)\b/i, label: "standing-sensitive" },
    { re: /\b(walking (?:is )?worse|walking hurts|worse (?:with |when )?walking)\b/i, label: "walking-sensitive" },
    { re: /\b(prefer (?:to )?sit|sitting eases|better sitting|easier (?:to )?sit)\b/i, label: "sitting-eases" },
    { re: /\b(prefer (?:to )?walk|walking eases|better walking|easier (?:to )?walk)\b/i, label: "walking-eases" },
  ]);

  const histBlob = `${opts?.pastMedicalHistory || ""} ${opts?.currentMedicalHistory || ""} ${raw}`;
  const hasHistory =
    /\b(surgery|s\/p|arthroscopy|replacement|fracture|fusion|diabetes|hypertension|high blood pressure|heart disease|asthma|arthritis|past medical|currently (?:have|manage)|pmh|cmh)\b/i.test(
      histBlob
    );

  // Theme coverage = evidence present only (never mark covered from weak co-occurrence).
  const coveredThemes: StoryTheme[] = [];
  if (raw.length >= 20 || sensory.length || (regions.length > 0 && wordCount > 0)) {
    coveredThemes.push("primary-complaint");
  }
  if ((regions.length && wordCount > 0) || sensory.length) coveredThemes.push("location-quality");
  if (onset !== "unknown" || timelineHints.length) coveredThemes.push("onset-timeline");
  if (painNow != null || painWorst != null) coveredThemes.push("pain-intensity");
  if (aggravators.length) coveredThemes.push("aggravators");
  if (easers.length) coveredThemes.push("easers");
  if (timeOfDayWorst.length) coveredThemes.push("time-pattern");
  if (functionalLimits.length) coveredThemes.push("function-limits");
  if (activityResponse !== "unknown") coveredThemes.push("activity-response");
  if (fearAvoidance) coveredThemes.push("fear-avoidance");
  if (sleepImpact || stressImpact) coveredThemes.push("sleep-stress");
  if (radiation || neuroLanguage) coveredThemes.push("radiation-neuro");
  if (hasHistory) coveredThemes.push("history");
  if (goals.length) coveredThemes.push("goals");
  if (redFlagHints.length || /\b(no red flags|nothing like that)\b/i.test(raw)) {
    coveredThemes.push("red-flags");
  }
  if (laterality !== "unknown") coveredThemes.push("laterality");
  if (occupation.source === "stated") coveredThemes.push("occupation");

  const missingThemes = ALL_THEMES.filter((th) => !coveredThemes.includes(th));

  let richness: StoryIntelligence["richness"] = "empty";
  if (wordCount === 0) richness = "empty";
  else if (wordCount < 18) richness = "thin";
  else if (wordCount < 50 || coveredThemes.length < 4) richness = "moderate";
  else if (wordCount < 120 || coveredThemes.length < 8) richness = "rich";
  else richness = "clinical";

  // Irritability from stated signals first; assumptions fill only when empty (below).
  let irritability: StoryIrritability = "unknown";
  let irritabilitySource: StoryIntelligence["irritabilitySource"] = "unknown";
  const highSignals =
    (painNow != null && painNow >= 6 ? 2 : 0) +
    (painWorst != null && painWorst >= 8 ? 1 : 0) +
    (painSeverityQual === "high" ? 2 : 0) +
    (activityResponse === "delayed-worse" || activityResponse === "worse" ? 2 : 0) +
    (aggravators.length >= 3 ? 1 : 0) +
    (neuroLanguage ? 1 : 0) +
    (fearAvoidance ? 1 : 0) +
    (sleepImpact && painNow != null && painNow >= 5 ? 1 : 0);
  const lowSignals =
    (painNow != null && painNow <= 3 ? 2 : 0) +
    (painSeverityQual === "low" ? 2 : 0) +
    (activityResponse === "better" ? 2 : 0) +
    (easers.includes("gentle movement") || easers.includes("stretching") ? 1 : 0);
  if (highSignals >= 3) {
    irritability = "high";
    irritabilitySource = "stated";
  } else if (lowSignals >= 3 && highSignals === 0) {
    irritability = "low";
    irritabilitySource = "stated";
  } else if (highSignals >= 2 && lowSignals === 0) {
    irritability = "moderate";
    irritabilitySource = "stated";
  } else if (lowSignals >= 2 && highSignals === 0) {
    irritability = "low";
    irritabilitySource = "stated";
  } else if (highSignals >= 1 || lowSignals >= 1) {
    // Partial stated signal — still data-driven lean
    irritability = highSignals > lowSignals ? "moderate" : lowSignals > highSignals ? "low" : "moderate";
    irritabilitySource = "stated";
  }

  // Descriptors/conditions: mostly data-driven keyword match (user text).
  const descriptorIds = raw.length >= 12 ? matchDescriptorsFromText(raw, 10) : [];
  const conditionIds = raw.length >= 12 ? matchConditionsFromText(raw, 8) : [];

  const primaryComplaint =
    raw.length >= 12
      ? snip(
          raw
            .split(/\n+/)
            .map((l) => l.replace(/^▸\s*/, "").trim())
            .find((l) => l.length > 12 && !l.endsWith("?")) || raw,
          140
        )
      : undefined;

  // —— No assumption fill: free-write only. Missing fields stay empty/unknown. ——
  const assumedAggravators: string[] = [];
  const assumedEasers: string[] = [];
  const assumedGoals: string[] = [];
  const assumptions: StoryAssumption[] = [];
  // Official pain estimate only when user stated a 0–10 (never from quality words alone)
  const painEstimate: StoryIntelligence["painEstimate"] | undefined =
    painNow != null || painWorst != null
      ? { now: painNow, worst: painWorst, source: "stated" }
      : undefined;

  // Plan uses stated data only — never soft-assumed aggravators/goals/easers
  const planAggravators = [...aggravators];
  const planEasers = [...easers];
  const planGoals = [...goals];

  const answerSnippets: StoryIntelligence["answerSnippets"] = [];
  if (primaryComplaint)
    answerSnippets.push({ theme: "primary-complaint", text: primaryComplaint });
  if (aggravators.length)
    answerSnippets.push({ theme: "aggravators", text: aggravators.join(", ") });
  if (easers.length) answerSnippets.push({ theme: "easers", text: easers.join(", ") });
  if (functionalLimits.length)
    answerSnippets.push({ theme: "function-limits", text: functionalLimits.join(", ") });

  let planHints = buildPlanHints({
    regions,
    sensory,
    irritability,
    activityResponse,
    aggravators: planAggravators,
    easers: planEasers,
    functionalLimits,
    directionalCues,
    neuroLanguage,
    fearAvoidance,
    painNow: painNow ?? painEstimate?.now,
    goals: planGoals,
    redFlagHints,
    onset,
    assumptions,
    injuryTimeline,
    occupation,
  });

  const baseLiveRead = buildLiveReadLines({
    name,
    richness,
    regions,
    laterality,
    sensory,
    onset,
    injuryTimeline,
    occupation,
    painNow,
    painWorst,
    painEstimate,
    aggravators,
    assumedAggravators,
    easers,
    assumedEasers,
    functionalLimits,
    irritability,
    irritabilitySource,
    activityResponse,
    neuroLanguage,
    goals,
    assumedGoals,
    assumptions,
    coveredThemes,
    missingThemes,
  });

  const baseAdaptive = buildAdaptiveQuestions({
    name,
    raw,
    regions,
    laterality,
    sensory,
    onset,
    injuryTimeline,
    occupation,
    painNow,
    painWorst,
    aggravators,
    easers,
    timeOfDayWorst,
    functionalLimits,
    fearAvoidance,
    sleepImpact,
    stressImpact,
    activityResponse,
    neuroLanguage,
    radiation,
    goals,
    redFlagHints,
    missingThemes,
    coveredThemes,
    irritability,
    directionalCues,
    primaryComplaint,
    sex: opts?.sex,
  });

  // —— Elite systems layer (evidence ledger, dose envelope, info-value interview) ——
  const baseSnapshot: StoryIntelligence = {
    raw,
    wordCount,
    richness,
    primaryComplaint,
    regions,
    laterality,
    sensory,
    onset,
    timelineHints,
    injuryTimeline,
    occupation,
    painNow,
    painWorst,
    painEstimate,
    aggravators,
    assumedAggravators,
    easers,
    assumedEasers,
    timeOfDayWorst,
    functionalLimits,
    fearAvoidance,
    sleepImpact,
    stressImpact,
    activityResponse,
    irritability,
    irritabilitySource,
    directionalCues,
    radiation,
    neuroLanguage,
    goals,
    assumedGoals,
    redFlagHints,
    coveredThemes: unique(coveredThemes),
    missingThemes,
    descriptorIds,
    conditionIds,
    answerSnippets,
    planHints,
    coachSummary: "",
    liveReadLines: baseLiveRead,
    adaptiveQuestions: baseAdaptive,
    priorPrompt: {
      heading: "",
      question: "",
      placeholder: "",
      coachLine: "",
    },
    assumptions,
  };

  const elite = runEliteStoryEngine(baseSnapshot, { preferredName: name });

  // Fuse dose envelope from elite (stated-evidence only) into plan hints
  if (elite.doseEnvelope.mode !== "unknown") {
    planHints = {
      ...planHints,
      phaseBias: elite.doseEnvelope.phaseBias,
      minutesScale: planHints.minutesScale * elite.doseEnvelope.minutesScale,
      maxDifficulty:
        difficultyRank(elite.doseEnvelope.maxDifficulty) < difficultyRank(planHints.maxDifficulty)
          ? elite.doseEnvelope.maxDifficulty
          : planHints.maxDifficulty,
      evidenceLines: unique([
        ...elite.doseEnvelope.rationale.map((r) => `Dose envelope: ${r}`),
        ...planHints.evidenceLines,
        ...elite.systemsRead.slice(0, 2),
      ]).slice(0, 10),
      scoringBoost: planHints.scoringBoost + (elite.completeness >= 70 ? 3 : elite.completeness >= 40 ? 1 : 0),
    };
  } else {
    planHints = {
      ...planHints,
      evidenceLines: unique([
        ...elite.doseEnvelope.rationale.map((r) => `Dose envelope: ${r}`),
        ...planHints.evidenceLines,
      ]).slice(0, 10),
    };
  }

  // Trajectory fine-tune (stated only)
  if (elite.trajectory === "worsening" && planHints.phaseBias !== "protect-calm") {
    planHints = {
      ...planHints,
      phaseBias: "protect-calm",
      minutesScale: Math.min(planHints.minutesScale, 0.75),
      maxDifficulty: "beginner",
      evidenceLines: unique([
        "Trajectory stated as worsening — protect-calm until trend stabilizes.",
        ...planHints.evidenceLines,
      ]).slice(0, 10),
    };
  } else if (elite.trajectory === "improving" && irritability === "low") {
    planHints = {
      ...planHints,
      exerciseBias: planHints.exerciseBias + 0.1,
      evidenceLines: unique([
        "Trajectory stated as improving with low irritability — allow graded capacity bias.",
        ...planHints.evidenceLines,
      ]).slice(0, 10),
    };
  }

  // Prefer base live read for stated-vs-assumed clarity; keep elite telemetry lines.
  const liveReadLines = unique([
    ...baseLiveRead,
    ...elite.liveReadLines.filter((l) => /Telemetry|Flight read|Conflict|Provisional|Highest-value|Evidence:/i.test(l)),
  ]).slice(0, 10);
  // Merge elite + base, then refine: no re-asks of known facts, de-dupe near-identical prompts
  const mergedAdaptive = mergeAdaptiveQuestions(elite.adaptiveQuestions, baseAdaptive, 14);
  const adaptiveQuestions = refineStoryFollowUps(mergedAdaptive, {
    raw,
    name,
    regionLabel: regionLabel(regions),
    quote: primaryComplaint,
    lastAnswer: answerSnippets.slice(-1)[0]?.text || raw.slice(-280),
    cap: 10,
  });
  const coachSummary = liveReadLines.slice(0, 4).join(" ");

  const priorPrompt = buildAdaptivePriorPrompt({
    name,
    richness,
    regions,
    sensory,
    aggravators,
    functionalLimits,
    irritability,
    primaryComplaint,
    adaptiveQuestions,
  });

  // Upgrade prior prompt coach line with elite telemetry when useful
  if (elite.intelligenceGrade !== "empty" && priorPrompt.coachLine) {
    const assn = assumptions.length ? ` · ${assumptions.length} assumptions` : "";
    priorPrompt.coachLine = `${priorPrompt.coachLine} · Signal ${elite.intelligenceGrade} (${elite.completeness}/100)${assn}${
      elite.criticalGaps[0] ? ` · next gap: ${elite.criticalGaps[0].theme}` : ""
    }.`;
  }

  return {
    raw,
    wordCount,
    richness,
    primaryComplaint,
    regions,
    laterality,
    sensory,
    onset,
    timelineHints,
    injuryTimeline,
    occupation,
    painNow,
    painWorst,
    painEstimate,
    aggravators,
    assumedAggravators,
    easers,
    assumedEasers,
    timeOfDayWorst,
    functionalLimits,
    fearAvoidance,
    sleepImpact,
    stressImpact,
    activityResponse,
    irritability,
    irritabilitySource,
    directionalCues,
    radiation,
    neuroLanguage,
    goals,
    assumedGoals,
    redFlagHints,
    coveredThemes: unique(coveredThemes),
    missingThemes,
    descriptorIds,
    conditionIds,
    answerSnippets,
    planHints,
    coachSummary,
    liveReadLines,
    adaptiveQuestions,
    priorPrompt,
    assumptions,
    elite,
    completeness: elite.completeness,
    intelligenceGrade: elite.intelligenceGrade,
    trajectory: elite.trajectory,
    conflicts: elite.conflicts,
  };
}

function difficultyRank(d: Difficulty): number {
  if (d === "beginner") return 1;
  if (d === "intermediate") return 2;
  return 3;
}

/**
 * Intentionally empty — free-write mode never invents clinical fields.
 * Kept as a no-op helper so call sites / docs can reference the policy.
 */
export function buildClinicalAssumptions(_s?: unknown): {
  assumptions: StoryAssumption[];
  assumedAggravators: string[];
  assumedEasers: string[];
  assumedGoals: string[];
  irritability: StoryIrritability;
  irritabilitySource: StoryIntelligence["irritabilitySource"];
  painEstimate?: StoryIntelligence["painEstimate"];
  assumedActivityResponse?: ActivityResponse;
} {
  return {
    assumptions: [],
    assumedAggravators: [],
    assumedEasers: [],
    assumedGoals: [],
    irritability: "unknown",
    irritabilitySource: "unknown",
  };
}

function buildPlanHints(s: {
  regions: BodyPart[];
  sensory: string[];
  irritability: StoryIrritability;
  activityResponse: ActivityResponse;
  aggravators: string[];
  easers: string[];
  functionalLimits: string[];
  directionalCues: string[];
  neuroLanguage: boolean;
  fearAvoidance: boolean;
  painNow?: number;
  goals: string[];
  redFlagHints: string[];
  onset: OnsetType;
  assumptions?: StoryAssumption[];
  injuryTimeline?: InjuryTimeline;
  occupation?: OccupationProfile;
}): StoryPlanHints {
  const preferTags: string[] = [];
  const avoidTags: string[] = [];
  const movementKeywords: string[] = [];
  const evidenceLines: string[] = [];
  let stretchBias = 0;
  let exerciseBias = 0;
  let minutesScale = 1;
  let maxDifficulty: Difficulty = "intermediate";
  let preferKinds: MovementKind[] = ["stretch", "exercise"];
  let phaseBias: StoryPlanHints["phaseBias"] = "mobility-restore";
  let scoringBoost = 0;

  if (s.irritability === "high") {
    phaseBias = "protect-calm";
    stretchBias += 0.35;
    exerciseBias -= 0.15;
    minutesScale = 0.7;
    maxDifficulty = "beginner";
    preferTags.push("gentle", "isometric", "activation", "motor-control", "protected");
    avoidTags.push("plyo", "jump", "heavy-load", "impact", "end-range", "ballistic");
    evidenceLines.push(
      "High irritability from story: short volume, protected mobility, isometrics before aggressive stretch/load."
    );
    scoringBoost += 4;
  } else if (s.irritability === "low") {
    phaseBias =
      s.functionalLimits.some((f) => /sport|gym|stairs|work/.test(f))
        ? "capacity-load"
        : "motor-control";
    exerciseBias += 0.4;
    stretchBias += 0.1;
    preferTags.push("strength", "functional", "endurance", "motor-control");
    evidenceLines.push(
      "Lower irritability (stated evidence): bias motor control and graded capacity while keeping mobility gains."
    );
    scoringBoost += 2;
  } else if (s.irritability === "moderate") {
    phaseBias = s.sensory.includes("stiff/tight") ? "mobility-restore" : "motor-control";
    stretchBias += 0.2;
    exerciseBias += 0.2;
    preferTags.push("mobility", "activation", "motor-control");
    evidenceLines.push(
      "Moderate irritability (stated evidence): balanced mobility + control with traffic-light dosing."
    );
    scoringBoost += 2;
  } else {
    // unknown: neutral dosing only — never invent moderate/high irritability
    phaseBias = "motor-control";
    stretchBias += 0.15;
    exerciseBias += 0.15;
    preferTags.push("gentle", "mobility", "motor-control");
    evidenceLines.push(
      "Irritability not stated — neutral free-write dosing (no assumed moderate/high). Add 0–10 pain, what flares you, and 24h response when ready."
    );
    scoringBoost += 0;
  }

  // Region keywords only from stated regions (not assumed context)
  if (s.regions.some((r) => /knee|hips|ankles|foot|glutes/.test(r))) {
    preferTags.push("quad", "glute", "functional", "balance");
    movementKeywords.push("sit-to-stand", "bridge", "step");
  }
  if (s.regions.some((r) => /shoulder|neck|scapular|thoracic/.test(r))) {
    preferTags.push("scapular", "posture", "thoracic");
    movementKeywords.push("chin-tuck", "scapular", "rows");
  }
  if (s.regions.some((r) => /lower-back|pelvis/.test(r))) {
    preferTags.push("hip", "core", "motor-control");
    movementKeywords.push("hip hinge", "bird-dog", "dead bug");
  }

  if (s.activityResponse === "delayed-worse") {
    phaseBias = "protect-calm";
    minutesScale *= 0.8;
    avoidTags.push("heavy-load", "plyo");
    preferTags.push("gentle", "isometric");
    evidenceLines.push(
      "Delayed symptom spike after activity → cut volume ~30–50%, favor calm control over heroics."
    );
    scoringBoost += 3;
  } else if (s.activityResponse === "better") {
    preferTags.push("mobility", "movement");
    exerciseBias += 0.15;
    evidenceLines.push("Symptoms ease with movement → graded exposure and frequent short bouts.");
  }

  if (s.neuroLanguage) {
    preferTags.push("gentle", "neural-gentle", "motor-control", "core");
    avoidTags.push("neural-aggressive", "end-range", "ballistic", "plyo");
    evidenceLines.push(
      "Neuro/radiation language → prefer centralization-friendly gentle dosing; avoid aggressive neural tensioning."
    );
    scoringBoost += 3;
    maxDifficulty = "beginner";
  }

  if (s.fearAvoidance) {
    preferTags.push("gentle", "motor-control", "functional");
    evidenceLines.push(
      "Fear-avoidance language → graded exposure to feared tasks with high success reps, not forced end-range."
    );
    scoringBoost += 2;
  }

  // Aggravator-specific plan tags
  for (const a of s.aggravators) {
    if (a.includes("sitting") || a.includes("desk")) {
      preferTags.push("desk", "posture", "thoracic", "hip", "extension");
      movementKeywords.push("chin-tuck", "thoracic", "hip flexor", "cat-cow", "rows");
      scoringBoost += 2;
    }
    if (a.includes("stairs") || a.includes("walking")) {
      preferTags.push("quad", "glute", "functional", "knee", "balance");
      movementKeywords.push("sit-to-stand", "bridge", "heel raise", "step");
      exerciseBias += 0.2;
      scoringBoost += 2;
    }
    if (a.includes("reaching") || a.includes("overhead")) {
      preferTags.push("scapular", "shoulder", "rotator-cuff", "posture");
      movementKeywords.push("scapular", "external rotation", "serratus", "doorway");
      scoringBoost += 2;
    }
    if (a.includes("bending") || a.includes("lifting")) {
      preferTags.push("hip", "hinge", "glute", "core", "motor-control");
      movementKeywords.push("hip hinge", "bridge", "bird-dog", "dead bug");
      scoringBoost += 2;
    }
    if (a.includes("morning")) {
      preferTags.push("mobility", "gentle", "warmup");
      stretchBias += 0.15;
    }
    if (a.includes("night")) {
      preferTags.push("gentle", "protected");
      minutesScale *= 0.9;
    }
  }

  for (const d of s.directionalCues) {
    if (d.includes("flexion-sensitive") || d.includes("sitting-sensitive")) {
      preferTags.push("extension", "hip", "glute");
      avoidTags.push("end-range-flexion-load");
    }
    if (d.includes("extension-sensitive") || d.includes("standing-sensitive")) {
      preferTags.push("flexion-gentle", "hip", "mobility");
    }
    if (d.includes("walking-eases")) preferTags.push("movement", "gentle");
  }

  if (s.sensory.includes("stiff/tight")) {
    stretchBias += 0.35;
    preferTags.push("mobility", "flexibility");
  }
  if (s.sensory.includes("weakness/giving-way")) {
    exerciseBias += 0.4;
    preferTags.push("activation", "strength", "balance", "isometric");
  }
  if (s.sensory.includes("swelling")) {
    preferTags.push("gentle", "isometric", "protected");
    avoidTags.push("plyo", "impact");
    maxDifficulty = "beginner";
  }

  // Region keywords
  for (const r of s.regions) {
    const lab = (BODY_PART_LABELS[r] || r).toLowerCase();
    preferTags.push(lab.split(" ")[0]!);
    movementKeywords.push(lab);
  }

  if (s.redFlagHints.length) {
    maxDifficulty = "beginner";
    minutesScale = Math.min(minutesScale, 0.65);
    preferTags.push("gentle", "protected");
    avoidTags.push("plyo", "heavy-load", "impact");
    evidenceLines.push(
      "Concerning language detected — keep program conservative and recommend licensed clinical review for red-flag symptoms."
    );
    scoringBoost += 2;
  }

  if (s.onset === "sudden") {
    evidenceLines.push("Sudden onset language → early protection and irritability-first dosing.");
    if (s.irritability !== "low") phaseBias = "protect-calm";
  }

  // —— Time since injury (weeks / months / years) ——
  const tl = s.injuryTimeline;
  if (tl && tl.source === "stated") {
    phaseBias =
      mergePhaseBias(tl.phaseBias, phaseBias) || phaseBias;
    minutesScale = Math.min(minutesScale, tl.minutesScale);
    if ((tl.approxWeeksSince ?? 99) < 2) {
      maxDifficulty = "beginner";
      preferTags.push("gentle", "protected", "isometric");
      avoidTags.push("plyo", "heavy-load", "impact");
    }
    evidenceLines.push(
      `Time since onset stated: ${tl.label} (${tl.tissuePhase}) → phase bias ${phaseBias}, volume ×${minutesScale.toFixed(2)}.`
    );
    if (tl.progressOutlook[0]) {
      evidenceLines.push(
        `Progress outlook: ${tl.progressOutlook[0].windowLabel} — ${tl.progressOutlook[0].lookFor}`
      );
    }
    if (tl.progressOutlook[1]) {
      evidenceLines.push(
        `Next milestone: ${tl.progressOutlook[1].windowLabel} — ${tl.progressOutlook[1].measures.slice(0, 2).join("; ")}.`
      );
    }
    scoringBoost += 3;
  } else if (tl && tl.source === "unknown") {
    evidenceLines.push(
      "Time since onset not stated — ask weeks (0–6+), months, or years to set realistic progress milestones."
    );
  }

  // —— Occupation / daily work role ——
  const occ = s.occupation;
  if (occ && occ.source === "stated") {
    const applied = applyOccupationToPlanTags({
      occupation: occ,
      preferTags,
      avoidTags,
      movementKeywords,
      minutesScale,
    });
    preferTags.length = 0;
    preferTags.push(...applied.preferTags);
    avoidTags.length = 0;
    avoidTags.push(...applied.avoidTags);
    movementKeywords.length = 0;
    movementKeywords.push(...applied.movementKeywords);
    minutesScale = applied.minutesScale;
    if (applied.evidenceLine) evidenceLines.push(applied.evidenceLine);
    evidenceLines.push(...occ.sessionNotes.slice(0, 2));
    // Soft phase nudge when not already in protect-calm
    if (
      phaseBias !== "protect-calm" &&
      occ.phaseHint &&
      s.irritability !== "high" &&
      s.activityResponse !== "delayed-worse"
    ) {
      const order = [
        "protect-calm",
        "mobility-restore",
        "motor-control",
        "capacity-load",
        "function-return",
      ] as const;
      // Only step toward occupation hint when irritability allows capacity
      if (
        s.irritability === "low" &&
        order.indexOf(occ.phaseHint) > order.indexOf(phaseBias)
      ) {
        phaseBias = occ.phaseHint;
      } else if (
        order.indexOf(occ.phaseHint) < order.indexOf(phaseBias) &&
        (occ.category === "desk" ||
          occ.category === "driving" ||
          occ.category === "student")
      ) {
        // Desk/driving often need mobility restore first
        phaseBias = occ.phaseHint;
      }
    }
    if (occ.category === "athlete" && s.irritability === "low") {
      exerciseBias += 0.15;
    }
    if (
      occ.category === "desk" ||
      occ.category === "student" ||
      occ.category === "driving"
    ) {
      stretchBias += 0.1;
    }
    if (occ.category === "labor" || occ.category === "healthcare") {
      exerciseBias += 0.12;
    }
    scoringBoost += 3;
  } else if (occ && occ.source === "unknown") {
    evidenceLines.push(
      "Occupation not stated — ask desk / standing / lifting / driving / healthcare / school / sport / retired to tailor HEP to real-life load."
    );
  }

  // Stated goals first; assumed goals (from limits) allowed for plan anchors when labeled.
  const functionalGoals = s.goals.length ? s.goals.slice(0, 6) : [];

  preferKinds =
    exerciseBias > stretchBias + 0.15
      ? ["exercise", "stretch"]
      : stretchBias > exerciseBias + 0.15
        ? ["stretch", "exercise"]
        : ["stretch", "exercise"];

  return {
    phaseBias,
    preferTags: unique(preferTags),
    avoidTags: unique(avoidTags),
    stretchBias,
    exerciseBias,
    minutesScale,
    maxDifficulty,
    preferKinds,
    movementKeywords: unique(movementKeywords).slice(0, 16),
    irritability: s.irritability,
    functionalGoals,
    evidenceLines: unique(evidenceLines).slice(0, 12),
    scoringBoost,
  };
}

function buildLiveReadLines(s: {
  name: string;
  richness: StoryIntelligence["richness"];
  regions: BodyPart[];
  laterality: Laterality;
  sensory: string[];
  onset: OnsetType;
  injuryTimeline?: InjuryTimeline;
  occupation?: OccupationProfile;
  painNow?: number;
  painWorst?: number;
  painEstimate?: StoryIntelligence["painEstimate"];
  aggravators: string[];
  assumedAggravators: string[];
  easers: string[];
  assumedEasers: string[];
  functionalLimits: string[];
  irritability: StoryIrritability;
  irritabilitySource: StoryIntelligence["irritabilitySource"];
  activityResponse: ActivityResponse;
  neuroLanguage: boolean;
  goals: string[];
  assumedGoals: string[];
  assumptions: StoryAssumption[];
  coveredThemes: StoryTheme[];
  missingThemes: StoryTheme[];
}): string[] {
  const lines: string[] = [];
  if (s.richness === "empty") {
    lines.push(
      `${s.name}, I’m ready when you are—start with what is bothering you most in your body today.`
    );
    return lines;
  }

  const region = regionLabel(s.regions);
  const painBit =
    s.painNow != null
      ? ` · ${s.painNow}/10 stated${
          s.painWorst != null && s.painWorst !== s.painNow ? ` (worst ${s.painWorst}/10)` : ""
        }`
      : s.painWorst != null
        ? ` · worst ${s.painWorst}/10 stated`
        : " · pain 0–10 not stated (not invented)";
  lines.push(
    `Clinical read: ${region}${s.laterality !== "unknown" ? ` (${s.laterality})` : ""}${
      s.sensory.length ? ` · feels ${s.sensory.slice(0, 3).join(", ")}` : ""
    }${painBit}.`
  );

  const irrLabel =
    s.irritabilitySource === "stated"
      ? `${s.irritability} (stated signals)`
      : "unknown (not assumed — free-write more if you want this scored)";
  lines.push(
    `Irritability: ${irrLabel}${
      s.activityResponse !== "unknown" ? ` · after activity: ${s.activityResponse}` : ""
    }${s.onset !== "unknown" ? ` · onset ${s.onset}` : ""}.`
  );

  if (s.injuryTimeline) {
    lines.push(...injuryTimelineLiveLines(s.injuryTimeline).slice(0, 2));
  }

  if (s.occupation) {
    lines.push(...occupationLiveLines(s.occupation).slice(0, 2));
  }

  if (s.aggravators.length) {
    lines.push(`Aggravators you stated: ${s.aggravators.slice(0, 5).join(", ")}.`);
  } else {
    lines.push("Aggravators: none stated yet.");
  }

  if (s.easers.length) {
    lines.push(`Easers you stated: ${s.easers.slice(0, 4).join(", ")}.`);
  } else {
    lines.push("Easers: none stated yet.");
  }

  if (s.functionalLimits.length) {
    lines.push(`Function limits you stated: ${s.functionalLimits.slice(0, 5).join(", ")}.`);
  }
  if (s.neuroLanguage) {
    lines.push("Neuro/radiation language you used — plan will stay gentle and centralization-minded.");
  }
  if (s.goals.length) {
    lines.push(`Goals you stated: ${s.goals.slice(0, 4).join("; ")}.`);
  } else {
    lines.push("Goals: none stated yet — write them in free text when ready.");
  }

  lines.push(
    "Free-write mode: nothing is invented for empty fields (pain numbers, aggravators, irritability stay blank until you state them)."
  );

  lines.push(
    `Interview coverage: ${s.coveredThemes.length}/${ALL_THEMES.length} themes · still open: ${
      s.missingThemes.slice(0, 4).join(", ") || "none major"
    }.`
  );
  return lines;
}

function buildAdaptivePriorPrompt(s: {
  name: string;
  richness: StoryIntelligence["richness"];
  regions: BodyPart[];
  sensory: string[];
  aggravators: string[];
  functionalLimits: string[];
  irritability: StoryIrritability;
  primaryComplaint?: string;
  adaptiveQuestions: AdaptiveStoryQuestion[];
}): StoryIntelligence["priorPrompt"] {
  const next = s.adaptiveQuestions[0];
  const region = regionLabel(s.regions);

  if (s.richness === "empty") {
    return {
      heading: "What’s bothering you?",
      question: `${s.name}, what is bothering you most right now in your body—and how does it show up in a typical day?`,
      placeholder: `${s.name}, write freely… Where is it? Left/right? Sharp, dull, stiff, numb? When is it worst? What tasks get hard? What eases it? Any past surgery or current conditions?`,
      coachLine:
        "This free-text box is your PT interview. Answer in your own words—I’ll adapt the next questions to what you write.",
    };
  }

  if (s.richness === "thin") {
    return {
      heading: "I’m listening — keep going",
      question: s.primaryComplaint
        ? `${s.name}, you said “${snip(s.primaryComplaint, 80)}.” What else matters—how it feels, when it flares, or which daily task suffers most?`
        : `${s.name}, tell me more about ${region}: how it feels, when it’s worst, and what you want back.`,
      placeholder: "Add sensation, timing, tasks, pain 0–10, what helps, history…",
      coachLine: next
        ? `Next I’ll ask: ${next.label}. Your answers reshape Plan & Routine in real time.`
        : "Your answers reshape Plan & Routine in real time.",
    };
  }

  // Answer-adaptive prior prompt
  if (s.aggravators.includes("sitting/desk")) {
    return {
      heading: "You linked this to sitting — let’s go deeper",
      question:
        next?.question ||
        `${s.name}, sitting seems important in your story. About how many minutes before symptoms build, and does standing or walking settle them?`,
      placeholder: "Answer the open question above in this same box…",
      coachLine: `Irritability looks ${s.irritability}. Plan will bias desk/posture control and protected mobility unless you add more.`,
    };
  }
  if (s.functionalLimits.includes("stairs") || s.aggravators.includes("stairs")) {
    return {
      heading: "Stairs showed up in your story",
      question:
        next?.question ||
        `${s.name}, with stairs, is it worse going up, down, or both—and is it pain, weakness, swelling, or giving way first?`,
      placeholder: "Answer here in free text…",
      coachLine: "Stair limits steer the routine toward quad/glute control and graded closed-chain work.",
    };
  }
  if (s.irritability === "high") {
    return {
      heading: "Sounds pretty irritable — we’ll go gentle and specific",
      question:
        next?.question ||
        `${s.name}, when symptoms spike, how long until they settle, and is there any small motion that still feels safe?`,
      placeholder: "Describe flare timing and any safe motions…",
      coachLine: "High irritability (from your words) → protect-calm dosing for Plan.",
    };
  }
  // empty richness already returned above
  if (s.irritability === "unknown") {
    return {
      heading: "I’m not assuming — need more from you",
      question:
        next?.question ||
        `${s.name}, I won’t invent what flares this. What positions, actions, or activities reliably make it worse or better?`,
      placeholder: "What makes it worse? What eases it? Pain 0–10 if you know it…",
      coachLine: "No assumptions: irritability, aggravators, and pain numbers stay blank until you state them.",
    };
  }

  return {
    heading: "Your story is driving the interview",
    question:
      next?.question ||
      `${s.name}, what’s the one detail about ${region} a careful PT would still need before locking a plan?`,
    placeholder: "Continue answering guided questions below in this free-text box…",
    coachLine: `Live themes covered; next questions adapt to your answers. Plan intelligence scales with story detail.`,
  };
}

/**
 * Generate open-ended questions that *adapt to what the user already wrote*.
 */
function buildAdaptiveQuestions(s: {
  name: string;
  raw: string;
  regions: BodyPart[];
  laterality: Laterality;
  sensory: string[];
  onset: OnsetType;
  injuryTimeline?: InjuryTimeline;
  occupation?: OccupationProfile;
  painNow?: number;
  painWorst?: number;
  aggravators: string[];
  easers: string[];
  timeOfDayWorst: string[];
  functionalLimits: string[];
  fearAvoidance: boolean;
  sleepImpact: boolean;
  stressImpact: boolean;
  activityResponse: ActivityResponse;
  neuroLanguage: boolean;
  radiation: boolean;
  goals: string[];
  redFlagHints: string[];
  missingThemes: StoryTheme[];
  coveredThemes: StoryTheme[];
  irritability: StoryIrritability;
  directionalCues: string[];
  primaryComplaint?: string;
  sex?: SexSelection | null;
}): AdaptiveStoryQuestion[] {
  const q: AdaptiveStoryQuestion[] = [];
  const region = regionLabel(s.regions);
  const quote = s.primaryComplaint ? snip(s.primaryComplaint, 70) : "";

  const push = (item: AdaptiveStoryQuestion) => {
    // Avoid near-duplicate ids
    if (q.some((x) => x.id === item.id)) return;
    // Skip if question fragment already in story
    if (s.raw.includes(item.question.slice(0, Math.min(36, item.question.length)))) return;
    q.push(item);
  };

  // —— Empty / thin ——
  if (!s.raw || s.raw.length < 24) {
    push({
      id: "adapt-bother",
      label: "What’s bothering you most?",
      question: `${s.name}, what is bothering you most right now—and how does it show up from morning to night?`,
      category: "bother",
      theme: "primary-complaint",
      reason: "Start the clinical interview",
      priority: 100,
    });
    push({
      id: "adapt-where-feel",
      label: "Where & how does it feel?",
      question: `Where exactly do you feel it (point with words: left/right, deep/surface), and what words fit best—sharp, dull, stiff, burning, numb, weak?`,
      category: "bother",
      theme: "location-quality",
      reason: "Need location + sensory quality",
      priority: 95,
    });
  }

  // —— Adapt to quote / primary complaint ——
  if (quote && s.missingThemes.includes("aggravators")) {
    push({
      id: "adapt-from-quote-agg",
      label: "What sets it off?",
      question: `${s.name}, you mentioned “${quote}.” What reliably makes that worse—sitting, standing, walking, stairs, lifting, reaching—and how quickly does it build?`,
      category: "irritability",
      theme: "aggravators",
      reason: `Follow-up on your words: “${snip(quote, 40)}”`,
      priority: 92,
    });
  }

  // —— Aggravator-specific adaptive probes (skip re-asking known dose/direction) ——
  const rawL = s.raw.toLowerCase();
  const sittingDoseKnown =
    /\b(\d{1,3})\s*(min|mins|minutes|hour|hours)\b/.test(rawL) &&
    /\b(sit|sitting|desk)\b/.test(rawL);
  const stairsDirKnown =
    /\b(going\s+)?(up|down|upstairs|downstairs)\b/.test(rawL) &&
    /\b(stair|stairs)\b/.test(rawL);
  const regionPhrase = conversationalRegion(region);

  if (s.aggravators.includes("sitting/desk")) {
    if (sittingDoseKnown) {
      push({
        id: "adapt-sit-recover",
        label: "What ends the sit flare?",
        question: `You already timed the sitting build-up. What ends that desk flare faster—standing, a short walk, lumbar support, or something else—and how long until it settles?`,
        category: "irritability",
        theme: "aggravators",
        reason: "Sitting dose already in your words — deepen recovery",
        priority: 90,
      });
    } else {
      push({
        id: "adapt-sit-dose",
        label: "Sitting tolerance?",
        question: `You linked symptoms to sitting/desk time. About how many minutes before it builds, and does standing, walking, or changing lumbar support settle it?`,
        category: "irritability",
        theme: "aggravators",
        reason: "You named sitting/desk as a problem",
        priority: 90,
      });
    }
    push({
      id: "adapt-sit-dir",
      label: "Sit vs stand preference?",
      question: `When ${regionPhrase} is angry from sitting, do you feel better standing/walking, or do you need to lie down—and does bending forward help or hurt?`,
      category: "behavior",
      theme: "aggravators",
      reason: "Directional preference from sitting story",
      priority: 84,
    });
  }
  if (s.aggravators.includes("stairs") || s.functionalLimits.includes("stairs")) {
    if (stairsDirKnown) {
      push({
        id: "adapt-stairs-limiter",
        label: "What limits stairs first?",
        question: `You already said which way on stairs is harder. Is the first limit pain, weakness, swelling, stiffness, or a sense of giving way?`,
        category: "function",
        theme: "function-limits",
        reason: "Stairs direction already stated — ask limiter",
        priority: 88,
      });
    } else {
      push({
        id: "adapt-stairs",
        label: "Stairs: up, down, or both?",
        question: `With stairs, is it worse going up, down, or both—and is the first limit pain, weakness, swelling, or a sense of giving way?`,
        category: "function",
        theme: "function-limits",
        reason: "Stairs appear in your story",
        priority: 88,
      });
    }
  }
  if (s.aggravators.includes("reaching/overhead") || s.functionalLimits.includes("reaching")) {
    push({
      id: "adapt-reach",
      label: "Which reaches hurt?",
      question: `For arm/shoulder reach: is it worse overhead, behind the back (bra/belt), or across the body—and do you notice grinding, weakness, or night pain?`,
      category: "function",
      theme: "function-limits",
      reason: "Reaching limits in your story",
      priority: 86,
    });
  }
  if (s.aggravators.includes("bending") || s.aggravators.includes("lifting/carrying")) {
    push({
      id: "adapt-bend-lift",
      label: "Bend & lift story?",
      question: `When you bend or lift, where do you feel it first, and do you hold your breath or “brace hard”? What load (laundry, kids, boxes) is the real-world problem?`,
      category: "function",
      theme: "function-limits",
      reason: "Bending/lifting in your story",
      priority: 85,
    });
  }
  if (s.aggravators.includes("walking") || s.functionalLimits.includes("walking/errands")) {
    push({
      id: "adapt-walk",
      label: "Walking distance?",
      question: `How far can you walk before ${regionPhrase} changes—and is it pain, tightness, numbness, or fatigue that stops you first?`,
      category: "function",
      theme: "function-limits",
      reason: "Walking shows up as limited",
      priority: 83,
    });
  }

  // —— Sensory adaptive ——
  if (s.sensory.includes("numbness") || s.sensory.includes("tingling") || s.radiation) {
    push({
      id: "adapt-neuro-map",
      label: "Map the radiation",
      question: `You described nerve-like symptoms. Trace them for me: where do they start, where do they travel (buttock, thigh, calf, foot / shoulder, arm, hand), and are they constant or only with certain positions?`,
      category: "bother",
      theme: "radiation-neuro",
      reason: "Numbness/tingling/radiation language",
      priority: 91,
    });
  }
  if (s.sensory.includes("weakness/giving-way")) {
    push({
      id: "adapt-weak",
      label: "Weakness or pain inhibition?",
      question: `When you say weak or giving way—is the joint truly buckling, or do you stop because of pain/fear? Any trips, falls, or need to use a rail?`,
      category: "function",
      theme: "function-limits",
      reason: "Weakness/giving-way in your story",
      priority: 87,
    });
  }
  if (s.sensory.includes("stiff/tight") && !s.aggravators.includes("morning")) {
    push({
      id: "adapt-stiff",
      label: "Stiffness pattern?",
      question: `The stiffness you mentioned—is it worst first thing in the morning, after sitting, or after activity, and how long until you “loosen up”?`,
      category: "irritability",
      theme: "time-pattern",
      reason: "Stiffness language without time pattern",
      priority: 80,
    });
  }

  // —— Pain intensity adaptive ——
  if (s.painNow != null && s.painNow >= 6) {
    push({
      id: "adapt-high-pain",
      label: "Safe motion at high pain?",
      question: `You reported pain at ${s.painNow}/10. Is there any small range or position that still feels relatively safe—and how long do flares last when you overdo it?`,
      category: "irritability",
      theme: "pain-intensity",
      reason: `You reported ${s.painNow}/10 pain`,
      priority: 89,
    });
  } else if (s.missingThemes.includes("pain-intensity") && s.raw.length >= 24) {
    push({
      id: "adapt-pain-scale",
      label: "Pain 0–10 pattern",
      question: `You have not given a 0–10 number yet—and I will not invent one. On a 0–10 scale, where does ${regionPhrase} sit most of the day, and where does it go at its worst?`,
      category: "irritability",
      theme: "pain-intensity",
      reason: "No pain number stated (not assumed)",
      priority: 78,
    });
  }

  // —— Activity response ——
  if (s.missingThemes.includes("activity-response") && s.raw.length >= 40) {
    push({
      id: "adapt-after",
      label: "How do you feel after?",
      question: `After you move, stretch, or do chores, do you feel better, the same, or more irritated later (especially 2–24 hours after)? That tells us how hard to push.`,
      category: "irritability",
      theme: "activity-response",
      reason: "Need 24-hour response for dosing",
      priority: 82,
    });
  } else if (s.activityResponse === "delayed-worse") {
    push({
      id: "adapt-delayed",
      label: "What volume spikes you?",
      question: `You notice a delayed spike after activity. What amount of activity usually “costs” you the next day—and what’s a lighter dose that still feels productive?`,
      category: "behavior",
      theme: "activity-response",
      reason: "You described delayed post-activity flare",
      priority: 90,
    });
  }

  // —— Easers ——
  if (s.missingThemes.includes("easers") && s.aggravators.length) {
    push({
      id: "adapt-ease",
      label: "What eases it?",
      question: `You named things that aggravate ${regionPhrase}. What reliably eases it even a little—position change, walk, heat, ice, meds, rest—and how long does relief last?`,
      category: "behavior",
      theme: "easers",
      reason: "Have aggravators but not easers",
      priority: 81,
    });
  }

  // —— Onset / time since injury ——
  if (
    (s.missingThemes.includes("onset-timeline") ||
      s.injuryTimeline?.source === "unknown") &&
    s.raw.length >= 20
  ) {
    push({
      id: "adapt-onset",
      label: "How long has this been going on?",
      question: `${s.name}, about how long has this been going on—0 weeks (just started), 1, 2, 3, 4, 5, or 6+ weeks, or months/years since it started?`,
      category: "bother",
      theme: "onset-timeline",
      reason: "Need weeks/months/years since onset for phase & progress milestones",
      priority: 91,
    });
  }
  if (s.injuryTimeline?.source === "stated" && s.injuryTimeline.progressOutlook[0]) {
    const m0 = s.injuryTimeline.progressOutlook[0];
    push({
      id: "adapt-progress-outlook",
      label: "What would count as progress?",
      question: `You are about ${s.injuryTimeline.label} into this. For the next check-in (${m0.windowLabel}), what would feel like real progress on a 0–10 scale for your hardest daily task—and what’s your pain most of the day now?`,
      category: "goals",
      theme: "goals",
      reason: `Timeline ${s.injuryTimeline.label} → evidence-informed progress window`,
      priority: 84,
    });
  }

  // —— Occupation / work-school role ——
  if (
    (s.missingThemes.includes("occupation") || s.occupation?.source === "unknown") &&
    s.raw.length >= 24
  ) {
    push({
      id: "adapt-occupation",
      label: "What does your workday demand?",
      question: `${s.name}, what does a typical work or school day demand—mostly sitting at a desk, standing on your feet, lifting/carrying, driving, patient care, training/sport, caregiving, or are you retired?`,
      category: "function",
      theme: "occupation",
      reason: "Occupation shapes realistic HEP dosing and movement selection",
      priority: 93,
    });
  } else if (s.occupation?.source === "stated") {
    const cat = s.occupation.category;
    if (cat === "desk" || cat === "student") {
      push({
        id: "adapt-occ-desk-dose",
        label: "Desk / screen tolerance?",
        question: `You described ${s.occupation.label}. About how many minutes at the desk or screen before ${regionPhrase} builds—and do micro-breaks (stand, walk, reset posture) help?`,
        category: "irritability",
        theme: "occupation",
        reason: `Occupation: ${s.occupation.label}`,
        priority: 86,
      });
    } else if (cat === "labor" || cat === "healthcare" || cat === "caregiver") {
      push({
        id: "adapt-occ-lift",
        label: "Work lifts / transfers?",
        question: `With ${s.occupation.label}, what loads or transfers are hardest (patients, boxes, laundry, kids)—and do you notice next-day cost after heavier shifts?`,
        category: "function",
        theme: "occupation",
        reason: `Occupation: ${s.occupation.label}`,
        priority: 86,
      });
    } else if (cat === "driving") {
      push({
        id: "adapt-occ-drive",
        label: "Drive-time symptoms?",
        question: `How long are you typically behind the wheel before ${regionPhrase} changes, and what helps at stops—walk, hip stretch, seat adjust?`,
        category: "function",
        theme: "occupation",
        reason: `Occupation: ${s.occupation.label}`,
        priority: 85,
      });
    } else if (cat === "standing") {
      push({
        id: "adapt-occ-stand",
        label: "On-feet endurance?",
        question: `On your feet for work, when do feet/legs/back usually start complaining—and do softer shoes, a mat, or weight-shifting help?`,
        category: "function",
        theme: "occupation",
        reason: `Occupation: ${s.occupation.label}`,
        priority: 85,
      });
    } else if (cat === "athlete") {
      push({
        id: "adapt-occ-sport",
        label: "Training load this week?",
        question: `For training/sport, what does a typical week look like (sessions, intensity)—and is ${regionPhrase} worse in practice, competition, or the day after?`,
        category: "function",
        theme: "occupation",
        reason: `Occupation: ${s.occupation.label}`,
        priority: 85,
      });
    }
  }

  // —— Laterality ——
  if (s.missingThemes.includes("laterality") && s.regions.length && s.raw.length >= 20) {
    push({
      id: "adapt-side",
      label: "Left, right, or both?",
      question: `Is ${regionPhrase} mainly left, right, both, or central—and if both, is one side clearly worse?`,
      category: "bother",
      theme: "laterality",
      reason: "Side not specified",
      priority: 70,
    });
  }

  // —— Function / goals ——
  if (s.missingThemes.includes("function-limits")) {
    push({
      id: "adapt-function",
      label: "Hardest daily task?",
      question: `Which everyday task is hardest because of this—sitting, standing up, walking, stairs, reaching, dressing, sleep, work—and what about that task feels limited?`,
      category: "function",
      theme: "function-limits",
      reason: "Need a functional anchor for the plan",
      priority: 79,
    });
  }
  if (s.missingThemes.includes("goals") && s.raw.length >= 30) {
    const anchor = s.functionalLimits[0] || "daily life";
    push({
      id: "adapt-goal",
      label: "Meaningful 2-week win?",
      question: `If we only improved one thing in the next two weeks related to ${anchor}, what would feel like a real win for you?`,
      category: "goals",
      theme: "goals",
      reason: s.functionalLimits[0]
        ? `Goal tied to your limit: ${s.functionalLimits[0]}`
        : "Need a patient-specific goal",
      priority: 76,
    });
  }

  // —— Fear / sleep ——
  if (s.fearAvoidance) {
    push({
      id: "adapt-fear",
      label: "Feared movement?",
      question: `You mentioned fear or avoiding movement. Which specific motion feels most threatening, and what do you notice in your body when you think about doing it?`,
      category: "behavior",
      theme: "fear-avoidance",
      reason: "Fear-avoidance language present",
      priority: 84,
    });
  } else if (s.missingThemes.includes("fear-avoidance") && s.irritability === "high") {
    push({
      id: "adapt-guard",
      label: "Any guarding?",
      question: `You described a high-irritability picture—are there moves you guard against or avoid because you’re worried they’ll set you back? (Only if true for you.)`,
      category: "behavior",
      theme: "fear-avoidance",
      reason: "High irritability from your stated evidence — asking, not assuming fear",
      priority: 72,
    });
  }
  if (s.sleepImpact) {
    push({
      id: "adapt-sleep",
      label: "Sleep positions?",
      question: `Sleep is in your story. Which positions are worst, how often do you wake, and does pain or racing thoughts wake you more?`,
      category: "function",
      theme: "sleep-stress",
      reason: "Sleep impact mentioned",
      priority: 75,
    });
  } else if (s.missingThemes.includes("sleep-stress") && s.raw.length >= 50) {
    push({
      id: "adapt-sleep-stress",
      label: "Sleep or stress link?",
      question: `How are sleep and stress right now—and do you notice ${regionPhrase} changing when you’re tired, tense, or under pressure?`,
      category: "function",
      theme: "sleep-stress",
      reason: "Sleep/stress not covered",
      priority: 68,
    });
  }

  // —— History ——
  if (s.missingThemes.includes("history") && s.raw.length >= 40) {
    push({
      id: "adapt-hist",
      label: "Past & current health?",
      question: `${s.name}, any past surgeries, fractures, or old injuries—and any current conditions (blood pressure, diabetes, heart/lung, arthritis)—that should shape how hard we push?`,
      category: "history",
      theme: "history",
      reason: "Medical history gap",
      priority: 74,
    });
  }

  // —— Red flags soft ——
  if (s.redFlagHints.length) {
    push({
      id: "adapt-red-urgent",
      label: "Concerning symptoms?",
      question: `You used language that a clinician should take seriously (“${s.redFlagHints[0]}”). Have you already contacted a licensed clinician, and are bowel/bladder changes, saddle numbness, progressive weakness, or fever present now?`,
      category: "safety",
      theme: "red-flags",
      reason: "Possible red-flag language",
      priority: 99,
    });
  } else if (s.missingThemes.includes("red-flags") && s.raw.length >= 60) {
    push({
      id: "adapt-red-soft",
      label: "Anything urgent?",
      question: `Besides the main bother, have you noticed unexplained progressive weakness, numbness in the saddle area, bowel/bladder changes, fever with severe pain, or pain after a bad fall that a clinician should hear about urgently?`,
      category: "safety",
      theme: "red-flags",
      reason: "Screen for urgent symptoms (standard interview)",
      priority: 60,
    });
  }

  // —— Sex-aware optional ——
  if (s.sex === "female" && (s.regions.includes("pelvis") || s.regions.includes("lower-back"))) {
    push({
      id: "adapt-sex-f",
      label: "Pelvic / bone health context?",
      question: `Is there anything about pregnancy, postpartum recovery, pelvic comfort, or bone health you want the plan to respect?`,
      category: "safety",
      theme: "history",
      reason: "Sex context + pelvic/lumbar regions",
      priority: 65,
    });
  }

  // —— Closing PT sentence ——
  if (s.coveredThemes.length >= 5) {
    push({
      id: "adapt-one-sentence",
      label: "One sentence for your PT",
      question: `If you had 10 seconds with a physical therapist, what one honest sentence would you say about what is bothering you and what you want back?`,
      category: "goals",
      theme: "goals",
      reason: "Story is rich enough to crystallize",
      priority: 55,
    });
  }

  // Sort by priority, cap
  return q.sort((a, b) => b.priority - a.priority).slice(0, 10);
}

/**
 * Boost movement scoring using story intelligence (Plan/Routine).
 */
export function storyMovementBoost(
  intel: StoryIntelligence,
  movement: {
    id: string;
    kind: "stretch" | "exercise";
    name: string;
    tags: string[];
    bodyParts: BodyPart[];
    benefits?: string[];
  }
): number {
  const hints = intel.planHints;
  let score = 0;
  const blob = [movement.name, movement.tags.join(" "), (movement.benefits || []).join(" ")]
    .join(" ")
    .toLowerCase();

  // Region priority
  for (let i = 0; i < intel.regions.length; i++) {
    if (movement.bodyParts.includes(intel.regions[i]!)) {
      score += Math.max(4, 12 - i * 2);
    }
  }

  for (const t of hints.preferTags) {
    if (movement.tags.includes(t) || blob.includes(t.toLowerCase())) score += 3.5;
  }
  for (const t of hints.avoidTags) {
    if (t === "all") score -= 25;
    else if (movement.tags.includes(t) || blob.includes(t.toLowerCase())) score -= 7;
  }
  for (const kw of hints.movementKeywords) {
    if (blob.includes(kw.toLowerCase()) || movement.name.toLowerCase().includes(kw.toLowerCase())) {
      score += 5;
    }
  }

  // Functional task alignment
  for (const f of intel.functionalLimits) {
    if (f.includes("stairs") && /step|stair|sit-to-stand|quad|glute|bridge/i.test(blob)) score += 6;
    if (f.includes("sit-to-stand") && /sit-to-stand|squat|quad|bridge/i.test(blob)) score += 6;
    if (f.includes("work/desk") && /chin|thoracic|scapular|row|posture|chest/i.test(blob)) score += 6;
    if (f.includes("reaching") && /scapular|shoulder|serratus|external|doorway/i.test(blob))
      score += 6;
    if (f.includes("sleep") && /gentle|mobility|breath|cat-cow|child/i.test(blob)) score += 3;
    if (f.includes("walking") && /heel|balance|glute|calf|gait|walk/i.test(blob)) score += 5;
  }

  for (const a of intel.aggravators) {
    if (a.includes("sitting") && /hip flexor|thoracic|chin|extension|glute|bridge/i.test(blob))
      score += 4;
    if (a.includes("lifting") && /hinge|dead|bridge|bird|dead bug|core/i.test(blob)) score += 4;
  }

  if (movement.kind === "stretch") score += hints.stretchBias * 8;
  if (movement.kind === "exercise") score += hints.exerciseBias * 8;

  if (intel.irritability === "high") {
    if (/gentle|isometric|activation|motor-control|protected/i.test(blob)) score += 5;
    if (/plyo|jump|heavy|aggressive|ballistic/i.test(blob)) score -= 10;
  }
  if (intel.neuroLanguage) {
    if (/neural|slump|tensioner/i.test(blob) && !/gentle/i.test(blob)) score -= 8;
    if (/gentle|motor-control|core|bird|dead bug/i.test(blob)) score += 4;
  }

  // Free-text token overlap with movement name
  const tokens = movement.name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((x) => x.length >= 4);
  const story = intel.raw.toLowerCase();
  for (const tok of tokens) if (story.includes(tok)) score += 2.5;

  // Elite: only boost when completeness is high (more reliable stated map)
  if (typeof intel.completeness === "number") {
    if (intel.completeness >= 70) score += 2;
    else if (intel.completeness < 30) score -= 1;
  }
  if (intel.elite?.doseEnvelope.mode === "protect") {
    if (/gentle|isometric|protected|activation/i.test(blob)) score += 3;
    if (/plyo|jump|heavy|ballistic/i.test(blob)) score -= 6;
  }

  score += hints.scoringBoost * 0.15;
  return score;
}

/** Compact correlation payload for clinical context / Jeffery / insights */
export function storyIntelCorrelationSummary(intel: StoryIntelligence): string[] {
  const lines = [...intel.liveReadLines];
  if (intel.intelligenceGrade) {
    lines.unshift(
      `Story intel grade: ${intel.intelligenceGrade}${
        typeof intel.completeness === "number" ? ` (${intel.completeness}/100)` : ""
      }`
    );
  }
  for (const e of intel.planHints.evidenceLines.slice(0, 3)) {
    lines.push(e);
  }
  if (intel.conflicts?.[0]) lines.push(`Conflict: ${intel.conflicts[0]}`);
  if (intel.elite?.clinicalHypotheses?.[0]) {
    lines.push(
      `Provisional: ${intel.elite.clinicalHypotheses[0].label} (${intel.elite.clinicalHypotheses[0].confidence})`
    );
  }
  if (intel.adaptiveQuestions[0]) {
    lines.push(`Next interview focus: ${intel.adaptiveQuestions[0].label}`);
  }
  return lines.slice(0, 14);
}
