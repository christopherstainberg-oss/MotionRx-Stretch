/**
 * Functional audit for Gravatar profile photo update flow.
 * Run: npx tsx scripts/test-gravatar.mjs
 */
import { createHash } from "crypto";

let gravatarHash, gravatarUrl, publicUser;
try {
  const g = await import("../src/lib/gravatar.ts");
  gravatarHash = g.gravatarHash;
  gravatarUrl = g.gravatarUrl;
  const a = await import("../src/lib/auth.ts");
  publicUser = a.publicUser;
} catch (e) {
  console.error("Import failed — run with: npx tsx scripts/test-gravatar.mjs");
  console.error(e);
  process.exit(1);
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("OK  :", msg);
  }
}

function baseUser(over = {}) {
  return {
    id: "user-test-1",
    email: "test.user@example.com",
    name: "Test User",
    passwordHash: "x",
    twoFactorEnabled: false,
    sessionVersion: 0,
    createdAt: "2026-01-15T12:00:00.000Z",
    preferences: {
      reminderTimes: ["08:00"],
      defaultDifficulty: "beginner",
      sessionLengthMinutes: 15,
      notificationsEnabled: true,
      offlineVideosPreferred: false,
      theme: "auto",
    },
    goals: [],
    favorites: [],
    painBaseline: {},
    ...over,
  };
}

// —— Official Gravatar MD5 vector ——
{
  // https://en.gravatar.com/site/implement/hash/
  const email = "MyEmailAddress@example.com";
  const expected = "0bc83cb571cd1c50ba6f3e8a78ef1346";
  const got = gravatarHash(email);
  assert(got === expected, `MD5 vector for "${email}" → ${got}`);
}

// —— Normalization ——
{
  const a = gravatarHash("  Test@Example.COM  ");
  const b = gravatarHash("test@example.com");
  assert(a === b, "email trim + lowercase matches Gravatar rules");
}

// —— URL shape ——
{
  const email = "test.user@example.com";
  const url = gravatarUrl(email, 256, "identicon");
  const hash = gravatarHash(email);
  assert(
    url === `https://www.gravatar.com/avatar/${hash}?s=256&d=identicon&r=pg`,
    `URL shape: ${url}`
  );
  assert(url.startsWith("https://www.gravatar.com/avatar/"), "HTTPS Gravatar host");
  assert(/[?&]s=256\b/.test(url), "size query param");
  assert(/[?&]d=identicon\b/.test(url), "fallback identicon");
}

// —— Size clamp ——
{
  const u1 = gravatarUrl("a@b.co", 0);
  const u2 = gravatarUrl("a@b.co", 99999);
  assert(/[?&]s=1\b/.test(u1), "size min clamp to 1");
  assert(/[?&]s=2048\b/.test(u2), "size max clamp to 2048");
}

// —— publicUser: switch to Gravatar ——
{
  const pub = publicUser(
    baseUser({
      avatarSource: "gravatar",
      avatarKey: undefined,
    })
  );
  assert(pub.avatarSource === "gravatar", "publicUser avatarSource=gravatar");
  assert(pub.hasAvatar === true, "gravatar counts as hasAvatar");
  assert(pub.hasUploadAvatar === false, "no upload file");
  assert(
    typeof pub.gravatarUrl === "string" && pub.gravatarUrl.includes(gravatarHash(pub.email)),
    "gravatarUrl embeds email hash"
  );
  assert(
    pub.avatarDisplayUrl === pub.gravatarUrl,
    "avatarDisplayUrl resolves to Gravatar when source=gravatar"
  );
}

// —— publicUser: Gravatar preferred over leftover upload file ——
{
  const pub = publicUser(
    baseUser({
      avatarSource: "gravatar",
      avatarKey: "avatars/user/old.webp",
    })
  );
  assert(pub.avatarSource === "gravatar", "source stays gravatar with leftover file");
  assert(pub.hasUploadAvatar === true, "upload file still reported");
  assert(
    pub.avatarDisplayUrl === pub.gravatarUrl,
    "display prefers Gravatar over upload when source=gravatar"
  );
}

// —— publicUser: upload mode ——
{
  const pub = publicUser(
    baseUser({
      avatarSource: "upload",
      avatarKey: "avatars/user/pic.jpg",
    })
  );
  assert(pub.avatarSource === "upload", "upload source");
  assert(pub.hasAvatar === true, "upload hasAvatar");
  assert(pub.avatarDisplayUrl === "/api/account/avatar", "display uses local API");
}

// —— publicUser: none ——
{
  const pub = publicUser(
    baseUser({
      avatarSource: "none",
      avatarKey: undefined,
    })
  );
  assert(pub.avatarSource === "none", "none source");
  assert(pub.hasAvatar === false, "none has no avatar");
  assert(pub.avatarDisplayUrl === null, "none display null");
}

