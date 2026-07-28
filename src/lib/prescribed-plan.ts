/**
 * Licensed-PT-style prescribed plan of care (educational).
 * Structures problem list → goals → interventions → dosing → progression
 * aligned with outpatient HEP standards and functional outcome tracking.
 */

import type { Difficulty, Routine, SymptomInput } from "@/lib/types";
import { getStretchById } from "@/data/stretch-library";
import { getExerciseById } from "@/data/exercise-library";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import {
  buildClinicalRehabPlan,
  type ClinicalRehabPlan,
} from "@/lib/clinical-rehab-intel";
import { displayPreferredName, type AssessmentCoachContext } from "@/lib/assessment-coach";
import { generateHybridPlan, adjustRoutineFromFeedback } from "@/lib/plan-engine";

export type PrescribedPlanDocument = {
  title: string;
  preferredName: string;
  /** Full multi-section written prescription */
  fullText: string;
  sections: Array<{ heading: string; body: string }>;
  /** Measurable functional outcomes to track */
  outcomeMeasures: Array<{
    label: string;
    baselineHint: string;
    targetHint: string;
    timeframe: string;
  }>;
  /** Pain-related goals */
  painGoals: {
    currentOverall: number;
    targetOverall: number;
    rule: string;
  };
  frequency: string;
  durationWeeks: string;
  sessionMinutes: number;
  phase: string;
  patterns: string[];
  agreedAt?: string;
  userAdaptationNotes?: string;
  version: number;
};

/**
 * Build a prescribed written plan a user can review and agree to.
 */
