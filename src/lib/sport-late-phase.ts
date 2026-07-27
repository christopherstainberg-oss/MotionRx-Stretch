/**
 * Deeper sport-specific late-phase programs (PhysioPath / RTP-inspired).
 * Educational HEP structure only — not return-to-play clearance.
 */

import type { Sport, SportDemand } from "@/data/sports";
import { getSportById } from "@/data/sports";
import type { Difficulty } from "@/lib/types";

export type LatePhaseId =
  | "base-capacity"
  | "sport-motor"
  | "sport-load"
  | "criteria-check";

export type LatePhaseBlock = {
  id: LatePhaseId;
  title: string;
  weeksHint: string;
  focus: string;
  criteria: string[];
  preferTags: string[];
  preferredStretchIds: string[];
  preferredExerciseIds: string[];
  avoidTags: string[];
  minutesScale: number;
  maxDifficulty: Difficulty;
  sessionNotes: string[];
};

export type SportLatePhaseProgram = {
  sportId: string;
  sportName: string;
  impact: Sport["impact"];
  demands: SportDemand[];
  /** Only apply aggressive late-phase blocks when irritability is low and not early post-op */
  allowed: boolean;
  blockWhy: string;
  blocks: LatePhaseBlock[];
  /** Flattened seeds for plan composer */
  preferTags: string[];
  preferredStretchIds: string[];
  preferredExerciseIds: string[];
  avoidTags: string[];
  evidenceLines: string[];
  criteriaChecklist: string[];
};

const DEMAND_SEEDS: Record<
  SportDemand,
  {
    preferTags: string[];
    stretchIds: string[];
    exerciseIds: string[];
    criteria: string[];
  }
