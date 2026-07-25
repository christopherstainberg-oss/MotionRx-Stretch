/**
 * Deep free-text story intelligence for Assessment “Describe Your Issue”.
 * Parses clinical narrative signals, drives adaptive open-ended Q&A that
 * reacts to user answers, and supplies high-signal scoring for Plan/Routine.
 * Educational only — not diagnosis or licensed care.
 */

import type { BodyPart, Difficulty, MovementKind } from "@/lib/types";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import { matchDescriptorsFromText } from "@/data/pain-descriptors";
import { matchConditionsFromText } from "@/data/clinical-conditions";
import type { SexSelection } from "@/lib/clinical-history";

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
  | "laterality";

export type StoryIrritability = "low" | "moderate" | "high";
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
  irritability: StoryIrritability;
  directionalCues: string[];
  radiation: boolean;
  neuroLanguage: boolean;
  goals: string[];
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
];

const AREA_MAP: Array<{ re: RegExp; parts: BodyPart[] }> = [
  { re: /\b(low(?:er)?\s*back|lumbar|lumbago)\b/i, parts: ["lower-back"] },
  { re: /\b(mid(?:dle)?\s*back|thoracic|upper\s*back)\b/i, parts: ["thoracic", "upper-back"] },
  { re: /\b(neck|cervical|whiplash)\b/i, parts: ["neck"] },
  { re: /\b(shoulder|rotator\s*cuff|impinge)\b/i, parts: ["shoulders", "scapular"] },
  { re: /\b(scapula|shoulder\s*blade)\b/i, parts: ["scapular"] },
  { re: /\b(hip|piriformis|groin)\b/i, parts: ["hips", "groin", "glutes"] },
  { re: /\b(knee|patell|menisc|acl|mcl)\b/i, parts: ["knee", "quadriceps"] },
  { re: /\b(ankle|achilles)\b/i, parts: ["ankles", "calves"] },
  { re: /\b(foot|plantar|heel|arch)\b/i, parts: ["foot", "ankles"] },
  { re: /\b(elbow|tennis\s*elbow|golfer.?s\s*elbow)\b/i, parts: ["elbow", "forearm"] },
  { re: /\b(wrist|carpal|hand|finger)\b/i, parts: ["wrists", "hand"] },
  { re: /\b(jaw|tmj)\b/i, parts: ["jaw"] },
  { re: /\b(pelvis|si\s*joint|sacroiliac)\b/i, parts: ["pelvis"] },
  { re: /\b(glute|butt)\b/i, parts: ["glutes"] },
  { re: /\b(hamstring)\b/i, parts: ["hamstrings"] },
  { re: /\b(quad|thigh)\b/i, parts: ["quadriceps"] },
  { re: /\b(calf|calves)\b/i, parts: ["calves"] },
  { re: /\b(core|abs)\b/i, parts: ["core"] },
  { re: /\b(chest|pec)\b/i, parts: ["chest"] },
];

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function regionLabel(parts: BodyPart[]): string {
  if (!parts.length) return "what is bothering you";
  const labels = parts.slice(0, 2).map((a) => BODY_PART_LABELS[a] || a);
  if (labels.length === 1) return labels[0]!;
  return labels.join(" and ");
}