// —— publicUser: legacy upload without avatarSource ——
{
  const pub = publicUser(
    baseUser({
      avatarKey: "avatars/user/legacy.png",
    })
  );
  assert(pub.avatarSource === "upload", "legacy key implies upload source");
  assert(pub.hasAvatar === true, "legacy hasAvatar");
}

// —— Client-side profilePhotoSrc parity (mirror account page logic) ——
{
  function profilePhotoSrc(u, avatarBust = 1) {
    if (u.avatarSource === "gravatar" && u.gravatarUrl) return u.gravatarUrl;
    if (u.avatarSource === "upload" && u.hasUploadAvatar) {
      return `/api/account/avatar?t=${avatarBust}`;
    }
    if (u.hasUploadAvatar && u.avatarSource !== "none" && u.avatarSource !== "gravatar") {
      return `/api/account/avatar?t=${avatarBust}`;
    }
    if (u.avatarDisplayUrl?.startsWith("http")) return u.avatarDisplayUrl;
    if (u.avatarDisplayUrl === "/api/account/avatar") {
      return `/api/account/avatar?t=${avatarBust}`;
    }
    return null;
  }

  const g = publicUser(baseUser({ avatarSource: "gravatar" }));
  const src = profilePhotoSrc(g, 3);
  assert(src === g.gravatarUrl, "client profilePhotoSrc uses Gravatar URL");

  const up = publicUser(baseUser({ avatarSource: "upload", avatarKey: "k.jpg" }));
  assert(
    profilePhotoSrc(up, 9) === "/api/account/avatar?t=9",
    "client profilePhotoSrc uses upload API with bust"
  );

  const none = publicUser(baseUser({ avatarSource: "none" }));
  assert(profilePhotoSrc(none) === null, "client profilePhotoSrc null for none");
}

// —— Simulated PATCH avatarSource update (persistence shape) ——
{
  const dbUser = baseUser({ avatarSource: "none" });
  // Simulate account PATCH body handling
  const body = { avatarSource: "gravatar" };
  if (body.avatarSource !== undefined) {
    dbUser.avatarSource = body.avatarSource;
  }
  const after = publicUser(dbUser);
  assert(after.avatarSource === "gravatar", "PATCH simulation persists gravatar");
  assert(
    after.avatarDisplayUrl?.includes("gravatar.com"),
    "after PATCH, clients get Gravatar display URL"
  );

  // Switch to none
  dbUser.avatarSource = "none";
  const cleared = publicUser(dbUser);
  assert(cleared.avatarSource === "none" && !cleared.hasAvatar, "switch off gravatar works");

  // Upload sets source (avatar POST simulation)
  dbUser.avatarKey = "avatars/u/1.webp";
  dbUser.avatarSource = "upload";
  const uploaded = publicUser(dbUser);
  assert(uploaded.avatarSource === "upload" && uploaded.hasAvatar, "upload mode after file save");

  // DELETE upload while on gravatar should keep gravatar
  dbUser.avatarSource = "gravatar";
  delete dbUser.avatarKey;
  // (avatar DELETE only clears source when it was upload)
  const stillG = publicUser(dbUser);
  assert(stillG.avatarSource === "gravatar", "removing file while on gravatar keeps gravatar");
}

// —— CSP allowlist audit (next.config.mjs) ——
{
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const cfg = fs.readFileSync(path.join(root, "next.config.mjs"), "utf8");
  assert(cfg.includes("www.gravatar.com"), "CSP/config includes www.gravatar.com");
  assert(
    cfg.includes("*.gravatar.com") || cfg.includes("secure.gravatar.com"),
    "CSP allows Gravatar CDN mirrors"
  );
  assert(/img-src[^"]*gravatar/i.test(cfg), "img-src directive mentions gravatar");
}

// —— Live network: Gravatar serves image for hashed email ——
{
  const email = "test.user@example.com";
  const url = gravatarUrl(email, 80, "identicon");
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "image/*" },
      redirect: "follow",
    });
    const ct = res.headers.get("content-type") || "";
    assert(res.ok, `live Gravatar HTTP ${res.status} for ${url}`);
    assert(
      ct.startsWith("image/") || ct.includes("octet-stream"),
      `live Gravatar content-type image-like: ${ct}`
    );
    const buf = Buffer.from(await res.arrayBuffer());
    assert(buf.length > 50, `live Gravatar body non-trivial (${buf.length} bytes)`);
  } catch (e) {
    assert(false, `live Gravatar fetch failed: ${e?.message || e}`);
  }
}

// —— Hash stability for account email used in publicUser ——
{
  const email = "Chris.Stainberg@Example.Org";
  const user = baseUser({ email, avatarSource: "gravatar" });
  const pub = publicUser(user);
  const manual = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  assert(pub.gravatarUrl.includes(manual), "publicUser hash matches manual MD5 of normalized email");
}

console.log("");
if (failed) {
  console.error(`${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("All Gravatar functional checks passed.");
