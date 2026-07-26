/**
 * Anti-hallucination tests for Describe Your Issue intelligence.
 * Run: npx tsx scripts/test-story-intelligence.mjs
 * (uses dynamic import of compiled TS via tsx)
 */
import { createRequire } from "module";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Prefer tsx loader when available
let analyzeStoryIntelligence;
try {
  const mod = await import("../src/lib/story-intelligence.ts");
  analyzeStoryIntelligence = mod.analyzeStoryIntelligence;
} catch (e) {
  console.error("Failed to import story-intelligence.ts — run with: npx tsx scripts/test-story-intelligence.mjs");
  console.error(e);
  process.exit(1);
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  :", msg);
  }
}

// —— Pain number: never invent ——
{
  const s = analyzeStoryIntelligence(
    "I have severe sharp stabbing lower back pain that is moderate most days and mild sometimes."
  );
  assert(s.painNow == null, "no official painNow from severe/sharp/moderate/mild");
  assert(s.painWorst == null, "no official painWorst from qualitative words");
  assert(
    s.painEstimate?.source === "assumed" && s.painEstimate.now != null,
    `soft painEstimate allowed when no 0–10: ${JSON.stringify(s.painEstimate)}`
  );
  assert(
    s.liveReadLines.some((l) => /assumed|not stated|0–10/i.test(l)),
    "live read distinguishes assumed vs stated pain"
  );
}

{
  const s = analyzeStoryIntelligence("Lower back pain for 2 weeks after a workout. About 5 months of desk work.");
  assert(s.painNow == null, "does not harvest 2 from '2 weeks' or 5 from '5 months'");
  assert(s.painWorst == null, "no worst from duration numbers");
}

{
  const s = analyzeStoryIntelligence("My pain is 6/10 most of the day and worst 9/10 at night.");
  assert(s.painNow === 6, `explicit now=6, got ${s.painNow}`);
  assert(s.painWorst === 9, `explicit worst=9, got ${s.painWorst}`);
}

{
  const s = analyzeStoryIntelligence("I'd rate the pain at a 4.");
  assert(s.painNow === 4, `rated pain at 4, got ${s.painNow}`);
}

// —— Aggravators: never invent from bare mentions ——
{
  const s = analyzeStoryIntelligence(
    "I work at a desk and walk to the store. I also drive to work. My lower back hurts."
  );
  assert(
    s.aggravators.length === 0,
    `bare desk/walk/drive must not become stated aggravators, got: ${JSON.stringify(s.aggravators)}`
  );
  assert(
    s.functionalLimits.length === 0,
    `bare work/walk must not become functional limits, got: ${JSON.stringify(s.functionalLimits)}`
  );
  assert(
    s.assumedAggravators.length > 0,
    `soft assumed context from bare mentions: ${JSON.stringify(s.assumedAggravators)}`
  );
  assert(
    s.liveReadLines.some((l) => /assumed context|Aggravators:/i.test(l)),
    "live read discloses soft assumed context vs stated"
  );
}

{
  const s = analyzeStoryIntelligence(
    "My lower back is worse when sitting at my desk more than 20 minutes. Stairs make it worse going down."
  );
  assert(s.aggravators.includes("sitting/desk"), `sitting/desk from causal language: ${s.aggravators}`);
  assert(s.aggravators.includes("stairs"), `stairs from causal language: ${s.aggravators}`);
}

{
  const s = analyzeStoryIntelligence("Heat helps and ice eases it after activity. Stretching makes it better.");
  assert(s.easers.includes("heat"), `heat easer: ${s.easers}`);
  assert(s.easers.includes("ice/cold") || s.easers.some((e) => /ice/i.test(e)), `ice easer: ${s.easers}`);
  assert(s.easers.includes("stretching"), `stretching easer: ${s.easers}`);
}

{
  const s = analyzeStoryIntelligence("I use heat sometimes and I stretch in the morning. My hip aches.");
  assert(
    !s.easers.includes("heat") && !s.easers.includes("stretching"),
    `bare heat/stretch without help language must not be easers: ${JSON.stringify(s.easers)}`
  );
}

// —— Goals: not from bare activity words ——
{
  const s = analyzeStoryIntelligence("I walk and sleep and work. Left knee is stiff.");
  assert(
    s.goals.length === 0,
    `no invented goals from bare walk/sleep/work: ${JSON.stringify(s.goals)}`
  );
}

{
  const s = analyzeStoryIntelligence("I want to get back to running and sleep better.");
  assert(
    s.goals.some((g) => /sport|gym|run|sleep|stated/i.test(g)),
    `goal language extracts goals: ${JSON.stringify(s.goals)}`
  );
}

// —— Functional limits need limitation language ——
{
  const s = analyzeStoryIntelligence("I can't do stairs without holding the rail. Hard to put on socks.");
  assert(s.functionalLimits.includes("stairs") || s.aggravators.includes("stairs"), `stairs limit: ${s.functionalLimits}`);
  assert(
    s.functionalLimits.includes("dressing") || s.aggravators.includes("bending"),
    `dressing/bending from hard to socks: limits=${JSON.stringify(s.functionalLimits)} agg=${JSON.stringify(s.aggravators)}`
  );
}

// —— Sleep impact not from bare "sleep" ——
{
  const s = analyzeStoryIntelligence("I sleep about eight hours. Neck is tight.");
  assert(!s.sleepImpact, "bare sleep hours must not set sleepImpact");
}

