import { BASE_EXERCISES, getExerciseById } from "@/data/exercise-library";
import { BASE_STRETCHES, getStretchById } from "@/data/stretch-library";
import {
  matchDescriptorsFromText,
  summarizeDescriptors,
  type ProgramBias,
} from "@/data/pain-descriptors";
import {
  matchConditionsFromText,
  summarizeConditions,
} from "@/data/clinical-conditions";
import { buildClinicalSafetyPlan } from "@/data/clinical-safety";
import { analyzeAssessmentAdjectives } from "@/data/assessment-adjectives";
import { pickHomeVariationId } from "@/data/home-variations";
import { summarizeUserMedications } from "@/data/medications";
import { summarizeAdlEntries } from "@/data/adls";
import { summarizeClinicalSymptoms } from "@/data/clinical-symptoms";
import {
  buildClinicalRehabPlan,
  clinicalMovementBoost,
  type ClinicalRehabPlan,
} from "@/lib/clinical-rehab-intel";
import {
  analyzeStoryIntelligence,
  storyMovementBoost,
  type StoryIntelligence,
} from "@/lib/story-intelligence";
import {
  storyIdBoost,
  storyPreferredMovements,
  storyRegionMismatchPenalty,
  type StoryMovementPrefs,
} from "@/lib/routine-specificity";
import { buildSleepCorrelation } from "@/lib/psqi";
import { getSportById } from "@/data/sports";
import {
  getSurgeryById,
  weeksSinceSurgery,
  surgeryPhaseLabel,
} from "@/data/surgeries";
import { getActivityLevel } from "@/lib/activity-level";
import { buildSportLatePhaseProgram } from "@/lib/sport-late-phase";
import { vitalsPlanHints } from "@/lib/vitals";
import { labsPlanHints } from "@/lib/labs-store";
import {
  composePtSession,
  reorderItemsLikePtSession,
  type MovementCatalogRef,
} from "@/lib/routine-session-composer";
import {
  applyDynamicsToRehabPlan,
  buildRehabDynamics,
  dynamicsMovementBoost,
  type RehabDynamics,
} from "@/lib/rehab-dynamics";
import type {
  BodyPart,
  Difficulty,
  MovementKind,
  Routine,
  RoutineAdjustment,
  RoutineItem,
  RoutineModality,
  SymptomInput,
} from "@/lib/types";
import { v4 as uuid } from "uuid";

export { matchDescriptorsFromText, analyzeParagraphDescriptors } from "@/data/pain-descriptors";
export { matchConditionsFromText, summarizeConditions } from "@/data/clinical-conditions";
export { buildClinicalSafetyPlan } from "@/data/clinical-safety";
export { analyzeAssessmentAdjectives } from "@/data/assessment-adjectives";
export { buildClinicalRehabPlan } from "@/lib/clinical-rehab-intel";
export { buildRehabDynamics } from "@/lib/rehab-dynamics";

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const AREA_KEYWORDS: Record<string, BodyPart[]> = {
  neck: ["neck"],
  cervical: ["neck"],
  head: ["neck"],
  jaw: ["jaw"],
  tmj: ["jaw"],
  shoulder: ["shoulders"],
  shoulders: ["shoulders"],
  scapula: ["scapular", "shoulders"],
  "shoulder blade": ["scapular"],
  "upper back": ["upper-back", "thoracic"],
  "mid back": ["thoracic", "upper-back"],
  thoracic: ["thoracic"],
  "lower back": ["lower-back"],
  "low back": ["lower-back"],
  lumbar: ["lower-back"],
  back: ["lower-back", "upper-back"],
  si: ["pelvis"],
  "sacroiliac": ["pelvis"],
  pelvis: ["pelvis"],
  hip: ["hips"],
  hips: ["hips"],
  groin: ["groin"],
  adductor: ["groin"],
  glute: ["glutes"],
  butt: ["glutes"],
  hamstring: ["hamstrings"],
  quad: ["quadriceps"],
  thigh: ["quadriceps", "hamstrings"],
  knee: ["knee", "quadriceps", "hamstrings"],
  calf: ["calves"],
  calves: ["calves"],
  shin: ["shins"],
  ankle: ["ankles"],
  foot: ["foot", "ankles"],
  plantar: ["foot"],
  arch: ["foot"],
  toe: ["toes", "foot"],
  elbow: ["elbow", "forearm"],
  forearm: ["forearm", "elbow"],
  wrist: ["wrists", "forearm"],
  hand: ["hand", "wrists"],
  finger: ["hand"],
  chest: ["chest"],
  posture: ["chest", "thoracic", "neck", "scapular"],
  desk: ["neck", "shoulders", "thoracic", "wrists", "scapular"],
  balance: ["ankles", "full-body", "core", "foot"],
  core: ["core", "lower-back"],
  stiff: ["full-body"],
  tight: ["full-body"],
};

const EXERCISE_HINTS = [
  "weak",
  "strength",
  "strengthen",
  "unstable",
  "balance",
  "stairs",
  "sit to stand",
  "fatigue",
  "activation",
  "control",
  "walking",
  "stand",
];
const STRETCH_HINTS = [
  "tight",
  "stiff",
  "stretch",
  "flexibility",
  "mobility",
  "sore",
  "desk",
  "posture",
  "limited range",
  "can't reach",
];

export function parseConcernParagraph(paragraph: string): {
  areas: BodyPart[];
  symptoms: string[];
  goals: string[];
  preferKinds: MovementKind[] | "auto";
  estimatedPain: number;
  /** Clinical pain descriptors extracted from the paragraph */
  painDescriptorIds: string[];
  descriptorLabels: string[];
  /** Injuries, surgeries, and complex medical conditions from paragraph */
  conditionIds: string[];
  conditionLabels: string[];
} {
  // Prefer deep story intelligence when free text has enough signal
  const intel =
    paragraph.trim().length >= 12 ? analyzeStoryIntelligence(paragraph) : null;

  const text = paragraph.toLowerCase();
  const areas = new Set<BodyPart>();
  for (const [key, parts] of Object.entries(AREA_KEYWORDS)) {
    if (text.includes(key)) parts.forEach((p) => areas.add(p));
  }
  intel?.regions.forEach((r) => areas.add(r));

  const symptoms: string[] = [];
  for (const s of [
    "stiffness",
    "tightness",
    "pain",
    "ache",
    "numbness",
    "tingling",
    "weakness",
    "fatigue",
    "imbalance",
    "limited mobility",
    "morning stiffness",
    "after sitting",
    "after workout",
  ]) {
    if (text.includes(s.split(" ")[0]!)) symptoms.push(s);
  }

  const goals: string[] = [];
  if (text.includes("flexib")) goals.push("improve flexibility");
  if (text.includes("strength") || text.includes("weak")) goals.push("build strength");
  if (text.includes("posture")) goals.push("better posture");
  if (text.includes("walk") || text.includes("stair")) goals.push("move easier walking");
  if (text.includes("desk") || text.includes("work")) goals.push("move easier at work");
  if (text.includes("sport") || text.includes("run")) goals.push("prepare for sport");
  for (const g of intel?.planHints.functionalGoals || []) goals.push(g);
  for (const g of intel?.goals || []) if (g !== "stated goal") goals.push(g);
  if (goals.length === 0) goals.push("reduce stiffness", "move easier");

  let pain = intel?.painNow ?? 3;
  const painMatch = text.match(/pain\s*(?:is|=|:)?\s*(\d{1,2})/);
  if (painMatch) pain = Math.min(10, Number(painMatch[1]));
  else if (intel?.painNow != null) pain = intel.painNow;
  else if (text.includes("severe") || text.includes("unbearable")) pain = 7;
  else if (text.includes("moderate")) pain = 4;
  else if (text.includes("mild") || text.includes("slight")) pain = 2;
  else if (text.includes("sharp")) pain = 6;
  if (intel?.irritability === "high") pain = Math.max(pain, 5);

  const painDescriptorIds = Array.from(
    new Set([
      ...matchDescriptorsFromText(paragraph, 14),
      ...(intel?.descriptorIds || []),
    ])
  );
  const descHints = summarizeDescriptors(painDescriptorIds);
  const conditionIds = Array.from(
    new Set([
      ...matchConditionsFromText(paragraph, 12),
      ...(intel?.conditionIds || []),
    ])
  );
  const condHints = summarizeConditions(conditionIds);

  // Condition body regions enrich area set
  condHints.bodyParts.forEach((bp) => areas.add(bp));

  // Adjust estimated pain with descriptor + condition irritability
  pain = Math.min(
    10,
    Math.max(
      0,
      pain +
        Math.round(descHints.effectivePainBoost * 0.5) +
        Math.round(condHints.effectivePainBoost * 0.4)
    )
  );

  const exScore = EXERCISE_HINTS.filter((h) => text.includes(h)).length;
  const stScore = STRETCH_HINTS.filter((h) => text.includes(h)).length;
  let preferKinds: MovementKind[] | "auto" = "auto";
  if (intel?.planHints.preferKinds?.length) preferKinds = intel.planHints.preferKinds;
  else if (condHints.preferKinds !== "auto") preferKinds = condHints.preferKinds;
  else if (descHints.preferKinds !== "auto") preferKinds = descHints.preferKinds;
  else if (exScore > stScore + 1) preferKinds = ["exercise", "stretch"];
  else if (stScore > exScore + 1) preferKinds = ["stretch", "exercise"];
  else preferKinds = "auto";

  // Enrich symptoms from story intel
  if (intel?.sensory.length) {
    for (const s of intel.sensory) {
      if (!symptoms.includes(s)) symptoms.push(s);
    }
  }

  return {
    areas: areas.size ? Array.from(areas) : ["full-body"],
    symptoms: symptoms.length ? symptoms : ["general stiffness"],
    goals: Array.from(new Set(goals)),
    preferKinds,
    estimatedPain: pain,
    painDescriptorIds,
    descriptorLabels: descHints.summaryLines,
    conditionIds,
    conditionLabels: condHints.summaryLines,
  };
}

