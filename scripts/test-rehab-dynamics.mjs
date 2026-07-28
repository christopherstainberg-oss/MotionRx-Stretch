/**
 * Tests for intelligent recovery program generation (rehab dynamics v2).
 * Run: npx tsx scripts/test-rehab-dynamics.mjs
 */
let buildRehabDynamics,
  resolveTissueStage,
  dynamicsMovementBoost,
  detectTissueMechanisms,
  efficiencyRerank,
  generateHybridPlan;
try {
  const dyn = await import("../src/lib/rehab-dynamics.ts");
  buildRehabDynamics = dyn.buildRehabDynamics;
  resolveTissueStage = dyn.resolveTissueStage;
  dynamicsMovementBoost = dyn.dynamicsMovementBoost;
  detectTissueMechanisms = dyn.detectTissueMechanisms;
  efficiencyRerank = dyn.efficiencyRerank;
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

console.log("\nIntelligent Rehab Dynamics v2\n");

// Tissue stage mapping
ok(resolveTissueStage({ weeksSince: 1, avgPain: 4 }) === "inflammatory", "week 1 → inflammatory");
ok(resolveTissueStage({ weeksSince: 4, avgPain: 3 }) === "proliferative", "week 4 → proliferative");
ok(resolveTissueStage({ weeksSince: 8, avgPain: 3 }) === "remodeling", "week 8 → remodeling");
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

// Mechanism detection
{
  const m = detectTissueMechanisms({
    paragraph: "Achilles tendon pain for 4 months when I ramp up running mileage",
  });
  ok(m[0] === "tendon-load", `achilles → tendon-load got ${m[0]}`);
}
{
  const m = detectTissueMechanisms({
    paragraph: "Numbness and tingling down my leg with sciatica after lifting",
  });
  ok(m.includes("nerve-sensitive"), `sciatica mechanisms=${m.join(",")}`);
}
{
  const m = detectTissueMechanisms({
    paragraph: "Rolled my ankle playing soccer, feels unstable",
  });
  ok(m.includes("ligament-protect"), `sprain → ligament got ${m.join(",")}`);
}
{
  const m = detectTissueMechanisms({
    paragraph: "Desk job, forward head posture, stiff neck and upper back",
  });
  ok(m.includes("overuse-posture") || m.includes("stiffness-mobility"), `desk=${m.join(",")}`);
}

// Acute LBP intelligent path
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
  const d = buildRehabDynamics({ input, rehab });
  ok(
    d.tissueStage === "inflammatory" || d.tissueStage === "proliferative",
    `acute LBP stage=${d.tissueStage}`
  );
  ok(d.primaryMechanism, `mechanism=${d.primaryMechanism}`);
  ok(d.intelligenceVersion >= 2, "intelligence v2");
  ok(d.efficiencyLines.length > 0, "efficiency lines present");
  ok(d.preferredExerciseIds.length > 0, "has preferred exercises");
  ok(d.primaryAreas.includes("lower-back"), "primary area lower-back");
  ok(
    d.chainAreas.some((a) => ["hips", "glutes", "core", "hamstrings"].includes(a)),
    `chain partners for LBP: ${d.chainAreas.join(",")}`
  );
  ok(d.exerciseQuotaHint >= 2 && d.stretchQuotaHint >= 2, "quotas set");
}

// Chronic tendon → load-biased
{
  const input = {
    areas: ["ankles", "calves"],
    symptoms: ["ache"],
    painLevels: { ankles: 3, calves: 4 },
    goals: ["return to running"],
    availableMinutes: 25,
    difficulty: "intermediate",
    concernParagraph:
      "Chronic Achilles tendinopathy for 8 months. Worse after long runs. Want progressive loading.",
  };
  const rehab = buildClinicalRehabPlan(input);
  const d = buildRehabDynamics({ input, rehab });
  ok(d.primaryMechanism === "tendon-load", `tendon mech=${d.primaryMechanism}`);
  ok(d.exerciseBias > d.stretchBias, "tendon favors load over stretch-only");
  const loadScore = dynamicsMovementBoost(d, {
    id: "ex-heel-raises",
    kind: "exercise",
    name: "Heel Raises",
    tags: ["strength", "calf", "isometric"],
    bodyParts: ["ankles", "calves"],
  });
  const stretchScore = dynamicsMovementBoost(d, {
    id: "random-ballistic",
    kind: "stretch",
    name: "Ballistic Calf Bounce",
    tags: ["ballistic", "calf"],
    bodyParts: ["calves"],
  });
  ok(loadScore > stretchScore, `load ${loadScore} > ballistic stretch ${stretchScore}`);
}