{
  const s = analyzeStoryIntelligence("Night pain wakes me up and I can't get comfortable.");
  assert(s.sleepImpact, "night pain / can't get comfortable sets sleepImpact");
}

// —— Hybrid: stated fields pure; labeled assumptions fill gaps ——
{
  const s = analyzeStoryIntelligence("My lower back hurts.");
  assert(s.painNow == null, "no official painNow from silence");
  assert(s.aggravators.length === 0, "stated aggravators empty without causal language");
  assert(s.goals.length === 0, "stated goals empty");
  assert(
    s.irritability === "moderate" && s.irritabilitySource === "assumed",
    `thin story uses assumed moderate irritability, got ${s.irritability}/${s.irritabilitySource}`
  );
  assert(s.assumptions.length > 0, "assumptions ledger non-empty for gap fill");
  assert(
    s.liveReadLines.some((l) => /assumed/i.test(l)),
    "live read discloses assumptions"
  );
}

{
  const s = analyzeStoryIntelligence("Hip pain on the left side.");
  assert(s.regions.includes("hips"), `hip maps to hips: ${s.regions}`);
  assert(!s.regions.includes("groin"), "hip must not invent groin");
  assert(!s.regions.includes("glutes"), "hip must not invent glutes");
  assert(s.laterality === "left", `left side laterality: ${s.laterality}`);
}

{
  const s = analyzeStoryIntelligence("I left work early and my back hurts.");
  assert(s.laterality === "unknown", `bare “left work” is not laterality, got ${s.laterality}`);
}

{
  const s = analyzeStoryIntelligence("I use a hot pack. I'm feeling weak today about deadlines.");
  assert(!s.sensory.includes("burning"), `hot pack must not invent burning: ${s.sensory}`);
  assert(!s.sensory.includes("weakness/giving-way"), `weak about deadlines must not invent weakness: ${s.sensory}`);
}

{
  const s = analyzeStoryIntelligence(
    "I can't do stairs. Pain is 7/10 and worse the next day after I exercise."
  );
  assert(s.functionalLimits.includes("stairs") || s.aggravators.includes("stairs"), "stairs from can't");
  assert(s.painNow === 7, "explicit 7/10");
  assert(s.activityResponse === "delayed-worse", `delayed response: ${s.activityResponse}`);
  assert(s.irritability === "high" || s.irritability === "moderate", `evidence-based irritability: ${s.irritability}`);
  // Stated goals empty; assumed goals from limits are OK if labeled
  assert(s.goals.length === 0, "stated goals still empty without goal language");
  assert(
    s.assumedGoals.some((g) => /stairs/i.test(g)) || s.planHints.functionalGoals.some((g) => /stairs/i.test(g)),
    `assumed/plan goals may derive from stated stair limit: assumed=${JSON.stringify(s.assumedGoals)} plan=${JSON.stringify(s.planHints.functionalGoals)}`
  );
}

// —— Elite engine: completeness, ledger, dose, no invention ——
{
  const s = analyzeStoryIntelligence(
    "Left lower back is worse when sitting at my desk more than 20 minutes. Heat helps. Pain is 5/10 most of the day and worst 8/10. After exercise I feel better. I want to get back to hiking. It has been getting better over the last week."
  );
  assert(s.elite, "elite analysis attached");
  assert(typeof s.completeness === "number" && s.completeness >= 40, `completeness usable: ${s.completeness}`);
  assert(s.intelligenceGrade && s.intelligenceGrade !== "empty", `grade: ${s.intelligenceGrade}`);
  assert(s.aggravators.includes("sitting/desk"), "desk aggravator stated");
  assert(s.easers.includes("heat"), "heat easer stated");
  assert(s.painNow === 5 && s.painWorst === 8, `pain 5/8 got ${s.painNow}/${s.painWorst}`);
  assert(s.activityResponse === "better", `activity better: ${s.activityResponse}`);
  assert(s.trajectory === "improving", `trajectory improving: ${s.trajectory}`);
  assert(s.elite.evidence.length >= 4, `evidence ledger populated: ${s.elite.evidence.length}`);
  assert(
    s.elite.evidence.every((e) => e.quote && e.confidence > 0),
    "every evidence item has quote + confidence"
  );
  assert(s.adaptiveQuestions.length > 0, "elite adaptive questions present");
  assert(
    s.liveReadLines.some((l) => /Flight read|Telemetry|completeness/i.test(l)),
    "elite live read telemetry present"
  );
}

{
  const s = analyzeStoryIntelligence("My back hurts. Pain is 2/10 but it is unbearable and excruciating.");
  assert(s.conflicts && s.conflicts.length > 0, `conflict detected for mild number + severe words: ${s.conflicts}`);
  assert(s.painNow === 2, "still records explicit 2/10 without inventing higher");
}

{
  const rich = analyzeStoryIntelligence(
    "Right knee. Sharp pain 6/10. Worse when going down stairs. Hard to walk to the mailbox. Ice helps. Worse the next day after long walks. Goal: return to running. Started gradually over months."
  );
  const thin = analyzeStoryIntelligence("ouch knee");
  assert(
    (rich.completeness || 0) > (thin.completeness || 0),
    `rich completeness ${rich.completeness} > thin ${thin.completeness}`
  );
  assert(rich.elite?.doseEnvelope, "dose envelope present on rich story");
  assert(
    rich.elite.criticalGaps.every((g) => g.askNext && g.why),
    "critical gaps have why + askNext"
  );
}

console.log("\n" + (failed ? `${failed} failed` : "All tests passed."));
process.exit(failed ? 1 : 0);
