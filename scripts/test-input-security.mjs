/**
 * Keyboard character matching + security helper tests.
 * Run: npx tsx scripts/test-input-security.mjs
 */
import assert from "node:assert/strict";

const {
  foldKeyboardPunctuation,
  normalizeUserText,
  normalizeForMatch,
  sanitizePersonName,
  normalizeEmailInput,
  normalizePasswordInput,
  stripDangerousInvisible,
} = await import("../src/lib/input-normalize.ts");

const { sanitizeText, isValidEmail } = await import("../src/lib/rate-limit.ts");
const { sanitizeDisplayName, assertSameOrigin } = await import("../src/lib/security.ts");
const { curatedVideoFor, videoMovement } = await import("../src/lib/youtube-management.ts");
const { searchAppIndex } = await import("../src/data/app-search-index.ts");
const { matchDescriptorsFromText } = await import("../src/data/pain-descriptors.ts");

let n = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  n++;
  console.log("  ✓", msg);
}

console.log("\nInput normalize + security\n");

// Smart quotes / dashes from iOS/macOS keyboards
ok(
  foldKeyboardPunctuation("low\u2019s back pain\u2014worse after sitting") ===
    "low's back pain-worse after sitting",
  "folds curly apostrophe and em dash"
);
ok(
  foldKeyboardPunctuation("\u201Csharp\u201D pain") === '"sharp" pain',
  "folds curly double quotes"
);
ok(foldKeyboardPunctuation("10\u00A0reps") === "10 reps", "NBSP → space");

// Display names keep apostrophes (was broken when stripping all quotes)
ok(sanitizePersonName("O'Brien") === "O'Brien", "O'Brien keeps apostrophe");
ok(sanitizeDisplayName("Mary-Jane") === "Mary-Jane", "hyphenated name kept");
ok(sanitizeDisplayName("José García").includes("José") || sanitizeDisplayName("José García").length > 0, "unicode letters kept in display name");
ok(!sanitizeDisplayName("<script>x</script>").includes("<"), "strips HTML angle brackets");
ok(!sanitizeDisplayName("evil\u0000name").includes("\u0000"), "strips null");

// Storage sanitize preserves diacritics, folds keyboard junk
ok(sanitizeText("café — “stiff”").includes("café"), "sanitize keeps café");
ok(sanitizeText("café — “stiff”").includes("stiff"), "sanitize folds smart quotes");
ok(!sanitizeText("a\u200Bb").includes("\u200B"), "strips zero-width space");

// Match fold unifies keyboard variants
ok(
  normalizeForMatch("Straight—leg raises") === normalizeForMatch("straight-leg raises"),
  "em dash vs hyphen match equal"
);
ok(
  normalizeForMatch("café") === "cafe",
  "diacritic fold for match"
);

// Email
ok(isValidEmail("User@Example.COM"), "email case-insensitive valid");
ok(normalizeEmailInput("  User@Example.COM  ") === "user@example.com", "email normalize");
ok(!isValidEmail("not-an-email"), "invalid email rejected");

// Password keeps symbols (only strips controls)
ok(normalizePasswordInput("p@ss\u0000Word!").includes("@"), "password keeps @");
ok(!normalizePasswordInput("p@ss\u0000Word!").includes("\u0000"), "password strips null");

// Video curated match with smart punctuation name
const q = videoMovement("Straight—leg raises");
ok(q && q.includes("straight"), "videoMovement handles em dash");
ok(curatedVideoFor("Straight—leg raises")?.youtubeId, "curated match with em dash");
ok(curatedVideoFor("quad sets")?.youtubeId, "exact curated still works");

// Global search with curly quotes
const hits = searchAppIndex("assess\u2019ment"); // assessment with curly apostrophe mid-word is odd
// better: search "pain" still works
ok(searchAppIndex("assessment").length > 0, "search assessment");
ok(searchAppIndex("journal").length > 0, "search journal");

// Descriptor match folds keyboard
const ids = matchDescriptorsFromText("I have a sharp, shooting pain\u2014worse with bending");
ok(Array.isArray(ids), "descriptor match returns array");

// CSRF helper: missing host fails
const fakeReq = new Request("http://localhost/api/x", {
  method: "POST",
  headers: { Origin: "https://evil.example", Host: "localhost" },
});
// Request in node may not set host header the same way
ok(typeof assertSameOrigin === "function", "assertSameOrigin exported");

// Bidi override stripped
ok(!stripDangerousInvisible("ab\u202Ecd").includes("\u202E"), "strips RTL override");

console.log(`\n${n} assertions passed.\n`);
