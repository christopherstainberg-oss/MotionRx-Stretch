import { BASE_EXERCISES, getExerciseById } from "@/data/exercise-library";
import { BASE_STRETCHES, getStretchById } from "@/data/stretch-library";
import {
  matchDescriptorsFromText,
  summarizeDescriptors,
} from "@/data/pain-descriptors";
import type {
  BodyPart,
  Difficulty,
  MovementKind,
  Routine,
  RoutineAdjustment,
  RoutineItem,
  SymptomInput,
} from "@/lib/types";
import { v4 as uuid } from "uuid";

export { matchDescriptorsFromText, analyzeParagraphDescriptors } from "@/data/pain-descriptors";

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const AREA_KEYWORDS: Record<string, BodyPart[]> = {
  neck: ["neck"],
  cervical: ["neck"],
  head: ["neck"],
  shoulder: ["shoulders"],
  shoulders: ["shoulders"],
  "upper back": ["upper-back", "thoracic"],
  "mid back": ["thoracic", "upper-back"],
  thoracic: ["thoracic"],
  "lower back": ["lower-back"],
  "low back": ["lower-back"],
  lumbar: ["lower-back"],
  back: ["lower-back", "upper-back"],
  hip: ["hips"],
  hips: ["hips"],
  glute: ["glutes"],
  butt: ["glutes"],
  hamstring: ["hamstrings"],
  quad: ["quadriceps"],
  thigh: ["quadriceps", "hamstrings"],
  calf: ["calves"],
  calves: ["calves"],
  ankle: ["ankles"],
  foot: ["ankles"],
  wrist: ["wrists"],
  hand: ["wrists"],
  chest: ["chest"],
  posture: ["chest", "thoracic", "neck"],
  desk: ["neck", "shoulders", "thoracic", "wrists"],
  knee: ["quadriceps", "hamstrings", "hips"],
  balance: ["ankles", "full-body", "core"],
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
} {
  const text = paragraph.toLowerCase();
  const areas = new Set<BodyPart>();
  for (const [key, parts] of Object.entries(AREA_KEYWORDS)) {
    if (text.includes(key)) parts.forEach((p) => areas.add(p));
  }

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
  if (goals.length === 0) goals.push("reduce stiffness", "move easier");

  let pain = 3;
  const painMatch = text.match(/pain\s*(?:is|=|:)?\s*(\d{1,2})/);
  if (painMatch) pain = Math.min(10, Number(painMatch[1]));
  else if (text.includes("severe") || text.includes("unbearable")) pain = 7;
  else if (text.includes("moderate")) pain = 4;
  else if (text.includes("mild") || text.includes("slight")) pain = 2;
  else if (text.includes("sharp")) pain = 6;

  const painDescriptorIds = matchDescriptorsFromText(paragraph, 14);
  const descHints = summarizeDescriptors(painDescriptorIds);
  // Adjust estimated pain with descriptor irritability
  pain = Math.min(10, Math.max(0, pain + Math.round(descHints.effectivePainBoost * 0.5)));

  const exScore = EXERCISE_HINTS.filter((h) => text.includes(h)).length;
  const stScore = STRETCH_HINTS.filter((h) => text.includes(h)).length;
  let preferKinds: MovementKind[] | "auto" = "auto";
  if (descHints.preferKinds !== "auto") preferKinds = descHints.preferKinds;
  else if (exScore > stScore + 1) preferKinds = ["exercise", "stretch"];
  else if (stScore > exScore + 1) preferKinds = ["stretch", "exercise"];
  else preferKinds = "auto";

  return {
    areas: areas.size ? Array.from(areas) : ["full-body"],
    symptoms: symptoms.length ? symptoms : ["general stiffness"],
    goals,
    preferKinds,
    estimatedPain: pain,
    painDescriptorIds,
    descriptorLabels: descHints.summaryLines,
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
  descHints?: ReturnType<typeof summarizeDescriptors>
): number {
  let score = 0;
  for (const area of input.areas) {
    if (bodyParts.includes(area)) score += 5;
  }
  const blob = [name, tags.join(" "), benefits.join(" ")].join(" ").toLowerCase();
  for (const symptom of input.symptoms) {
    if (blob.includes(symptom.toLowerCase().split(" ")[0]!)) score += 2;
  }
  for (const goal of input.goals) {
    if (blob.includes(goal.toLowerCase().split(" ")[0]!)) score += 2;
  }
  if (input.concernParagraph) {
    const p = input.concernParagraph.toLowerCase();
    for (const t of tags) if (p.includes(t)) score += 1;
    for (const bp of bodyParts) if (p.includes(bp.replace("-", " "))) score += 2;
  }
  if (areaPain >= 5 && kind === "stretch") score += 1;
  if (areaPain >= 5 && tags.includes("neural")) score -= 4;
  if (tags.includes("warmup") || tags.includes("activation")) score += 1;

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

  return score;
}

function toItem(movementId: string, kind: MovementKind): RoutineItem {
  return {
    id: uuid(),
    movementId,
    kind,
    rotationSeed: Math.floor(Math.random() * 1000),
  };
}

/** Clinically styled hybrid plan from chips + free-text + pain descriptors */
export function generateHybridPlan(input: SymptomInput, userId?: string): Routine {
  const parsed = input.concernParagraph
    ? parseConcernParagraph(input.concernParagraph)
    : null;

  const textMatched = input.concernParagraph
    ? matchDescriptorsFromText(input.concernParagraph, 8)
    : [];
  const painDescriptorIds = Array.from(
    new Set([...(input.painDescriptorIds || []), ...textMatched])
  );
  const descHints = summarizeDescriptors(painDescriptorIds);

  const areas = input.areas.length
    ? input.areas
    : parsed?.areas ?? (["full-body"] as BodyPart[]);
  const symptoms = input.symptoms.length ? input.symptoms : parsed?.symptoms ?? [];
  const goals = input.goals.length ? input.goals : parsed?.goals ?? [];
  const rawAvg =
    areas.reduce((sum, a) => sum + (input.painLevels[a] ?? parsed?.estimatedPain ?? 3), 0) /
    Math.max(areas.length, 1);
  const avgPain = Math.min(10, rawAvg + descHints.effectivePainBoost);

  let difficulty = input.difficulty;
  if (descHints.maxDifficulty) {
    const rank = { beginner: 1, intermediate: 2, advanced: 3 };
    if (rank[descHints.maxDifficulty] < rank[difficulty]) {
      difficulty = descHints.maxDifficulty;
    }
  }
  if (avgPain >= 6) difficulty = "beginner";

  const merged: SymptomInput = {
    ...input,
    areas,
    symptoms,
    goals,
    difficulty,
    painDescriptorIds,
    painLevels: {
      ...Object.fromEntries(areas.map((a) => [a, input.painLevels[a] ?? parsed?.estimatedPain ?? 3])),
      ...input.painLevels,
    },
  };

  const prefer: MovementKind[] =
    input.preferKinds && input.preferKinds !== "auto"
      ? input.preferKinds
      : descHints.preferKinds !== "auto"
        ? descHints.preferKinds
        : parsed?.preferKinds && parsed.preferKinds !== "auto"
          ? parsed.preferKinds
          : (["stretch", "exercise"] as MovementKind[]);

  const stretchCandidates = BASE_STRETCHES.filter((s) =>
    rankOk(s.difficulty, difficulty, avgPain)
  )
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
        descHints
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const exerciseCandidates = BASE_EXERCISES.filter((e) =>
    rankOk(e.difficulty, difficulty, avgPain)
  )
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
        descHints
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const items: RoutineItem[] = [];
  const stretchIds: string[] = [];
  const exerciseIds: string[] = [];
  let minutes = 0;
  let target = Math.max(8, Math.min(45, input.availableMinutes));
  if (descHints.biases.includes("short-volume")) {
    target = Math.min(target, Math.max(8, Math.round(target * 0.7)));
  }
  if (descHints.biases.includes("defer-to-provider")) {
    target = Math.min(target, 10);
  }

  // Always start with mobility warm-up when possible
  const warm = BASE_STRETCHES.find((s) => s.id === "cat-cow");
  if (warm) {
    items.push(toItem(warm.id, "stretch"));
    stretchIds.push(warm.id);
    minutes += warm.durationSeconds / 60;
  }

  // Extra gentle mobility when warm-up-heavy descriptors present
  if (descHints.biases.includes("warm-up-heavy")) {
    const extraWarm = BASE_STRETCHES.find((s) => s.id === "pelvic-tilt");
    if (extraWarm && !stretchIds.includes(extraWarm.id)) {
      items.push(toItem(extraWarm.id, "stretch"));
      stretchIds.push(extraWarm.id);
      minutes += extraWarm.durationSeconds / 60;
    }
  }

  const wantStretch = prefer.includes("stretch");
  const wantExercise =
    prefer.includes("exercise") && !descHints.biases.includes("defer-to-provider");

  // Interleave based on preference order
  let maxStretches = wantStretch ? (wantExercise ? 4 : 6) : 1;
  let maxExercises = wantExercise ? (wantStretch ? 4 : 6) : 0;
  if (descHints.stretchBias > 0.4) maxStretches += 1;
  if (descHints.exerciseBias > 0.4) maxExercises += 1;
  if (descHints.biases.includes("short-volume")) {
    maxStretches = Math.min(maxStretches, 4);
    maxExercises = Math.min(maxExercises, 3);
  }

  let si = 0;
  let ei = 0;
  while (
    minutes < target &&
    (si < stretchCandidates.length || ei < exerciseCandidates.length) &&
    items.length < 12
  ) {
    const canStretch =
      wantStretch && si < stretchCandidates.length && stretchIds.length < maxStretches;
    const canEx =
      wantExercise && ei < exerciseCandidates.length && exerciseIds.length < maxExercises;

    const nextStretch = prefer[0] === "exercise" ? false : canStretch;
    const pickExercise = canEx && (!nextStretch || prefer[0] === "exercise" || stretchIds.length > exerciseIds.length);

    if (pickExercise && canEx) {
      const { e } = exerciseCandidates[ei++]!;
      if (exerciseIds.includes(e.id)) continue;
      items.push(toItem(e.id, "exercise"));
      exerciseIds.push(e.id);
      minutes += e.durationSeconds / 60;
    } else if (canStretch) {
      const { s } = stretchCandidates[si++]!;
      if (stretchIds.includes(s.id)) continue;
      items.push(toItem(s.id, "stretch"));
      stretchIds.push(s.id);
      minutes += s.durationSeconds / 60;
    } else if (canEx) {
      const { e } = exerciseCandidates[ei++]!;
      if (exerciseIds.includes(e.id)) continue;
      items.push(toItem(e.id, "exercise"));
      exerciseIds.push(e.id);
      minutes += e.durationSeconds / 60;
    } else break;
  }

  const cool = BASE_STRETCHES.find((s) => s.id === "childs-pose");
  if (cool && !stretchIds.includes(cool.id)) {
    items.push(toItem(cool.id, "stretch"));
    stretchIds.push(cool.id);
    minutes += cool.durationSeconds / 60;
  }

  const descDetail =
    painDescriptorIds.length > 0
      ? ` Descriptors: ${descHints.summaryLines.slice(0, 6).join("; ")}.`
      : "";
  const biasDetail = descHints.biases.length
    ? ` Program biases: ${descHints.biases.slice(0, 5).join(", ")}.`
    : "";
  const rfDetail = descHints.redFlags.length
    ? ` Safety notes applied from screening descriptors—seek care if red flags apply.`
    : "";

  const adjustment: RoutineAdjustment = {
    at: new Date().toISOString(),
    reason: painDescriptorIds.length
      ? "Generated from clinical pain descriptors + intake"
      : input.concernParagraph
        ? "Generated from written concerns + clinical intake"
        : "Generated from symptoms, goals, and pain scale",
    painFactor: avgPain,
    action:
      descHints.biases.includes("defer-to-provider") || avgPain >= 6
        ? "regress"
        : avgPain >= 4
          ? "modify"
          : avgPain <= 2
            ? "progress"
            : "hold",
    details:
      (avgPain >= 6
        ? "Elevated pain: beginner-biased selection, prioritize control and gentle mobility, reduce aggressive end-range."
        : avgPain >= 4
          ? "Moderate pain: balanced mobility + activation with mid volume per outpatient load management."
          : "Pain tolerable: include mobility and progressive exercise dosing with warm-up/cool-down.") +
      descDetail +
      biasDetail +
      rfDetail,
    source: "user",
  };

  const kindsLabel = [
    wantStretch ? "stretches" : null,
    wantExercise ? "exercises" : null,
  ]
    .filter(Boolean)
    .join(" + ");

  return {
    id: uuid(),
    userId,
    name:
      areas[0] === "full-body"
        ? `Personalized ${kindsLabel} plan`
        : `Plan: ${areas.map((a) => a.replace("-", " ")).join(", ")}`,
    description:
      "Clinically styled outpatient plan: warm-up mobility → targeted stretches and/or exercises → cool-down. Self-adjusts from pain, performance, and Jeffery discussions.",
    focusAreas: areas,
    stretchIds,
    exerciseIds,
    items,
    estimatedMinutes: Math.max(1, Math.round(minutes)),
    difficulty: avgPain >= 5 ? "beginner" : difficulty,
    isPersonalized: true,
    generatedFrom: {
      symptoms,
      areas,
      painLevels: merged.painLevels,
      goals,
      concernParagraph: input.concernParagraph,
      suggestedKinds: prefer,
      painDescriptorIds,
      descriptorSummary: descHints.summaryLines,
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
  if (routine.items?.length) return routine;
  const items: RoutineItem[] = [
    ...(routine.stretchIds || []).map((id) => toItem(id, "stretch" as const)),
    ...(routine.exerciseIds || []).map((id) => toItem(id, "exercise" as const)),
  ];
  return { ...routine, items };
}

export { generateHybridPlan as generateRoutine };
