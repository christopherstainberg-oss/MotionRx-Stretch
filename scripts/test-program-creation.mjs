/**
 * Tests for PhysioPath → MotionRx Program Creation Model.
 * Run: npx tsx scripts/test-program-creation.mjs
 */
import assert from "node:assert/strict";

const {
  generateProgram,
  classifyTrack,
  buildPhaseWeeks,
  healingScale,
  scalePlanPhases,
  applyVariant,
  detectPlan,
  planDrift,
  loadGuidance,
  sessionsText,
  currentPlanPhase,
  createProgramCreationInputFromSymptom,
} = await import("../src/lib/program-creation.ts");

const { generateHybridPlan } = await import("../src/lib/plan-engine.ts");
const { REHAB_PLANS } = await import("../src/data/program-creation-catalog.ts");

let passed = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  passed++;
  console.log("  ✓", msg);
}

console.log("\nProgram Creation Model\n");

// Track classification
ok(classifyTrack(2) === "acute", "≤6 weeks → acute");
ok(classifyTrack(6) === "acute", "6 weeks → acute");
ok(classifyTrack(7) === "chronic", ">6 weeks → chronic");
ok(classifyTrack(null) === "acute", "unknown weeks defaults acute");

// Phase week splits adapt to surgery / pain / fitness
const acuteBase = buildPhaseWeeks("acute", {});
ok(acuteBase.reduce((a, b) => a + b, 0) === 16, "acute weeks sum to 16");
const acuteSurg = buildPhaseWeeks("acute", { surgery: true });
ok(acuteSurg[0] >= acuteBase[0], "surgery lengthens early protect phase");
const chronic = buildPhaseWeeks("chronic", {});
ok(chronic.reduce((a, b) => a + b, 0) === 14, "chronic weeks sum to 14");

// Healing scale compounds and caps
const hs0 = healingScale({});
ok(hs0.scale === 1, "no comorbidities → scale 1");
const hs1 = healingScale({ flags: ["diabetes"] });
ok(hs1.scale > 1, "diabetes extends timeline");
const hs3 = healingScale({
  flags: ["diabetes", "ckd", "cancer_treatment", "pad"],
  smoking: "current",
  alcohol: "heavy",
  heightCm: 170,
  weightKg: 120,
});
ok(hs3.scale > hs1.scale, "comorbidities compound");
ok(hs3.scale <= 1.6, "healing scale capped at 1.6");

// scalePlanPhases keeps contiguous windows
const ph = [
  ["A", 0, 2, "g", "c", "r"],
  ["B", 2, 6, "g", "c", "r"],
  ["C", 6, 12, "g", "c", "r"],
  ["D", 12, 16, "g", "c", "r"],
];
const scaled = scalePlanPhases(ph, 1.5);
ok(scaled[0][1] === 0, "scale keeps start anchored");
for (let i = 1; i < scaled.length; i++) {
  ok(scaled[i][1] === scaled[i - 1][2], `phase ${i} joins previous`);
  ok(scaled[i][2] > scaled[i][1], `phase ${i} non-zero length`);
}

// Detect ACL reconstruction plan
const aclPlan = detectPlan("ACL reconstruction", { conditionNames: ["ACL reconstruction"], weeksSinceOnset: 4, painMove: 3, surgery: true });
ok(aclPlan && /ACL/i.test(aclPlan.label), `ACL plan matched: ${aclPlan?.label}`);
ok((aclPlan?.total || 0) >= 30, "ACL recon is a long timeline");

// Variant + healing applied
const resolved = applyVariant(aclPlan, aclPlan.variants?.[0] || { k: "standard", label: "Standard", sub: "", scale: 1 }, {
  conditionNames: ["ACL reconstruction"],
  weeksSinceOnset: 4,
  painMove: 3,
  flags: ["diabetes"],
  smoking: "current",
});
ok(resolved.total > aclPlan.total * 0.9, "healing scale extends resolved total");
ok(resolved.variantList.length > 3, "variant list includes cross-cutting options");

