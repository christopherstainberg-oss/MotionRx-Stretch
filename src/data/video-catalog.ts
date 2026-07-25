/**
 * Vetted institutional / clinical educational YouTube catalog.
 *
 * Inclusion rules:
 * - Publisher must be a recognized healthcare institution, government health agency,
 *   academic medical center, or system-run PT/patient-education channel
 *   (NIA/NIH, Mayo Clinic, Cleveland Clinic, Johns Hopkins Medicine, VHA, Dartmouth Health, etc.)
 * - Fitness-creator / influencer content is excluded
 * - Every ID is verified active via YouTube oEmbed before catalog entry
 * - Prefer technique-specific demos (form/safety) over generic region videos
 *
 * Last verified: 2026-07-25 (oEmbed batch check)
 */

export type InstitutionalVideo = {
  youtubeId: string;
  title: string;
  institution: string;
  source: string;
  /** High-level region tags for assignment to stretch/exercise slots */
  regions: string[];
  /** Movement techniques this demo best illustrates */
  techniques?: string[];
};

/** All vetted, active institutional education videos */
export const INSTITUTIONAL_VIDEOS: Record<string, InstitutionalVideo> = {
  // —— National Institute on Aging (NIH) ——
  nia_full_workout: {
    youtubeId: "Ev6yE55kYGw",
    title: "15-minute Workout for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA Go4Life educational series",
    regions: ["full", "general", "balance", "leg", "hip"],
  },
  nia_flexibility_6: {
    youtubeId: "KcdkySvCRCc",
    title: "6 Flexibility Exercises for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA flexibility education",
    regions: ["full", "general", "hamstring", "hip", "lowerBack"],
  },
  nia_flexibility_cooldown: {
    youtubeId: "kCQ6irSQwYA",
    title: "4 Flexibility and Cool Down Exercises for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA flexibility education",
    regions: ["full", "general", "calf", "ankle"],
  },
  nia_cooldown_flex: {
    youtubeId: "6ZIxaT4hlho",
    title: "Cool Down and Flexibility Exercises for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA cool-down education",
    regions: ["full", "general"],
  },
  nia_hamstring: {
    youtubeId: "guOj99WPZnw",
    title: "Back Of Leg Stretch for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA stretching education",
    regions: ["hamstring", "leg", "hip"],
  },
  nia_ankle: {
    youtubeId: "87BeiyTFZyU",
    title: "Ankle Stretch for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA stretching education",
    regions: ["ankle", "calf", "balance"],
  },
  nia_shoulder_arm: {
    youtubeId: "CW0h60-PS4Y",
    title: "Shoulder and Arm Stretch for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA stretching education",
    regions: ["shoulder", "chest", "neck"],
  },
  nia_back: {
    youtubeId: "FpIfMyfpCk0",
    title: "Back Stretch for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA stretching education",
    regions: ["lowerBack", "back", "thoracic"],
  },
  nia_balance_heel_toe: {
    youtubeId: "z_GKdFf3qv4",
    title: "Heel-to-Toe Walk Balance Exercise for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA balance education",
    regions: ["balance", "ankle", "leg"],
  },
  nia_balance_one_foot: {
    youtubeId: "QT5d4tTXW6U",
    title: "Stand on One Foot Balance Exercise for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA balance education",
    regions: ["balance", "leg", "hip"],
  },
  nia_upper_strength: {
    youtubeId: "pUYxcRvdal8",
    title: "6 Upper Body Strength Exercises for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA strength education",
    regions: ["shoulder", "core", "chest"],
  },
  nia_wall_pushups: {
    youtubeId: "751E9kAdkwg",
    title: "Wall Pushups Strength Exercise for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA strength education",
    regions: ["shoulder", "chest", "core"],
  },
  nia_strength_workout: {
    youtubeId: "JejTelL05Qw",
    title: "Strength Training Workout for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA strength education",
    regions: ["leg", "hip", "core", "full"],
  },

  // —— Johns Hopkins Medicine ——
  hopkins_movement: {
    youtubeId: "2Jq8jZnoQ8E",
    title: "Exercises to Facilitate Movement with Physical Therapist Peiting Lien",
    institution: "Johns Hopkins Medicine",
    source: "Johns Hopkins Medicine PT education",
    regions: ["full", "general", "hip", "leg", "balance"],
  },
  hopkins_move_more: {
    youtubeId: "4zgjRBQEkeg",
    title: "Simple Exercises to Move More Throughout the Day with Physical Therapist Peiting Lien",
    institution: "Johns Hopkins Medicine",
    source: "Johns Hopkins Medicine PT education",
    regions: ["full", "general", "neck", "shoulder"],
  },

  // —— Veterans Health Administration ——
  vha_full_body: {
    youtubeId: "bZDX7FMqt7U",
    title: "#GerofitExercise: Full body home exercise routine",
    institution: "U.S. Department of Veterans Affairs",
    source: "VA Gerofit / Whole Health education",
    regions: ["full", "general", "leg", "core"],
  },
  vha_seated_core: {
    youtubeId: "EePa6p_0dn8",
    title: "#GerofitExercise: Seated Core Strengthening Routine",
    institution: "U.S. Department of Veterans Affairs",
    source: "VA Gerofit education",
    regions: ["core", "back", "balance"],
  },
  vha_lower_yoga: {
    youtubeId: "cK88Vd7Dn4c",
    title: "#GerofitExercise: Lower-Body Yoga On The Go",
    institution: "U.S. Department of Veterans Affairs",
    source: "VA Gerofit education",
    regions: ["hip", "leg", "hamstring", "ankle"],
  },
  vha_upper_yoga: {
    youtubeId: "x0r6Gf8li-w",
    title: "#GerofitExercise: Upper-Body Yoga On the Go",
    institution: "U.S. Department of Veterans Affairs",
    source: "VA Gerofit education",
    regions: ["shoulder", "neck", "chest", "thoracic"],
  },
  vha_stretching: {
    youtubeId: "jCx5P_yQ4-4",
    title: "Get Fit for Life (10) Stretching",
    institution: "U.S. Department of Veterans Affairs",
    source: "VA Get Fit for Life education",
    regions: ["full", "general", "hamstring", "hip"],
  },
  vha_seated_yoga: {
    youtubeId: "b2gF0nTAY0o",
    title: "#GerofitExercise: Seated Yoga Routine",
    institution: "U.S. Department of Veterans Affairs",
    source: "VA Gerofit education",
    regions: ["full", "general", "neck", "back"],
  },
  vha_taichi_back: {
    youtubeId: "zdbhHqZHJPs",
    title: "Tai Chi: 4 Moves for Lower Back Health",
    institution: "U.S. Department of Veterans Affairs",
    source: "VA Whole Health Tai Chi education",
    regions: ["lowerBack", "back", "balance", "hip"],
  },
  vha_chronic_pain_yoga: {
    youtubeId: "bdvUOoO8gN8",
    title: "Gentle Yoga for Veterans: Chronic Pain Series (Part 1)",
    institution: "U.S. Department of Veterans Affairs",
    source: "VA Whole Health education",
    regions: ["full", "general", "neck", "back"],
  },
  vha_yoga_wellness: {
    youtubeId: "NFHthouBk1M",
    title: "Yoga for Veterans; Whole Health Wellness (Part 1 of 5)",
    institution: "U.S. Department of Veterans Affairs",
    source: "VA Whole Health education",
    regions: ["full", "general"],
  },

  // —— Cleveland Clinic ——
  cleveland_chest: {
    youtubeId: "xKck-mywgVw",
    title: "How to do an assisted chest stretch",
    institution: "Cleveland Clinic",
    source: "Cleveland Clinic Patient Education",
    regions: ["chest", "shoulder"],
  },
  cleveland_active_3: {
    youtubeId: "DC7xYLwWDXc",
    title: "How to do three active stretches",
    institution: "Cleveland Clinic",
    source: "Cleveland Clinic Patient Education",
    regions: ["full", "general", "hip", "shoulder"],
  },
  cleveland_side_bend: {
    youtubeId: "Vko-SJok-fk",
    title: "How to do a standing side bend",
    institution: "Cleveland Clinic",
    source: "Cleveland Clinic Patient Education",
    regions: ["thoracic", "back", "neck"],
  },
  cleveland_cat_cow: {
    youtubeId: "WHUevrqeKIg",
    title: "How to do a cat-cow yoga pose",
    institution: "Cleveland Clinic",
    source: "Cleveland Clinic Patient Education",
    regions: ["thoracic", "lowerBack", "back", "neck"],
  },

  // —— Mayo Clinic ——
  mayo_stretching_pt: {
    youtubeId: "l3uotK_hbn8",
    title: "Stretching Exercises (PT demonstration)",
    institution: "Mayo Clinic",
    source: "Mayo Clinic Patient Education",
    regions: ["shoulder", "chest", "neck"],
  },
  mayo_workday: {
    youtubeId: "XOIqLNElikI",
    title: "Mayo Clinic Minute: The importance of stretching throughout your workday",
    institution: "Mayo Clinic",
    source: "Mayo Clinic Healthy Living Program",
    regions: ["neck", "shoulder", "thoracic"],
  },
  mayo_shoulders: {
    youtubeId: "sbTpwEmtkWg",
    title: "Mayo Clinic Mindful Study Breaks - Shoulders & Upper Body",
    institution: "Mayo Clinic",
    source: "Mayo Clinic Mindful Study Breaks",
    regions: ["shoulder", "neck", "chest"],
  },
  mayo_or_stretch: {
    youtubeId: "bLAeVbBjZV0",
    title: "Mayo Clinic OR-Stretch Between Surgery Stretches Video",
    institution: "Mayo Clinic",
    source: "Mayo Clinic OR-Stretch program",
    regions: ["full", "general", "neck", "shoulder", "hip"],
  },
  mayo_flexibility: {
    youtubeId: "ZiuoldvSc2U",
    title: "Mayo Clinic Minute: The right way to get your body flexible",
    institution: "Mayo Clinic",
    source: "Mayo Clinic sports medicine education",
    regions: ["full", "general"],
  },

  // —— Dartmouth Health (academic medical center) ——
  dartmouth_standing: {
    youtubeId: "mQLzNf8VOIc",
    title: "Standing Exercises for Older Adults",
    institution: "Dartmouth Health",
    source: "Dartmouth Health patient education",
    regions: ["leg", "hip", "balance", "core"],
    techniques: ["sit-to-stand", "balance", "leg-strength", "step"],
  },

  // —— Additional technique-specific institutional demos (oEmbed verified) ——
  nia_lower_strength: {
    youtubeId: "TOKxtgKrGCQ",
    title: "4 Lower Body Strength Exercises for Older Adults",
    institution: "NIH / National Institute on Aging",
    source: "NIA strength education",
    regions: ["leg", "hip", "balance"],
    techniques: ["sit-to-stand", "leg-strength", "hip-strength", "step", "wall-sit", "tke"],
  },
  mayo_band_strength: {
    youtubeId: "P-DbBfHZHC8",
    title: "Strengthening Exercise Bands and Weights (PT demonstration)",
    institution: "Mayo Clinic",
    source: "Mayo Clinic Patient Education — shoulder rehab",
    regions: ["shoulder", "chest"],
    techniques: ["rotator-cuff", "band-row", "shoulder-strength", "serratus"],
  },
  mayo_desk_five: {
    youtubeId: "3QfMXwHGsKc",
    title: "Mayo Clinic Minute: 5 exercises you can do without leaving your desk",
    institution: "Mayo Clinic",
    source: "Mayo Clinic Healthy Living Program",
    regions: ["full", "leg", "shoulder", "balance"],
    techniques: ["sit-to-stand", "wall-push", "calf-raise", "desk-mobility", "carry-walk"],
  },
  mayo_fab5: {
    youtubeId: "T0_QWyAelWI",
    title: "Mayo Clinic Minute: Fab 5 exercises to get you moving",
    institution: "Mayo Clinic",
    source: "Mayo Clinic Minute",
    regions: ["full", "leg", "shoulder"],
    techniques: ["sit-to-stand", "wall-push", "calf-raise", "leg-strength"],
  },
  mayo_low_back: {
    youtubeId: "Ddgmo7NFu1o",
    title: "The do's and don'ts of exercise with low back pain",
    institution: "Mayo Clinic",
    source: "Mayo Clinic sports medicine education",
    regions: ["lowerBack", "back", "core"],
    techniques: ["hip-hinge", "spinal-safe", "core-control", "bird-dog"],
  },
  mayo_move_work: {
    youtubeId: "OW-NbZtBka0",
    title: "Mayo Clinic Minute: Move more at work",
    institution: "Mayo Clinic",
    source: "Mayo Clinic Healthy Living Program",
    regions: ["full", "neck", "thoracic"],
    techniques: ["desk-mobility", "posture", "cervical"],
  },
  cleveland_superman: {
    youtubeId: "uexOGyxLr7E",
    title: "How to do the Superman exercise",
    institution: "Cleveland Clinic",
    source: "Cleveland Clinic Patient Education",
    regions: ["back", "lowerBack", "core"],
    techniques: ["back-extensor", "prone-strength", "posture"],
  },
} as const;

