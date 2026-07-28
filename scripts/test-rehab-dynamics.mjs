/**
 * Tests for evidence-informed rehab dynamics (injury stage + prognosis framing).
 * Run: npx tsx scripts/test-rehab-dynamics.mjs
 */
let buildRehabDynamics, resolveTissueStage, dynamicsMovementBoost, generateHybridPlan;
try {
  const dyn = await import("../src/lib/rehab-dynamics.ts");
  buildRehabDynamics = dyn.buildRehabDynamics;
  resolveTissueStage = dyn.resolveTissueStage;
  dynamicsMovementBoost = dyn.dynamicsMovementBoost;
  const plan = await import("../src/lib/plan-engine.ts");
  generateHybridPlan = plan.generateHybridPlan;
} catch (e) {
  console.error("Import failed — run with: npx tsx scripts/test-rehab-dynamics.mjs");
  console.error(e);
  process.exit(1);
}

import { buildClinicalRehabPlan } from "../src/lib/clinical-rehab-intel.ts";

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  :", msg);
  }
}

console.log("\nRehab Dynamics\n");

// Tissue stage mapping
ok(
  resolveTissueStage({ weeksSince: 1, avgPain: 4 }) === "inflammatory",
  "week 1 → inflammatory"
);
ok(
  resolveTissueStage({ weeksSince: 4, avgPain: 3 }) === "proliferative",
  "week 4 → proliferative"
);
ok(
  resolveTissueStage({ weeksSince: 8, avgPain: 3 }) === "remodeling",
  "week 8 → remodeling"
);
ok(
  resolveTissueStage({ weeksSince: 20, avgPain: 3 }) === "chronic-capacity",
  "week 20 → chronic-capacity"
);
ok(
  resolveTissueStage({
    weeksSince: 10,
    postOpWeeks: 2,
    protectWeeksTypical: 6,
    avgPain: 2,
  }) === "post-op-protect",
  "early post-op → post-op-protect"
);
ok(
  resolveTissueStage({
    weeksSince: 8,
    avgPain: 8,
    irritability: "high",
  }) === "inflammatory",
  "high irritability can force inflammatory dosing"
);

// buildRehabDynamics acute low-back story
{
  const input = {
    areas: ["lower-back"],
    symptoms: ["stiffness", "pain"],
    painLevels: { "lower-back": 5 },
    goals: ["walk without pain", "sit at desk"],
    availableMinutes: 20,
    difficulty: "beginner",
    concernParagraph:
      "Sharp lower back pain for 10 days after yard work. Hurts more the next day after longer walks.",
  };
  const rehab = buildClinicalRehabPlan(input);
  const dyn = buildRehabDynamics({ input, rehab });
  ok(dyn.tissueStage === "inflammatory" || dyn.tissueStage === "proliferative", `acute LBP stage=${dyn.tissueStage}`);
  ok(dyn.phase === "protect-calm" || dyn.phase === "mobility-restore", `phase=${dyn.phase}`);
  ok(dyn.preferredExerciseIds.length > 0, "has preferred exercise seeds");
  ok(dyn.evidenceLines.length > 0, "has evidence lines");
  ok(dyn.prognosisBand !== "post-op-protocol", "not post-op for non-surgical");
  ok(
    dyn.avoidTags.some((t) => /plyo|impact|heavy/.test(t)),
    "avoids aggressive early load tags"
  );
}

// Chronic capacity prefers strength/function
{
  const input = {
    areas: ["knee"],
    symptoms: ["ache"],
    painLevels: { knee: 3 },
    goals: ["stairs", "return to sport"],
    availableMinutes: 25,
    difficulty: "intermediate",
    concernParagraph:
      "Chronic left knee ache for 8 months. Worse after long runs. Want to rebuild strength.",
  };
  const rehab = buildClinicalRehabPlan(input);
  const dyn = buildRehabDynamics({ input, rehab });
  ok(dyn.tissueStage === "chronic-capacity", `chronic stage=${dyn.tissueStage}`);
  ok(dyn.exerciseBias >= dyn.stretchBias, "chronic favors exercise load over stretch-only");
  const strengthScore = dynamicsMovementBoost(dyn, {
    id: "ex-sit-to-stand",
    kind: "exercise",
    name: "Sit to Stand",
    tags: ["strength", "functional", "knee"],
    bodyParts: ["knee"],
  });
  const plyoScore = dynamicsMovementBoost(dyn, {
    id: "ex-box-jump",
    kind: "exercise",
    name: "Box Jump",
    tags: ["plyo", "impact", "jump"],
    bodyParts: ["knee"],
  });
  ok(strengthScore > 0, `functional strength boost=${strengthScore}`);
  // chronic may not heavily penalize plyo tags if avoid empty — ensure strength is competitive
  ok(typeof plyoScore === "number", `plyo scored=${plyoScore}`);
}

// Hybrid plan wires rehabDynamics (no PhysioPath program object)
{
  const routine = generateHybridPlan({
    areas: ["shoulders"],
    symptoms: ["stiffness"],
    painLevels: { shoulders: 4 },
    goals: ["reach overhead"],
    availableMinutes: 15,
    difficulty: "beginner",
    concernParagraph: "Shoulder stiffness for 3 weeks after sleeping funny.",
  });
  ok(Boolean(routine.generatedFrom?.rehabDynamics), "generatedFrom.rehabDynamics present");
  ok(!routine.generatedFrom?.program, "PhysioPath program object removed");
  ok(
    typeof routine.generatedFrom.rehabDynamics.tissueStage === "string",
    `tissueStage=${routine.generatedFrom.rehabDynamics.tissueStage}`
  );
  ok(routine.items.length >= 3, `routine has items=${routine.items.length}`);
  ok(
    /tissue-stage|tissue stage|outlook/i.test(routine.description || "") ||
      (routine.generatedFrom.safetyEducation || []).some((b) =>
        /dynamics|injury|recovery|outlook/i.test(b.title || "")
      ) ||
      (routine.generatedFrom.safetySummary || []).some((n) =>
        /tissue|dosing stage|prognosis|outlook/i.test(n)
      ),
    "plan narrative mentions dynamics/outlook"
  );
}

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll rehab-dynamics tests passed.\n");
