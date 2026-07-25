/**
 * Vetted institutional / clinical educational YouTube catalog.
 *
 * Inclusion rules:
 * - Publisher must be a recognized healthcare institution, government health agency,
 *   academic medical center, or system-run PT/patient-education channel
 *   (NIA/NIH, Mayo Clinic, Cleveland Clinic, Johns Hopkins Medicine, VHA, Dartmouth Health, etc.)
 * - Fitness-creator / influencer content is excluded
 * - Every ID is verified active via YouTube oEmbed before catalog entry
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
export function videoForRegion(region: VideoRegion, titleOverride?: string) {
  const v = VIDEO_BY_REGION[region];
  return {
    youtubeId: v.youtubeId,
    title: titleOverride ?? v.title,
    source: v.source,
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
