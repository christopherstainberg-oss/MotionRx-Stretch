/**
 * PhysioPath → MotionRx YouTube management tests.
 * Run: npx tsx scripts/test-youtube-management.mjs
 */
import assert from "node:assert/strict";

const {
  videoMovement,
  vidNorm,
  curatedVideoFor,
  videoCaveat,
  isSpecificEnoughMatch,
  isPhysioPathAllowedPublisher,
  VIDEO_VERIFIED,
  CURATED_MOVEMENT_VIDEOS,
} = await import("../src/lib/youtube-management.ts");

const { isAllowedHealthcareInstitution, getCatalogVideoById, allCatalogYoutubeIds } =
  await import("../src/data/video-catalog.ts");

let n = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  n++;
  console.log("  ✓", msg);
}

console.log("\nYouTube Management (PhysioPath)\n");

// —— videoMovement cleaning ——
ok(videoMovement("Soup-can split squat — unilateral")?.includes("split squat"), "strips equipment + modifier");
ok(videoMovement("Gentle progressive ROM around the injury") === null, "prescription-only → null");
ok(
  (videoMovement("Straight-leg raises") || "").includes("straight"),
  "SLR cleans to straight leg raise family"
);
ok(videoMovement("Wrist flexion / wrist curl / extension") === "wrist flexion", "keeps first space-delimited clause");
ok(videoMovement("Radial/ulnar deviation")?.includes("radial"), "keeps slash-joined single movement");

// —— vidNorm ——
ok(vidNorm("straight-leg raises") === vidNorm("straight leg raise"), "hyphen + plural normalize");
ok(vidNorm("Quad Sets") === "quad set", "plural strip on 4+ letter words");

// —— curated map ——
ok(Object.keys(CURATED_MOVEMENT_VIDEOS).length >= 80, "curated map has PhysioPath coverage");
const qs = curatedVideoFor("quad sets");
ok(qs && qs.youtubeId === CURATED_MOVEMENT_VIDEOS["quad sets"].youtubeId, "exact curated match: quad sets");
ok(qs?.match === "exact", "exact match type");
const slr = curatedVideoFor("straight-leg raises");
ok(slr && slr.youtubeId, "normalised match: straight-leg raises → SLR");
const none = curatedVideoFor("sport-specific loading");
ok(none === null, "category label → no video (PhysioPath silence)");
const bridge = curatedVideoFor("double-leg bridges");
ok(bridge && bridge.youtubeId, "synonym/plural: double-leg bridges");

// —— caveats ——
ok(/generic/i.test(videoCaveat({})), "default generic caveat");
ok(/weight-bearing|WB/i.test(videoCaveat({ weightBearingStatus: "nwb" })), "NWB caveat");
ok(/sternal/i.test(videoCaveat({ flags: ["sternal_precautions"] })), "sternal caveat");
ok(/spinal|bending/i.test(videoCaveat({ flags: ["spinal-precautions"] })), "spinal caveat");
ok(/pregnancy|lying flat/i.test(videoCaveat({ flags: ["pregnancy"] })), "pregnancy caveat");
ok(/abdominal|sit-ups/i.test(videoCaveat({ flags: ["abdominal-precautions"] })), "abdominal caveat");

// —— publisher bar ——
ok(isPhysioPathAllowedPublisher("Piedmont Healthcare"), "Piedmont allowed");
ok(isPhysioPathAllowedPublisher("Mayo Clinic"), "Mayo allowed");
ok(isAllowedHealthcareInstitution("Children's Hospital Colorado"), "Children's Hospital Colorado allowlisted");
ok(isAllowedHealthcareInstitution("NHS inform"), "NHS inform allowlisted");
ok(!isAllowedHealthcareInstitution("Yoga with Adriene"), "fitness influencer blocked");
ok(!isAllowedHealthcareInstitution("Somers Animal Hospital"), "animal hospital rejected");

// —— specific match policy ——
ok(
  isSpecificEnoughMatch({
    curated: qs,
    catalogScore: 0,
    ownsTechnique: false,
  }),
  "curated alone is specific enough"
);
ok(
  !isSpecificEnoughMatch({
    curated: null,
    catalogScore: 10,
    ownsTechnique: false,
  }),
  "weak score without technique is not specific"
);
ok(
  isSpecificEnoughMatch({
    curated: null,
    catalogScore: 80,
    ownsTechnique: true,
  }),
  "technique ownership + score is specific"
);

// —— catalog integration ——
ok(VIDEO_VERIFIED.length > 0, "VIDEO_VERIFIED stamp present");
const curatedId = CURATED_MOVEMENT_VIDEOS["quad sets"].youtubeId;
ok(getCatalogVideoById(curatedId)?.institution, "curated ID resolvable via getCatalogVideoById");
ok(allCatalogYoutubeIds().includes(curatedId), "curated IDs in health refresh set");

console.log(`\n${n} assertions passed.\n`);