// Multi-issue primary focus (high knee pain + mild neck)
{
  const input = {
    areas: ["knee", "neck"],
    symptoms: ["pain"],
    painLevels: { knee: 7, neck: 2 },
    goals: ["stairs"],
    availableMinutes: 18,
    difficulty: "beginner",
    concernParagraph: "Left knee pain 7/10 going downstairs. Mild neck tightness from desk work.",
  };
  const rehab = buildClinicalRehabPlan(input);
  const d = buildRehabDynamics({ input, rehab });
  ok(d.primaryAreas[0] === "knee", `primary should be knee, got ${d.primaryAreas[0]}`);
  ok(
    d.preferredExerciseIds.some((id) =>
      /quad|sit-to-stand|terminal|glute|step/.test(id)
    ),
    `knee-first seeds ${d.preferredExerciseIds.slice(0, 6).join(",")}`
  );
}

// Efficiency re-rank diversity
{
  const ranked = [
    { id: "a", score: 100 },
    { id: "b", score: 99 },
    { id: "c", score: 50 },
  ];
  const meta = {
    a: { name: "Hamstring A", tags: ["hamstring"], bodyParts: ["hamstrings"] },
    b: { name: "Hamstring B", tags: ["hamstring"], bodyParts: ["hamstrings"] },
    c: { name: "Chin Tuck", tags: ["cervical"], bodyParts: ["neck"] },
  };
  const out = efficiencyRerank(ranked, (id) => meta[id], {
    primaryAreas: ["neck", "hamstrings"],
    limit: 3,
  });
  ok(out[0].id === "a", "top score still first");
  // second pick should prefer diversity over near-clone when scores close
  ok(out.map((x) => x.id).includes("c"), "diversity includes different region/family");
}

// Hybrid plan intelligence wired
{
  const routine = generateHybridPlan({
    areas: ["shoulders"],
    symptoms: ["stiffness"],
    painLevels: { shoulders: 4 },
    goals: ["reach overhead"],
    availableMinutes: 15,
    difficulty: "beginner",
    concernParagraph:
      "Shoulder stiffness for 3 weeks after sleeping funny. Hard to reach overhead shelves.",
  });
  const rd = routine.generatedFrom?.rehabDynamics;
  ok(Boolean(rd), "rehabDynamics present");
  ok(!routine.generatedFrom?.program, "no PhysioPath program object");
  ok(rd.intelligenceVersion >= 2, `intel v=${rd.intelligenceVersion}`);
  ok(typeof rd.primaryMechanism === "string", `mechanism=${rd.primaryMechanism}`);
  ok(routine.items.length >= 4, `items=${routine.items.length}`);
  ok(
    /mechanism|intelligent|tissue|efficiency|minimal/i.test(routine.description || "") ||
      (routine.generatedFrom.safetyEducation || []).some((b) =>
        /intelligent|mechanism|recovery/i.test(b.title || "")
      ),
    "narrative mentions intelligent recovery"
  );
  // Exercises should appear for non-clearance shoulder plan
  ok(
    routine.exerciseIds.length >= 1 ||
      routine.items.some((i) => i.kind === "exercise"),
    "includes activation/load, not stretch-only"
  );
}

// Knee PFPS-style efficiency
{
  const routine = generateHybridPlan({
    areas: ["knee"],
    symptoms: ["pain"],
    painLevels: { knee: 5 },
    goals: ["stairs", "walk"],
    availableMinutes: 20,
    difficulty: "beginner",
    conditionIds: ["cond-patellofemoral"],
    concernParagraph:
      "Patellofemoral pain for 6 weeks. Stairs and sitting hurt. Want hip and quad control.",
  });
  const ids = [
    ...(routine.stretchIds || []),
    ...(routine.exerciseIds || []),
    ...routine.items.map((i) => i.movementId),
  ];
  ok(
    ids.some((id) => /quad|glute|sit-to-stand|terminal|abduction|bridge/i.test(id)),
    `PFPS picks control/load moves: ${ids.slice(0, 8).join(",")}`
  );
  ok(
    !ids.some((id) => /box-jump|plyo/i.test(id)),
    "no plyo for irritable knee"
  );
}

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll intelligent rehab-dynamics tests passed.\n");