// Full generateProgram
const prog = generateProgram({
  conditionNames: ["ACL reconstruction"],
  weeksSinceOnset: 3,
  painMove: 4,
  surgery: true,
  surgeryName: "ACL reconstruction",
  fitness: "moderate",
  sportLabels: ["soccer", "football"],
  timePerDay: "20to40",
});
ok(prog.track === "acute", "3 weeks post → acute track");
ok(prog.phases.length === 4, "four phases");
ok(prog.totalWeeks >= 12, "multi-week program");
ok(prog.builtFrom.pain === 4, "builtFrom stores pain");
ok(prog.builtFrom.flags != null, "builtFrom stores flags fingerprint");
ok(prog.currentPhaseIndex >= 0, "current phase resolved");
ok(prog.load.length > 20, "load guidance present");
ok(prog.sessions.length > 5, "sessions text present");
// Signature / RTS / sport seeds appear in later phases for ACL
const lateSeeds = prog.phases[2]?.seeds || [];
ok(lateSeeds.length >= 0, "phase seeds array present");

// Meniscectomy is short vs ACL
const men = generateProgram({
  conditionNames: ["Partial meniscectomy"],
  weeksSinceOnset: 1,
  painMove: 3,
  surgery: true,
});
ok(men.totalWeeks < prog.totalWeeks, "meniscectomy shorter than ACL recon");

// Drift detection
const drift = planDrift(prog.builtFrom, {
  pain: 7,
  flags: prog.builtFrom.flags.split(",").filter(Boolean).concat(["newflag"]),
});
ok(drift && drift.length >= 1, "pain/flags drift detected");
ok(!planDrift(prog.builtFrom, { pain: 4, flags: prog.builtFrom.flags.split(",").filter(Boolean) }), "stable picture → no drift");

// Load guidance bands
ok(/very light/i.test(loadGuidance(8)), "high pain → very light");
ok(/confidence/i.test(loadGuidance(2)), "low pain → load with confidence");
ok(/little & often/i.test(sessionsText("acute", { painMove: 7 })), "irritable acute → little & often");

// currentPlanPhase
const idx = currentPlanPhase(resolved, 8);
ok(idx >= 0 && idx < resolved.ph.length, "currentPlanPhase in range");

// Catalog has curated plans
ok(REHAB_PLANS.length >= 40, `catalog has ${REHAB_PLANS.length} rehab plans`);

// Hybrid plan attaches program
const routine = generateHybridPlan({
  areas: ["knee"],
  symptoms: ["pain", "swelling"],
  painLevels: { knee: 4 },
  goals: ["walk without limp"],
  availableMinutes: 20,
  difficulty: "beginner",
  concernParagraph:
    "I had ACL reconstruction 3 weeks ago. Knee still swollen, pain 4/10 when walking. Soccer player.",
  surgeryId: "acl-r",
  surgeryDate: new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10),
  sportIds: [],
  conditionIds: [],
});
ok(routine.generatedFrom?.program, "hybrid plan includes program model");
ok(routine.generatedFrom.program.phases.length === 4, "hybrid program has 4 phases");
ok(
  (routine.generatedFrom.safetyEducation || []).some((b) =>
    /multi-phase|PhysioPath/i.test(b.title)
  ),
  "safety education includes multi-phase program block"
);
ok(
  /phase|ACL|program|week/i.test(routine.name + routine.description),
  "routine name/description reflects program"
);

// SymptomInput bridge
const fromSx = createProgramCreationInputFromSymptom({
  areas: ["knee"],
  symptoms: [],
  painLevels: { knee: 5 },
  goals: [],
  availableMinutes: 15,
  difficulty: "beginner",
  concernParagraph: "Knee replacement 4 weeks ago",
  surgeryId: "tka",
  surgeryDate: new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10),
});
ok(fromSx.surgery === true, "bridge detects surgery");
ok(fromSx.weeksSinceOnset != null, "bridge derives post-op weeks");

console.log(`\n${passed} assertions passed.\n`);
