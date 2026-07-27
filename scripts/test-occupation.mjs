/**
 * Occupation parse + story integration tests.
 * Run: npx tsx scripts/test-occupation.mjs
 */
import { parseOccupation, occupationLiveLines } from "../src/lib/occupation.ts";
import { analyzeStoryIntelligence } from "../src/lib/story-intelligence.ts";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  :", msg);
  }
}

// Desk
{
  const o = parseOccupation("I have a desk job and sit at a computer all day. Neck stiff.");
  assert(o.source === "stated" && o.category === "desk", `desk ${o.category}`);
  assert(o.preferTags.includes("posture") || o.preferTags.includes("desk"), "desk tags");
  assert(o.preferredStretchIds.includes("chin-tuck"), "desk chin-tuck");
}

// Labor
{
  const o = parseOccupation("I work construction and do heavy lifting at work. Low back hurts.");
  assert(o.source === "stated" && o.category === "labor", `labor ${o.category}`);
  assert(o.preferTags.some((t) => /hinge|glute|core/.test(t)), "labor tags");
}

// Healthcare
{
  const o = parseOccupation("I'm a nurse on 12-hour shifts with patient care and charting.");
  assert(o.source === "stated" && o.category === "healthcare", `healthcare ${o.category}`);
}

// Driving
{
  const o = parseOccupation("I'm a truck driver and sit behind the wheel for hours.");
  assert(o.source === "stated" && o.category === "driving", `driving ${o.category}`);
}

// Student
{
  const o = parseOccupation("I'm a college student studying for exams with a heavy backpack.");
  assert(o.source === "stated" && o.category === "student", `student ${o.category}`);
}

// Retired
{
  const o = parseOccupation("I'm retired and want to walk more without hip pain.");
  assert(o.source === "stated" && o.category === "retired", `retired ${o.category}`);
}

// Unknown without framing
{
  const o = parseOccupation("My knee hurts on stairs.");
  assert(o.source === "unknown", "unknown without occupation");
  assert(o.askIfMissing.length > 20, "ask if missing");
}

// Story integration
{
  const s = analyzeStoryIntelligence(
    "Right shoulder pain for 4 weeks. I work a desk job on Zoom all day. Pain 4/10. Want easier overhead reach.",
    { preferredName: "Sam" }
  );
  assert(s.occupation.source === "stated", "story occupation stated");
  assert(s.occupation.category === "desk", `story cat ${s.occupation.category}`);
  assert(s.coveredThemes.includes("occupation"), "theme covered");
  assert(
    s.planHints.preferTags.some((t) => /desk|posture|thoracic|scapular/.test(t)),
    `plan tags ${s.planHints.preferTags.join(",")}`
  );
  assert(
    s.planHints.evidenceLines.some((l) => /Occupation/i.test(l)),
    "evidence line"
  );
  assert(
    s.liveReadLines.some((l) => /Occupation/i.test(l)),
    `live read ${s.liveReadLines.join(" | ")}`
  );
  assert(
    s.adaptiveQuestions.some((q) => q.theme === "occupation" || /desk|screen|minutes/i.test(q.question)),
    "occupation adaptive deepen"
  );
  assert(occupationLiveLines(s.occupation).length >= 1, "live lines helper");
}

// Missing occupation → adaptive ask
{
  const s = analyzeStoryIntelligence(
    "Low back pain 5/10 for 3 weeks after lifting boxes at home. Stairs hard going down.",
    { preferredName: "Alex" }
  );
  assert(s.occupation.source === "unknown", "no false occupation");
  assert(
    s.adaptiveQuestions.some((q) => q.id.includes("occupation") || /work or school day/i.test(q.question)),
    "asks for occupation"
  );
}

if (failed) {
  console.error(`\n${failed} occupation test(s) failed.`);
  process.exit(1);
}
console.log("\nAll occupation tests passed.");
