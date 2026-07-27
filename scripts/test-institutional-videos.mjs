/**
 * Enforce healthcare / institutional-only YouTube catalog.
 * Run: npx tsx scripts/test-institutional-videos.mjs
 */
import {
  ALLOWED_INSTITUTION_MARKERS,
  INSTITUTIONAL_VIDEOS,
  allCatalogVideos,
  auditNonInstitutionalCatalogEntries,
  getCatalogVideoById,
  isAllowedHealthcareInstitution,
  isVettedInstitutionalVideo,
  videoForTechnique,
} from "../src/data/video-catalog.ts";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  :", msg);
  }
}

const videos = allCatalogVideos();
assert(videos.length > 20, `catalog has videos: ${videos.length}`);
assert(
  auditNonInstitutionalCatalogEntries().length === 0,
  `no non-institutional entries: ${JSON.stringify(auditNonInstitutionalCatalogEntries())}`
);

for (const v of videos) {
  assert(
    isAllowedHealthcareInstitution(v.institution),
    `allowlisted: ${v.institution} (${v.youtubeId})`
  );
  assert(isVettedInstitutionalVideo(v), `vetted: ${v.youtubeId}`);
  // No empty IDs
  assert(/^[A-Za-z0-9_-]{6,}$/.test(v.youtubeId), `plausible id ${v.youtubeId}`);
}

// Fitness / creator strings must not pass allowlist
assert(!isAllowedHealthcareInstitution("Howcast"), "block Howcast");
assert(!isAllowedHealthcareInstitution("Fitness Blender"), "block Fitness Blender");
assert(!isAllowedHealthcareInstitution("Random YouTuber PT"), "block random");
assert(!isAllowedHealthcareInstitution(""), "block empty");

// Healthcare strings pass
assert(isAllowedHealthcareInstitution("Mayo Clinic"), "allow Mayo");
assert(isAllowedHealthcareInstitution("NIH / National Institute on Aging"), "allow NIH");
assert(
  isAllowedHealthcareInstitution("American Physical Therapy Association (ChoosePT)"),
  "allow APTA ChoosePT"
);
assert(isAllowedHealthcareInstitution("Dana-Farber Cancer Institute"), "allow Dana-Farber");

// Non-catalog IDs are not serveable
assert(!getCatalogVideoById("dQw4w9WgXcQ"), "reject random non-catalog ID");
assert(
  !isVettedInstitutionalVideo({
    youtubeId: "dQw4w9WgXcQ",
    institution: "Mayo Clinic",
  }),
  "reject non-catalog even with Mayo label spoof"
);

// Technique resolve stays institutional
for (const tech of ["glute-bridge", "bird-dog", "dead-bug", "cat-cow", "chest-open", "hamstring"]) {
  const v = videoForTechnique(tech, tech);
  assert(isVettedInstitutionalVideo(v), `${tech} → institutional ${v.institution}`);
  assert(getCatalogVideoById(v.youtubeId), `${tech} ID in catalog`);
}

// Every raw INSTITUTIONAL_VIDEOS entry should also pass (static audit)
for (const [key, v] of Object.entries(INSTITUTIONAL_VIDEOS)) {
  assert(
    isAllowedHealthcareInstitution(v.institution),
    `static entry ${key}: ${v.institution}`
  );
}

assert(ALLOWED_INSTITUTION_MARKERS.length >= 8, "allowlist has core institutions");

if (failed) {
  console.error(`\n${failed} institutional-video test(s) failed.`);
  process.exit(1);
}
console.log(`\nAll institutional-video tests passed (${videos.length} catalog videos).`);
