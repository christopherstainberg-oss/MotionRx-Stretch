/**
 * PT-style home exercise program (HEP) session composition.
 * Orders and trims movements the way an outpatient physical therapist would
 * structure a realistic home program: warm-up → target mobility → motor control
 * → functional capacity → cool-down — with phase-appropriate volume.
 *
 * Educational synthesis only — not a substitute for licensed care.
 */

import type { BodyPart, MovementKind, RoutineItem } from "@/lib/types";
import type { RehabPhase, InjuryPattern } from "@/lib/clinical-rehab-intel";

export type MovementCatalogRef = {
  id: string;
  kind: "stretch" | "exercise";
  name: string;
  tags: string[];
  bodyParts: BodyPart[];
  durationSeconds: number;
};

export type ComposerSlot =
  | "warm-up"
  | "mobility"
  | "motor-control"
  | "functional"
  | "capacity"
  | "cool-down";

export type ComposedSession = {
  orderedIds: Array<{ id: string; kind: "stretch" | "exercise"; slot: ComposerSlot }>;
  blueprintNarrative: string[];
  dosingNotes: string[];
  totalTargetItems: number;
};

const WARMUP_BY_REGION: Partial<Record<BodyPart, string[]>> = {
  "lower-back": ["cat-cow", "pelvic-tilt", "knee-to-chest"],
  pelvis: ["pelvic-tilt", "cat-cow", "childs-pose"],
  core: ["cat-cow", "pelvic-tilt"],
  neck: ["chin-tuck", "upper-trap-stretch", "cat-cow"],
  jaw: ["chin-tuck"],
  shoulders: ["doorway-chest-stretch", "open-book-thoracic", "upper-trap-stretch"],
  scapular: ["open-book-thoracic", "doorway-chest-stretch"],
  thoracic: ["cat-cow", "open-book-thoracic", "doorway-chest-stretch"],
  "upper-back": ["cat-cow", "open-book-thoracic"],
  hips: ["cat-cow", "half-kneeling-hip-flexor", "figure-four-glute"],
  glutes: ["figure-four-glute", "cat-cow"],
  hamstrings: ["supine-hamstring-strap", "cat-cow"],
  knee: ["quad-standing", "supine-hamstring-strap", "cat-cow"],
  quadriceps: ["quad-standing", "half-kneeling-hip-flexor"],
  ankles: ["ankle-alphabet", "gastroc-wall"],
  foot: ["ankle-alphabet", "plantar-fascia-wall"],
  calves: ["gastroc-wall", "ankle-alphabet"],
  chest: ["doorway-chest-stretch", "open-book-thoracic"],
};

const COOLDOWN_BY_REGION: Partial<Record<BodyPart, string[]>> = {
  "lower-back": ["childs-pose", "knee-to-chest", "pelvic-tilt"],
  neck: ["chin-tuck", "upper-trap-stretch"],
  shoulders: ["doorway-chest-stretch", "upper-trap-stretch"],
  thoracic: ["childs-pose", "cat-cow"],
  hips: ["childs-pose", "figure-four-glute"],
  knee: ["supine-hamstring-strap", "childs-pose"],
  ankles: ["ankle-alphabet", "gastroc-wall"],
  "full-body": ["childs-pose", "cat-cow"],
};

/** Motor-control / activation tags (isometrics, timing, low-load) */
const MOTOR_TAGS = [
  "motor-control",
  "activation",
  "isometric",
  "core",
  "scapular",
  "chin-tuck",
  "gentle",
  "protected",
];

/** Functional / capacity tags */
const FUNCTIONAL_TAGS = [
  "functional",
  "balance",
  "stairs",
  "gait",
  "closed-chain",
  "sit-to-stand",
  "strength",
  "endurance",
  "proprioception",
];

function slotForMovement(
  m: MovementCatalogRef,
  phase: RehabPhase
): ComposerSlot {
  const blob = `${m.name} ${m.tags.join(" ")}`.toLowerCase();
  const tags = new Set(m.tags.map((t) => t.toLowerCase()));

  if (tags.has("warmup") || tags.has("warm-up") || /warm.?up|cat.?cow|pelvic tilt|alphabet/.test(blob)) {
    if (m.kind === "stretch") return "warm-up";
  }
  if (tags.has("cooldown") || tags.has("cool-down") || /child.?s pose|cool.?down|restorative/.test(blob)) {
    if (m.kind === "stretch") return "cool-down";
  }

  if (m.kind === "stretch") {
    return "mobility";
  }

  // Exercises
  const motorHit = MOTOR_TAGS.some((t) => tags.has(t) || blob.includes(t));
  const funcHit = FUNCTIONAL_TAGS.some((t) => tags.has(t) || blob.includes(t));

  if (
    /quad set|isometric|dead.?bug|bird.?dog|chin tuck|scapular|serratus|tke|terminal knee|slr|activation/.test(
      blob
    ) ||
    (motorHit && !funcHit)
  ) {
    return "motor-control";
  }

  if (
    /sit.?to.?stand|step|balance|heel raise|row|push|hinge|bridge|wall sit|carry|walk/.test(
      blob
    ) ||
    funcHit
  ) {
    return phase === "capacity-load" || phase === "function-return"
      ? "capacity"
      : "functional";
  }

  return phase === "protect-calm" || phase === "motor-control"
    ? "motor-control"
    : "functional";
}