/**
 * Stable region → video-key mapping used by stretch/exercise libraries.
 * Prefer region-specific NIA / Cleveland / Mayo demos; fall back to broader institutional routines.
 */
export const VIDEO_BY_REGION = {
  neck: INSTITUTIONAL_VIDEOS.mayo_workday,
  shoulder: INSTITUTIONAL_VIDEOS.nia_shoulder_arm,
  hip: INSTITUTIONAL_VIDEOS.vha_lower_yoga,
  hamstring: INSTITUTIONAL_VIDEOS.nia_hamstring,
  lowerBack: INSTITUTIONAL_VIDEOS.nia_back,
  back: INSTITUTIONAL_VIDEOS.vha_taichi_back,
  calf: INSTITUTIONAL_VIDEOS.nia_ankle,
  chest: INSTITUTIONAL_VIDEOS.cleveland_chest,
  full: INSTITUTIONAL_VIDEOS.nia_full_workout,
  general: INSTITUTIONAL_VIDEOS.nia_flexibility_6,
  thoracic: INSTITUTIONAL_VIDEOS.cleveland_cat_cow,
  ankle: INSTITUTIONAL_VIDEOS.nia_ankle,
  core: INSTITUTIONAL_VIDEOS.vha_seated_core,
  balance: INSTITUTIONAL_VIDEOS.nia_balance_one_foot,
  leg: INSTITUTIONAL_VIDEOS.nia_strength_workout,
} as const;

