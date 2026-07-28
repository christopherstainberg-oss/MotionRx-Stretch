/**
 * High-precision surgery detection from free-text story.
 * Run: npx tsx scripts/test-surgery-detection.mjs
 */
const {
  detectSurgeriesFromText,
  matchSurgeriesFromText,
  hasStatedSurgicalEvent,
  hasSurgicalNegation,
  storyStatesPostOp,
} = await import("../src/data/surgeries.ts");

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  :", msg);
  }
}

console.log("\nSurgery Detection (no invent)\n");

// —— Do NOT invent from injury names alone ——
ok(detectSurgeriesFromText("I tore my ACL playing soccer.").length === 0, "ACL tear ≠ surgery");
ok(
  detectSurgeriesFromText("Rotator cuff pain when reaching overhead.").length === 0,
  "rotator cuff pain ≠ repair"
);
ok(
  detectSurgeriesFromText("Meniscus feels locked after squatting.").length === 0,
  "meniscus symptom ≠ meniscus surgery"
);
ok(
  detectSurgeriesFromText("I might need surgery on my knee.").length === 0,
  "might need surgery negated"
);
ok(hasSurgicalNegation("considering surgery next year"), "considering = negation");
ok(
  detectSurgeriesFromText("No surgery — treating conservatively.").length === 0,
  "no surgery"
);
ok(
  detectSurgeriesFromText("Lower back hurts after yard work.").length === 0,
  "no surgery language"
);

// —— Specific procedures ——
{
  const m = detectSurgeriesFromText(
    "I had ACL reconstruction 4 months ago. Still weak on stairs."
  );
  ok(m.length >= 1 && m[0].surgery.id === "acl-r", `ACL recon → acl-r got ${m[0]?.surgery.id}`);
  ok(m[0]?.confidence === "high" || m[0]?.matchedPhrase.includes("acl"), "high/specific match");
}
{
  const m = detectSurgeriesFromText("TKA on the left knee 6 weeks ago.");
  ok(m.some((x) => x.surgery.id === "tka"), `TKA → tka: ${m.map((x) => x.surgery.id)}`);
}
{
  const m = detectSurgeriesFromText("After my total hip replacement I still limp.");
  ok(m.some((x) => x.surgery.id === "tha"), "hip replacement → tha");
}
{
  const m = detectSurgeriesFromText(
    "Status post rotator cuff repair; limited elevation still."
  );
  ok(m.some((x) => x.surgery.id === "rotator-cuff-repair"), "cuff repair");
}
{
  const m = detectSurgeriesFromText("I underwent lumbar fusion last year.");
  ok(m.some((x) => x.surgery.id === "lumbar-fusion"), "lumbar fusion");
}
{
  const m = detectSurgeriesFromText("Meniscus repair two months ago, still swollen.");
  ok(m.some((x) => x.surgery.id === "meniscus-repair"), "meniscus repair");
  ok(!m.some((x) => x.surgery.id === "meniscectomy"), "not meniscectomy when repair stated");
}

// —— Generic had surgery without name ——
{
  const m = detectSurgeriesFromText("I had surgery three weeks ago and still hurt.");
  ok(
    m.length === 1 && m[0].surgery.id === "other-surgery",
    `unspecified surgery → other-surgery: ${m.map((x) => x.surgery.id)}`
  );
  ok(m[0].confidence === "medium", "generic is medium confidence");
}

// —— Do not match bare post-op without substance ——
ok(
  !hasStatedSurgicalEvent("posture at my desk is bad"),
  "posture does not fire surgical event"
);

// —— storyStatesPostOp ——
ok(storyStatesPostOp("I had knee replacement 2 months ago"), "states post-op for TKA language");
ok(!storyStatesPostOp("I think I sprained my ankle"), "sprain not post-op");

// —— matchSurgeriesFromText API ——
ok(
  matchSurgeriesFromText("ACL tear, no surgery yet").length === 0,
  "matchSurgeriesFromText respects no invent"
);
ok(
  matchSurgeriesFromText("Had meniscectomy last month").some((s) => s.id === "meniscectomy"),
  "meniscectomy matches"
);

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll surgery-detection tests passed.\n");