function rankOk(difficulty: Difficulty, target: Difficulty, pain: number) {
  const maxRank = pain >= 6 ? 1 : pain >= 4 ? 2 : DIFFICULTY_RANK[target];
  return DIFFICULTY_RANK[difficulty] <= maxRank;
}

function scoreMovement(
  bodyParts: BodyPart[],
  tags: string[],
  name: string,
  benefits: string[],
  input: SymptomInput,
  areaPain: number,
  kind: MovementKind,
  descHints?: ReturnType<typeof summarizeDescriptors>,
  rehab?: ClinicalRehabPlan,
  movementId?: string,
  storyIntel?: StoryIntelligence | null,
  storyPrefs?: StoryMovementPrefs | null,
  dynamics?: RehabDynamics | null
): number {
  let score = 0;
  // Priority-weighted area match (primary complaint regions first)
  const priority = rehab?.priorityAreas?.length
    ? rehab.priorityAreas
    : storyIntel?.regions?.length
      ? storyIntel.regions
      : input.areas;
  for (let i = 0; i < priority.length; i++) {
    const area = priority[i]!;
    if (bodyParts.includes(area)) score += Math.max(4, 14 - i * 2);
  }
  for (const area of input.areas) {
    if (bodyParts.includes(area)) score += 4;
  }
  const blob = [name, tags.join(" "), benefits.join(" ")].join(" ").toLowerCase();
  for (const symptom of input.symptoms) {
    if (blob.includes(symptom.toLowerCase().split(" ")[0]!)) score += 2.5;
  }
  for (const goal of input.goals) {
    if (blob.includes(goal.toLowerCase().split(" ")[0]!)) score += 3;
  }
  if (input.concernParagraph) {
    const p = input.concernParagraph.toLowerCase();
    // Deep free-text token overlap for issue-specific routine composition
    const tokens = name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3);
    for (const t of tokens) if (p.includes(t)) score += 4;
    for (const t of tags) if (p.includes(t)) score += 3;
    for (const bp of bodyParts) if (p.includes(bp.replace(/-/g, " "))) score += 3.5;
    // Phrase-level story hits
    const phrases = [
      "sit",
      "desk",
      "stair",
      "walk",
      "lift",
      "bend",
      "reach",
      "sleep",
      "morning",
      "numb",
      "tingl",
      "weak",
      "stiff",
    ];
    for (const ph of phrases) {
      if (p.includes(ph) && (blob.includes(ph) || tags.some((t) => t.includes(ph)))) {
        score += 5;
      }
    }
  }
  if (areaPain >= 5 && kind === "stretch") score += 1;
  if (areaPain >= 5 && tags.includes("neural")) score -= 4;
  if (areaPain >= 6 && (blob.includes("end-range") || blob.includes("aggressive"))) score -= 4;
  if (tags.includes("warmup") || tags.includes("activation")) score += 1;

  // Story-preferred library IDs (Describe Your Issue → exact movements)
  if (storyPrefs && movementId) {
    score += storyIdBoost(storyPrefs, movementId, kind === "stretch" ? "stretch" : "exercise");
    for (const t of storyPrefs.boostTags) {
      if (tags.includes(t) || blob.includes(t.toLowerCase())) score += 4.5;
    }
    for (const t of storyPrefs.avoidTags) {
      if (t === "all") score -= 30;
      else if (tags.includes(t) || blob.includes(t.toLowerCase())) score -= 9;
    }
  }
  score += storyRegionMismatchPenalty(storyIntel, bodyParts);

  // Clinical pain descriptor influence
  if (descHints) {
    if (kind === "stretch") score += descHints.stretchBias * 4;
    if (kind === "exercise") score += descHints.exerciseBias * 4;
    for (const t of descHints.preferTags) {
      if (tags.includes(t) || blob.includes(t)) score += 3;
    }
    for (const t of descHints.avoidTags) {
      if (t === "all") score -= 20;
      else if (tags.includes(t) || blob.includes(t)) score -= 5;
    }
    if (descHints.biases.includes("neural-caution") && tags.includes("neural")) score -= 6;
    if (descHints.biases.includes("warm-up-heavy") && tags.includes("warmup")) score += 3;
    if (descHints.biases.includes("cooldown-heavy") && tags.includes("cooldown")) score += 2;
    if (descHints.biases.includes("motor-control") && tags.includes("motor-control")) score += 3;
    if (descHints.biases.includes("postural-endurance") && (tags.includes("posture") || tags.includes("desk")))
      score += 3;
    if (descHints.biases.includes("balance-focus") && tags.includes("balance")) score += 3;
    if (descHints.biases.includes("prefer-extension") && blob.includes("extension")) score += 2;
    if (descHints.biases.includes("prefer-flexion") && blob.includes("flexion")) score += 2;
    if (descHints.biases.includes("defer-to-provider")) score -= 2;
  }

  // Evidence-informed rehab phase / injury pattern boosts
  if (rehab && movementId) {
    score += clinicalMovementBoost(rehab, {
      id: movementId,
      kind,
      name,
      tags,
      bodyParts,
      benefits,
    });
  }

  // Deep free-text story intelligence (Describe Your Issue → routine ranking)
  if (storyIntel && movementId) {
    score += storyMovementBoost(storyIntel, {
      id: movementId,
      kind: kind === "stretch" ? "stretch" : "exercise",
      name,
      tags,
      bodyParts,
      benefits,
    });
  }

  // Injury dynamics + prognosis-informed selection (tissue stage, evidence tags)
  if (dynamics && movementId) {
    score += dynamicsMovementBoost(dynamics, {
      id: movementId,
      kind,
      name,
      tags,
      bodyParts,
    });
  }

  // Medical history soft penalties (educational)
  const hist = `${input.pastMedicalHistory || ""} ${input.currentMedicalHistory || ""}`.toLowerCase();
  if (/osteopor|fracture risk/i.test(hist) && (blob.includes("jump") || blob.includes("twist"))) {
    score -= 8;
  }
  if (/cardiac|heart failure|angina/i.test(hist) && (blob.includes("heavy") || blob.includes("isometric max"))) {
    score -= 6;
  }

  return score;
}

function toItem(
  movementId: string,
  kind: MovementKind,
  variationId?: string
): RoutineItem {
  return {
    id: uuid(),
    movementId,
    kind,
    variationId,
    rotationSeed: Math.floor(Math.random() * 1000),
  };
}

function homeVarFor(kind: MovementKind, movementId: string, homeBased: boolean): string | undefined {
  if (!homeBased) return undefined;
  const m =
    kind === "stretch" ? getStretchById(movementId) : getExerciseById(movementId);
  return pickHomeVariationId(m?.variations);
}

/** Apply or clear home-based variation IDs on every routine item */
export function applyHomeBasedProgram(routine: Routine, homeBased: boolean): Routine {
  const items = routine.items.map((item) => {
    if (!homeBased) {
      const { variationId, ...rest } = item;
      // Keep non-home variations; clear home ones
      if (variationId && /home-/i.test(variationId)) {
        return { ...rest, id: item.id, movementId: item.movementId, kind: item.kind };
      }
      return item;
    }
    const vid = homeVarFor(item.kind, item.movementId, true);
    return vid ? { ...item, variationId: vid } : item;
  });
  const adjustment: RoutineAdjustment = {
    at: new Date().toISOString(),
    reason: homeBased
      ? "Switched to home-based program variations"
      : "Home-based program variations turned off",
    painFactor: 0,
    action: "modify",
    details: homeBased
      ? "Each stretch/exercise prefers chair/wall/floor/minimal-equipment home variations when available."
      : "Items use default catalog variations.",
    source: "home",
  };
  return {
    ...routine,
    homeBasedProgram: homeBased,
    items,
    generatedFrom: routine.generatedFrom
      ? { ...routine.generatedFrom, homeBasedProgram: homeBased }
      : routine.generatedFrom,
    selfAdjustHistory: [...(routine.selfAdjustHistory || []), adjustment],
    updatedAt: new Date().toISOString(),
  };
}

