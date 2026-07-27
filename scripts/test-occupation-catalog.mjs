/**
 * Occupation backend catalog tests (100k capacity).
 * Run: npx tsx scripts/test-occupation-catalog.mjs
 */
import {
  OCCUPATION_CATALOG_CAPACITY,
  OCCUPATION_STATS,
  BASE_OCCUPATIONS,
  getOccupationByIndex,
  getOccupationById,
  searchOccupations,
  matchOccupationsFromText,
  resolveOccupationProfile,
  userOccupationFromCatalog,
} from "../src/data/occupations.ts";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  :", msg);
  }
}

assert(OCCUPATION_CATALOG_CAPACITY === 100_000, "capacity 100000");
assert(BASE_OCCUPATIONS.length >= 500, `bases >= 500 (got ${BASE_OCCUPATIONS.length})`);
assert(OCCUPATION_STATS.totalCount === 100_000, "stats total");
assert(OCCUPATION_STATS.baseCount === BASE_OCCUPATIONS.length, "stats base count");

// Index 0 is first base
const first = getOccupationByIndex(0);
assert(!!first && first.isBase, "index 0 base");
assert(!!first?.title, "has title");

// High index still resolves
const high = getOccupationByIndex(99_999);
assert(!!high && high.catalogIndex === 99_999, "index 99999 resolves");
assert(!!high?.displayTitle, "edition display title");

// Out of range
assert(getOccupationByIndex(100_000) === undefined, "index OOB");
assert(getOccupationByIndex(-1) === undefined, "negative OOB");

// Search
const nurses = searchOccupations({ query: "nurse", basesOnly: true, limit: 20 });
assert(nurses.length > 0, `search nurse (${nurses.length})`);
assert(
  nurses.some((n) => /nurse/i.test(n.title)),
  "nurse in results"
);

const desk = searchOccupations({
  query: "software",
  category: "desk",
  basesOnly: true,
  limit: 10,
});
assert(desk.length > 0, "software desk category");

// ID round-trip
const byId = getOccupationById(first.id);
assert(byId?.id === first.id, "get by id");

// Expanded id
if (high && !high.isBase) {
  const again = getOccupationById(high.id);
  assert(!!again, "expanded id parse");
}

// Free-text match
const hits = matchOccupationsFromText(
  "I am a registered nurse on night shifts with low back pain.",
  5
);
assert(hits.length > 0, `match from text ${hits.join(",")}`);

// Resolve profile from catalog selection
const occ = searchOccupations({ query: "truck driver", basesOnly: true, limit: 1 })[0];
assert(!!occ, "truck driver search");
const entry = userOccupationFromCatalog(occ, { hoursNote: "50 hrs/week" });
const profile = resolveOccupationProfile({
  freeText: "My back hurts.",
  selected: [entry],
});
assert(profile.source === "stated", "selected occupation stated");
assert(/truck|driver/i.test(profile.label), `label ${profile.label}`);

// Resolve from free text alone via catalog
const p2 = resolveOccupationProfile({
  freeText: "I work as a software engineer at a desk all day. Neck pain.",
});
assert(p2.source === "stated", "free text stated");
assert(
  p2.category === "desk" || /software|desk|engineer/i.test(p2.label),
  `cat/label ${p2.category} ${p2.label}`
);

// Sample uniqueness across a span of indices
const titles = new Set();
for (let i = 0; i < 500; i += 7) {
  const o = getOccupationByIndex(i);
  if (o) titles.add(o.id);
}
assert(titles.size >= 60, `diverse ids in sample (${titles.size})`);

if (failed) {
  console.error(`\n${failed} occupation catalog test(s) failed.`);
  process.exit(1);
}
console.log(
  `\nAll occupation catalog tests passed (${BASE_OCCUPATIONS.length} bases × editions → ${OCCUPATION_CATALOG_CAPACITY.toLocaleString()}).`
);