const SLOT_ORDER: ComposerSlot[] = [
  "warm-up",
  "mobility",
  "motor-control",
  "functional",
  "capacity",
  "cool-down",
];

/**
 * Choose a realistic warm-up stretch ID for the priority region.
 */
export function pickWarmupId(
  priorityAreas: BodyPart[],
  availableStretchIds: string[],
  phase: RehabPhase
): string | undefined {
  const pool: string[] = [];
  for (const a of priorityAreas.slice(0, 3)) {
    for (const id of WARMUP_BY_REGION[a] || []) pool.push(id);
  }
  if (!pool.length) {
    pool.push(
      phase === "protect-calm" ? "pelvic-tilt" : "cat-cow",
      "cat-cow",
      "pelvic-tilt",
      "chin-tuck",
      "ankle-alphabet"
    );
  }
  for (const id of pool) {
    if (availableStretchIds.includes(id)) return id;
  }
  // Prefer any available that looks like a warm-up
  return availableStretchIds.find((id) =>
    /cat-cow|pelvic|chin-tuck|alphabet|doorway|open-book/.test(id)
  );
}

export function pickCooldownId(
  priorityAreas: BodyPart[],
  availableStretchIds: string[],
  avoidFlexionHeavy?: boolean
): string | undefined {
  const pool: string[] = [];
  for (const a of priorityAreas.slice(0, 3)) {
    for (const id of COOLDOWN_BY_REGION[a] || []) {
      if (avoidFlexionHeavy && /childs-pose|knee-to-chest/.test(id)) continue;
      pool.push(id);
    }
  }
  if (!pool.length) pool.push("childs-pose", "cat-cow", "chin-tuck");
  for (const id of pool) {
    if (availableStretchIds.includes(id)) return id;
  }
  return availableStretchIds.find((id) => /childs|cat-cow|chin|hamstring/.test(id));
}

/**
 * Phase-realistic total item budgets (warm + cool included).
 * Outpatient HEPs are usually 6–10 movements, not 12+ random picks.
 */
export function phaseItemBudget(phase: RehabPhase, minutesTarget: number): {
  maxTotal: number;
  maxStretch: number;
  maxExercise: number;
} {
  const short = minutesTarget <= 12;
  switch (phase) {
    case "protect-calm":
      return short
        ? { maxTotal: 6, maxStretch: 4, maxExercise: 2 }
        : { maxTotal: 7, maxStretch: 4, maxExercise: 3 };
    case "mobility-restore":
      return short
        ? { maxTotal: 7, maxStretch: 5, maxExercise: 2 }
        : { maxTotal: 8, maxStretch: 5, maxExercise: 3 };
    case "motor-control":
      return short
        ? { maxTotal: 7, maxStretch: 3, maxExercise: 4 }
        : { maxTotal: 9, maxStretch: 3, maxExercise: 5 };
    case "capacity-load":
      return short
        ? { maxTotal: 7, maxStretch: 2, maxExercise: 5 }
        : { maxTotal: 9, maxStretch: 3, maxExercise: 6 };
    case "function-return":
      return short
        ? { maxTotal: 8, maxStretch: 2, maxExercise: 5 }
        : { maxTotal: 10, maxStretch: 3, maxExercise: 6 };
  }
}

/**
 * Compose a PT-ordered session from already-scored candidates + preferred seeds.
 * Does not invent movements — only orders and budgets what scoring already selected.
 */