> = {
  running: {
    preferTags: ["endurance", "calf", "hip", "foot", "single-leg"],
    stretchIds: ["gastroc-wall", "half-kneeling-hip-flexor", "supine-hamstring-strap"],
    exerciseIds: ["ex-heel-raises", "ex-hip-hinge-dowel", "ex-glute-bridge", "ex-tandem-balance"],
    criteria: [
      "Pain-free walk 20–30 min",
      "Single-leg calf raise ≥15 each side without sharp pain",
      "Hop in place pain-free before run/walk intervals",
    ],
  },
  cutting: {
    preferTags: ["agility", "lateral-hip", "single-leg", "functional"],
    stretchIds: ["figure-four-glute", "half-kneeling-hip-flexor"],
    exerciseIds: ["ex-side-lying-abduction", "ex-sit-to-stand", "ex-tandem-balance", "ex-glute-bridge"],
    criteria: [
      "Side-step / shuffle pain-free",
      "Single-leg balance 20s eyes open",
      "Deceleration feels controlled before sharp cuts",
    ],
  },
  jumping: {
    preferTags: ["plyo-prep", "quad", "landing", "ankle"],
    stretchIds: ["quad-standing", "gastroc-wall", "half-kneeling-hip-flexor"],
    exerciseIds: ["ex-sit-to-stand", "ex-heel-raises", "ex-glute-bridge", "ex-wall-sit"],
    criteria: [
      "Soft double-leg land without knee collapse",
      "Pain ≤3/10 with submax jump prep",
      "No next-day joint swelling spike",
    ],
  },
  overhead: {
    preferTags: ["scapular", "rotator-cuff", "thoracic", "posture"],
    stretchIds: ["doorway-chest-stretch", "open-book-thoracic", "chin-tuck"],
    exerciseIds: [
      "ex-scapular-rows-band",
      "ex-cervical-isometrics",
      "ex-wall-pushup",
      "ex-serratus-punch",
    ],
    criteria: [
      "Pain-free active elevation to sport-needed range",
      "Scapular control through overhead arc",
      "No night pain increase after volume day",
    ],
  },
  throwing: {
    preferTags: ["rotator-cuff", "scapular", "hip", "core", "kinetic-chain"],
    stretchIds: ["doorway-chest-stretch", "open-book-thoracic", "figure-four-glute"],
    exerciseIds: ["ex-scapular-rows-band", "ex-dead-bug", "ex-hip-hinge-dowel", "ex-glute-bridge"],
    criteria: [
      "Pain-free throw progression (short → long)",
      "Trunk/hip rotation without lumbar flare",
      "Arm fatigue recovers ≤24h",
    ],
  },
  endurance: {
    preferTags: ["endurance", "aerobic", "functional"],
    stretchIds: ["cat-cow", "half-kneeling-hip-flexor", "gastroc-wall"],
    exerciseIds: ["ex-sit-to-stand", "ex-heel-raises", "ex-glute-bridge"],
    criteria: [
      "Steady-state effort without delayed flare",
      "Can talk in full sentences at easy pace",
      "Sleep and next-day readiness stable",
    ],
  },
  strength: {
    preferTags: ["strength", "hinge", "motor-control", "capacity"],
    stretchIds: ["cat-cow", "childs-pose", "half-kneeling-hip-flexor"],
    exerciseIds: [
      "ex-hip-hinge-dowel",
      "ex-glute-bridge",
      "ex-sit-to-stand",
      "ex-dead-bug",
      "ex-side-plank-knees",
    ],
    criteria: [
      "Form holds under moderate load",
      "No next-day sharp joint pain",
      "Core bracing without breath-holding pain",
    ],
  },
  balance: {
    preferTags: ["balance", "proprioception", "ankle", "hip"],
    stretchIds: ["ankle-alphabet", "gastroc-wall", "figure-four-glute"],
    exerciseIds: ["ex-tandem-balance", "ex-heel-raises", "ex-hip-hinge-dowel", "ex-glute-bridge"],
    criteria: [
      "Single-leg stand 20–30s",
      "Tandem walk without loss of balance",
      "Uneven surface tolerance improving",
    ],
  },
  flexibility: {
    preferTags: ["mobility", "flexibility", "gentle"],
    stretchIds: [
      "worlds-greatest-stretch",
      "open-book-thoracic",
      "half-kneeling-hip-flexor",
      "figure-four-glute",
    ],
    exerciseIds: ["ex-dead-bug", "ex-bird-dog", "ex-glute-bridge"],
    criteria: [
      "Sport-needed range without sharp pain",
      "End-range is productive, not threatening",
      "No next-day stiffness spike after mobility day",
    ],
  },
  contact: {
    preferTags: ["strength", "core", "functional", "contact-prep"],
    stretchIds: ["cat-cow", "doorway-chest-stretch", "half-kneeling-hip-flexor"],
    exerciseIds: [
      "ex-side-plank-knees",
      "ex-dead-bug",
      "ex-glute-bridge",
      "ex-wall-pushup",
      "ex-hip-hinge-dowel",
    ],
    criteria: [
      "Clinician clearance for contact",
      "Neck/shoulder load tolerance green",
      "Confidence with contact drills ≥7/10",
    ],
  },
  racket: {
    preferTags: ["rotator-cuff", "wrist", "lateral-hip", "ankle"],
    stretchIds: ["doorway-chest-stretch", "open-book-thoracic", "figure-four-glute"],
    exerciseIds: [
      "ex-scapular-rows-band",
      "ex-wall-pushup",
      "ex-side-lying-abduction",
      "ex-tandem-balance",
    ],
    criteria: [
      "Pain-free groundstrokes then serve progression",
      "Lateral shuffle without knee flare",
      "Grip/wrist settles ≤24h",
    ],
  },
  cycling: {
    preferTags: ["hip", "quad", "posture", "endurance"],
    stretchIds: ["half-kneeling-hip-flexor", "figure-four-glute", "cat-cow"],
    exerciseIds: ["ex-glute-bridge", "ex-sit-to-stand", "ex-dead-bug", "ex-heel-raises"],
    criteria: [
      "Bike fit comfortable 20+ min",
      "No low-back numbness after rides",
      "Cadence work without knee sharp pain",
    ],
  },
  swimming: {
    preferTags: ["rotator-cuff", "scapular", "thoracic", "endurance"],
    stretchIds: ["doorway-chest-stretch", "open-book-thoracic", "chin-tuck"],
    exerciseIds: ["ex-scapular-rows-band", "ex-dead-bug", "ex-wall-pushup", "ex-glute-bridge"],
    criteria: [
      "Pain-free freestyle/backstroke segments",
      "Breathing side without neck flare",
      "Shoulder recovers by next morning",
    ],
  },
  lifting: {
    preferTags: ["hinge", "squat", "core", "strength"],
    stretchIds: ["cat-cow", "childs-pose", "half-kneeling-hip-flexor", "supine-hamstring-strap"],
    exerciseIds: [
      "ex-hip-hinge-dowel",
      "ex-sit-to-stand",
      "ex-glute-bridge",
      "ex-dead-bug",
      "ex-side-plank-knees",
    ],
    criteria: [
      "Competition patterns pain-free empty bar / light load",
      "Brace without Valsalva-related symptoms",
      "No next-day joint swelling",
    ],
  },
};

