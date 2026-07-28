/**
 * MotionRx YouTube Management — PhysioPath program video intricacies.
 *
 * Ported behaviours:
 * 1. videoMovement() — strip equipment / prescription / jargon to a real movement name
 * 2. vidNorm() — hyphen/plural-insensitive keys
 * 3. curatedVideoFor() — exact then longest-substring match on curated institutional map
 * 4. videoCaveat() — precaution-aware warnings on the link / embed
 * 5. No search fallback — unmatched movements must not invent a YouTube search
 * 6. Publisher bar — only institutional healthcare channels; titles/snippets lie
 * 7. VIDEO_VERIFIED stamp for re-check cadence
 *
 * Works with MotionRx oEmbed health cache + institutional catalog resolver.
 */

import {
  CURATED_MOVEMENT_VIDEOS,
  CURATED_PUBLISHERS,
  VIDEO_VERIFIED,
  type CuratedMovementVideo,
} from "@/data/curated-movement-videos";
import {
  isAllowedHealthcareInstitution,
  isVettedInstitutionalVideo,
  type InstitutionalVideo,
} from "@/data/video-catalog";

export { VIDEO_VERIFIED, CURATED_MOVEMENT_VIDEOS, CURATED_PUBLISHERS };
export type { CuratedMovementVideo };

/* -------------------------------------------------------------------------- */
/* Name cleaning (PhysioPath videoMovement)                                   */
/* -------------------------------------------------------------------------- */

const VID_STRIP_EQUIP =
  /^(dumbbell|kettlebell|barbell|band|loop-band|cable|machine|suspension|towel|broomstick|chair|med-ball|sandbag|backpack|heavy-book|soup-can|water-bottle|water-jug|resisted|weighted)\s+/i;
const VID_STRIP_TAIL = /\s+[—–-]\s+.*$/;
const VID_STRIP_PARENS = /\s*\((?!left|right|bilateral)[^)]*\)/gi;
const VID_LEAD =
  /^(gentle|progressive|assisted|light|graded|early|controlled|supported|pain-free|active|passive|isometric|advanced)\s+|^with\s+[\w-]+\s+(?=[a-z])/i;
const VID_JARGON: Array<[RegExp, string]> = [
  [/\brom\b/gi, "range of motion"],
  [/\bAAROM\b/gi, "assisted range of motion"],
  [/\bckc\b/gi, "closed chain"],
  [/\bokc\b/gi, "open chain"],
  [/\bslr\b/gi, "straight leg raise"],
  [/\bsaq\b/gi, "short arc quad"],
  [/\bter\b/gi, "terminal extension"],
  [/\bnwb\b/gi, ""],
];
const VID_FILLER =
  /\b(range of motion|exercise|exercises|work|working|activity|injury|injured|area|movement|the|a|an|around|all|direction|directions|and|with|as|tolerated|progression|training|drill|drills|side|both|affected|limb)\b/gi;

/**
 * Clean a prescription / library name down to a searchable movement phrase.
 * Returns null when nothing but dosing language remains (PhysioPath: show no link).
 */
export function videoMovement(name: string, _pattern?: string): string | null {
  let q = String(name || "")
    .replace(VID_STRIP_TAIL, "")
    .replace(VID_STRIP_PARENS, "")
    .replace(/\s*\((left|right|bilateral)\)\s*$/i, "")
    .trim()
    .replace(VID_STRIP_EQUIP, "");

  // Keep first clause of "A / B", "A: x → y", "A + B" (space-delimited only)
  q = q
    .split(/\s+(?:\/|\+|&)\s+|\s*(?::|→)\s*/)[0]!
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!q) q = String(name || "").trim();
  q = q.toLowerCase();
  while (VID_LEAD.test(q)) q = q.replace(VID_LEAD, "");
  for (const [re, to] of VID_JARGON) q = q.replace(re, to);
  q = q.replace(/\s+/g, " ").trim();

  const stripped = q
    .replace(VID_FILLER, "")
    .replace(/[^a-z0-9]/g, "");
  if (stripped.length < 3) return null;
  return q;
}

/**
 * Normalise keys/movements: hyphens → spaces, strip trailing plurals (4+ letter words).
 * "straight-leg raises" and "straight leg raise" share a key.
 */