/** Clinically styled hybrid plan from chips + free-text + descriptors + conditions + safety + adjectives */
export function generateHybridPlan(input: SymptomInput, userId?: string): Routine {
  const parsed = input.concernParagraph
    ? parseConcernParagraph(input.concernParagraph)
    : null;

  // Deep free-text intelligence (Describe Your Issue is primary signal)
  const storyIntel = input.concernParagraph?.trim()
    ? analyzeStoryIntelligence(input.concernParagraph, {
        areas: input.areas,
        sex: input.sex,
        pastMedicalHistory: input.pastMedicalHistory,
        currentMedicalHistory: input.currentMedicalHistory,
        goals: input.goals,
        selectedOccupations: input.occupations,
      })
    : null;
  const storyPrefs = storyPreferredMovements(storyIntel, { areas: input.areas });
  // Sleep PSQI recovery correlation (client plan generation)
  const sleepCorr =
    typeof window !== "undefined" ? buildSleepCorrelation() : null;

  const adj = analyzeAssessmentAdjectives(input.concernParagraph || "");
  const safety = buildClinicalSafetyPlan({
    ageYears: input.ageYears,
    borgTargetId: input.borgTargetId,
    restingHr: input.restingHr,
    precautionIds: input.precautionIds,
    implantIds: input.implantIds,
    orthoticIds: input.orthoticIds,
    prostheticIds: input.prostheticIds,
    assistiveDeviceIds: input.assistiveDeviceIds,
    protocolNotes: input.protocolNotes,
    concernParagraph: input.concernParagraph,
  });
  const userMeds = input.medications || [];
  const medSummary =
    userMeds.length > 0 ? summarizeUserMedications(userMeds) : null;
  const adlEntries = input.adlEntries || [];
  const adlSummary = adlEntries.length ? summarizeAdlEntries(adlEntries) : null;
  const clinicalSymptomIds = input.clinicalSymptomIds || [];
  const sxSummary = clinicalSymptomIds.length
    ? summarizeClinicalSymptoms(clinicalSymptomIds)
    : null;
  // Limited ADLs / seated preference force home-friendly variations
  const homeBased =
    Boolean(input.homeBasedProgram) || Boolean(adlSummary?.preferHome);

  const textMatched = input.concernParagraph
    ? matchDescriptorsFromText(input.concernParagraph, 8)
    : [];
  const painDescriptorIds = Array.from(
    new Set([
      ...(input.painDescriptorIds || []),
      ...textMatched,
      ...(storyIntel?.descriptorIds || []),
    ])
  );
  const descHints = summarizeDescriptors(painDescriptorIds);

  // Free-text condition matches are noisy — keep user-selected IDs fully, cap auto-matches
  const textConditions = input.concernParagraph
    ? matchConditionsFromText(input.concernParagraph, 4)
    : [];
  const conditionIds = Array.from(
    new Set([
      ...(input.conditionIds || []),
      ...(parsed?.conditionIds || []).slice(0, 3),
      ...textConditions.slice(0, 3),
      ...(storyIntel?.conditionIds || []).slice(0, 3),
    ])
  );
  const condHints = summarizeConditions(conditionIds);

  // Story-derived areas + pain fill gaps when chips empty
  const storyAreas =
    storyIntel?.regions?.length
      ? storyIntel.regions
      : parsed?.areas || [];
  const storyPain =
    storyIntel?.painNow ?? parsed?.estimatedPain ?? 3;

  // Injury-specific, phase-based outpatient HEP intelligence (+ story phase bias)
  const rehab = buildClinicalRehabPlan({
    ...input,
    areas: input.areas.length ? input.areas : storyAreas,
    painDescriptorIds,
    conditionIds,
    painLevels: {
      ...Object.fromEntries(
        (
          input.areas.length
            ? input.areas
            : storyAreas.length
              ? storyAreas
              : (["full-body"] as BodyPart[])
        ).map((a: BodyPart) => [a, input.painLevels[a] ?? storyPain])
      ),
      ...input.painLevels,
    },
    // pass story signals via concern paragraph already; rehab reads paragraph
  });

  // Merge story-preferred IDs into rehab seeds (Describe Your Issue specificity)
  // Note: latePhase preferred IDs merged after storyIntel is known (below rehabWithStory rebuild)
  const preferredStretchIds = Array.from(
    new Set([...storyPrefs.stretchIds, ...rehab.preferredStretchIds])
  );
  const preferredExerciseIds = Array.from(
    new Set([...storyPrefs.exerciseIds, ...rehab.preferredExerciseIds])
  );
  const rehabWithStory = {
    ...rehab,
    preferredStretchIds,
    preferredExerciseIds,
    preferTags: Array.from(new Set([...rehab.preferTags, ...storyPrefs.boostTags])),
    avoidTags: Array.from(new Set([...rehab.avoidTags, ...storyPrefs.avoidTags])),
    evidenceNotes: [
      ...storyPrefs.reasonLines,
      ...rehab.evidenceNotes,
    ].slice(0, 12),
    summaryLines: [
      ...(storyPrefs.reasonLines[0] ? [storyPrefs.reasonLines[0]] : []),
      ...rehab.summaryLines,
    ].slice(0, 10),
  };

  // Merge program biases: descriptors + conditions + adjectives + safety + ADLs + symptoms + story
  const mergedBiases = Array.from(
    new Set([
      ...descHints.biases,
      ...condHints.biases,
      ...adj.programBiases,
      ...(safety.programBiases as ProgramBias[]),
      ...((sxSummary?.programBiases || []) as ProgramBias[]),
    ])
  ) as ProgramBias[];
  const extraBiases = new Set<string>([
    ...(safety.programBiases || []),
    ...(adlSummary?.programBiases || []),
    ...(sxSummary?.extraBiases || []),
  ]);
  const mergedAvoid = Array.from(
    new Set([
      ...descHints.avoidTags,
      ...condHints.avoidTags,
      ...adj.avoidTags,
      ...safety.avoidTags,
      ...rehabWithStory.avoidTags,
      ...(storyIntel?.planHints.avoidTags || []),
    ])
  );
  // Evidence-based rehab dynamics (tissue stage, prognosis framing, realistic seeds)
  // Replaces the removed PhysioPath multi-phase program builder.
  const dynamics = buildRehabDynamics({
    input: {
      ...input,
      areas: input.areas.length ? input.areas : storyAreas,
      painDescriptorIds,
      conditionIds,
    },
    rehab: rehabWithStory,
    storyIntel,
  });
  // Merge dynamics into rehab plan used for scoring + session composition
  Object.assign(rehabWithStory, applyDynamicsToRehabPlan(rehabWithStory, dynamics));

  // Sports, surgery timeline, activity level
  const sports = (input.sportIds || [])
    .map((id) => getSportById(id))
    .filter(Boolean);
  const surgery = input.surgeryId ? getSurgeryById(input.surgeryId) : undefined;
  const postOpWeeks = weeksSinceSurgery(input.surgeryDate);
  const activityLevel = getActivityLevel(input.activityLevel);
  // Early post-op: force protective bias when within typical protect window
  const earlyPostOp = Boolean(
    surgery &&
      postOpWeeks != null &&
      postOpWeeks < (surgery.protectWeeksTypical || 6)
  );
  const latePhase = buildSportLatePhaseProgram({
    sportIds: input.sportIds,
    irritability: storyIntel?.irritability,
    earlyPostOp,
    protective:
      storyIntel?.activityResponse === "delayed-worse" ||
      storyIntel?.irritability === "high" ||
      earlyPostOp,
  });
  // Seed sport-specific late-phase movements into HEP composition
  if (latePhase) {
    for (const id of latePhase.preferredStretchIds) {
      if (!rehabWithStory.preferredStretchIds.includes(id)) {
        rehabWithStory.preferredStretchIds.push(id);
      }
    }
    for (const id of latePhase.preferredExerciseIds) {
      if (!rehabWithStory.preferredExerciseIds.includes(id)) {
        rehabWithStory.preferredExerciseIds.push(id);
      }
    }
    for (const line of latePhase.evidenceLines) {
      if (!rehabWithStory.evidenceNotes.includes(line)) {
        rehabWithStory.evidenceNotes.push(line);
      }
    }
  }
  const vitalsHints =
    typeof window !== "undefined" ? vitalsPlanHints() : null;
  const labHints =
    typeof window !== "undefined"
      ? labsPlanHints(undefined, input.sex)
      : null;
  const sportPrefer = [
    ...sports.flatMap((s) => s!.preferTags),
    ...(latePhase?.preferTags || []),
  ];
  const surgeryPrefer = surgery?.preferTags || [];
  const surgeryAvoid = surgery?.avoidTags || [];
  const activityPrefer = activityLevel?.preferTags || [];

  const mergedPrefer = Array.from(
    new Set([
      ...descHints.preferTags,
      ...condHints.preferTags,
      ...adj.preferTags,
      ...safety.preferTags,
      ...rehabWithStory.preferTags,
      ...(storyIntel?.planHints.preferTags || []),
      ...(sleepCorr?.preferTags || []),
      ...sportPrefer,
      ...surgeryPrefer,
      ...activityPrefer,
      ...dynamics.preferTags,
      ...(earlyPostOp ? ["gentle", "protected", "walking"] : []),
      ...(homeBased ? ["home", "minimal-equipment", "chair", "wall"] : []),
    ])
  );
  // Merge surgery / sport / vitals / labs / dynamics avoid tags
  for (const t of [
    ...surgeryAvoid,
    ...(latePhase?.avoidTags || []),
    ...(vitalsHints?.avoidTags || []),
    ...(labHints?.avoidTags || []),
    ...dynamics.avoidTags,
  ]) {
    if (!mergedAvoid.includes(t)) mergedAvoid.push(t);
  }
  if (earlyPostOp) {
    for (const t of ["plyo", "impact", "heavy-load", "jump"]) {
      if (!mergedAvoid.includes(t)) mergedAvoid.push(t);
    }
  }

  const rank = { beginner: 1, intermediate: 2, advanced: 3 };
  const pickMaxDiff = (...opts: (Difficulty | undefined)[]): Difficulty | undefined => {
    let best: Difficulty | undefined;
    for (const d of opts) {
      if (!d) continue;
      if (!best || rank[d] < rank[best]) best = d;
    }
    return best;
  };

  const combinedHints = {
    ...descHints,
    effectivePainBoost:
      descHints.effectivePainBoost +
      condHints.effectivePainBoost +
      adj.irritabilityBoost +
      (sxSummary?.irritabilityBoost ?? 0) +
      (sleepCorr?.irritabilityBoost ?? 0),
    biases: mergedBiases,
    avoidTags: mergedAvoid,
    preferTags: mergedPrefer,
    stretchBias:
      (descHints.stretchBias +
        condHints.stretchBias +
        adj.stretchBias +
        (sxSummary?.stretchBias ?? 0)) /
      3,
    exerciseBias:
      (descHints.exerciseBias +
        condHints.exerciseBias +
        adj.exerciseBias +
        (sxSummary?.exerciseBias ?? 0)) /
      3,
    redFlags: [
      ...descHints.redFlags,
      ...condHints.redFlags,
      ...safety.redFlags,
      ...(sxSummary?.redFlags || []),
    ],
    maxDifficulty: pickMaxDiff(
      descHints.maxDifficulty,
      condHints.maxDifficulty,
      adj.maxDifficulty,
      safety.maxDifficulty,
      adlSummary?.maxDifficulty,
      sxSummary?.maxDifficulty,
      rehabWithStory.maxDifficulty,
      storyIntel?.planHints.maxDifficulty,
      sleepCorr?.maxDifficulty
    ),
    preferKinds: descHints.preferKinds,
  };

  const areaSet = new Set<BodyPart>(
    input.areas.length
      ? input.areas
      : storyIntel?.regions?.length
        ? storyIntel.regions
        : parsed?.areas ?? ["full-body"]
  );
  condHints.bodyParts.forEach((bp) => areaSet.add(bp));
  for (const p of safety.precautions) {
    p.bodyPartsHint?.forEach((bp) => areaSet.add(bp));
  }
  rehabWithStory.priorityAreas.forEach((bp) => areaSet.add(bp));
  storyIntel?.regions?.forEach((bp) => areaSet.add(bp));
  // Injury-priority + free-text story regions first (Describe Your Issue primary)
  const areas = Array.from(
    new Set([
      ...rehabWithStory.priorityAreas,
      ...(storyIntel?.regions || []),
      ...Array.from(areaSet),
    ])
  ) as BodyPart[];

  const symptoms = input.symptoms.length
    ? input.symptoms
    : [
        ...(parsed?.symptoms ?? []),
        ...(storyIntel?.sensory || []),
        ...(storyIntel?.aggravators.map((a) => `aggravated by ${a}`) || []),
      ];
  const goals = input.goals.length
    ? input.goals
    : [
        ...(parsed?.goals ?? []),
        ...(storyIntel?.planHints.functionalGoals || []),
        ...(storyIntel?.goals || []),
        ...sports.map((s) => `Return toward ${s!.name}`),
      ].filter(Boolean);
  if (surgery) {
    goals.push(
      surgeryPhaseLabel(postOpWeeks, surgery)
    );
  }
  const rawAvg =
    areas.reduce(
      (sum, a) =>
        sum + (input.painLevels[a] ?? storyIntel?.painNow ?? parsed?.estimatedPain ?? 3),
      0
    ) / Math.max(areas.length, 1);
  const avgPain = Math.min(
    10,
    rawAvg +
      combinedHints.effectivePainBoost +
      (storyIntel?.irritability === "high" ? 1.2 : storyIntel?.irritability === "low" ? -0.4 : 0)
  );

  let difficulty = input.difficulty;
  if (combinedHints.maxDifficulty) {
    if (rank[combinedHints.maxDifficulty] < rank[difficulty]) {
      difficulty = combinedHints.maxDifficulty;
    }
  }
  if (rank[rehabWithStory.maxDifficulty] < rank[difficulty]) {
    difficulty = rehabWithStory.maxDifficulty;
  }
  if (
    storyIntel?.planHints.maxDifficulty &&
    rank[storyIntel.planHints.maxDifficulty] < rank[difficulty]
  ) {
    difficulty = storyIntel.planHints.maxDifficulty;
  }
  if (avgPain >= 6 || condHints.clearanceRequired) difficulty = "beginner";
  if (storyIntel?.irritability === "high" || storyIntel?.redFlagHints.length)
    difficulty = "beginner";
  if (safety.programBiases.includes("sternal-precautions")) difficulty = "beginner";
  if (safety.programBiases.includes("nwb") || safety.programBiases.includes("ttwb"))
    difficulty = "beginner";
  if (sxSummary?.redFlags.length || sxSummary?.maxDifficulty === "beginner")
    difficulty = "beginner";
  if (adlSummary?.maxDifficulty === "beginner") difficulty = "beginner";
  if (earlyPostOp || surgery?.maxDifficulty === "beginner") difficulty = "beginner";
  if (vitalsHints?.caution || labHints?.critical) difficulty = "beginner";
  // Tissue-stage protect caps difficulty
  if (rank[dynamics.maxDifficulty] < rank[difficulty]) {
    difficulty = dynamics.maxDifficulty;
  }
  if (
    dynamics.tissueStage === "inflammatory" ||
    dynamics.tissueStage === "post-op-protect"
  ) {
    difficulty = "beginner";
  }

  // Fold clinical symptom labels into free-text symptom chips for scoring
  const symptomLabels = Array.from(
    new Set([
      ...symptoms,
      ...(sxSummary?.labels || []),
      ...(storyIntel?.functionalLimits || []),
      ...(adlSummary?.limitedCount
        ? adlEntries
            .filter((e) => e.assistance !== "independent")
            .map((e) => e.label)
        : []),
    ])
  );

  const merged: SymptomInput = {
    ...input,
    areas,
    symptoms: symptomLabels,
    goals,
    difficulty,
    painDescriptorIds,
    conditionIds,
    clinicalSymptomIds,
    adlEntries,
    painLevels: {
      ...Object.fromEntries(areas.map((a) => [a, input.painLevels[a] ?? parsed?.estimatedPain ?? 3])),
      ...input.painLevels,
    },
  };

  const prefer: MovementKind[] =
    input.preferKinds && input.preferKinds !== "auto"
      ? input.preferKinds
      : storyIntel?.planHints.preferKinds?.length
        ? storyIntel.planHints.preferKinds
        : rehabWithStory.preferKinds?.length
          ? rehabWithStory.preferKinds
          : combinedHints.preferKinds !== "auto" && Array.isArray(combinedHints.preferKinds)
            ? combinedHints.preferKinds
            : condHints.preferKinds !== "auto"
              ? condHints.preferKinds
              : descHints.preferKinds !== "auto"
                ? descHints.preferKinds
                : parsed?.preferKinds && parsed.preferKinds !== "auto"
                  ? parsed.preferKinds
                  : (["stretch", "exercise"] as MovementKind[]);

  const stretchCandidates = BASE_STRETCHES.filter((s) => {
    if (!rankOk(s.difficulty, difficulty, avgPain)) return false;
    const blob = `${s.name} ${s.tags.join(" ")}`.toLowerCase();
    for (const t of mergedAvoid) {
      if (t === "all") return false;
      if (blob.includes(t) || s.tags.includes(t)) return false;
    }
    return true;
  })
    .map((s) => ({
      s,
      score: scoreMovement(
        s.bodyParts,
        s.tags,
        s.name,
        s.benefits,
        merged,
        Math.max(...s.bodyParts.map((bp) => merged.painLevels[bp] ?? avgPain), 0),
        "stretch",
        combinedHints,
        rehabWithStory,
        s.id,
        storyIntel,
        storyPrefs,
        dynamics
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const exerciseCandidates = BASE_EXERCISES.filter((e) => {
    if (!rankOk(e.difficulty, difficulty, avgPain)) return false;
    // Safety: drop high-load / impact when precautions demand
    const blob = `${e.name} ${e.tags.join(" ")}`.toLowerCase();
    for (const t of mergedAvoid) {
      if (t === "all") return false;
      if (blob.includes(t) || e.tags.includes(t)) return false;
    }
    if (
      (safety.programBiases.includes("no-ue-load") ||
        safety.programBiases.includes("sternal-precautions")) &&
      (e.tags.includes("push") ||
        e.tags.includes("pull") ||
        blob.includes("push") ||
        blob.includes("plank") ||
        blob.includes("row"))
    ) {
      return false;
    }
    if (
      (safety.programBiases.includes("nwb") ||
        safety.programBiases.includes("ttwb") ||
        safety.programBiases.includes("tdwb")) &&
      (e.tags.includes("single-leg") ||
        blob.includes("lunge") ||
        blob.includes("squat") ||
        blob.includes("jump") ||
        blob.includes("step"))
    ) {
      return false;
    }
    if (
      safety.programBiases.includes("no-core-strain") &&
      (blob.includes("crunch") || blob.includes("sit-up") || blob.includes("plank"))
    ) {
      return false;
    }
    // ADLs / symptoms: prefer lower impact when fall risk or seated program
    if (
      (extraBiases.has("fall-prevention") || extraBiases.has("seated-program")) &&
      (e.tags.includes("single-leg") ||
        blob.includes("jump") ||
        blob.includes("hop") ||
        blob.includes("run") ||
        blob.includes("plyo"))
    ) {
      return false;
    }
    if (
      extraBiases.has("seated-program") &&
      (blob.includes("standing balance") || blob.includes("tandem"))
    ) {
      return false;
    }
    return true;
  })
    .map((e) => ({
      e,
      score: scoreMovement(
        e.bodyParts,
        e.tags,
        e.name,
        e.benefits,
        merged,
        Math.max(...e.bodyParts.map((bp) => merged.painLevels[bp] ?? avgPain), 0),
        "exercise",
        combinedHints,
        rehabWithStory,
        e.id,
        storyIntel,
        storyPrefs,
        dynamics
      ),
    }))
    .sort((a, b) => b.score - a.score);

  let minutes = 0;
  let target = Math.max(8, Math.min(45, input.availableMinutes));
  target = Math.round(
    target *
      safety.minutesScale *
      adj.minutesScale *
      rehabWithStory.minutesScale *
      dynamics.minutesScale *
      (storyIntel?.planHints.minutesScale ?? 1) *
      (adlSummary?.minutesScale ?? 1) *
      (sxSummary?.minutesScale ?? 1) *
      (sleepCorr?.minutesScale ?? 1) *
      (surgery?.minutesScale ?? 1) *
      (activityLevel?.minutesScale ?? 1) *
      (vitalsHints?.minutesScale ?? 1) *
      (labHints?.minutesScale ?? 1) *
      (earlyPostOp ? 0.85 : 1)
  );
  if (
    combinedHints.biases.includes("short-volume") ||
    extraBiases.has("short-volume") ||
    extraBiases.has("seated-program")
  ) {
    target = Math.min(target, Math.max(8, Math.round(target * 0.7)));
  }
  if (
    combinedHints.biases.includes("defer-to-provider") ||
    condHints.clearanceRequired ||
    (sxSummary?.redFlags.length ?? 0) > 0
  ) {
    target = Math.min(target, 10);
  }
  // Delayed flare / poor sleep → cap realistic home volume
  if (storyIntel?.activityResponse === "delayed-worse") {
    target = Math.min(target, Math.max(8, Math.round(target * 0.7)));
  }
  target = Math.max(6, Math.min(40, target));

  const wantStretch = prefer.includes("stretch");
  // Only suppress exercises for true post-op / defer-to-provider clearance — not soft free-text matches
  const hardClearance =
    combinedHints.biases.includes("defer-to-provider") ||
    safety.programBiases.includes("lvad") ||
    (condHints.clearanceRequired &&
      (rehabWithStory.patterns.includes("post-op-conservative") ||
        /surgery|post-?op|replacement|fusion|s\/p/i.test(input.concernParagraph || "")));
  const wantExercise = prefer.includes("exercise") && !hardClearance;

  // —— PT-style session composition (warm-up → mobility → control → function → cool-down) ——
  // Ensure preferred library IDs are always eligible even if global score rank is low
  const stretchById = new Map(BASE_STRETCHES.map((s) => [s.id, s]));
  const exerciseById = new Map(BASE_EXERCISES.map((e) => [e.id, e]));
  const stretchRefs: MovementCatalogRef[] = [];
  const seenStretch = new Set<string>();
  const pushStretchRef = (s: (typeof BASE_STRETCHES)[0] | undefined) => {
    if (!s || seenStretch.has(s.id)) return;
    if (!rankOk(s.difficulty, difficulty, avgPain)) return;
    const blob = `${s.name} ${s.tags.join(" ")}`.toLowerCase();
    if (mergedAvoid.some((t) => t !== "all" && (blob.includes(t) || s.tags.includes(t)))) return;
    seenStretch.add(s.id);
    stretchRefs.push({
      id: s.id,
      kind: "stretch",
      name: s.name,
      tags: s.tags,
      bodyParts: s.bodyParts,
      durationSeconds: s.durationSeconds,
    });
  };
  for (const id of rehabWithStory.preferredStretchIds) pushStretchRef(stretchById.get(id));
  for (const { s } of stretchCandidates) pushStretchRef(s);

  const exerciseRefs: MovementCatalogRef[] = [];
  const seenEx = new Set<string>();
  const pushExRef = (e: (typeof BASE_EXERCISES)[0] | undefined) => {
    if (!wantExercise || !e || seenEx.has(e.id)) return;
    if (!rankOk(e.difficulty, difficulty, avgPain)) return;
    const blob = `${e.name} ${e.tags.join(" ")}`.toLowerCase();
    if (mergedAvoid.some((t) => t !== "all" && (blob.includes(t) || e.tags.includes(t)))) return;
    seenEx.add(e.id);
    exerciseRefs.push({
      id: e.id,
      kind: "exercise",
      name: e.name,
      tags: e.tags,
      bodyParts: e.bodyParts,
      durationSeconds: e.durationSeconds,
    });
  };
  for (const id of rehabWithStory.preferredExerciseIds) pushExRef(exerciseById.get(id));
  for (const { e } of exerciseCandidates) pushExRef(e);

  const composed = composePtSession({
    phase: rehabWithStory.phase,
    patterns: rehabWithStory.patterns,
    priorityAreas: rehabWithStory.priorityAreas,
    stretchCandidates: wantStretch ? stretchRefs : stretchRefs.slice(0, 3),
    exerciseCandidates: exerciseRefs,
    preferredStretchIds: wantStretch ? rehabWithStory.preferredStretchIds : [],
    preferredExerciseIds: wantExercise ? rehabWithStory.preferredExerciseIds : [],
    minutesTarget: target,
    avoidTags: mergedAvoid,
    functionalLimits: storyIntel?.functionalLimits,
    occupationNotes:
      storyIntel?.occupation?.source === "stated"
        ? storyIntel.occupation.sessionNotes
        : undefined,
  });

  const items: RoutineItem[] = [];
  const stretchIds: string[] = [];
  const exerciseIds: string[] = [];

  for (const slot of composed.orderedIds) {
    // Prefer completing a balanced HEP (at least 1 exercise when available) over hard minute cut
    if (minutes >= target && items.length >= 6 && exerciseIds.length > 0) break;
    if (slot.kind === "stretch") {
      const s = BASE_STRETCHES.find((x) => x.id === slot.id);
      if (!s || stretchIds.includes(s.id)) continue;
      if (!rankOk(s.difficulty, difficulty, avgPain)) continue;
      items.push(toItem(s.id, "stretch", homeVarFor("stretch", s.id, homeBased)));
      stretchIds.push(s.id);
      minutes += s.durationSeconds / 60;
    } else {
      const e = BASE_EXERCISES.find((x) => x.id === slot.id);
      if (!e || exerciseIds.includes(e.id)) continue;
      if (!rankOk(e.difficulty, difficulty, avgPain)) continue;
      items.push(toItem(e.id, "exercise", homeVarFor("exercise", e.id, homeBased)));
      exerciseIds.push(e.id);
      minutes += e.durationSeconds / 60;
    }
  }

  // Safety net: ensure ≥1 exercise when scoring allows (PT HEPs are not stretch-only unless forced)
  if (wantExercise && exerciseIds.length === 0) {
    // Prefer any eligible preferred exercise, then top-scored — ignore soft score gaps
    for (const id of rehabWithStory.preferredExerciseIds) {
      const e = exerciseById.get(id);
      if (!e) continue;
      // Soften rank gate for safety-net so beginner HEPs always get activation/function
      const painGate = Math.min(avgPain, 5.5);
      if (!rankOk(e.difficulty, difficulty, painGate) && e.difficulty !== "beginner") continue;
      const blob = `${e.name} ${e.tags.join(" ")}`.toLowerCase();
      if (mergedAvoid.some((t) => t !== "all" && t.length > 2 && (blob.includes(t) || e.tags.includes(t))))
        continue;
      items.push(toItem(e.id, "exercise", homeVarFor("exercise", e.id, homeBased)));
      exerciseIds.push(e.id);
      minutes += e.durationSeconds / 60;
      if (exerciseIds.length >= 2) break;
    }
    if (exerciseIds.length === 0) {
      for (const { e } of exerciseCandidates) {
        if (exerciseIds.includes(e.id)) continue;
        items.push(toItem(e.id, "exercise", homeVarFor("exercise", e.id, homeBased)));
        exerciseIds.push(e.id);
        minutes += e.durationSeconds / 60;
        if (exerciseIds.length >= 2) break;
      }
    }
  }

  // Safety net: if session still thin, fill mobility from top-scored stretches
  if (items.length < 4) {
    for (const { s } of stretchCandidates) {
      if (stretchIds.includes(s.id) || items.length >= 8) break;
      items.push(toItem(s.id, "stretch", homeVarFor("stretch", s.id, homeBased)));
      stretchIds.push(s.id);
      minutes += s.durationSeconds / 60;
    }
  }

  // Final clinical order (handles safety-net fill)
  const catalogForOrder: MovementCatalogRef[] = [
    ...BASE_STRETCHES.map((s) => ({
      id: s.id,
      kind: "stretch" as const,
      name: s.name,
      tags: s.tags,
      bodyParts: s.bodyParts,
      durationSeconds: s.durationSeconds,
    })),
    ...BASE_EXERCISES.map((e) => ({
      id: e.id,
      kind: "exercise" as const,
      name: e.name,
      tags: e.tags,
      bodyParts: e.bodyParts,
      durationSeconds: e.durationSeconds,
    })),
  ];
  const orderedItems = reorderItemsLikePtSession(
    items,
    catalogForOrder,
    rehabWithStory.phase
  );
  items.length = 0;
  items.push(...orderedItems);
  // Rebuild id lists in final order
  stretchIds.length = 0;
  exerciseIds.length = 0;
  minutes = 0;
  for (const it of items) {
    if (it.kind === "stretch") stretchIds.push(it.movementId);
    else exerciseIds.push(it.movementId);
    const m =
      it.kind === "stretch"
        ? BASE_STRETCHES.find((x) => x.id === it.movementId)
        : BASE_EXERCISES.find((x) => x.id === it.movementId);
    minutes += (m?.durationSeconds || 90) / 60;
  }

  const descDetail =
    painDescriptorIds.length > 0
      ? ` Descriptors: ${descHints.summaryLines.slice(0, 6).join("; ")}.`
      : "";
  const condDetail =
    conditionIds.length > 0
      ? ` Clinical conditions: ${condHints.summaryLines.slice(0, 6).join("; ")}.`
      : "";
  const adjDetail =
    adj.summaryLines.length > 0
      ? ` Language analysis: ${adj.summaryLines.slice(0, 6).join("; ")}.`
      : "";
  const safetyDetail =
    safety.summaryLines.length > 0 ? ` Safety: ${safety.summaryLines.join(" · ")}.` : "";
  const subcatDetail =
    condHints.subcategories.length > 0
      ? ` Sub-categories: ${condHints.subcategories.slice(0, 5).join(", ")}.`
      : "";
  const outcomeDetail =
    (rehabWithStory.outcomeFocus.length || condHints.clinicalOutcomes.length) > 0
      ? ` Target outcomes: ${[
          ...rehabWithStory.outcomeFocus.slice(0, 3),
          ...condHints.clinicalOutcomes.slice(0, 3).map((o) => o.label),
        ]
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 5)
          .join("; ")}.`
      : "";
  const rehabDetail = ` Rehab phase: ${rehabWithStory.summaryLines.join(" · ")}. PT session order: ${composed.blueprintNarrative.join(" → ")}.`;
  const evidenceIntel =
    rehabWithStory.evidenceNotes.length > 0
      ? ` Evidence-informed dosing: ${[
          ...rehabWithStory.evidenceNotes.slice(0, 3),
          ...composed.dosingNotes.slice(0, 2),
        ].join(" ")}`
      : ` Dosing: ${composed.dosingNotes.slice(0, 2).join(" ")}`;
  const biasDetail = combinedHints.biases.length
    ? ` Program biases: ${combinedHints.biases.slice(0, 8).join(", ")}.`
    : "";
  const rfDetail = combinedHints.redFlags.length
    ? ` Safety notes from screening—seek licensed care if red flags apply.`
    : "";
  const clearanceDetail = condHints.clearanceRequired
    ? ` Clearance-sensitive condition(s): volume/intensity capped; follow surgeon/physician/PT guidance.`
    : "";
  const homeDetail = homeBased
    ? ` Home-based program ON: chair/wall/floor/minimal-equipment variations preferred.`
    : "";
  const hrDetail =
    safety.maxHr != null
      ? ` Age ${safety.ageYears}: est. HRmax ${safety.maxHr} bpm; Borg ${safety.borg.label}; suggested HR cap ~${safety.targetHrCap} bpm.`
      : ` Borg target: ${safety.borg.label}.`;
  const evidenceDetail =
    condHints.clinicalOutcomes[0] != null
      ? ` Evidence framing: ${condHints.clinicalOutcomes[0].evidenceNote}`
      : evidenceIntel;

  const sleepDetail = sleepCorr?.hasData
    ? ` Sleep PSQI ${sleepCorr.global}/21 (${sleepCorr.bandLabel}) → minutes scale ×${sleepCorr.minutesScale.toFixed(2)}.`
    : "";
  const storyDetail = storyPrefs.reasonLines.length
    ? ` Story→movement: ${storyPrefs.reasonLines.slice(0, 2).join(" ")}`
    : "";

  const dynamicsDetail = dynamics.summaryLines.length
    ? ` Rehab dynamics: ${dynamics.summaryLines.join(" · ")}.`
    : "";
  const prognosisDetail = dynamics.prognosisLines[0]
    ? ` Outlook education: ${dynamics.prognosisLines[0]}`
    : "";

  const adjustment: RoutineAdjustment = {
    at: new Date().toISOString(),
    reason: `Evidence-informed ${rehabWithStory.phase} HEP (${dynamics.tissueStage} tissue stage; ${dynamics.prognosisBand} outlook framing) from story, injury patterns (${rehabWithStory.patterns.join(", ")}), conditions, and irritability-based dosing${storyPrefs.stretchIds.length || storyPrefs.exerciseIds.length ? "; story-seeded functional movements" : ""}`,
    painFactor: avgPain,
    action:
      combinedHints.biases.includes("defer-to-provider") ||
      condHints.clearanceRequired ||
      avgPain >= 6 ||
      safety.programBiases.includes("nwb") ||
      rehabWithStory.phase === "protect-calm" ||
      dynamics.tissueStage === "inflammatory" ||
      dynamics.tissueStage === "post-op-protect" ||
      storyIntel?.activityResponse === "delayed-worse"
        ? "regress"
        : avgPain >= 4
          ? "modify"
          : avgPain <= 2 && storyIntel?.irritability === "low"
            ? "progress"
            : "hold",
    details:
      (avgPain >= 6 || storyIntel?.irritability === "high"
        ? "High irritability: protected ROM + low-load motor control; short volume most days; no aggressive end-range."
        : avgPain >= 4
          ? "Moderate irritability: targeted mobility + activation with mid volume; progress only if 24h response stays green."
          : "Lower irritability: maintain mobility, progress motor control and functional capacity with warm-up/cool-down structure.") +
      rehabDetail +
      dynamicsDetail +
      prognosisDetail +
      hrDetail +
      descDetail +
      condDetail +
      adjDetail +
      safetyDetail +
      subcatDetail +
      outcomeDetail +
      biasDetail +
      rfDetail +
      clearanceDetail +
      homeDetail +
      sleepDetail +
      storyDetail +
      evidenceDetail +
      evidenceIntel,
    source: "safety",
  };

  const kindsLabel = [
    wantStretch ? "stretches" : null,
    wantExercise ? "exercises" : null,
  ]
    .filter(Boolean)
    .join(" + ");

  const primaryRegion =
    rehabWithStory.priorityAreas[0] || areas[0] || "full-body";
  const patternLabel = rehabWithStory.patterns
    .slice(0, 2)
    .map((p) => p.replace(/-/g, " "))
    .join(" · ");

  return {
    id: uuid(),
    userId,
    name:
      primaryRegion === "full-body"
        ? `${kindsLabel} · ${rehabWithStory.phase.replace(/-/g, " ")}`
        : `${primaryRegion.replace(/-/g, " ")}: ${patternLabel || kindsLabel}`,
    description: [
      `Outpatient-style HEP for “${rehabWithStory.phase.replace(/-/g, " ")}” with tissue-stage dosing (${dynamics.tissueStage.replace(/-/g, " ")}) — not a random stretch list.`,
      dynamics.prognosisLines[0] || null,
      storyIntel
        ? `From your story: ${
            storyIntel.irritability !== "unknown"
              ? `${storyIntel.irritability} irritability`
              : "irritability not assumed"
          }${
            storyIntel.activityResponse !== "unknown"
              ? `, activity ${storyIntel.activityResponse}`
              : ""
          }${
            storyIntel.functionalLimits.length
              ? `; function: ${storyIntel.functionalLimits.slice(0, 3).join(", ")}`
              : ""
          }${storyIntel.painNow != null ? `; pain ${storyIntel.painNow}/10` : ""}.`
        : null,
      storyPrefs.reasonLines[0] || null,
      `Priority regions: ${rehabWithStory.priorityAreas
        .slice(0, 4)
        .map((a) => a.replace(/-/g, " "))
        .join(", ")}.`,
      `Session order: warm-up → target mobility → motor control → functional/capacity → cool-down (${items.length} movements, ~${Math.max(1, Math.round(minutes))} min).`,
      composed.dosingNotes[0] || null,
      medSummary
        ? `Includes ${userMeds.length} medication(s)${
            medSummary.bleedingRisk ? "; bleeding-risk → fall prevention bias" : ""
          }${medSummary.hrBlunting ? "; beta-blocker → prefer Borg/RPE over HR" : ""}.`
        : null,
      homeBased ? "Home-friendly variations preferred." : null,
      sleepCorr?.hasData
        ? `Sleep PSQI ${sleepCorr.global}/21 correlated into volume/recovery dosing.`
        : null,
      "Ranked by story intelligence, injury/condition protocols, medical history, safety precautions, and irritability-based load management for functional mobility and pain control.",
    ]
      .filter(Boolean)
      .join(" "),
    focusAreas: areas,
    stretchIds,
    exerciseIds,
    items,
    estimatedMinutes: Math.max(1, Math.round(minutes)),
    difficulty: avgPain >= 5 ? "beginner" : difficulty,
    isPersonalized: true,
    homeBasedProgram: homeBased,
    generatedFrom: {
      symptoms,
      areas,
      painLevels: merged.painLevels,
      goals,
      concernParagraph: input.concernParagraph,
      suggestedKinds: prefer,
      painDescriptorIds,
      descriptorSummary: descHints.summaryLines,
      conditionIds,
      conditionSummary: condHints.summaryLines,
      conditionCategories: condHints.categories,
      conditionSubcategories: condHints.subcategories,
      ageYears: safety.ageYears,
      maxHr: safety.maxHr,
      targetHrCap: safety.targetHrCap,
      borgTargetId: safety.borg.id,
      borgLabel: safety.borg.label,
      precautionIds: safety.precautionIds,
      implantIds: safety.implantIds,
      orthoticIds: safety.orthoticIds,
      prostheticIds: safety.prostheticIds,
      assistiveDeviceIds: safety.assistiveDeviceIds,
      suggestedAssistiveDeviceIds: safety.suggestedAssistiveDeviceIds,
      safetySummary: [
        ...(storyIntel?.liveReadLines || []),
        ...dynamics.summaryLines,
        ...rehabWithStory.summaryLines,
        ...safety.summaryLines,
      ].slice(0, 18),
      safetyEducation: [
        {
          title: "Injury dynamics & recovery framing",
          body: dynamics.summaryLines.join(" · "),
          bullets: [
            ...dynamics.evidenceLines.slice(0, 4),
            ...dynamics.prognosisLines.slice(0, 2),
            `Preferred stage tags: ${dynamics.preferTags.slice(0, 6).join(", ") || "—"}`,
          ].filter(Boolean).slice(0, 10),
        },
        {
          title: "Evidence-informed PT session blueprint",
          body: composed.blueprintNarrative.join(" → "),
          bullets: [
            ...composed.dosingNotes.slice(0, 3),
            ...rehabWithStory.evidenceNotes.slice(0, 5),
          ].slice(0, 8),
        },
        ...(storyIntel
          ? [
              {
                title: "From your free-text story",
                body: storyIntel.coachSummary,
                bullets: [
                  ...storyPrefs.reasonLines.slice(0, 4),
                  ...storyIntel.planHints.evidenceLines.slice(0, 3),
                  ...(storyIntel.aggravators.length
                    ? [`Aggravators: ${storyIntel.aggravators.slice(0, 5).join(", ")}`]
                    : []),
                  ...(storyIntel.functionalLimits.length
                    ? [`Function: ${storyIntel.functionalLimits.slice(0, 5).join(", ")}`]
                    : []),
                ],
              },
            ]
          : []),
        ...safety.educationBlocks.slice(0, 16),
      ],
      protocolNotes: input.protocolNotes,
      adjectiveHits: adj.wordsFound,
      adjectiveSummary: [
        ...adj.summaryLines,
        ...storyPrefs.reasonLines,
        ...(storyIntel?.planHints.evidenceLines || []),
        ...rehabWithStory.evidenceNotes,
      ].slice(0, 14),
      // Clinical outcome targets: conditions + injury-pattern outcomes
      // (prefer condition-specific evidence when present)
      clinicalOutcomes: (
        condHints.clinicalOutcomes.length
          ? condHints.clinicalOutcomes
          : rehabWithStory.outcomeFocus.map((label) => ({
              label,
              evidenceNote:
                "Educational functional outcome framing used in outpatient HEP progress tracking.",
              timeframe: "Often 2–6 weeks of consistent, tolerable practice",
              measureHint: "Track a patient-specific daily task (0–10 ease).",
            }))
      ).slice(0, 10),
      homeBasedProgram: homeBased,
      medications: userMeds.slice(0, 20),
      medicationSummary: medSummary?.summaryLines,
      medicationFlags: medSummary
        ? {
            bleedingRisk: medSummary.bleedingRisk,
            fallSedationRisk: medSummary.fallSedationRisk,
            hrBlunting: medSummary.hrBlunting,
            hypoRisk: medSummary.hypoRisk,
            tendonCaution: medSummary.tendonCaution,
            steroidExposure: medSummary.steroidExposure,
          }
        : undefined,
      clinicalSymptomIds,
      clinicalSymptomSummary: sxSummary?.summaryLines,
      clinicalSymptomSuggestions: sxSummary?.suggestions?.slice(0, 8),
      adlEntries: adlEntries.slice(0, 20),
      adlSummary: adlSummary?.summaryLines,
      adlCoachingTips: adlSummary?.coachingTips,
      sex: input.sex,
      pastMedicalHistory: input.pastMedicalHistory,
      currentMedicalHistory: input.currentMedicalHistory,
      // Evidence-based rehab dynamics (replaces PhysioPath program builder)
      rehabDynamics: {
        tissueStage: dynamics.tissueStage,
        phase: dynamics.phase,
        prognosisBand: dynamics.prognosisBand,
        summaryLines: dynamics.summaryLines,
        evidenceLines: dynamics.evidenceLines,
        prognosisLines: dynamics.prognosisLines,
        weeksSince: dynamics.weeksSince,
        postOpWeeks: dynamics.postOpWeeks ?? undefined,
      },
    },
    selfAdjustHistory: [adjustment],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rotationCount: 0,
  };
}

/** Rotate a single item to a clinical alternative for same body regions */
export function rotateRoutineItem(routine: Routine, itemId: string): Routine {
  const items = routine.items.map((item) => {
    if (item.id !== itemId) return item;
    if (item.kind === "stretch") {
      const current = getStretchById(item.movementId);
      const pool = BASE_STRETCHES.filter(
        (s) =>
          s.id !== item.movementId &&
          (!current || s.bodyParts.some((bp) => current.bodyParts.includes(bp)))
      );
      const next = pool[(item.rotationSeed ?? 0) % Math.max(pool.length, 1)] ?? current;
      if (!next) return item;
      return {
        ...item,
        movementId: next.id,
        rotationSeed: (item.rotationSeed ?? 0) + 1,
        notes: `Rotated from previous stretch for variety/tolerance`,
      };
    }
    const current = getExerciseById(item.movementId);
    const pool = BASE_EXERCISES.filter(
      (e) =>
        e.id !== item.movementId &&
        (!current || e.bodyParts.some((bp) => current.bodyParts.includes(bp)))
    );
    const next = pool[(item.rotationSeed ?? 0) % Math.max(pool.length, 1)] ?? current;
    if (!next) return item;
    return {
      ...item,
      movementId: next.id,
      rotationSeed: (item.rotationSeed ?? 0) + 1,
      notes: `Rotated from previous exercise for variety/tolerance`,
    };
  });

  const stretchIds = items.filter((i) => i.kind === "stretch").map((i) => i.movementId);
  const exerciseIds = items.filter((i) => i.kind === "exercise").map((i) => i.movementId);

  return {
    ...routine,
    items,
    stretchIds,
    exerciseIds,
    updatedAt: new Date().toISOString(),
    selfAdjustHistory: [
      ...routine.selfAdjustHistory,
      {
        at: new Date().toISOString(),
        reason: "User rotated a single movement",
        painFactor: 0,
        action: "rotate",
        details: `Rotated item ${itemId} to a related clinical alternative.`,
        source: "user",
      },
    ],
  };
}

/** Rotate entire routine while keeping focus areas and kind balance */
export function rotateEntireRoutine(routine: Routine): Routine {
  let next = { ...routine, items: [...routine.items] };
  for (const item of routine.items) {
    next = rotateRoutineItem(next, item.id);
  }
  return {
    ...next,
    rotationCount: (routine.rotationCount ?? 0) + 1,
    name: routine.name.includes("(rotated")
      ? routine.name.replace(/\(rotated.*\)/, `(rotated ×${(routine.rotationCount ?? 0) + 1})`)
      : `${routine.name} (rotated)`,
    selfAdjustHistory: [
      ...routine.selfAdjustHistory,
      {
        at: new Date().toISOString(),
        reason: "User rotated entire routine",
        painFactor: 0,
        action: "rotate",
        details:
          "Full-routine rotation kept regional focus and movement-kind balance per outpatient variety principles.",
        source: "user",
      },
    ],
  };
}

export function addMovementToRoutine(
  routine: Routine,
  movementId: string,
  kind: MovementKind
): Routine {
  if (routine.items.some((i) => i.movementId === movementId && i.kind === kind)) {
    return routine;
  }
  const items = [...routine.items, toItem(movementId, kind)];
  const stretchIds = items.filter((i) => i.kind === "stretch").map((i) => i.movementId);
  const exerciseIds = items.filter((i) => i.kind === "exercise").map((i) => i.movementId);
  return {
    ...routine,
    items,
    stretchIds,
    exerciseIds,
    updatedAt: new Date().toISOString(),
    selfAdjustHistory: [
      ...routine.selfAdjustHistory,
      {
        at: new Date().toISOString(),
        reason: "User added movement from library",
        painFactor: 0,
        action: "modify",
        details: `Added ${kind} ${movementId} from library.`,
        source: "builder",
      },
    ],
  };
}

export function removeItemFromRoutine(routine: Routine, itemId: string): Routine {
  const items = routine.items.filter((i) => i.id !== itemId);
  return {
    ...routine,
    items,
    stretchIds: items.filter((i) => i.kind === "stretch").map((i) => i.movementId),
    exerciseIds: items.filter((i) => i.kind === "exercise").map((i) => i.movementId),
    updatedAt: new Date().toISOString(),
  };
}

export function adjustRoutineFromFeedback(
  routine: Routine,
  feedback: {
    averagePainBefore: number;
    averagePainAfter: number;
    difficultyFelt: 1 | 2 | 3 | 4 | 5;
  }
): Routine {
  const delta = feedback.averagePainAfter - feedback.averagePainBefore;
  let action: RoutineAdjustment["action"] = "hold";
  let details = "Maintain current dosing per current rehab standards.";
  let items = [...routine.items];
  let difficulty = routine.difficulty;

  if (feedback.averagePainAfter >= 6 || delta >= 2) {
    action = "regress";
    details =
      "Pain rose or remained high: regress load, favor beginner control/mobility, shorten advanced strength volume.";
    difficulty = "beginner";
    items = items.map((item) => {
      if (item.kind === "exercise") {
        const easier =
          BASE_EXERCISES.find(
            (e) =>
              e.difficulty === "beginner" &&
              e.bodyParts.some((bp) => routine.focusAreas.includes(bp))
          ) ?? getExerciseById(item.movementId);
        return easier ? { ...item, movementId: easier.id } : item;
      }
      const easier =
        BASE_STRETCHES.find(
          (s) =>
            s.difficulty === "beginner" &&
            s.bodyParts.some((bp) => routine.focusAreas.includes(bp))
        ) ?? getStretchById(item.movementId);
      return easier ? { ...item, movementId: easier.id } : item;
    });
  } else if (
    feedback.averagePainAfter <= 3 &&
    delta <= 0 &&
    feedback.difficultyFelt <= 2
  ) {
    action = "progress";
    details =
      "Well tolerated: modest progression in difficulty and optional added activation/strength drill.";
    if (difficulty === "beginner") difficulty = "intermediate";
    else if (difficulty === "intermediate") difficulty = "advanced";
    const add = BASE_EXERCISES.find(
      (e) =>
        DIFFICULTY_RANK[e.difficulty] >= DIFFICULTY_RANK[difficulty] &&
        e.bodyParts.some((bp) => routine.focusAreas.includes(bp)) &&
        !items.some((i) => i.movementId === e.id)
    );
    if (add) items.push(toItem(add.id, "exercise"));
  } else if (feedback.difficultyFelt >= 4) {
    action = "modify";
    details =
      "High effort with acceptable pain: hold intensity, emphasize form, rest, and tempo control.";
  }

  return {
    ...routine,
    items,
    stretchIds: items.filter((i) => i.kind === "stretch").map((i) => i.movementId),
    exerciseIds: items.filter((i) => i.kind === "exercise").map((i) => i.movementId),
    difficulty,
    updatedAt: new Date().toISOString(),
    selfAdjustHistory: [
      ...routine.selfAdjustHistory,
      {
        at: new Date().toISOString(),
        reason: "Post-session feedback (clinically dosed)",
        painFactor: feedback.averagePainAfter,
        action,
        details,
        source: "session",
      },
    ],
  };
}

export function ensureRoutineItems(routine: Routine): Routine {
  const withItems = routine.items?.length
    ? routine
    : {
        ...routine,
        items: [
          ...(routine.stretchIds || []).map((id) => toItem(id, "stretch" as const)),
          ...(routine.exerciseIds || []).map((id) => toItem(id, "exercise" as const)),
        ] as RoutineItem[],
      };
  return {
    ...withItems,
    modalities: Array.isArray(withItems.modalities) ? withItems.modalities : [],
  };
}

export function addModalityToRoutine(
  routine: Routine,
  modalityId: string,
  opts: {
    preVisit?: boolean;
    postVisit?: boolean;
    preSession?: boolean;
    postSession?: boolean;
    variantId?: string;
    notes?: string;
  } = {}
): Routine {
  const r = ensureRoutineItems(routine);
  const preVisit = opts.preVisit ?? true;
  const postVisit = opts.postVisit ?? false;
  const existing = (r.modalities || []).find((m) => m.modalityId === modalityId);
  if (existing) {
    const modalities = (r.modalities || []).map((m) =>
      m.modalityId === modalityId
        ? {
            ...m,
            preVisit: opts.preVisit !== undefined ? opts.preVisit : m.preVisit || preVisit,
            postVisit: opts.postVisit !== undefined ? opts.postVisit : m.postVisit || postVisit,
            preSession: opts.preSession !== undefined ? opts.preSession : m.preSession,
            postSession: opts.postSession !== undefined ? opts.postSession : m.postSession,
            variantId: opts.variantId ?? m.variantId,
            notes: opts.notes ?? m.notes,
          }
        : m
    );
    return {
      ...r,
      modalities,
      updatedAt: new Date().toISOString(),
    };
  }
  const entry: RoutineModality = {
    id: uuid(),
    modalityId,
    preVisit,
    postVisit,
    preSession: opts.preSession ?? preVisit,
    postSession: opts.postSession ?? postVisit,
    variantId: opts.variantId,
    notes: opts.notes,
    order: (r.modalities || []).length,
  };
  return {
    ...r,
    modalities: [...(r.modalities || []), entry],
    updatedAt: new Date().toISOString(),
    selfAdjustHistory: [
      ...r.selfAdjustHistory,
      {
        at: new Date().toISOString(),
        reason: "User added modality to program",
        painFactor: 0,
        action: "modify",
        details: `Added modality ${modalityId} (pre-visit: ${preVisit}, post-visit: ${postVisit}).`,
        source: "builder",
      },
    ],
  };
}

export function addModalitiesToRoutine(
  routine: Routine,
  modalityIds: string[],
  opts: {
    preVisit?: boolean;
    postVisit?: boolean;
    preSession?: boolean;
    postSession?: boolean;
  } = {}
): Routine {
  return modalityIds.reduce(
    (r, id) => addModalityToRoutine(r, id, opts),
    ensureRoutineItems(routine)
  );
}

export function updateRoutineModality(
  routine: Routine,
  instanceId: string,
  patch: Partial<
    Pick<
      RoutineModality,
      "preVisit" | "postVisit" | "preSession" | "postSession" | "variantId" | "notes" | "order"
    >
  >
): Routine {
  const r = ensureRoutineItems(routine);
  return {
    ...r,
    modalities: (r.modalities || []).map((m) =>
      m.id === instanceId ? { ...m, ...patch } : m
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function removeModalityFromRoutine(routine: Routine, instanceId: string): Routine {
  const r = ensureRoutineItems(routine);
  return {
    ...r,
    modalities: (r.modalities || []).filter((m) => m.id !== instanceId),
    updatedAt: new Date().toISOString(),
  };
}

export function modalitiesForPhase(
  routine: Routine,
  phase: "pre-visit" | "post-visit" | "pre-session" | "post-session"
): RoutineModality[] {
  const list = ensureRoutineItems(routine).modalities || [];
  return list.filter((m) => {
    if (phase === "pre-visit") return m.preVisit;
    if (phase === "post-visit") return m.postVisit;
    if (phase === "pre-session") return m.preSession ?? m.preVisit;
    if (phase === "post-session") return m.postSession ?? m.postVisit;
    return false;
  });
}

export { generateHybridPlan as generateRoutine };