function unique(xs: string[]): string[] {
  return Array.from(new Set(xs.filter(Boolean)));
}

function demandPack(demands: SportDemand[]) {
  const preferTags: string[] = [];
  const stretchIds: string[] = [];
  const exerciseIds: string[] = [];
  const criteria: string[] = [];
  for (const d of demands) {
    const p = DEMAND_SEEDS[d];
    if (!p) continue;
    preferTags.push(...p.preferTags);
    stretchIds.push(...p.stretchIds);
    exerciseIds.push(...p.exerciseIds);
    criteria.push(...p.criteria);
  }
  return {
    preferTags: unique(preferTags),
    stretchIds: unique(stretchIds),
    exerciseIds: unique(exerciseIds),
    criteria: unique(criteria).slice(0, 10),
  };
}

/**
 * Build multi-block late-phase program for selected sports.
 * Aggressive sport-load blocks only when allowed (low irritability, not early post-op).
 */
export function buildSportLatePhaseProgram(opts: {
  sportIds?: string[];
  /** High irritability / delayed flare / early post-op → keep base only */
  protective?: boolean;
  irritability?: "low" | "moderate" | "high" | "unknown";
  earlyPostOp?: boolean;
}): SportLatePhaseProgram | null {
  const ids = opts.sportIds || [];
  if (!ids.length) return null;
  const sports = ids.map((id) => getSportById(id)).filter(Boolean) as Sport[];
  if (!sports.length) return null;

  const primary = sports[0]!;
  const allDemands = unique(sports.flatMap((s) => s.demands)) as SportDemand[];
  const pack = demandPack(allDemands.length ? allDemands : primary.demands);

  const allowed =
    !opts.protective &&
    !opts.earlyPostOp &&
    opts.irritability !== "high" &&
    opts.irritability !== "unknown";

  const blockWhy = !allowed
    ? opts.earlyPostOp
      ? "Early post-op / protection window — sport-load blocks deferred."
      : opts.irritability === "high"
        ? "High irritability — stay in base capacity until traffic lights are green."
        : "Sport late-phase load unlocks when irritability is moderate/low and protection cues clear."
    : "Irritability allows sport-motor and graded sport-load blocks with criteria checks.";

  const base: LatePhaseBlock = {
    id: "base-capacity",
    title: "Base Capacity",
    weeksHint: "Ongoing foundation",
    focus: "Tissue tolerance, motor control, and general strength before sport skill load.",
    criteria: [
      "Session response settles ≤24h",
      "Daily task confidence trending up",
      "No red-flag swelling/night pain spikes",
    ],
    preferTags: unique(["motor-control", "strength", "functional", ...pack.preferTags.slice(0, 4)]),
    preferredStretchIds: pack.stretchIds.slice(0, 4),
    preferredExerciseIds: pack.exerciseIds.slice(0, 5),
    avoidTags: primary.impact === "collision" || primary.impact === "high" ? ["plyo"] : [],
    minutesScale: 1,
    maxDifficulty: "intermediate",
    sessionNotes: [
      `Late-phase base for ${sports.map((s) => s.name).join(", ")}: control quality before intensity.`,
    ],
  };

  const sportMotor: LatePhaseBlock = {
    id: "sport-motor",
    title: "Sport Motor Patterns",
    weeksHint: "When base is green",
    focus: "Sport-adjacent movement (hinge, single-leg, scapular, landing prep) without full skill intensity.",
    criteria: pack.criteria.slice(0, 4),
    preferTags: unique([...pack.preferTags, "sport", "motor-control"]),
    preferredStretchIds: pack.stretchIds.slice(0, 5),
    preferredExerciseIds: pack.exerciseIds.slice(0, 7),
    avoidTags: primary.impact === "collision" ? ["contact-full"] : [],
    minutesScale: 1,
    maxDifficulty: "intermediate",
    sessionNotes: [
      `Sport-motor emphasis: ${allDemands.slice(0, 5).join(", ") || "general"}.`,
      primary.rtpNote,
    ],
  };

  const sportLoad: LatePhaseBlock = {
    id: "sport-load",
    title: "Graded Sport Load",
    weeksHint: "Only if criteria green",
    focus: "Volume and intensity closer to sport demands; still traffic-light dosed.",
    criteria: [
      ...pack.criteria.slice(0, 3),
      "Confidence ≥7/10 for planned sport drill",
      "No next-day flare after prior graded session",
    ],
    preferTags: unique([...pack.preferTags, "capacity", "sport", "endurance"]),
    preferredStretchIds: pack.stretchIds,
    preferredExerciseIds: pack.exerciseIds,
    avoidTags: [],
    minutesScale: 1.05,
    maxDifficulty:
      primary.impact === "collision" || primary.impact === "high"
        ? "advanced"
        : "intermediate",
    sessionNotes: [
      "Increase one variable at a time (volume OR intensity OR complexity).",
      "Contact / full competition requires licensed clinician clearance — not this app.",
    ],
  };

  const criteriaBlock: LatePhaseBlock = {
    id: "criteria-check",
    title: "RTP Criteria Checklist",
    weeksHint: "Before full return",
    focus: "Objective-ish self-checks (not formal hop testing / clearance).",
    criteria: unique([
      ...pack.criteria,
      "Pain most days ≤3/10 with sport practice",
      "Sleep and readiness stable after hard days",
      "You have a plan for first-week load re-entry",
    ]).slice(0, 8),
    preferTags: ["functional", "motor-control", "balance"],
    preferredStretchIds: pack.stretchIds.slice(0, 3),
    preferredExerciseIds: pack.exerciseIds.slice(0, 4),
    avoidTags: [],
    minutesScale: 0.95,
    maxDifficulty: "intermediate",
    sessionNotes: [
      "Use checklist as education, not a green light for competition.",
    ],
  };

  const blocks = allowed
    ? [base, sportMotor, sportLoad, criteriaBlock]
    : [base, criteriaBlock];

  const active = allowed ? [base, sportMotor] : [base];
  const preferTags = unique(active.flatMap((b) => b.preferTags));
  const preferredStretchIds = unique(active.flatMap((b) => b.preferredStretchIds));
  const preferredExerciseIds = unique(active.flatMap((b) => b.preferredExerciseIds));
  const avoidTags = unique(active.flatMap((b) => b.avoidTags));

  return {
    sportId: primary.id,
    sportName: sports.map((s) => s.name).join(", "),
    impact: primary.impact,
    demands: allDemands,
    allowed,
    blockWhy,
    blocks,
    preferTags,
    preferredStretchIds,
    preferredExerciseIds,
    avoidTags,
    evidenceLines: [
      `Sport late-phase program: ${sports.map((s) => s.name).join(", ")} (${primary.impact} impact).`,
      blockWhy,
      ...active.flatMap((b) => b.sessionNotes).slice(0, 3),
    ],
    criteriaChecklist: unique(blocks.flatMap((b) => b.criteria)).slice(0, 12),
  };
}