export function vidNorm(t: string): string {
  return String(t || "")
    .toLowerCase()
    .replace(/[-–—]/g, " ")
    .replace(/\b(\w{3,})s\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/* -------------------------------------------------------------------------- */
/* Curated map matching (PhysioPath curatedVideoFor)                          */
/* -------------------------------------------------------------------------- */

const CURATED_NORM: Record<string, CuratedMovementVideo> = {};
for (const [k, v] of Object.entries(CURATED_MOVEMENT_VIDEOS)) {
  CURATED_NORM[vidNorm(k)] = v;
}
/** Longest key first so "single-leg bridge" does not lose to shorter prefixes */
const CURATED_KEYS = Object.keys(CURATED_NORM).sort((a, b) => b.length - a.length);

export type CuratedMatch = CuratedMovementVideo & {
  key: string;
  movement: string;
  match: "exact" | "includes";
};

/**
 * Resolve a curated institutional demo for a movement name.
 * Exact normalised key first, then longest substring includes.
 * Returns null when no verified demo exists (PhysioPath: silence, no search).
 */
export function curatedVideoFor(
  name: string,
  pattern?: string
): CuratedMatch | null {
  const m0 = videoMovement(name, pattern);
  if (!m0) return null;
  const m = vidNorm(m0);
  if (CURATED_NORM[m]) {
    return { ...CURATED_NORM[m]!, key: m, movement: m0, match: "exact" };
  }
  for (const k of CURATED_KEYS) {
    if (m.includes(k) || k.includes(m)) {
      // Prefer longer keys already ordered; require meaningful overlap
      if (k.length < 4 && m.length > k.length + 4) continue;
      return { ...CURATED_NORM[k]!, key: k, movement: m0, match: "includes" };
    }
  }
  return null;
}

/** All curated YouTube IDs (for health refresh inclusion) */
export function allCuratedYoutubeIds(): string[] {
  return Array.from(
    new Set(Object.values(CURATED_MOVEMENT_VIDEOS).map((v) => v.youtubeId))
  );
}

/* -------------------------------------------------------------------------- */
/* Precaution caveats (PhysioPath videoCaveat)                                */
/* -------------------------------------------------------------------------- */

export type VideoCaveatContext = {
  /** Weight-bearing status code: fwb | wbat | pwb | ttwb | nwb | … */
  weightBearingStatus?: string;
  weightBearingLabel?: string;
  flags?: string[];
  precautionIds?: string[];
  implantIds?: string[];
  protocolNotes?: string;
};

const WB_ABBR: Record<string, string> = {
  fwb: "FWB",
  wbat: "WBAT",
  pwb: "PWB",
  ttwb: "TTWB",
  tdwb: "TDWB",
  nwb: "NWB",
  ffwb: "FFWB",
};

/**
 * Generic videos ignore the user's precautions. Surface that ON the video UI.
 */
export function videoCaveat(ctx: VideoCaveatContext = {}): string {
  const flags = new Set(
    [...(ctx.flags || []), ...(ctx.precautionIds || [])].map((f) =>
      f.toLowerCase().replace(/_/g, "-")
    )
  );
  const blob = [
    ...(ctx.flags || []),
    ...(ctx.precautionIds || []),
    ...(ctx.implantIds || []),
    ctx.protocolNotes || "",
  ]
    .join(" ")
    .toLowerCase();

  const wb = (ctx.weightBearingStatus || "").toLowerCase();
  if (wb && wb !== "fwb" && wb !== "wbat") {
    const abbr = ctx.weightBearingLabel || WB_ABBR[wb] || wb.toUpperCase();
    return `Your weight-bearing order is ${abbr} — videos will show the full standing version. Follow your plan's version, not theirs.`;
  }
  if (
    flags.has("sternal-precautions") ||
    flags.has("sternal") ||
    /sternal/.test(blob)
  ) {
    return "You're under sternal precautions — ignore any pushing, pulling or overhead loading a video shows.";
  }
  if (
    flags.has("spinal-precautions") ||
    flags.has("spinal-blt") ||
    /spinal.?precaution|no (bend|lift|twist)|blt\b/.test(blob)
  ) {
    return "You're under spinal precautions (no bending, lifting or twisting) — a general video won't respect them.";
  }
  if (
    flags.has("abdominal-precautions") ||
    flags.has("no-core-strain") ||
    /abdominal.?precaution|hernia|abdominal surgery/.test(blob)
  ) {
    return "You're under abdominal precautions — ignore any sit-ups, crunches or planks a video adds.";
  }
  if (flags.has("pregnancy") || /pregnan|postpartum/.test(blob)) {
    return "Videos won't account for pregnancy — skip lying flat on your back and any breath-holding they show.";
  }
  if (
    flags.has("nwb") ||
    flags.has("ttwb") ||
    flags.has("tdwb") ||
    /non-?weight|toe.?touch/.test(blob)
  ) {
    return "Your weight-bearing is restricted — videos often show full standing loads. Follow your plan and written orders, not the video.";
  }
  if (flags.has("hip-precautions") || /hip precaution/.test(blob)) {
    return "Hip precautions may ban deep bend / crossing the midline — a general video will not enforce your surgeon's list.";
  }
  if (flags.has("shoulder-protection") || /sling|cuff repair|labral/.test(blob)) {
    return "Shoulder protection rules (sling, no active elevation) override any early motion a video shows.";
  }
  return "Videos are generic: they don't know your precautions, your phase, or your dose. Your plan's sets and reps win.";
}

/* -------------------------------------------------------------------------- */
/* Publisher bar helpers                                                      */
/* -------------------------------------------------------------------------- */

/**
 * PhysioPath-style publisher recognition: allowlisted MotionRx institutions
 * OR exact curated publisher name (oEmbed-verified channel on the curated map).
 */
export function isPhysioPathAllowedPublisher(institution: string): boolean {
  if (isAllowedHealthcareInstitution(institution)) return true;
  const s = (institution || "").trim().toLowerCase();
  if (!s) return false;
  return CURATED_PUBLISHERS.some((p) => p.toLowerCase() === s || s.includes(p.toLowerCase()));
}

/** Curated video is serveable if publisher is known institutional */
export function isCuratedServeable(v: CuratedMovementVideo | null | undefined): boolean {
  if (!v?.youtubeId?.trim()) return false;
  return isPhysioPathAllowedPublisher(v.institution);
}

/**
 * Convert curated match into InstitutionalVideo-like shape for the resolver.
 */
export function curatedAsInstitutional(
  match: CuratedMatch
): InstitutionalVideo {
  return {
    youtubeId: match.youtubeId,
    title: match.movement.replace(/\b\w/g, (c) => c.toUpperCase()),
    institution: match.institution,
    source: `PhysioPath curated · checked ${VIDEO_VERIFIED} · Educational match for: ${match.movement}`,
    regions: ["general"],
    techniques: [match.key.replace(/\s+/g, "-")],
    kind: "both",
    aliases: [match.movement, match.key],
    accuracyTier: "technique",
  };
}

/* -------------------------------------------------------------------------- */
/* Match policy                                                               */
/* -------------------------------------------------------------------------- */

export type YoutubeMatchPolicy = {
  /**
   * When true (PhysioPath default for named movements), do not fall back to a
   * generic region video if no curated / technique-specific demo matches.
   * Prevents ankle patients landing on stroke balance compilations.
   */
  requireSpecificMatch?: boolean;
  /** Minimum content score to accept a catalog technique match as "specific" */
  minSpecificScore?: number;
};

export const DEFAULT_MATCH_POLICY: Required<YoutubeMatchPolicy> = {
  requireSpecificMatch: true,
  minSpecificScore: 40,
};

/**
 * Decide whether a resolved catalog score is specific enough to show,
 * or whether PhysioPath would stay silent.
 */
export function isSpecificEnoughMatch(
  opts: {
    curated: CuratedMatch | null;
    catalogScore?: number;
    ownsTechnique?: boolean;
  },
  policy: YoutubeMatchPolicy = {}
): boolean {
  const p = { ...DEFAULT_MATCH_POLICY, ...policy };
  if (opts.curated && isCuratedServeable(opts.curated)) return true;
  if (opts.ownsTechnique && (opts.catalogScore ?? 0) >= p.minSpecificScore) return true;
  if (!p.requireSpecificMatch && (opts.catalogScore ?? 0) > 0) return true;
  return false;
}

/** Attribution line for UI (PhysioPath vidrow style) */
export function videoAttributionLine(opts: {
  institution: string;
  verified?: string;
}): string {
  const verified = opts.verified || VIDEO_VERIFIED;
  return `from ${opts.institution} · link checked ${verified}`;
}

/** Offline note (PhysioPath vidoff) */
export const VIDEO_OFFLINE_NOTE =
  "You're offline — this video needs a connection. Written steps still work.";

/** Educational disclaimer (always true for generic institutional demos) */
export const VIDEO_GENERIC_DISCLAIMER =
  "Educational demonstration only. MotionRx written steps and your clinician protocol always win over the video.";