export type VideoRegion = keyof typeof VIDEO_BY_REGION;

/** Convenience: youtube ID only (legacy VIDEO maps) */
export const VIDEO_IDS: Record<VideoRegion, string> = {
  neck: VIDEO_BY_REGION.neck.youtubeId,
  shoulder: VIDEO_BY_REGION.shoulder.youtubeId,
  hip: VIDEO_BY_REGION.hip.youtubeId,
  hamstring: VIDEO_BY_REGION.hamstring.youtubeId,
  lowerBack: VIDEO_BY_REGION.lowerBack.youtubeId,
  back: VIDEO_BY_REGION.back.youtubeId,
  calf: VIDEO_BY_REGION.calf.youtubeId,
  chest: VIDEO_BY_REGION.chest.youtubeId,
  full: VIDEO_BY_REGION.full.youtubeId,
  general: VIDEO_BY_REGION.general.youtubeId,
  thoracic: VIDEO_BY_REGION.thoracic.youtubeId,
  ankle: VIDEO_BY_REGION.ankle.youtubeId,
  core: VIDEO_BY_REGION.core.youtubeId,
  balance: VIDEO_BY_REGION.balance.youtubeId,
  leg: VIDEO_BY_REGION.leg.youtubeId,
};

/** Build a Stretch/Exercise video field from a region key */
export function videoForRegion(region: VideoRegion, movementName?: string) {
  const v = VIDEO_BY_REGION[region];
  return {
    youtubeId: v.youtubeId,
    title: v.title,
    source: movementName
      ? `${v.source} · Educational match for: ${movementName}`
      : v.source,
    institution: v.institution,
  };
}