export function composePtSession(opts: {
  phase: RehabPhase;
  patterns: InjuryPattern[];
  priorityAreas: BodyPart[];
  stretchCandidates: MovementCatalogRef[]; // highest score first
  exerciseCandidates: MovementCatalogRef[];
  preferredStretchIds: string[];
  preferredExerciseIds: string[];
  minutesTarget: number;
  avoidTags?: string[];
  functionalLimits?: string[];
}): ComposedSession {
  const budget = phaseItemBudget(opts.phase, opts.minutesTarget);
  const avoid = new Set((opts.avoidTags || []).map((t) => t.toLowerCase()));
  const stretchMap = new Map(opts.stretchCandidates.map((s) => [s.id, s]));
  const exerciseMap = new Map(opts.exerciseCandidates.map((e) => [e.id, e]));

  const stretchPool = opts.stretchCandidates.filter((s) => {
    const blob = `${s.name} ${s.tags.join(" ")}`.toLowerCase();
    for (const t of avoid) {
      if (t && t !== "all" && (blob.includes(t) || s.tags.includes(t))) return false;
    }
    return true;
  });
  const exercisePool = opts.exerciseCandidates.filter((e) => {
    const blob = `${e.name} ${e.tags.join(" ")}`.toLowerCase();
    for (const t of avoid) {
      if (t && t !== "all" && (blob.includes(t) || e.tags.includes(t))) return false;
    }
    return true;
  });

  const stretchIdsAvail = stretchPool.map((s) => s.id);
  const exerciseIdsAvail = exercisePool.map((e) => e.id);

  const selected: Array<{ id: string; kind: "stretch" | "exercise"; slot: ComposerSlot; scoreRank: number }> =
    [];
  const used = new Set<string>();

  const push = (
    id: string,
    kind: "stretch" | "exercise",
    slot: ComposerSlot,
    rank: number
  ) => {
    if (used.has(id)) return false;
    if (selected.length >= budget.maxTotal) return false;
    const stretchCount = selected.filter((x) => x.kind === "stretch").length;
    const exerciseCount = selected.filter((x) => x.kind === "exercise").length;
    if (kind === "stretch" && stretchCount >= budget.maxStretch) return false;
    if (kind === "exercise" && exerciseCount >= budget.maxExercise) return false;
    const ref = kind === "stretch" ? stretchMap.get(id) : exerciseMap.get(id);
    if (!ref && !(kind === "stretch" ? stretchIdsAvail : exerciseIdsAvail).includes(id)) {
      // Prefer catalog-known IDs only
      if (kind === "stretch" && !stretchIdsAvail.includes(id)) return false;
      if (kind === "exercise" && !exerciseIdsAvail.includes(id)) return false;
    }
    used.add(id);
    selected.push({ id, kind, slot, scoreRank: rank });
    return true;
  };

  // 1) Warm-up
  const warmId = pickWarmupId(opts.priorityAreas, stretchIdsAvail, opts.phase);
  if (warmId) push(warmId, "stretch", "warm-up", 100);

  // 2) Preferred exercises early (function/control) so mobility fill cannot crowd them out
  let rank = 95;
  for (const id of opts.preferredExerciseIds) {
    if (!exerciseIdsAvail.includes(id)) continue;
    const ref = exerciseMap.get(id) || {
      id,
      kind: "exercise" as const,
      name: id,
      tags: [],
      bodyParts: [],
      durationSeconds: 120,
    };
    push(id, "exercise", slotForMovement(ref, opts.phase), rank--);
  }

  // 3) Preferred stretches (mobility seeds)
  rank = 90;
  for (const id of opts.preferredStretchIds) {
    if (!stretchIdsAvail.includes(id)) continue;
    const ref = stretchMap.get(id) || {
      id,
      kind: "stretch" as const,
      name: id,
      tags: [],
      bodyParts: [],
      durationSeconds: 120,
    };
    const slot = slotForMovement(ref, opts.phase);
    if (slot === "warm-up" && selected.some((s) => s.slot === "warm-up")) continue;
    push(id, "stretch", slot === "warm-up" ? "mobility" : slot, rank--);
  }

  // 4) Fill motor control / functional from remaining top exercises
  const motorFirst = [...exercisePool].sort((a, b) => {
    const sa = slotForMovement(a, opts.phase);
    const sb = slotForMovement(b, opts.phase);
    const rankSlot = (s: ComposerSlot) =>
      s === "motor-control" ? 0 : s === "functional" ? 1 : s === "capacity" ? 2 : 3;
    return rankSlot(sa) - rankSlot(sb);
  });
  for (const e of motorFirst) {
    if (selected.filter((x) => x.kind === "exercise").length >= budget.maxExercise) break;
    push(e.id, "exercise", slotForMovement(e, opts.phase), 40 - selected.length);
  }

  // 5) Fill mobility from top-scored stretches
  for (const s of stretchPool) {
    if (selected.filter((x) => x.kind === "stretch").length >= budget.maxStretch) break;
    const slot = slotForMovement(s, opts.phase);
    if (slot === "warm-up" || slot === "cool-down") continue;
    push(s.id, "stretch", "mobility", 50 - selected.length);
  }

  // 6) Cool-down
  const avoidFlex = (opts.avoidTags || []).some((t) =>
    /flexion|end-range-flexion/.test(t)
  );
  const coolId = pickCooldownId(opts.priorityAreas, stretchIdsAvail, avoidFlex);
  if (coolId && !used.has(coolId)) {
    // Allow one extra cool-down if under maxTotal+1 soft cap
    if (selected.length < budget.maxTotal || selected.length < budget.maxTotal + 1) {
      used.add(coolId);
      selected.push({ id: coolId, kind: "stretch", slot: "cool-down", scoreRank: 1 });
    }
  }

  // Guarantee at least one exercise when pool has any (realistic PT HEP)
  if (
    !selected.some((s) => s.kind === "exercise") &&
    exercisePool.length > 0 &&
    budget.maxExercise > 0
  ) {
    const e = exercisePool[0]!;
    // Replace last mobility stretch if needed to free a slot
    if (selected.length >= budget.maxTotal) {
      const mobIdx = [...selected]
        .map((s, i) => ({ s, i }))
        .reverse()
        .find((x) => x.s.slot === "mobility" && x.s.kind === "stretch");
      if (mobIdx) {
        used.delete(selected[mobIdx.i]!.id);
        selected.splice(mobIdx.i, 1);
      }
    }
    push(e.id, "exercise", slotForMovement(e, opts.phase), 70);
  }

  // Sort into clinical order; stable within slot by scoreRank
  selected.sort((a, b) => {
    const oi = SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
    if (oi !== 0) return oi;
    return b.scoreRank - a.scoreRank;
  });

  const dosingNotes = dosingNotesForPhase(opts.phase, opts.functionalLimits);
  const blueprintNarrative = [
    "Warm-up: easy protected motion for priority region",
    "Mobility: 1–3 targeted stretches for stated limits (not random full-body)",
    "Motor control: low-load activation / timing before heavier load",
    "Functional / capacity: graded task-related strength or balance if irritability allows",
    "Cool-down: short calm mobility; stop for red-flag pain",
  ];

  return {
    orderedIds: selected.map(({ id, kind, slot }) => ({ id, kind, slot })),
    blueprintNarrative,
    dosingNotes,
    totalTargetItems: budget.maxTotal,
  };
}