function snip(text: string, max = 90): string {
  const s = text.trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function extractPainNumbers(text: string): { now?: number; worst?: number } {
  const t = text.toLowerCase();
  const pairs = Array.from(
    t.matchAll(
      /(?:pain|hurt|ache|level|rated?|about|around|is|=|:)?\s*(\d{1,2})\s*(?:\/\s*10|out of 10)?/gi
    )
  );
  const nums = pairs
    .map((m) => Number(m[1]))
    .filter((n) => n >= 0 && n <= 10);
  if (!nums.length) {
    if (/\b(unbearable|excruciating|severe)\b/i.test(t)) return { now: 7, worst: 9 };
    if (/\b(moderate)\b/i.test(t)) return { now: 4, worst: 6 };
    if (/\b(mild|slight|annoying)\b/i.test(t)) return { now: 2, worst: 4 };
    if (/\b(sharp|stabbing)\b/i.test(t)) return { now: 6, worst: 8 };
    return {};
  }
  const now = nums[0];
  const worst = nums.length > 1 ? Math.max(...nums) : now;
  return { now, worst };
}

function extractList(text: string, patterns: Array<{ re: RegExp; label: string }>): string[] {
  const out: string[] = [];
  for (const p of patterns) {
    if (p.re.test(text)) out.push(p.label);
  }
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
  }
): StoryIntelligence {
  const raw = (paragraph || "").trim();
  const t = raw.toLowerCase();
  const name = displayPreferredName(opts?.preferredName);
  const words = raw ? raw.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  const regions = unique<BodyPart>([
    ...(opts?.areas || []),
    ...AREA_MAP.flatMap((m) => (m.re.test(raw) ? m.parts : [])),
  ]);

  let laterality: Laterality = "unknown";
  if (/\b(both sides|bilateral|left and right)\b/i.test(raw)) laterality = "bilateral";
  else if (/\b(left)\b/i.test(raw) && /\b(right)\b/i.test(raw)) laterality = "bilateral";
  else if (/\b(left[- ]?(side|sided)?|l\.?\s*side)\b/i.test(raw)) laterality = "left";
  else if (/\b(right[- ]?(side|sided)?|r\.?\s*side)\b/i.test(raw)) laterality = "right";
  else if (/\b(central|midline|across the (back|spine))\b/i.test(raw)) laterality = "central";

  const sensory = extractList(raw, [
    { re: /\b(sharp|stabbing|knife)\b/i, label: "sharp" },
    { re: /\b(dull|ache|achy)\b/i, label: "dull/achy" },
    { re: /\b(burning|hot)\b/i, label: "burning" },
    { re: /\b(throbbing|pulsing)\b/i, label: "throbbing" },
    { re: /\b(tight|stiff|stiffness)\b/i, label: "stiff/tight" },
    { re: /\b(numb|numbness)\b/i, label: "numbness" },
    { re: /\b(tingl|pins and needles|paresthesia)\b/i, label: "tingling" },
    { re: /\b(weak|giving way|buckl)\b/i, label: "weakness/giving-way" },
    { re: /\b(catch|lock|click|pop)\b/i, label: "catching/clicking" },
    { re: /\b(swollen|swelling)\b/i, label: "swelling" },
    { re: /\b(cramp)\b/i, label: "cramping" },
  ]);

  let onset: OnsetType = "unknown";
  if (/\b(sudden|suddenly|all of a sudden|immediate|heard a (pop|snap))\b/i.test(raw))
    onset = "sudden";
  else if (/\b(gradual|gradually|over (time|weeks|months)|slowly|crept)\b/i.test(raw))
    onset = "gradual";
  else if (/\b(no (clear|known) (injury|cause)|insidious|came out of nowhere)\b/i.test(raw))
    onset = "insidious";

  const timelineHints = extractList(raw, [
    { re: /\b(today|this morning)\b/i, label: "today" },
    { re: /\b(\d+\s*days?|a few days|this week)\b/i, label: "days–week" },
    { re: /\b(\d+\s*weeks?|couple weeks|few weeks)\b/i, label: "weeks" },
    { re: /\b(\d+\s*months?|several months)\b/i, label: "months" },
    { re: /\b(years?|chronic|long.?standing|on and off)\b/i, label: "chronic/years" },
    { re: /\b(after (a )?(fall|lift|workout|run|game|accident|surgery))\b/i, label: "post-event" },
  ]);

  const { now: painNow, worst: painWorst } = extractPainNumbers(raw);

  const aggravators = extractList(raw, [
    { re: /\b(sitting|sit too long|desk)\b/i, label: "sitting/desk" },
    { re: /\b(standing (too )?long|stand(ing)? still)\b/i, label: "prolonged standing" },
    { re: /\b(walking|walks?|gait)\b/i, label: "walking" },
    { re: /\b(stairs?|steps)\b/i, label: "stairs" },
    { re: /\b(bending|bend|tie shoes|put on socks)\b/i, label: "bending" },
    { re: /\b(lifting|lift|carry|carrying)\b/i, label: "lifting/carrying" },
    { re: /\b(reaching|overhead|raise arm)\b/i, label: "reaching/overhead" },
    { re: /\b(twisting|twist|turn(ing)?)\b/i, label: "twisting" },
    { re: /\b(running|run|jog)\b/i, label: "running" },
    { re: /\b(driving|drive)\b/i, label: "driving" },
    { re: /\b(morning|first thing|get(ting)? out of bed)\b/i, label: "morning" },
    { re: /\b(night|in bed|lying|sleep)\b/i, label: "night/lying" },
    { re: /\b(squat|kneel|lunge)\b/i, label: "squat/kneel" },
    { re: /\b(work|job|shift)\b/i, label: "work tasks" },
  ]);

  const easers = extractList(raw, [
    { re: /\b(heat|hot pack|warm shower)\b/i, label: "heat" },
    { re: /\b(ice|cold pack|frozen)\b/i, label: "ice/cold" },
    { re: /\b(rest|lying down|sit down)\b/i, label: "rest/position change" },
    { re: /\b(walking (helps|eases)|walk it off|gentle walk)\b/i, label: "gentle walking" },
    { re: /\b(stretch|stretching|yoga)\b/i, label: "stretching" },
    { re: /\b(meds?|ibuprofen|tylenol|naproxen|acetaminophen|pain pill)\b/i, label: "medication" },
    { re: /\b(massage|foam roll)\b/i, label: "massage/soft tissue" },
    { re: /\b(movement|keep moving|motion is lotion)\b/i, label: "gentle movement" },
    { re: /\b(brace|support|tape)\b/i, label: "brace/support" },
  ]);

  const timeOfDayWorst = extractList(raw, [
    { re: /\b(morning|first thing|wake)\b/i, label: "morning" },
    { re: /\b(afternoon|midday)\b/i, label: "afternoon" },
    { re: /\b(evening|end of (the )?day)\b/i, label: "evening" },
    { re: /\b(night|overnight|in bed)\b/i, label: "night" },
    { re: /\b(after (work|activity|exercise|sitting))\b/i, label: "after activity/load" },
  ]);

  const functionalLimits = extractList(raw, [
    { re: /\b(stairs?)\b/i, label: "stairs" },
    { re: /\b(sit to stand|get(ting)? up from (a )?chair|stand(ing)? up)\b/i, label: "sit-to-stand" },
    { re: /\b(dress|socks|shoes|shirt overhead)\b/i, label: "dressing" },
    { re: /\b(sleep|wake(s)? up|toss and turn)\b/i, label: "sleep" },
    { re: /\b(work|desk|computer|job)\b/i, label: "work/desk" },
    { re: /\b(walk|walking|grocery|errands)\b/i, label: "walking/errands" },
    { re: /\b(sport|gym|run|bike|swim|golf|tennis)\b/i, label: "sport/gym" },
    { re: /\b(lift|carry|kids?|grandkids?)\b/i, label: "lifting/carrying" },
    { re: /\b(drive|driving|commute)\b/i, label: "driving" },
    { re: /\b(reach|overhead|shelves)\b/i, label: "reaching" },
  ]);

  const fearAvoidance =
    /\b(afraid|fear|scared|avoid|don'?t want to make it worse|worried it will|guarding|terrified)\b/i.test(
      raw
    );
  const sleepImpact = /\b(sleep|insomnia|wake|night pain|can'?t get comfortable)\b/i.test(raw);
  const stressImpact = /\b(stress|anxious|anxiety|tense|tension|overwhelmed)\b/i.test(raw);

  let activityResponse: ActivityResponse = "unknown";
  if (
    /\b(worse (the )?next day|delayed|2.?24 hour|pays for it later|sore after|irritated later|flares after)\b/i.test(
      raw
    )
  ) {
    activityResponse = "delayed-worse";
  } else if (/\b(worse after|aggravates|flares with|makes it worse)\b/i.test(raw)) {
    activityResponse = "worse";
  } else if (/\b(better after|eases with|loosens (up|after)|helps when I move)\b/i.test(raw)) {
    activityResponse = "better";
  } else if (/\b(same after|no change after|doesn'?t change)\b/i.test(raw)) {
    activityResponse = "same";
  }

  const radiation =
    /\b(radiat|shoots?|travels?|down (my )?(leg|arm)|sciatic|into (the )?(foot|hand|butt))\b/i.test(
      raw
    );
  const neuroLanguage =
    radiation ||
    /\b(numb|tingl|pins|nerve|weakness|drop foot|saddle)\b/i.test(raw);

  const goals = unique([
    ...(opts?.goals || []),
    ...extractList(raw, [
      { re: /\b(want to|hope to|goal|get back to|return to|wish i could)\b/i, label: "stated goal" },
      { re: /\b(walk|hiking|steps)\b/i, label: "walk more comfortably" },
      { re: /\b(sleep)\b/i, label: "sleep better" },
      { re: /\b(work|desk|job)\b/i, label: "tolerate work/desk" },
      { re: /\b(stairs?)\b/i, label: "manage stairs" },
      { re: /\b(sport|gym|run|golf|tennis|bike)\b/i, label: "return to sport/gym" },
      { re: /\b(play with|kids?|grandkids?)\b/i, label: "play with kids/family" },
      { re: /\b(pain.?free|less pain|reduce pain)\b/i, label: "reduce pain interference" },
    ]),
  ]);

  const redFlagHints = extractList(raw, [
    { re: /\b(saddle|groin numbness|perineal)\b/i, label: "saddle anesthesia language" },
    { re: /\b(bowel|bladder|incontinence|retention)\b/i, label: "bowel/bladder change" },
    { re: /\b(fever|night sweats|unexplained weight)\b/i, label: "systemic fever/weight language" },
    { re: /\b(trauma|bad fall|mva|car accident|fracture)\b/i, label: "significant trauma" },
    { re: /\b(progressive weakness|foot drop|can'?t lift)\b/i, label: "progressive weakness" },
    { re: /\b(chest pain|short(ness)? of breath|sob)\b/i, label: "cardio/resp language" },
    { re: /\b(cancer|tumor|infection|iv drug)\b/i, label: "red-flag history language" },
  ]);

  const directionalCues = extractList(raw, [
    { re: /\b(flexion|bending forward|touch(ing)? toes)\b/i, label: "flexion-sensitive" },
    { re: /\b(extension|bending back|arching|standing tall)\b/i, label: "extension-sensitive" },
    { re: /\b(sitting (worse|hurts)|worse sitting)\b/i, label: "sitting-sensitive" },
    { re: /\b(standing (worse|hurts)|worse standing)\b/i, label: "standing-sensitive" },
    { re: /\b(walking (worse|hurts)|worse walking)\b/i, label: "walking-sensitive" },
    { re: /\b(prefer (to )?sit|sitting eases)\b/i, label: "sitting-eases" },
    { re: /\b(prefer (to )?walk|walking eases)\b/i, label: "walking-eases" },
  ]);

  const histBlob = `${opts?.pastMedicalHistory || ""} ${opts?.currentMedicalHistory || ""} ${raw}`;
  const hasHistory =
    /\b(surgery|s\/p|arthroscopy|replacement|fracture|fusion|diabetes|hypertension|heart|asthma|arthritis|past:|currently|pmh|cmh)\b/i.test(
      histBlob
    );

  const coveredThemes: StoryTheme[] = [];
  if (raw.length >= 20 || sensory.length || regions.length) coveredThemes.push("primary-complaint");
  if (regions.length || sensory.length) coveredThemes.push("location-quality");
  if (onset !== "unknown" || timelineHints.length) coveredThemes.push("onset-timeline");
  if (painNow != null) coveredThemes.push("pain-intensity");
  if (aggravators.length) coveredThemes.push("aggravators");
  if (easers.length) coveredThemes.push("easers");
  if (timeOfDayWorst.length) coveredThemes.push("time-pattern");
  if (functionalLimits.length) coveredThemes.push("function-limits");
  if (activityResponse !== "unknown") coveredThemes.push("activity-response");
  if (fearAvoidance) coveredThemes.push("fear-avoidance");
  if (sleepImpact || stressImpact) coveredThemes.push("sleep-stress");
  if (radiation || neuroLanguage) coveredThemes.push("radiation-neuro");
  if (hasHistory) coveredThemes.push("history");
  if (goals.length || /\b(want|goal|hope|get back)\b/i.test(raw)) coveredThemes.push("goals");
  if (redFlagHints.length || /\b(no red flags|nothing like that)\b/i.test(raw))
    coveredThemes.push("red-flags");
  if (laterality !== "unknown") coveredThemes.push("laterality");

  const missingThemes = ALL_THEMES.filter((th) => !coveredThemes.includes(th));

  let richness: StoryIntelligence["richness"] = "empty";
  if (wordCount === 0) richness = "empty";
  else if (wordCount < 18) richness = "thin";
  else if (wordCount < 50 || coveredThemes.length < 4) richness = "moderate";
  else if (wordCount < 120 || coveredThemes.length < 8) richness = "rich";
  else richness = "clinical";

  // Irritability model (PT-style traffic-light proxy)
  let irritability: StoryIrritability = "moderate";
  const highSignals =
    (painNow != null && painNow >= 6 ? 2 : 0) +
    (painWorst != null && painWorst >= 8 ? 1 : 0) +
    (activityResponse === "delayed-worse" || activityResponse === "worse" ? 2 : 0) +
    (aggravators.length >= 4 ? 1 : 0) +
    (neuroLanguage ? 1 : 0) +
    (fearAvoidance ? 1 : 0) +
    (sleepImpact && (painNow ?? 0) >= 5 ? 1 : 0);
  const lowSignals =
    (painNow != null && painNow <= 3 ? 2 : 0) +
    (activityResponse === "better" ? 2 : 0) +
    (easers.includes("gentle movement") || easers.includes("stretching") ? 1 : 0) +
    (aggravators.length <= 1 && wordCount > 30 ? 1 : 0);
  if (highSignals >= 3) irritability = "high";
  else if (lowSignals >= 3 && highSignals === 0) irritability = "low";
  else if (highSignals >= 1) irritability = "moderate";
  else if (lowSignals >= 1) irritability = "low";

  const descriptorIds = raw.length >= 8 ? matchDescriptorsFromText(raw, 14) : [];
  const conditionIds = raw.length >= 8 ? matchConditionsFromText(raw, 12) : [];

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

  const answerSnippets: StoryIntelligence["answerSnippets"] = [];
  if (primaryComplaint)
    answerSnippets.push({ theme: "primary-complaint", text: primaryComplaint });
  if (aggravators.length)
    answerSnippets.push({ theme: "aggravators", text: aggravators.join(", ") });
  if (easers.length) answerSnippets.push({ theme: "easers", text: easers.join(", ") });
  if (functionalLimits.length)
    answerSnippets.push({ theme: "function-limits", text: functionalLimits.join(", ") });

  const planHints = buildPlanHints({
    regions,
    sensory,
    irritability,
    activityResponse,
    aggravators,
    easers,
    functionalLimits,
    directionalCues,
    neuroLanguage,
    fearAvoidance,
    painNow,
    goals,
    redFlagHints,
    onset,
  });

  const liveReadLines = buildLiveReadLines({
    name,
    richness,
    regions,
    laterality,
    sensory,
    onset,
    painNow,
    painWorst,
    aggravators,
    easers,
    functionalLimits,
    irritability,
    activityResponse,
    neuroLanguage,
    goals,
    coveredThemes,
    missingThemes,
  });

  const coachSummary = liveReadLines.slice(0, 4).join(" ");

  const adaptiveQuestions = buildAdaptiveQuestions({
    name,
    raw,
    regions,
    laterality,
    sensory,
    onset,
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
    irritability,
    directionalCues,
    radiation,
    neuroLanguage,
    goals,
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
      "Lower irritability: bias motor control and graded capacity while keeping mobility gains."
    );
    scoringBoost += 2;
  } else {
    phaseBias = s.sensory.includes("stiff/tight") ? "mobility-restore" : "motor-control";
    stretchBias += 0.2;
    exerciseBias += 0.2;
    preferTags.push("mobility", "activation", "motor-control");
    evidenceLines.push("Moderate irritability: balanced mobility + control with traffic-light dosing.");
    scoringBoost += 2;
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

  const functionalGoals = s.goals.length
    ? s.goals.slice(0, 6)
    : s.functionalLimits.map((f) => `Improve ${f}`).slice(0, 4);

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
    evidenceLines: unique(evidenceLines).slice(0, 8),
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
  painNow?: number;
  painWorst?: number;
  aggravators: string[];
  easers: string[];
  functionalLimits: string[];
  irritability: StoryIrritability;
  activityResponse: ActivityResponse;
  neuroLanguage: boolean;
  goals: string[];
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
  lines.push(
    `Clinical read: ${region}${s.laterality !== "unknown" ? ` (${s.laterality})` : ""}${
      s.sensory.length ? ` · feels ${s.sensory.slice(0, 3).join(", ")}` : ""
    }${s.painNow != null ? ` · ~${s.painNow}/10` : ""}${
      s.painWorst != null && s.painWorst !== s.painNow ? ` (worst ~${s.painWorst})` : ""
    }.`
  );
  lines.push(
    `Irritability: ${s.irritability}${
      s.activityResponse !== "unknown" ? ` · after activity: ${s.activityResponse}` : ""
    }${s.onset !== "unknown" ? ` · onset ${s.onset}` : ""}.`
  );
  if (s.aggravators.length)
    lines.push(`Aggravators noted: ${s.aggravators.slice(0, 5).join(", ")}.`);
  if (s.easers.length) lines.push(`Easers noted: ${s.easers.slice(0, 4).join(", ")}.`);
  if (s.functionalLimits.length)
    lines.push(`Function limited in: ${s.functionalLimits.slice(0, 5).join(", ")}.`);
  if (s.neuroLanguage)
    lines.push("Neuro/radiation language present — plan will stay gentle and centralization-minded.");
  if (s.goals.length) lines.push(`Goals in story: ${s.goals.slice(0, 4).join("; ")}.`);
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
      coachLine: "High irritability → protect-calm dosing for Plan (short volume, isometrics, traffic lights).",
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

  // —— Aggravator-specific adaptive probes ——
  if (s.aggravators.includes("sitting/desk")) {
    push({
      id: "adapt-sit-dose",
      label: "Sitting tolerance?",
      question: `You linked symptoms to sitting/desk time. About how many minutes before it builds, and does standing, walking, or changing lumbar support settle it?`,
      category: "irritability",
      theme: "aggravators",
      reason: "You named sitting/desk as a problem",
      priority: 90,
    });
    push({
      id: "adapt-sit-dir",
      label: "Sit vs stand preference?",
      question: `When ${region} is angry from sitting, do you feel better standing/walking, or do you need to lie down—and does bending forward help or hurt?`,
      category: "behavior",
      theme: "aggravators",
      reason: "Directional preference from sitting story",
      priority: 84,
    });
  }
  if (s.aggravators.includes("stairs") || s.functionalLimits.includes("stairs")) {
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
      question: `How far can you walk before ${region} changes—and is it pain, tightness, numbness, or fatigue that stops you first?`,
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
      question: `With pain around ${s.painNow}/10, is there any small range or position that still feels relatively safe—and how long do flares last when you overdo it?`,
      category: "irritability",
      theme: "pain-intensity",
      reason: `You reported ~${s.painNow}/10 pain`,
      priority: 89,
    });
  } else if (s.missingThemes.includes("pain-intensity") && s.raw.length >= 24) {
    push({
      id: "adapt-pain-scale",
      label: "Pain 0–10 pattern",
      question: `On a 0–10 scale, where does ${region} sit most of the day, and where does it go at its worst? Does it stay local or travel?`,
      category: "irritability",
      theme: "pain-intensity",
      reason: "No pain number yet",
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
      question: `You named things that aggravate ${region}. What reliably eases it even a little—position change, walk, heat, ice, meds, rest—and how long does relief last?`,
      category: "behavior",
      theme: "easers",
      reason: "Have aggravators but not easers",
      priority: 81,
    });
  }

  // —— Onset ——
  if (s.missingThemes.includes("onset-timeline") && s.raw.length >= 20) {
    push({
      id: "adapt-onset",
      label: "How did it start?",
      question: `How did this start—suddenly after a lift, fall, or workout, or gradually over weeks—and has it been getting better, worse, or staying about the same?`,
      category: "bother",
      theme: "onset-timeline",
      reason: "Onset/timeline not clear yet",
      priority: 77,
    });
  }

  // —— Laterality ——
  if (s.missingThemes.includes("laterality") && s.regions.length && s.raw.length >= 20) {
    push({
      id: "adapt-side",
      label: "Left, right, or both?",
      question: `Is ${region} mainly left, right, both, or central—and if both, is one side clearly worse?`,
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
      question: `With how irritable this sounds—are there moves you guard against or avoid because you’re worried they’ll set you back?`,
      category: "behavior",
      theme: "fear-avoidance",
      reason: "High irritability often pairs with guarding",
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
      question: `How are sleep and stress right now—and do you notice ${region} changing when you’re tired, tense, or under pressure?`,
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

  score += hints.scoringBoost * 0.15;
  return score;
}

/** Compact correlation payload for clinical context / Jeffery / insights */
export function storyIntelCorrelationSummary(intel: StoryIntelligence): string[] {
  const lines = [...intel.liveReadLines];
  for (const e of intel.planHints.evidenceLines.slice(0, 3)) {
    lines.push(e);
  }
  if (intel.adaptiveQuestions[0]) {
    lines.push(`Next interview focus: ${intel.adaptiveQuestions[0].label}`);
  }
  return lines.slice(0, 12);
}