/**
 * Technique-specific institutional demos for proper form.
 * Prefer these over broad region videos when a movement has a clear technique family.
 */
export type TechniqueKey =
  | "chin-tuck"
  | "neck-side"
  | "cervical"
  | "chest-open"
  | "cat-cow"
  | "spinal-flex"
  | "spinal-safe"
  | "hip-glute"
  | "hip-flexor"
  | "hamstring"
  | "quad"
  | "calf"
  | "ankle"
  | "wrist-hand"
  | "thoracic-rotation"
  | "scapular"
  | "glute-bridge"
  | "bird-dog"
  | "sit-to-stand"
  | "wall-push"
  | "dead-bug"
  | "step"
  | "row-pull"
  | "balance"
  | "calf-raise"
  | "carry-walk"
  | "rotator-cuff"
  | "serratus"
  | "core-lateral"
  | "hip-hinge"
  | "knee-rom"
  | "slr"
  | "tke"
  | "foot-intrinsic"
  | "wrist-load"
  | "wall-sit"
  | "adductor"
  | "cervical-iso"
  | "desk-mobility"
  | "full-body"
  | "general"
  | "leg-strength"
  | "hip-strength"
  | "posture";

type VideoCatalogKey = keyof typeof INSTITUTIONAL_VIDEOS;