export function buildPrescribedPlanDocument(opts: {
  routine: Routine;
  input: SymptomInput;
  coach: AssessmentCoachContext;
  rehab?: ClinicalRehabPlan;
}): PrescribedPlanDocument {
  const { routine, input, coach } = opts;
  const rehab =
    opts.rehab ||
    buildClinicalRehabPlan({
      ...input,
      painDescriptorIds: routine.generatedFrom?.painDescriptorIds || input.painDescriptorIds,
      conditionIds: routine.generatedFrom?.conditionIds || input.conditionIds,
    });

  const name = displayPreferredName(coach.preferredName);
  const areas = (routine.focusAreas?.length ? routine.focusAreas : input.areas || []).map(
    (a) => BODY_PART_LABELS[a] || a
  );
  const painVals = Object.values(input.painLevels || {}).filter(
    (n): n is number => typeof n === "number"
  );
  const currentPain =
    painVals.length > 0
      ? Math.round((painVals.reduce((a, b) => a + b, 0) / painVals.length) * 10) / 10
      : 3;
  const targetPain = Math.max(0, Math.min(currentPain, Math.max(0, currentPain - 2)));

  const moves = routine.items.map((item, i) => {
    const m =
      item.kind === "stretch"
        ? getStretchById(item.movementId)
        : getExerciseById(item.movementId);
    return `${i + 1}. ${item.kind === "stretch" ? "Mobility" : "Exercise"} — ${m?.name || item.movementId}`;
  });

  const outcomes = (routine.generatedFrom?.clinicalOutcomes || []).slice(0, 4);
  const outcomeMeasures =
    outcomes.length > 0
      ? outcomes.map((o) => ({
          label: o.label,
          baselineHint: o.measureHint,
          targetHint: `Meaningful improvement in “${o.label}” with consistent dosing`,
          timeframe: o.timeframe,
        }))
      : rehab.outcomeFocus.slice(0, 4).map((label) => ({
          label,
          baselineHint: "Rate ease of this task 0–10 today",
          targetHint: "Aim for ≥2-point ease improvement or less pain during the task",
          timeframe: "Often 2–6 weeks of consistent, tolerable practice",
        }));

  const sections: PrescribedPlanDocument["sections"] = [
    {
      heading: "1. Clinical problem focus (why this plan)",
      body: [
        coach.paragraph.trim()
          ? `Your story: “${coach.paragraph.trim().slice(0, 280)}${coach.paragraph.trim().length > 280 ? "…" : ""}”`
          : "Your Assessment intake drives this prescription.",
        `Priority regions: ${areas.slice(0, 5).join(", ") || "as assessed"}.`,
        currentPain != null ? `Reported pain burden ~${currentPain}/10 (area-averaged or story-based).` : "",
        rehab.patterns.length
          ? `Clinical patterns guiding care: ${rehab.patterns.map((p) => p.replace(/-/g, " ")).join("; ")}.`
          : "",
        coach.pastMedicalHistory
          ? `Past medical history considered: ${coach.pastMedicalHistory.slice(0, 180)}.`
          : "",
        coach.currentMedicalHistory
          ? `Current medical history considered: ${coach.currentMedicalHistory.slice(0, 180)}.`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    },
    {
      heading: "2. Goals of care (positive functional outcomes)",
      body: [
        `Primary goals: ${(input.goals || []).slice(0, 4).join(", ") || "reduce pain interference and restore daily mobility"}.`,
        `Pain goal: reduce overall movement-related pain from ~${currentPain}/10 toward ≤${targetPain}/10 while improving function—not resting completely.`,
        `Functional outcomes to track: ${outcomeMeasures.map((o) => o.label).join("; ")}.`,
        "Success is defined as better task ease (sit, stand, walk, reach, sleep) and fewer flare-ups—not a single “perfect” stretch.",
      ].join(" "),
    },
    {
      heading: "3. Plan of care phase (licensed-PT style problem solving)",
      body: [
        `Phase: ${rehab.summaryLines.find((s) => /phase/i.test(s)) || rehab.phase.replace(/-/g, " ")}.`,
        `Session blueprint: ${rehab.sessionBlueprint.join(" → ")}.`,
        "Clinical reasoning: irritability and pain guide volume; protected mobility and motor control first when irritable; progressive loading when symptoms settle within ~24 hours (traffic-light dosing).",
        "This mirrors outpatient PT prioritization: protect → restore range → control → capacity → function.",
      ].join(" "),
    },
    {
      heading: "3b. Injury dynamics & recovery framing (evidence-informed)",
      body: (() => {
        const dyn = routine.generatedFrom?.rehabDynamics;
        if (!dyn) {
          return [
            "Exercise choice is shaped by tissue stage (inflammatory → proliferative → remodeling → capacity), irritability, onset/post-op timing, and common outpatient PT load-management rules.",
            "High irritability or early post-op → protect, gentle motion, isometrics; settled chronic presentations → progressive loading and graded exposure.",
            "Educational framing only — surgeon/PT protocol always overrides; not a personal medical prognosis.",
          ].join(" ");
        }
        const lines = [
          `Tissue dosing stage: ${String(dyn.tissueStage).replace(/-/g, " ")}`,
          `Session phase: ${String(dyn.phase).replace(/-/g, " ")}`,
          `Outlook framing: ${String(dyn.prognosisBand).replace(/-/g, " ")} (population-level education, not a personal forecast)`,
          dyn.weeksSince != null
            ? `Onset framing ~${dyn.weeksSince} weeks (educational stage map)`
            : null,
          dyn.postOpWeeks != null ? `Post-op week ~${dyn.postOpWeeks}` : null,
          ...(dyn.summaryLines || []).slice(0, 4),
          ...(dyn.evidenceLines || []).slice(0, 4),
          ...(dyn.prognosisLines || []).slice(0, 2),
          "",
          "Progress by 24-hour symptom response and task ease, not calendar alone. Surgeon/PT protocol always overrides.",
        ].filter(Boolean);
        return lines.join("\n");
      })(),
    },
    {
      heading: "4. Prescribed home exercise program (interventions)",
      body: [
        `Prescribed routine: “${routine.name}” — ~${routine.estimatedMinutes} minutes · ${routine.difficulty} · ${routine.items.length} items${
          routine.homeBasedProgram ? " · home-friendly variations" : ""
        }.`,
        moves.length ? `Interventions:\n${moves.join("\n")}` : "Interventions generated from your intake.",
        "Perform with quality form; follow written steps and institutional education videos for technique cues.",
      ].join("\n"),
    },
    {
      heading: "5. Dosing, frequency, and progression (to shorten rehab time safely)",
      body: [
        `Frequency: most days of the week (target 5–6 days), about ${routine.estimatedMinutes} minutes per session.`,
        "Duration: reassess in 2 weeks; many mobility and pain-interference gains appear in 2–6 weeks when dosing is consistent and flare-aware.",
        "Progression rule: if pain rises ≤2/10 during work and settles by next day → maintain or small progress. If worse >24h, sharp/radiating, or night pain escalates → ease range/volume 30–50% (regress).",
        "Traffic lights: Green = proceed; Yellow = modify (shorter hold, less range, more rest); Red = stop that item and protect.",
        rehab.evidenceNotes.slice(0, 3).join(" "),
      ]
        .filter(Boolean)
        .join(" "),
    },
    {
      heading: "6. Safety & when to seek licensed care",
      body: [
        "Educational plan only—not a medical diagnosis or replacement for evaluation by a licensed physical therapist or physician.",
        "Seek urgent care for red flags: unexplained progressive weakness, bowel/bladder change, saddle numbness, fever with severe back pain, chest pain, trauma with inability to bear weight, or post-op protocol violations.",
        (routine.generatedFrom?.safetySummary || []).slice(0, 4).join(" "),
      ]
        .filter(Boolean)
        .join(" "),
    },
    {
      heading: "7. Your agreement & shared decision-making",
      body: `${name}, review this prescribed plan. Check the agreement box if you understand and consent to follow this educational HEP. You may request changes in free text (easier/harder, shorter sessions, focus more on a body region, avoid certain moves). The application will reconfigure the routine using the same clinical rules a PT uses: pain irritability, injury pattern, and functional goals.`,
    },
  ];

  const fullText = [
    `PRESCRIBED MOBILITY PLAN OF CARE — MotionRx Stretch (Educational)`,
    `Patient-preferred name: ${name}`,
    `Plan title: ${routine.name}`,
    "",
    ...sections.flatMap((s) => [s.heading, s.body, ""]),
    "I understand this is educational support and not a substitute for licensed clinical care.",
  ].join("\n");

  return {
    title: `Prescribed plan: ${routine.name}`,
    preferredName: name,
    fullText,
    sections,
    outcomeMeasures,
    painGoals: {
      currentOverall: currentPain,
      targetOverall: targetPain,
      rule: "Reduce pain interference while improving a daily task; do not chase zero pain at the cost of all movement.",
    },
    frequency: "5–6 days/week (most days), quality over intensity",
    durationWeeks: routine.generatedFrom?.rehabDynamics
      ? `Tissue stage “${routine.generatedFrom.rehabDynamics.tissueStage}”; outlook “${routine.generatedFrom.rehabDynamics.prognosisBand}” (educational); 2-week check-in`
      : "2-week check-in; 2–6 week functional window for many goals",
    sessionMinutes: routine.estimatedMinutes,
    phase: routine.generatedFrom?.rehabDynamics?.phase || rehab.phase,
    patterns: rehab.patterns,
    version: 1,
  };
}

export type PlanAdaptationIntent = {
  /** User free-text request */
  raw: string;
  easier: boolean;
  harder: boolean;
  shorter: boolean;
  longer: boolean;
  moreStretch: boolean;
  moreExercise: boolean;
  moreBalance: boolean;
  focusTokens: string[];
  avoidTokens: string[];
  painUp: boolean;
  painDown: boolean;
  notes: string[];
};

/**
 * Parse free-text plan adaptation requests (PT-style change orders).
 */
export function parsePlanAdaptationRequest(text: string): PlanAdaptationIntent {
  const t = text.toLowerCase().trim();
  const notes: string[] = [];
  const focusTokens: string[] = [];
  const avoidTokens: string[] = [];

  const easier =
    /easier|too hard|gentler|less intense|regress|scale back|reduce|simplify|flare|irritat|hurt more/.test(
      t
    );
  const harder =
    /harder|progress|more challenge|stronger|advance|increase intensity|too easy|level up/.test(t);
  const shorter = /shorter|less time|quick|5 min|10 min|busy|less minutes/.test(t);
  const longer = /longer|more time|20 min|30 min|extend session/.test(t);
  const moreStretch = /more stretch|more mobility|more flexible|looser|tight/.test(t);
  const moreExercise = /more strength|more exercise|stronger|activation|weak/.test(t);
  const moreBalance = /balance|fall|unsteady|stable/.test(t);
  const painUp = /pain (is )?(up|higher|worse|increased)|hurts more|flare/.test(t);
  const painDown = /pain (is )?(down|lower|better|improved)|feeling better/.test(t);

  const regionMap: Array<[RegExp, string]> = [
    [/low(er)? back|lumbar|spine/, "lower-back"],
    [/neck|cervical/, "neck"],
    [/shoulder/, "shoulders"],
    [/hip|glute/, "hips"],
    [/knee/, "knee"],
    [/ankle|foot|plantar/, "ankles"],
    [/hamstring/, "hamstrings"],
    [/thoracic|mid[- ]back|upper back/, "thoracic"],
    [/wrist|hand/, "wrists"],
    [/core|abs/, "core"],
  ];
  for (const [re, token] of regionMap) {
    if (re.test(t)) {
      if (/avoid|skip|no more|don'?t|stop|remove/.test(t)) avoidTokens.push(token);
      else focusTokens.push(token);
    }
  }

  if (easier) notes.push("User requested easier / less irritable dosing");
  if (harder) notes.push("User requested progression / more challenge");
  if (shorter) notes.push("User requested shorter sessions");
  if (longer) notes.push("User requested longer sessions");
  if (moreStretch) notes.push("Bias toward mobility");
  if (moreExercise) notes.push("Bias toward strength/control");
  if (focusTokens.length) notes.push(`Focus: ${focusTokens.join(", ")}`);
  if (avoidTokens.length) notes.push(`Avoid emphasis: ${avoidTokens.join(", ")}`);

  return {
    raw: text.trim(),
    easier: easier || painUp,
    harder: harder && !painUp,
    shorter,
    longer,
    moreStretch,
    moreExercise,
    moreBalance,
    focusTokens,
    avoidTokens,
    painUp,
    painDown,
    notes,
  };
}

/**
 * Apply free-text adaptation to SymptomInput (for regenerating a prescribed plan).
 */
export function applyAdaptationToInput(
  base: SymptomInput,
  intent: PlanAdaptationIntent
): SymptomInput {
  const next: SymptomInput = {
    ...base,
    areas: [...(base.areas || [])],
    goals: [...(base.goals || [])],
    symptoms: [...(base.symptoms || [])],
    painLevels: { ...(base.painLevels || {}) },
  };

  // Difficulty
  const rank: Record<Difficulty, number> = { beginner: 1, intermediate: 2, advanced: 3 };
  const unrank = (n: number): Difficulty =>
    n <= 1 ? "beginner" : n === 2 ? "intermediate" : "advanced";
  let d = rank[next.difficulty] || 1;
  if (intent.easier || intent.painUp) d = Math.max(1, d - 1);
  if (intent.harder && !intent.painUp) d = Math.min(3, d + 1);
  next.difficulty = unrank(d);

  // Minutes
  let mins = next.availableMinutes || 15;
  if (intent.shorter) mins = Math.max(6, Math.round(mins * 0.7));
  if (intent.longer) mins = Math.min(45, Math.round(mins * 1.25));
  next.availableMinutes = mins;

  // Kind preference
  if (intent.moreStretch && !intent.moreExercise) next.preferKinds = ["stretch", "exercise"];
  if (intent.moreExercise && !intent.moreStretch) next.preferKinds = ["exercise", "stretch"];
  if (intent.moreBalance) {
    next.goals = Array.from(new Set([...(next.goals || []), "improve balance"]));
    next.symptoms = Array.from(new Set([...(next.symptoms || []), "imbalance"]));
  }

  // Focus areas from free text
  const bodyMap: Record<string, SymptomInput["areas"][number]> = {
    "lower-back": "lower-back",
    neck: "neck",
    shoulders: "shoulders",
    hips: "hips",
    knee: "knee",
    ankles: "ankles",
    hamstrings: "hamstrings",
    thoracic: "thoracic",
    wrists: "wrists",
    core: "core",
  };
  for (const t of intent.focusTokens) {
    const bp = bodyMap[t];
    if (bp && !next.areas.includes(bp)) next.areas.unshift(bp);
  }

  // Pain levels: bump if pain up for focused areas
  if (intent.painUp) {
    const targets = next.areas.length ? next.areas : (["full-body"] as const);
    for (const a of targets) {
      const cur = next.painLevels[a] ?? 4;
      next.painLevels[a] = Math.min(10, cur + 1);
    }
  }
  if (intent.painDown) {
    for (const a of Object.keys(next.painLevels) as Array<keyof typeof next.painLevels>) {
      const cur = next.painLevels[a];
      if (typeof cur === "number") next.painLevels[a] = Math.max(0, cur - 1);
    }
  }

  // Append adaptation note into protocol / concern for re-parse richness
  const adaptNote = `User plan adaptation request: ${intent.raw}`;
  next.protocolNotes = [next.protocolNotes, adaptNote].filter(Boolean).join("\n");
  next.concernParagraph = [next.concernParagraph, adaptNote].filter(Boolean).join("\n\n");

  return next;
}

/**
 * Reconfigure prescribed routine from user free-text request.
 * Uses PT-style rules: pain irritability, difficulty, volume, region focus.
 */
export function reconfigurePrescribedPlan(opts: {
  baseInput: SymptomInput;
  currentRoutine: Routine;
  adaptationText: string;
  coach: AssessmentCoachContext;
}): {
  routine: Routine;
  input: SymptomInput;
  prescribed: PrescribedPlanDocument;
  intent: PlanAdaptationIntent;
  changeSummary: string;
} {
  const intent = parsePlanAdaptationRequest(opts.adaptationText);
  const input = applyAdaptationToInput(opts.baseInput, intent);

  // Start from a fresh hybrid plan with adapted clinical inputs
  let routine = generateHybridPlan(input, opts.currentRoutine.userId);

  // If user reported pain up / easier, also run feedback adjuster for extra safety
  if (intent.easier || intent.painUp) {
    const pain = Math.min(
      10,
      Object.values(input.painLevels || {}).reduce((a, b) => a + (b || 0), 0) /
        Math.max(1, Object.keys(input.painLevels || {}).length) || 5
    );
    routine = adjustRoutineFromFeedback(routine, {
      averagePainBefore: pain,
      averagePainAfter: Math.min(10, pain + (intent.painUp ? 1 : 0)),
      difficultyFelt: intent.easier ? 5 : 3,
    });
  } else if (intent.harder) {
    routine = adjustRoutineFromFeedback(routine, {
      averagePainBefore: 2,
      averagePainAfter: 2,
      difficultyFelt: 1,
    });
  }

  const prescribed = buildPrescribedPlanDocument({
    routine,
    input,
    coach: {
      ...opts.coach,
      paragraph: input.concernParagraph || opts.coach.paragraph,
      minutes: input.availableMinutes,
      difficulty: input.difficulty,
      preferKinds: input.preferKinds === "auto" ? "auto" : input.preferKinds || "auto",
      areas: input.areas,
      painLevels: input.painLevels,
      goals: input.goals,
    },
  });
  prescribed.userAdaptationNotes = intent.raw;
  prescribed.version = (opts.currentRoutine.generatedFrom as { planVersion?: number } | undefined)
    ?.planVersion
    ? Number((opts.currentRoutine.generatedFrom as { planVersion?: number }).planVersion) + 1
    : 2;

  routine = {
    ...routine,
    generatedFrom: {
      ...routine.generatedFrom!,
      writtenApproach: prescribed.fullText,
      preferredName: prescribed.preferredName,
      concernParagraph: input.concernParagraph,
    },
    selfAdjustHistory: [
      ...(routine.selfAdjustHistory || []),
      {
        at: new Date().toISOString(),
        reason: "User-adapted prescribed plan (free-text reconfiguration)",
        painFactor: prescribed.painGoals.currentOverall,
        action: intent.easier || intent.painUp ? "regress" : intent.harder ? "progress" : "modify",
        details: intent.notes.join("; ") || intent.raw,
        source: "user",
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  const changeSummary =
    intent.notes.length > 0
      ? `Reconfigured plan: ${intent.notes.join("; ")}.`
      : "Reconfigured plan from your free-text request using clinical dosing rules.";

  return { routine, input, prescribed, intent, changeSummary };
}