function dosingNotesForPhase(phase: RehabPhase, functionalLimits?: string[]): string[] {
  const notes: string[] = [
    "Traffic-light dosing: green ≤3/10 mild productive discomfort OK if settles ≤24h; yellow 4–5 modify range/volume; red ≥6 stop and regress.",
  ];
  switch (phase) {
    case "protect-calm":
      notes.push(
        "High irritability / early protection: short holds (5–20s mobility), isometrics 5–10s × 4–6, 1–2 sets, stop before flare."
      );
      notes.push("Frequency: brief sessions most days rather than rare long sessions.");
      break;
    case "mobility-restore":
      notes.push(
        "Mobility focus: 20–40s gentle holds × 2–3, easy breath; follow with light activation to own new range."
      );
      break;
    case "motor-control":
      notes.push(
        "Motor control: quality > load. 6–10 slow reps or 8–15s holds × 2–3 sets; rest if form degrades."
      );
      break;
    case "capacity-load":
      notes.push(
        "Capacity: progress one variable at a time (reps, hold, or resistance). 8–12 controlled reps × 2–3 sets when pain rules allow."
      );
      break;
    case "function-return":
      notes.push(
        "Function return: task practice (stairs, sit-to-stand, reach, walk tolerance) with clear success criteria weekly."
      );
      break;
  }
  if (functionalLimits?.length) {
    notes.push(
      `Anchor practice to stated limits: ${functionalLimits.slice(0, 3).join(", ")} (PSFS-style weekly track).`
    );
  }
  return notes;
}

/**
 * Reorder already-built RoutineItems into PT session order using catalog metadata.
 */
export function reorderItemsLikePtSession(
  items: RoutineItem[],
  catalog: MovementCatalogRef[],
  phase: RehabPhase
): RoutineItem[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const decorated = items.map((item, index) => {
    const ref = byId.get(item.movementId) || {
      id: item.movementId,
      kind: item.kind === "stretch" ? ("stretch" as const) : ("exercise" as const),
      name: item.movementId,
      tags: [] as string[],
      bodyParts: [] as BodyPart[],
      durationSeconds: 120,
    };
    return {
      item,
      index,
      slot: slotForMovement(
        {
          id: ref.id,
          kind: item.kind === "stretch" ? "stretch" : "exercise",
          name: ref.name,
          tags: ref.tags,
          bodyParts: ref.bodyParts,
          durationSeconds: ref.durationSeconds,
        },
        phase
      ),
    };
  });
  decorated.sort((a, b) => {
    const oi = SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
    if (oi !== 0) return oi;
    return a.index - b.index;
  });
  return decorated.map((d) => d.item);
}