/**
 * Best institutional demo per technique (form + safety focused).
 * Maps to the closest *content-accurate* catalog entry — not a generic filler.
 * Catalog titles are shown honestly (never relabeled as a different exercise).
 */
export const VIDEO_BY_TECHNIQUE: Record<TechniqueKey, VideoCatalogKey> = {
  "chin-tuck": "mayo_shoulders",
  "neck-side": "mayo_shoulders",
  cervical: "mayo_shoulders",
  "chest-open": "cleveland_chest",
  "cat-cow": "cleveland_cat_cow",
  "spinal-flex": "nia_back",
  "spinal-safe": "mayo_low_back",
  "hip-glute": "vha_lower_yoga",
  "hip-flexor": "vha_lower_yoga",
  hamstring: "nia_hamstring",
  quad: "nia_flexibility_6",
  calf: "nia_ankle",
  ankle: "nia_ankle",
  "wrist-hand": "mayo_or_stretch",
  "thoracic-rotation": "cleveland_side_bend",
  scapular: "mayo_shoulders",
  "glute-bridge": "nia_lower_strength",
  "bird-dog": "cleveland_superman",
  "sit-to-stand": "dartmouth_standing",
  "wall-push": "nia_wall_pushups",
  "dead-bug": "vha_seated_core",
  step: "nia_lower_strength",
  "row-pull": "nia_upper_strength",
  balance: "nia_balance_one_foot",
  "calf-raise": "nia_ankle",
  "carry-walk": "hopkins_move_more",
  "rotator-cuff": "mayo_band_strength",
  serratus: "mayo_band_strength",
  "core-lateral": "vha_seated_core",
  "hip-hinge": "mayo_low_back",
  "knee-rom": "hopkins_movement",
  slr: "nia_lower_strength",
  tke: "nia_lower_strength",
  "foot-intrinsic": "nia_ankle",
  "wrist-load": "mayo_or_stretch",
  "wall-sit": "nia_lower_strength",
  adductor: "vha_lower_yoga",
  "cervical-iso": "mayo_shoulders",
  "desk-mobility": "mayo_desk_five",
  "full-body": "nia_full_workout",
  general: "nia_flexibility_6",
  "leg-strength": "nia_lower_strength",
  "hip-strength": "nia_lower_strength",
  posture: "mayo_shoulders",
};

