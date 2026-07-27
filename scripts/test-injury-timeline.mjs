/**
 * Injury timeline + progress outlook tests.
 * Run: npx tsx scripts/test-injury-timeline.mjs
 */
import {
  parseInjuryTimeline,
  weeksToBucket,
  bucketLabel,
  buildProgressOutlook,
} from "../src/lib/injury-timeline.ts";
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

// Buckets
assert(weeksToBucket(0) === "0-weeks", "0 days → 0-weeks");
assert(weeksToBucket(1) === "1-week", "1 week");
assert(weeksToBucket(3) === "3-weeks", "3 weeks");
assert(weeksToBucket(6) === "6-weeks", "6 weeks");
assert(weeksToBucket(10) === "7-12-weeks", "10 weeks");
assert(weeksToBucket(20) === "3-6-months", "20 weeks ~ months");
assert(weeksToBucket(60) === "1-2-years", "60 weeks ~ years");
assert(bucketLabel("4-weeks").includes("4"), "bucket label");

// Parse weeks
{
  const t = parseInjuryTimeline("Low back hurt for 3 weeks after a lift. Pain 5/10.");
  assert(t.source === "stated", "3 weeks stated");
  assert(t.unit === "weeks" && t.amount === 3, `amount/unit ${t.amount} ${t.unit}`);
  assert(t.bucket === "3-weeks", `bucket ${t.bucket}`);
  assert(t.tissuePhase === "subacute", `tissue ${t.tissuePhase}`);
  assert(t.progressOutlook.length >= 3, "progress milestones");
  assert(
    t.progressOutlook.some((m) => m.measures.some((x) => /NPRS|PSFS|0–10|0-10/i.test(x))),
    "uses outcome measures"
  );
}

// Parse months
{
  const t = parseInjuryTimeline("Shoulder pain for 4 months, worse reaching overhead.");
  assert(t.source === "stated" && t.unit === "months", "months");
  assert((t.approxWeeksSince || 0) > 12, `weeks from months ${t.approxWeeksSince}`);
  assert(t.approxMonthsSince != null, "months field");
}

// Parse years
{
  const t = parseInjuryTimeline("Chronic neck pain for 2 years, desk work.");
  assert(t.source === "stated" && (t.unit === "years" || t.bucket.includes("year")), "years");
  assert((t.approxYearsSince || 0) >= 1, "years field");
}

// Zero weeks / today
{
  const t = parseInjuryTimeline("Pain started this morning after I lifted a box.");
  assert(t.source === "stated", "today onset");
  assert(t.bucket === "0-weeks" || (t.approxWeeksSince ?? 1) < 1, `0-week bucket ${t.bucket}`);
}

// Unknown
{
  const t = parseInjuryTimeline("My knee hurts on stairs.");
  assert(t.source === "unknown", "unknown without duration");
  assert(t.askIfMissing.length > 20, "ask if missing");
}

// Story integration
{
  const s = analyzeStoryIntelligence(
    "Right knee pain for 6 weeks. Stairs hard going down. Pain 4/10. Want to hike again.",
    { preferredName: "Alex" }
  );
  assert(s.injuryTimeline.source === "stated", "story has timeline");
  assert(s.injuryTimeline.bucket === "6-weeks", `story bucket ${s.injuryTimeline.bucket}`);
  assert(
    s.planHints.evidenceLines.some((e) => /Time since onset|Progress outlook/i.test(e)),
    "plan hints include timeline evidence"
  );
  assert(
    s.liveReadLines.some((l) => /Onset timeline|timeline/i.test(l)),
    "live read mentions timeline"
  );
}

// Progress outlook structure
{
  const o = buildProgressOutlook({
    weeksSince: 2,
    tissuePhase: "acute",
    bucket: "2-weeks",
  });
  assert(o[0].windowLabel.length > 5, "window labels");
  assert(o.every((m) => m.measures.length >= 1 && m.evidenceNote.length > 20), "measures+evidence");
}

if (failed) {
  console.error(`\n${failed} injury-timeline test(s) failed.`);
  process.exit(1);
}
console.log("\nAll injury-timeline tests passed.");
