/**
 * Labs parse + sport late-phase + vitals helpers
 * Run: npx tsx scripts/test-labs-sport-vitals.mjs
 */
import { parseLabText, parseLabCsv, parseLabJson } from "../src/lib/lab-parse.ts";
import { buildSportLatePhaseProgram } from "../src/lib/sport-late-phase.ts";
import { statusOf, VITAL_DEFS } from "../src/lib/vitals.ts";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else console.log("OK  :", msg);
}

// Labs text
{
  const t = parseLabText(`
    Hemoglobin 13.2
    Platelets 220
    Sodium 140
    Creatinine 0.9
    TSH 2.1
  `);
  assert(t.values.length >= 4, `text parse count ${t.values.length}`);
  assert(t.values.some((v) => v.key === "hemoglobin"), "hgb");
}

// CSV
{
  const t = parseLabCsv(`Test,Value\nPotassium,3.9\nGlucose,92\nINR,1.0`);
  assert(t.values.some((v) => v.key === "potassium"), "csv K");
  assert(t.values.some((v) => v.key === "glucose"), "csv glu");
}

// JSON
{
  const t = parseLabJson(JSON.stringify({ hemoglobin: 12.1, platelets: 180, date: "2026-01-15" }));
  assert(t.values.some((v) => v.key === "hemoglobin"), "json hgb");
  assert(t.collectedAt === "2026-01-15" || t.values.length >= 1, "json date or values");
}

// Sport late phase
{
  const p = buildSportLatePhaseProgram({
    sportIds: ["soccer", "running"],
    irritability: "low",
    earlyPostOp: false,
  });
  assert(!!p && p.allowed, "late phase allowed");
  assert(p.blocks.length >= 3, "multiple blocks");
  assert(p.preferredExerciseIds.length > 0, "exercise seeds");
  assert(p.criteriaChecklist.length >= 3, "criteria");
}

{
  const p = buildSportLatePhaseProgram({
    sportIds: ["basketball"],
    irritability: "high",
    earlyPostOp: false,
  });
  assert(!!p && !p.allowed, "high irr locks sport load");
}

// Vitals status
{
  const hr = VITAL_DEFS.find((d) => d.key === "heart_rate");
  assert(statusOf(hr, 72) === "normal", "hr normal");
  assert(statusOf(hr, 120) === "high", "hr high");
}

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nAll labs/sport/vitals tests passed.");