function normalizeMatchText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s/+-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Score how well a catalog video matches a movement name / technique / region.
 * Higher = better content alignment (used so we don't show a calf video for chin tuck).
 */
export function scoreCatalogVideoMatch(
  video: InstitutionalVideo,
  opts: {
    name?: string;
    technique?: string;
    region?: string;
    bodyParts?: string[];
  }
): number {
  let score = 0;
  const title = normalizeMatchText(video.title);
  const hay = normalizeMatchText(
    [video.title, video.source, ...(video.techniques || []), ...video.regions].join(" ")
  );
  const name = normalizeMatchText(opts.name || "");
  const technique = (opts.technique || "").toLowerCase();

  // Technique key listed on catalog entry
  if (technique && video.techniques?.some((t) => t.toLowerCase() === technique)) {
    score += 40;
  }
  if (technique && video.techniques?.some((t) => t.toLowerCase().includes(technique) || technique.includes(t.toLowerCase()))) {
    score += 18;
  }

  // Region tags
  const region = (opts.region || "").toString();
  if (region && video.regions.includes(region)) score += 14;
  for (const bp of opts.bodyParts || []) {
    const r = inferRegionFromBodyParts([bp]);
    if (video.regions.includes(r) || video.regions.includes(bp)) score += 6;
  }

  // Name tokens vs video title (most important for specificity)
  const tokens = name.split(" ").filter((t) => t.length >= 4);
  const strongTokens = [
    "hamstring",
    "quad",
    "calf",
    "ankle",
    "shoulder",
    "neck",
    "chin",
    "tuck",
    "chest",
    "hip",
    "glute",
    "bridge",
    "balance",
    "push",
    "wall",
    "cat",
    "cow",
    "bird",
    "dog",
    "superman",
    "row",
    "step",
    "sit",
    "stand",
    "flexor",
    "piriformis",
    "thoracic",
    "wrist",
    "core",
    "dead",
    "bug",
    "side",
    "bend",
  ];
  for (const t of tokens) {
    if (title.includes(t)) score += 12;
    else if (hay.includes(t)) score += 5;
  }
  for (const t of strongTokens) {
    if (name.includes(t) && (title.includes(t) || hay.includes(t))) score += 16;
  }

  // Prefer technique-specific demos over generic "minute" / full workouts when name is specific
  if (tokens.length >= 2 && /minute|importance|move more|full workout|15-minute/i.test(video.title)) {
    score -= 12;
  }
  if (video.techniques && video.techniques.length > 0) score += 4;

  return score;
}

/** Best catalog video for free-text movement name (+ optional technique/region). */
export function bestCatalogVideoForMovement(opts: {
  name?: string;
  technique?: TechniqueKey | string;
  region?: VideoRegion | string;
  bodyParts?: string[];
}): InstitutionalVideo {
  const region =
    (opts.region as VideoRegion) ||
    inferRegionFromBodyParts(opts.bodyParts) ||
    "general";

  let best: InstitutionalVideo | undefined;
  let bestScore = -1;

  // Prefer technique map first as a strong candidate
  if (opts.technique && opts.technique in VIDEO_BY_TECHNIQUE) {
    const key = VIDEO_BY_TECHNIQUE[opts.technique as TechniqueKey];
    const v = INSTITUTIONAL_VIDEOS[key];
    const s = scoreCatalogVideoMatch(v, { ...opts, region }) + 30;
    best = v;
    bestScore = s;
  }

  for (const v of Object.values(INSTITUTIONAL_VIDEOS)) {
    const s = scoreCatalogVideoMatch(v, { ...opts, region });
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }

  if (best && bestScore >= 12) return best;

  // Fall back to region primary when score is weak
  return VIDEO_BY_REGION[region] || INSTITUTIONAL_VIDEOS.nia_flexibility_6;
}

/**
 * Technique-specific video for proper demonstration.
 * Title is ALWAYS the real institutional video title (never a fake stretch name).
 * Optional movementName is stored only in source attribution.
 */
export function videoForTechnique(
  technique: TechniqueKey | string,
  movementName?: string
) {
  const v = bestCatalogVideoForMovement({
    technique,
    name: movementName,
  });
  return {
    youtubeId: v.youtubeId,
    title: v.title,
    source: movementName
      ? `${v.source} · Educational match for: ${movementName}`
      : v.source,
    institution: v.institution,
  };
}

/**
 * Resolve the most specific institutional video for a library item.
 * Scores catalog by technique + movement name so videos track written content.
 */
export function videoForMovement(opts: {
  technique?: TechniqueKey | string;
  region?: VideoRegion | string;
  /** Written stretch/exercise name — used for content matching */
  title?: string;
  name?: string;
  bodyParts?: string[];
}) {
  const movementName = opts.name || opts.title;
  const v = bestCatalogVideoForMovement({
    technique: opts.technique,
    region: opts.region,
    name: movementName,
    bodyParts: opts.bodyParts,
  });
  return {
    youtubeId: v.youtubeId,
    title: v.title,
    source: movementName
      ? `${v.source} · Educational match for: ${movementName}`
      : v.source,
    institution: v.institution,
  };
}

/** Flat list of every catalog youtubeId (for audits / oEmbed re-checks) */
export function allCatalogYoutubeIds(): string[] {
  return Object.values(INSTITUTIONAL_VIDEOS).map((v) => v.youtubeId);
}

/** Lookup catalog entry by YouTube ID */
export function getCatalogVideoById(youtubeId: string): InstitutionalVideo | undefined {
  return Object.values(INSTITUTIONAL_VIDEOS).find((v) => v.youtubeId === youtubeId);
}

/**
 * Ordered candidate list for a body region (primary + tagged peers + ultimate fallbacks).
 * Used by auto-refresh resolver so a dead primary never leaves the user without video.
 */
export function candidatesForRegion(region: VideoRegion | string): InstitutionalVideo[] {
  const seen = new Set<string>();
  const out: InstitutionalVideo[] = [];

  const push = (v: InstitutionalVideo | undefined) => {
    if (!v || seen.has(v.youtubeId)) return;
    seen.add(v.youtubeId);
    out.push(v);
  };

  const key = region in VIDEO_BY_REGION ? (region as VideoRegion) : "general";
  push(VIDEO_BY_REGION[key]);

  for (const v of Object.values(INSTITUTIONAL_VIDEOS)) {
    if (v.regions.includes(key) || v.regions.includes(region)) push(v);
  }

  // Always keep strong full-body institutional anchors at the end of the chain
  push(INSTITUTIONAL_VIDEOS.nia_full_workout);
  push(INSTITUTIONAL_VIDEOS.nia_flexibility_6);
  push(INSTITUTIONAL_VIDEOS.hopkins_movement);
  push(INSTITUTIONAL_VIDEOS.vha_full_body);
  push(INSTITUTIONAL_VIDEOS.mayo_or_stretch);

  return out;
}

/** Infer video region from body-part tags when libraries don't pass one */
export function inferRegionFromBodyParts(bodyParts: string[] | undefined): VideoRegion {
  if (!bodyParts?.length) return "general";
  const map: Record<string, VideoRegion> = {
    neck: "neck",
    shoulders: "shoulder",
    shoulder: "shoulder",
    chest: "chest",
    upper_back: "thoracic",
    mid_back: "thoracic",
    thoracic: "thoracic",
    lower_back: "lowerBack",
    low_back: "lowerBack",
    back: "back",
    hips: "hip",
    hip: "hip",
    glutes: "hip",
    hamstrings: "hamstring",
    hamstring: "hamstring",
    quads: "leg",
    thigh: "leg",
    knee: "leg",
    knees: "leg",
    leg: "leg",
    legs: "leg",
    calf: "calf",
    calves: "calf",
    ankle: "ankle",
    ankles: "ankle",
    foot: "ankle",
    core: "core",
    balance: "balance",
    full_body: "full",
    wrist: "general",
    elbow: "general",
    hand: "general",
  };
  for (const bp of bodyParts) {
    const hit = map[bp.toLowerCase().replace(/\s+/g, "_")];
    if (hit) return hit;
  }
  return "general";
}

/** Ultimate always-try list if region chain fails (every catalog ID) */
export function allCatalogVideos(): InstitutionalVideo[] {
  return Object.values(INSTITUTIONAL_VIDEOS);
}
