/**
 * Stretch/exercise ↔ institutional YouTube correlation tests.
 * Run: npx tsx scripts/test-video-match.mjs
 */
import {
  videoForTechnique,
  bestCatalogVideoForMovement,
  inferTechniqueFromMovement,
} from "../src/data/video-catalog.ts";
import { BASE_STRETCHES } from "../src/data/stretch-library.ts";
import { BASE_EXERCISES } from "../src/data/exercise-library.ts";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  :", msg);
  }
}

const must = [
  {
    name: "Glute bridge",
    tech: "glute-bridge",
    kind: "exercise",
    titleIncludes: /glute|bridge/i,
    id: "YRqoIM0u0PY",
  },
  {
    name: "Bird-dog",
    tech: "bird-dog",
    kind: "exercise",
    titleIncludes: /bird.?dog/i,
    id: "ww-6lRXvI9Y",
  },
  {
    name: "Dead bug",
    tech: "dead-bug",
    kind: "exercise",
    titleIncludes: /bird dog|dead|back/i,
    id: "e3mqAN8meh8",
  },
  {
    name: "Cat-cow",
    tech: "cat-cow",
    kind: "stretch",
    titleIncludes: /cat.?cow/i,
  },
  {
    name: "Doorway chest stretch",
    tech: "chest-open",
    kind: "stretch",
    titleIncludes: /chest/i,
  },
  {
    name: "Wall push-up",
    tech: "wall-push",
    kind: "exercise",
    titleIncludes: /wall push/i,
  },
  {
    name: "Hamstring strap stretch",
    tech: "hamstring",
    kind: "stretch",
    titleIncludes: /leg|hamstring|back of/i,
  },
  {
    name: "Sit to stand",
    tech: "sit-to-stand",
    kind: "exercise",
    titleIncludes: /standing|sit|chair|older/i,
  },
  {
    name: "Balance tandem",
    tech: "balance",
    kind: "exercise",
    titleIncludes: /balance/i,
  },
];

for (const m of must) {
  const inferred = inferTechniqueFromMovement({ name: m.name, kind: m.kind });
  assert(inferred === m.tech, `${m.name}: infer ${inferred} === ${m.tech}`);
  const v = videoForTechnique(m.tech, m.name, { kind: m.kind });
  assert(
    m.titleIncludes.test(v.title),
    `${m.name}: title "${v.title}" matches ${m.titleIncludes}`
  );
  if (m.id) {
    assert(v.youtubeId === m.id, `${m.name}: youtubeId ${v.youtubeId} === ${m.id}`);
  }
  // Must not be generic workday / OR-stretch / full-body fillers for named techniques
  assert(
    !/importance of stretching throughout|or-stretch|15-minute workout/i.test(v.title),
    `${m.name}: not generic filler (${v.title})`
  );
}

// Library cards use videoForTechnique at load — spot-check core IDs
const glute = BASE_EXERCISES.find(
  (e) => /glute bridge/i.test(e.name) || e.id.includes("glute-bridge")
);
if (glute) {
  assert(
    /glute|bridge/i.test(glute.video.title),
    `library glute exercise video: ${glute.video.title}`
  );
  assert(
    glute.video.youtubeId === "YRqoIM0u0PY",
    `library glute id ${glute.video.youtubeId}`
  );
}
const bird = BASE_EXERCISES.find(
  (e) => /bird.?dog/i.test(e.name) || e.id.includes("bird-dog")
);
if (bird) {
  assert(/bird.?dog/i.test(bird.video.title), `library bird-dog title: ${bird.video.title}`);
  assert(bird.video.youtubeId === "ww-6lRXvI9Y", `library bird-dog id ${bird.video.youtubeId}`);
}
const cat = BASE_STRETCHES.find(
  (s) => /cat.?cow/i.test(s.name) || s.id.includes("cat-cow")
);
if (cat) {
  assert(/cat.?cow/i.test(cat.video.title), `library cat-cow title: ${cat.video.title}`);
}

// bestCatalog must not map bird-dog to superman or mayo low-back dos/donts
const birdBest = bestCatalogVideoForMovement({
  name: "Bird-dog core control",
  technique: "bird-dog",
  kind: "exercise",
});
assert(
  /bird.?dog/i.test(birdBest.title),
  `best bird-dog is form demo, got: ${birdBest.title}`
);
assert(
  !/superman|do's and don'ts/i.test(birdBest.title),
  "bird-dog not superman/dos-donts"
);

const bridgeBest = bestCatalogVideoForMovement({
  name: "Glute bridge",
  technique: "glute-bridge",
  kind: "exercise",
});
assert(/glute|bridge/i.test(bridgeBest.title), `best glute: ${bridgeBest.title}`);
assert(bridgeBest.youtubeId === "YRqoIM0u0PY", "best glute is Mayo bridge demo");

if (failed) {
  console.error(`\n${failed} video-match test(s) failed.`);
  process.exit(1);
}
console.log("\nAll video-match tests passed.");
