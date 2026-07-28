/**
 * Vetted institutional / clinical educational YouTube catalog.
 *
 * HARD RULE: MotionRx serves ONLY healthcare / institutional education videos.
 *
 * Also merges PhysioPath curated movement demos (src/data/curated-movement-videos.ts)
 * for health refresh + ID lookup without circular imports.
 *
 * Inclusion rules (all required):
 * - Publisher must match ALLOWED_INSTITUTION_MARKERS (recognized hospital system,
 *   government health agency, academic medical center, or official PT association
 *   patient-education channel)
 * - Fitness-creator / influencer / commercial gym content is excluded forever
 * - Non-catalog YouTube IDs are never embedded (resolver + library enforce this)
 * - Every ID is verified active via YouTube oEmbed before catalog entry
 * - Prefer technique-specific demos (form/safety) over generic region videos
 *
 * Allowed publisher families:
 *   NIH / NIA · Mayo Clinic · Cleveland Clinic · Johns Hopkins Medicine ·
 *   U.S. Department of Veterans Affairs (VHA) · Dartmouth Health ·
 *   Dana-Farber Cancer Institute · American Physical Therapy Association (ChoosePT)
 *
 * Last verified: 2026-07-27 (allowlist + oEmbed)
 */

import {
  CURATED_MOVEMENT_VIDEOS,
  CURATED_PUBLISHERS,
  VIDEO_VERIFIED,
} from "@/data/curated-movement-videos";
import { normalizeForMatch } from "@/lib/input-normalize";

/**
 * Substrings that must appear in `institution` for a video to be serveable.
 * Case-insensitive. Any catalog entry that fails this check is dropped at runtime.
 */
export const ALLOWED_INSTITUTION_MARKERS = [
  // Core MotionRx institutional families
  "nih",
  "national institute on aging",
  "mayo clinic",
  "cleveland clinic",
  "johns hopkins",
  "veterans affairs",
  "department of veterans",
  "vha",
  "dartmouth health",
  "dartmouth",
  "dana-farber",
  "dana farber",
  "american physical therapy association",
  "choosept",
  "apta",
  // PhysioPath curated publisher families (oEmbed author_name verified)
  "piedmont",
  "mgh",
  "massachusetts general",
  "michigan medicine",
  "university orthopedics",
  "ucsf",
  "tsaog",
  "nhs",
  "royal free",
  "visiting nurse",
  "baptist health",
  "penn state health",
  "children's hospital",
  "childrens hospital",
  "mymichigan",
  "ohio state",
  "wexner",
  "adventist health",
  "multicare",
  "upmc",
  "midlands orthop",
  "emergeortho",
  "east cheshire",
  "medstar",
  "hospital for special surgery",
  "hss",
  "tan tock seng",
  "atrius",
  "northamptonshire",
  "buckinghamshire",
  "orthoindy",
  "orthocarolina",
  "unc health",
  "blue ridge",
  "bess",
  "british elbow",
  "singapore general",
  "emory",
  "sharp health",
  "musculoskeletal physiotherapy australia",
  "emory healthcare",
  "hospital",
  "healthcare",
  "health system",
  "medical center",
  "orthop",
  "physiotherapy",
  "physical therapy",
] as const;

/** Blocklist markers — if present, never serve even if somehow catalogued */
export const BLOCKED_PUBLISHER_MARKERS = [
  "howcast",
  "athlete",
  "crossfit",
  "bodybuilding",
  "gymshark",
  "fitness blender",
  "blogilates",
  "yoga with adriene",
  "personal trainer",
  "influencer",
] as const;

export type InstitutionalVideo = {
  youtubeId: string;
  title: string;
  institution: string;
  source: string;
  /** High-level region tags for assignment to stretch/exercise slots */
  regions: string[];
  /** Movement techniques this demo best illustrates */
  techniques?: string[];
  /** stretch | exercise | both — improves kind-aware matching */
  kind?: "stretch" | "exercise" | "both";
  /** Alternate phrases matching written stretch/exercise names */
  aliases?: string[];
  /**
   * technique = specific form demo (preferred for named movements)
   * regional = region-focused education
   * general = full-body / lifestyle education (last resort for specific names)
   */
  accuracyTier?: "technique" | "regional" | "general";
};

/** True when institution string is an allowlisted healthcare / institutional publisher */
export function isAllowedHealthcareInstitution(institution: string): boolean {
  const s = (institution || "").toLowerCase();
  if (!s.trim()) return false;
  if (BLOCKED_PUBLISHER_MARKERS.some((b) => s.includes(b))) return false;
  // Exact curated publisher names (PhysioPath oEmbed-verified channels)
  if (
    CURATED_PUBLISHERS.some(
      (p) => p.toLowerCase() === s || s.includes(p.toLowerCase()) || p.toLowerCase().includes(s)
    )
  ) {
    return true;
  }
  // PhysioPath: "hospital" alone is not enough — animal hospitals pass that bar.
  const genericOnly = [
    "hospital",
    "healthcare",
    "health system",
    "medical center",
    "orthop",
    "physiotherapy",
    "physical therapy",
  ];
  const hit = ALLOWED_INSTITUTION_MARKERS.filter((m) => s.includes(m));
  if (!hit.length) return false;
  if (hit.every((m) => genericOnly.includes(m))) {
    if (/\banimal\b|veterinary|pet\b|photo|visual|gym|recreation|fitness\b/.test(s))
      return false;
  }
  return true;
}

/** True when a video object is in-catalog (or PhysioPath curated) and institutional-allowlisted */
export function isVettedInstitutionalVideo(
  video: Pick<InstitutionalVideo, "youtubeId" | "institution"> | null | undefined
): boolean {
  if (!video?.youtubeId?.trim()) return false;
  if (!isAllowedHealthcareInstitution(video.institution || "")) return false;
  // Must be a known catalog / curated ID (no freestyle YouTube URLs)
  if (getCatalogVideoByIdLoose(video.youtubeId)) return true;
  return Object.values(CURATED_MOVEMENT_VIDEOS).some(
    (c) => c.youtubeId === video.youtubeId
  );
}

/** Internal lookup used before full export of getCatalogVideoById (hoisted helper) */
function getCatalogVideoByIdLoose(youtubeId: string): InstitutionalVideo | undefined {
  const id = youtubeId.trim();
  return Object.values(INSTITUTIONAL_VIDEOS).find((v) => v.youtubeId === id);
}

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
    // Superman only — never pair with bird-dog / dead-bug (different motor patterns)
    techniques: ["superman", "back-extensor", "prone-strength"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: ["superman", "back extension", "prone extension", "prone back raise"],
  },
  // —— Cleveland Clinic (exercise physiologist / balance education) ——
  cleveland_balance: {
    youtubeId: "wUImldgcaHk",
    title: "Balance Exercises To Build Stability | Katie Lawton, MEd",
    institution: "Cleveland Clinic",
    source: "Cleveland Clinic exercise physiology education",
    regions: ["balance", "leg", "hip", "ankle"],
    techniques: ["balance", "tandem", "single-leg", "proprioception"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: ["balance", "stability", "tandem", "single leg", "stand on one foot"],
  },

  // —— Technique-true institutional demos (oEmbed verified 2026-07-26) ——
  /** True glute-bridge form demo — not a multi-exercise lower-body block */
  mayo_glute_bridge: {
    youtubeId: "YRqoIM0u0PY",
    title: "Wellness Wednesday: The glutes exercise you need to know",
    institution: "Mayo Clinic",
    source: "Mayo Clinic Healthy Living Program — PT-led glute bridge education",
    regions: ["hip", "lowerBack", "leg", "core"],
    techniques: ["glute-bridge"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: [
      "glute bridge",
      "bridge pose",
      "hip bridge",
      "glutes exercise",
      "bridge",
      "glute activation",
    ],
  },
  /** True quadruped bird-dog form demo (APTA public education) */
  choosept_bird_dog: {
    youtubeId: "ww-6lRXvI9Y",
    title: "Physical Therapy - Bird Dog Exercise",
    institution: "American Physical Therapy Association (ChoosePT)",
    source: "ChoosePT patient education — bird-dog form demonstration",
    regions: ["lowerBack", "core", "back"],
    techniques: ["bird-dog"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: [
      "bird dog",
      "bird-dog",
      "bird dog exercise",
      "quadruped opposite arm leg",
      "opposite arm and leg",
    ],
  },
  /**
   * Supine opposite-limb control (bird-dog on back) — closest institutional
   * form demo for dead-bug / supine core patterns.
   */
  dana_supine_bird_dog: {
    youtubeId: "e3mqAN8meh8",
    title: "How to do the Bird Dog Exercise on your Back (8 min)",
    institution: "Dana-Farber Cancer Institute",
    source: "Dana-Farber Zakim Center remote programming — supine limb control",
    regions: ["core", "lowerBack", "back"],
    techniques: ["dead-bug", "core-control"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: [
      "bird dog on your back",
      "supine bird dog",
      "dead bug",
      "dead-bug",
      "core on back",
      "opposite arm leg supine",
    ],
  },
} as const;

/**
 * Enrichment layer: technique aliases, kind, and accuracy tier for smarter
 * matching of *written* stretch/exercise names → institutional demos.
 * Merged at score time so catalog entries stay lean.
 */
/**
 * Narrow technique claims: a video may only "own" demos it actually shows.
 * Over-broad technique bags caused glute-bridge → yoga, bird-dog → superman, etc.
 */
const VIDEO_ENRICHMENT: Partial<
  Record<
    keyof typeof INSTITUTIONAL_VIDEOS,
    Pick<InstitutionalVideo, "techniques" | "kind" | "aliases" | "accuracyTier">
  >
> = {
  nia_hamstring: {
    techniques: ["hamstring"],
    kind: "stretch",
    accuracyTier: "technique",
    aliases: ["hamstring", "back of leg", "posterior thigh", "straight leg stretch"],
  },
  nia_ankle: {
    techniques: ["ankle", "calf"],
    kind: "stretch",
    accuracyTier: "technique",
    aliases: ["ankle stretch", "calf stretch", "dorsiflexion", "plantarflexion", "heel cord"],
  },
  nia_shoulder_arm: {
    techniques: ["shoulder", "scapular"],
    kind: "stretch",
    accuracyTier: "regional",
    aliases: ["shoulder stretch", "arm stretch", "upper arm"],
  },
  nia_back: {
    techniques: ["spinal-flex", "lower-back"],
    kind: "stretch",
    accuracyTier: "regional",
    aliases: ["back stretch", "low back stretch", "lumbar stretch"],
  },
  nia_balance_one_foot: {
    techniques: ["balance"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: ["single leg balance", "stand on one foot", "one foot balance"],
  },
  nia_balance_heel_toe: {
    techniques: ["balance"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: ["heel to toe", "tandem walk", "balance walk"],
  },
  nia_wall_pushups: {
    techniques: ["wall-push"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: ["wall push", "wall pushup", "wall push-up", "wall push ups"],
  },
  nia_lower_strength: {
    // LE strength block — stands, steps, wall sit, calf raise.
    // Glute-bridge owns mayo_glute_bridge (do not steal that technique).
    techniques: ["sit-to-stand", "leg-strength", "hip-strength", "step", "wall-sit", "calf-raise", "tke", "knee-rom"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: [
      "sit to stand",
      "chair stand",
      "leg strength",
      "lower body strength",
      "squat",
      "step up",
      "wall sit",
      "heel raise",
      "calf raise",
      "terminal knee",
      "quad set",
    ],
  },
  mayo_glute_bridge: {
    techniques: ["glute-bridge"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: ["glute bridge", "bridge pose", "hip bridge", "glutes exercise", "bridge"],
  },
  choosept_bird_dog: {
    techniques: ["bird-dog"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: ["bird dog", "bird-dog", "bird dog exercise", "quadruped"],
  },
  dana_supine_bird_dog: {
    techniques: ["dead-bug", "core-control"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: ["dead bug", "dead-bug", "bird dog on your back", "supine core"],
  },
  nia_upper_strength: {
    techniques: ["row-pull", "shoulder-strength"],
    kind: "exercise",
    accuracyTier: "regional",
    aliases: ["upper body strength", "arm strength", "shoulder strength"],
  },
  cleveland_chest: {
    techniques: ["chest-open"],
    kind: "stretch",
    accuracyTier: "technique",
    aliases: ["chest stretch", "assisted chest", "doorway chest", "pec stretch", "pectoral stretch"],
  },
  cleveland_cat_cow: {
    techniques: ["cat-cow"],
    kind: "stretch",
    accuracyTier: "technique",
    aliases: ["cat cow", "cat-cow", "cat and cow"],
  },
  cleveland_side_bend: {
    techniques: ["thoracic-rotation", "side-bend"],
    kind: "stretch",
    accuracyTier: "technique",
    aliases: [
      "side bend",
      "standing side bend",
      "lateral flexion",
      "thread the needle",
      "thoracic rotation",
      "open book",
    ],
  },
  cleveland_balance: {
    techniques: ["balance"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: ["balance exercises", "stability", "build stability"],
  },
  mayo_shoulders: {
    techniques: ["shoulder", "posture", "scapular"],
    kind: "stretch",
    accuracyTier: "regional",
    aliases: ["shoulders", "upper body break", "shoulder mobility"],
  },
  mayo_band_strength: {
    techniques: ["rotator-cuff", "serratus", "band-row", "shoulder-strength"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: [
      "bands and weights",
      "rotator cuff",
      "external rotation",
      "shoulder strengthening",
      "resistance band",
      "serratus",
    ],
  },
  mayo_low_back: {
    // Education / dosing — not a bird-dog form demo (see choosept_bird_dog)
    techniques: ["spinal-safe", "hip-hinge", "core-control"],
    kind: "both",
    accuracyTier: "regional",
    aliases: ["low back pain", "exercise with low back", "lumbar", "hip hinge", "dos and donts"],
  },
  mayo_desk_five: {
    techniques: ["desk-mobility", "wrist-hand", "wrist-load", "posture"],
    kind: "both",
    accuracyTier: "regional",
    aliases: ["desk exercises", "without leaving your desk", "office mobility", "wrist", "hand"],
  },
  mayo_workday: {
    techniques: ["desk-mobility", "cervical", "chin-tuck", "neck-side", "cervical-iso", "posture"],
    kind: "stretch",
    accuracyTier: "regional",
    aliases: ["workday stretching", "stretching throughout", "neck stretch", "chin tuck", "cervical"],
  },
  mayo_stretching_pt: {
    techniques: ["chest-open", "shoulder", "neck-side"],
    kind: "stretch",
    accuracyTier: "regional",
    aliases: ["stretching exercises", "pt demonstration", "shoulder stretch"],
  },
  mayo_or_stretch: {
    techniques: ["full-body", "general"],
    kind: "stretch",
    accuracyTier: "general",
    aliases: ["or-stretch", "between surgery", "micro stretch break"],
  },
  dartmouth_standing: {
    techniques: ["sit-to-stand", "leg-strength", "balance"],
    kind: "exercise",
    accuracyTier: "technique",
    aliases: ["standing exercises", "sit to stand", "chair rise", "older adults standing"],
  },
  hopkins_movement: {
    techniques: ["general", "functional"],
    kind: "both",
    accuracyTier: "regional",
    aliases: ["facilitate movement", "functional mobility"],
  },
  hopkins_move_more: {
    techniques: ["carry-walk", "desk-mobility"],
    kind: "both",
    accuracyTier: "regional",
    aliases: ["move more", "throughout the day", "simple exercises"],
  },
  vha_seated_core: {
    // Seated core block — secondary for lateral core; dead-bug owns dana_supine_bird_dog
    techniques: ["core-lateral", "core", "seated-core"],
    kind: "exercise",
    accuracyTier: "regional",
    aliases: ["seated core", "core strengthening", "trunk strength", "seated"],
  },
  vha_taichi_back: {
    techniques: ["spinal-safe", "balance"],
    kind: "both",
    accuracyTier: "regional",
    aliases: ["tai chi", "lower back health"],
  },
  vha_lower_yoga: {
    // Stretch / yoga LE only — NOT glute-bridge strength or sit-to-stand
    techniques: ["hip-glute", "hip-flexor", "adductor", "quad"],
    kind: "stretch",
    accuracyTier: "regional",
    aliases: [
      "lower-body yoga",
      "hip stretch",
      "figure four",
      "piriformis",
      "hip flexor",
      "groin",
      "quad stretch",
      "quadriceps stretch",
    ],
  },
  vha_upper_yoga: {
    techniques: ["neck-side", "thoracic-rotation", "shoulder"],
    kind: "stretch",
    accuracyTier: "regional",
    aliases: ["upper-body yoga", "shoulder yoga", "neck mobility"],
  },
  vha_stretching: {
    techniques: ["hamstring", "hip-flexor", "full-body"],
    kind: "stretch",
    accuracyTier: "regional",
    aliases: ["get fit for life stretching", "stretching routine"],
  },
  nia_full_workout: {
    techniques: ["full-body"],
    kind: "both",
    accuracyTier: "general",
    aliases: ["full body workout", "15-minute workout"],
  },
  nia_flexibility_6: {
    techniques: ["full-body", "general"],
    kind: "stretch",
    accuracyTier: "general",
    aliases: ["flexibility exercises", "flexibility routine"],
  },
  nia_flexibility_cooldown: {
    techniques: ["calf", "ankle", "full-body"],
    kind: "stretch",
    accuracyTier: "regional",
    aliases: ["cool down", "flexibility and cool down"],
  },
  nia_cooldown_flex: {
    techniques: ["full-body", "general"],
    kind: "stretch",
    accuracyTier: "general",
    aliases: ["cool down and flexibility"],
  },
  nia_strength_workout: {
    techniques: ["leg-strength", "hip-strength", "full-body"],
    kind: "exercise",
    accuracyTier: "general",
    aliases: ["strength training workout"],
  },
  mayo_fab5: {
    techniques: ["sit-to-stand", "wall-push", "calf-raise", "leg-strength"],
    kind: "exercise",
    accuracyTier: "regional",
    aliases: ["fab 5", "get you moving"],
  },
  mayo_move_work: {
    techniques: ["desk-mobility", "posture"],
    kind: "both",
    accuracyTier: "regional",
    aliases: ["move more at work"],
  },
  mayo_flexibility: {
    techniques: ["full-body", "general"],
    kind: "stretch",
    accuracyTier: "general",
    aliases: ["get your body flexible", "right way flexible"],
  },
};

function catalogKeyForVideo(video: InstitutionalVideo): string | undefined {
  return Object.entries(INSTITUTIONAL_VIDEOS).find(
    ([, v]) => v.youtubeId === video.youtubeId
  )?.[0];
}

/** Merge static catalog entry with enrichment metadata */
export function enrichCatalogVideo(video: InstitutionalVideo): InstitutionalVideo {
  const key = catalogKeyForVideo(video) as keyof typeof INSTITUTIONAL_VIDEOS | undefined;
  if (!key) return video;
  const extra = VIDEO_ENRICHMENT[key];
  if (!extra) return video;
  return {
    ...video,
    techniques: uniqueStrings([...(video.techniques || []), ...(extra.techniques || [])]),
    aliases: uniqueStrings([...(video.aliases || []), ...(extra.aliases || [])]),
    kind: video.kind || extra.kind || "both",
    accuracyTier: video.accuracyTier || extra.accuracyTier || "regional",
  };
}

function uniqueStrings(arr: string[]): string[] {
  return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
}

/**
 * Infer technique family from written stretch/exercise name + tags.
 * Powers institutional video specificity from library titles.
 */
export function inferTechniqueFromMovement(opts: {
  name?: string;
  tags?: string[];
  benefits?: string[];
  kind?: "stretch" | "exercise";
}): TechniqueKey | undefined {
  const blob = normalizeMatchText(
    [opts.name, ...(opts.tags || []), ...(opts.benefits || [])].filter(Boolean).join(" ")
  );
  if (!blob) return undefined;

  const rules: Array<{ re: RegExp; tech: TechniqueKey }> = [
    { re: /\bchin tuck|double chin|cervical retraction\b/, tech: "chin-tuck" },
    { re: /\bcervical iso|neck iso|isometric neck\b/, tech: "cervical-iso" },
    { re: /\bupper trap|levator|neck side|side bend neck\b/, tech: "neck-side" },
    { re: /\bdoorway|chest stretch|pec stretch|pectoral\b/, tech: "chest-open" },
    { re: /\bcat.?cow|cat and cow\b/, tech: "cat-cow" },
    { re: /\bopen book|thoracic rotation|thread the needle\b/, tech: "thoracic-rotation" },
    { re: /\bhip hinge|deadlift pattern|hinge\b/, tech: "hip-hinge" },
    { re: /\bhip flexor|iliopsoas|lunge stretch\b/, tech: "hip-flexor" },
    { re: /\bfigure.?four|piriformis|glute stretch\b/, tech: "hip-glute" },
    { re: /\bhamstring|back of (the )?leg|posterior chain\b/, tech: "hamstring" },
    { re: /\bquad stretch|quadriceps stretch|standing quad\b/, tech: "quad" },
    { re: /\bcalf|gastroc|soleus|heel cord\b/, tech: "calf" },
    { re: /\bankle alphabet|ankle mobility|ankle circle\b/, tech: "ankle" },
    { re: /\bglute bridge|bridge\b/, tech: "glute-bridge" },
    { re: /\bbird.?dog\b/, tech: "bird-dog" },
    { re: /\bsuperman|prone (back )?extension|prone back raise\b/, tech: "spinal-safe" },
    { re: /\bdead.?bug\b/, tech: "dead-bug" },
    { re: /\bglute bridge|hip bridge\b/, tech: "glute-bridge" },
    { re: /\bsit.?to.?stand|chair stand|stand from sit\b/, tech: "sit-to-stand" },
    { re: /\bwall push|wall push.?up\b/, tech: "wall-push" },
    { re: /\bstep.?up|step.?down\b/, tech: "step" },
    { re: /\bscapular row|band row|seated row|row\b/, tech: "row-pull" },
    { re: /\bbalance|tandem|single.?leg stand|one foot\b/, tech: "balance" },
    { re: /\bheel raise|calf raise\b/, tech: "calf-raise" },
    { re: /\brotator cuff|external rotation|shoulder er\b/, tech: "rotator-cuff" },
    { re: /\bserratus|scapular punch|plus\b/, tech: "serratus" },
    { re: /\btke|terminal knee|end.?range knee extension\b/, tech: "tke" },
    { re: /\bstraight leg raise|slr\b/, tech: "slr" },
    { re: /\bquad set|quadriceps set\b/, tech: "knee-rom" },
    { re: /\bwall sit\b/, tech: "wall-sit" },
    { re: /\bshort foot|foot doming|intrinsic\b/, tech: "foot-intrinsic" },
    { re: /\bwrist|forearm tendon|eccentric wrist\b/, tech: "wrist-load" },
    { re: /\badductor|groin squeeze\b/, tech: "adductor" },
    { re: /\bpelvic tilt|lumbar control\b/, tech: "spinal-safe" },
    { re: /\bchild.?s pose|knee to chest\b/, tech: "spinal-flex" },
    { re: /\bdesk|posture|workday\b/, tech: "desk-mobility" },
    { re: /\bthoracic extension|foam roller thoracic\b/, tech: "thoracic-rotation" },
    { re: /\bscapular|shoulder blade\b/, tech: "scapular" },
  ];

  for (const r of rules) {
    if (r.re.test(blob)) return r.tech;
  }

  // Kind fallbacks
  if (opts.kind === "stretch" && /\bneck|cervical\b/.test(blob)) return "cervical";
  if (opts.kind === "exercise" && /\bleg|lower body\b/.test(blob)) return "leg-strength";
  return undefined;
}

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
  balance: INSTITUTIONAL_VIDEOS.cleveland_balance,
  leg: INSTITUTIONAL_VIDEOS.nia_lower_strength,
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
 * Canonical institutional demo per technique family.
 * Matching LOCKS to this map unless another catalog entry explicitly owns the
 * same technique key (see bestCatalogVideoForMovement). Prevents generic
 * “full body / yoga / OR stretch” demos from stealing specific movements.
 */
export const VIDEO_BY_TECHNIQUE: Record<TechniqueKey, VideoCatalogKey> = {
  // Neck / posture — workday + shoulder breaks are closest institutional neck education
  "chin-tuck": "mayo_workday",
  "neck-side": "mayo_workday",
  cervical: "mayo_workday",
  "cervical-iso": "mayo_workday",
  // True named form demos
  "chest-open": "cleveland_chest",
  "cat-cow": "cleveland_cat_cow",
  "spinal-flex": "nia_back",
  "spinal-safe": "mayo_low_back",
  "hip-glute": "vha_lower_yoga",
  "hip-flexor": "vha_lower_yoga",
  hamstring: "nia_hamstring",
  quad: "vha_lower_yoga",
  calf: "nia_ankle",
  ankle: "nia_ankle",
  "wrist-hand": "mayo_desk_five",
  "wrist-load": "mayo_desk_five",
  "thoracic-rotation": "cleveland_side_bend",
  scapular: "mayo_shoulders",
  // Technique-true locks (must match listed movement, not generic LE blocks)
  "glute-bridge": "mayo_glute_bridge",
  "bird-dog": "choosept_bird_dog",
  "dead-bug": "dana_supine_bird_dog",
  "sit-to-stand": "dartmouth_standing",
  "wall-push": "nia_wall_pushups",
  step: "nia_lower_strength",
  "row-pull": "nia_upper_strength",
  balance: "cleveland_balance",
  "calf-raise": "nia_lower_strength",
  "carry-walk": "hopkins_move_more",
  "rotator-cuff": "mayo_band_strength",
  serratus: "mayo_band_strength",
  "core-lateral": "vha_seated_core",
  "hip-hinge": "mayo_low_back",
  "knee-rom": "nia_lower_strength",
  // SLR is an exercise; hamstring stretch video is posterior-chain setup only (regional)
  slr: "nia_hamstring",
  tke: "nia_lower_strength",
  "foot-intrinsic": "nia_ankle",
  "wall-sit": "nia_lower_strength",
  adductor: "vha_lower_yoga",
  "desk-mobility": "mayo_desk_five",
  "full-body": "nia_full_workout",
  general: "nia_flexibility_6",
  "leg-strength": "nia_lower_strength",
  "hip-strength": "nia_lower_strength",
  posture: "mayo_shoulders",
};

function normalizeMatchText(s: string): string {
  // Keyboard smart quotes/dashes/diacritics → catalog-safe match tokens
  return normalizeForMatch(s);
}

/** True if catalog video explicitly owns this technique key */
function videoOwnsTechnique(video: InstitutionalVideo, technique: string): boolean {
  const t = technique.toLowerCase().trim();
  if (!t) return false;
  return (video.techniques || []).some((x) => x.toLowerCase() === t);
}

/**
 * Score how well a catalog video matches a *written* stretch/exercise name,
 * technique family, body region, and movement kind.
 *
 * Technique ownership is required for high scores — loose region/token overlap
 * alone cannot beat a locked technique map entry.
 */
export function scoreCatalogVideoMatch(
  video: InstitutionalVideo,
  opts: {
    name?: string;
    technique?: string;
    region?: string;
    bodyParts?: string[];
    tags?: string[];
    kind?: "stretch" | "exercise";
    /** When true, videos that do not own the technique get a hard penalty */
    requireTechnique?: boolean;
  }
): number {
  const v = enrichCatalogVideo(video);
  let score = 0;
  const title = normalizeMatchText(v.title);
  const aliasHay = normalizeMatchText((v.aliases || []).join(" "));
  const techHay = normalizeMatchText((v.techniques || []).join(" "));
  const hay = normalizeMatchText(
    [v.title, v.source, aliasHay, techHay, ...v.regions, v.institution].join(" ")
  );
  const name = normalizeMatchText(opts.name || "");
  const tagBlob = normalizeMatchText((opts.tags || []).join(" "));
  const technique =
    (opts.technique || "").toLowerCase() ||
    inferTechniqueFromMovement({
      name: opts.name,
      tags: opts.tags,
      kind: opts.kind,
    }) ||
    "";

  // —— Technique ownership (hard gate for instructional accuracy) ——
  if (technique) {
    const owns = videoOwnsTechnique(v, technique);
    if (owns) {
      score += 80;
    } else if (opts.requireTechnique) {
      // Hard reject: wrong technique family must not win on weak token overlap
      score -= 120;
    } else {
      // Soft partial: only if technique words appear in title/aliases (not region spam)
      const techWords = technique
        .replace(/-/g, " ")
        .split(" ")
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
      let partial = 0;
      for (const w of techWords) {
        if (title.includes(w) || aliasHay.includes(w)) partial += 8;
      }
      score += Math.min(partial, 16);
      score -= 25; // still disfavor non-owners
    }
  }

  // —— Exact alias phrase match (written name ↔ catalog aliases) ——
  for (const alias of v.aliases || []) {
    const a = normalizeMatchText(alias);
    if (a.length < 4) continue;
    if (name === a || name.includes(a) || a.includes(name)) score += 48;
    else if (tagBlob.includes(a)) score += 12;
  }

  // —— Region tags (secondary to technique) ——
  const region = (opts.region || "").toString();
  if (region && v.regions.includes(region)) score += 10;
  for (const bp of opts.bodyParts || []) {
    const r = inferRegionFromBodyParts([bp]);
    if (v.regions.includes(r) || v.regions.includes(bp.replace(/-/g, ""))) score += 5;
  }

  // —— Name token overlap — only title/alias, not bag-of-regions ——
  const tokens = name.split(" ").filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
  let titleAliasHits = 0;
  for (const t of tokens) {
    if (title.includes(t)) {
      score += 14;
      titleAliasHits++;
    } else if (aliasHay.includes(t)) {
      score += 12;
      titleAliasHits++;
    }
  }

  // Specificity gate: named movement with zero title/alias token hits loses
  // against technique-true demos (prevents “workday minute” winning for “glute bridge”)
  if (tokens.length >= 2 && titleAliasHits === 0) {
    score -= 35;
    if (v.accuracyTier === "general") score -= 25;
    if (/minute|importance|wellness|full body|15-minute|or-stretch|between surgery/i.test(v.title)) {
      score -= 30;
    }
  }
  if (tokens.length >= 1 && titleAliasHits >= 2) score += 22;
  if (tokens.length >= 1 && titleAliasHits >= 3) score += 12;

  // Multi-word phrase hits require title or alias (never generic region hay)
  const phrases = [
    "sit to stand",
    "chin tuck",
    "cat cow",
    "bird dog",
    "dead bug",
    "wall push",
    "hip hinge",
    "heel raise",
    "calf raise",
    "glute bridge",
    "terminal knee",
    "external rotation",
    "straight leg",
    "figure four",
    "doorway chest",
    "hip flexor",
    "low back",
    "back of leg",
    "assisted chest",
    "wall pushup",
    "wall push-up",
    "shoulder er",
    "scapular row",
    "side bend",
    "single leg",
    "stand on one foot",
  ];
  for (const ph of phrases) {
    if (name.includes(ph) && (title.includes(ph) || aliasHay.includes(ph))) {
      score += 50;
    }
  }

  // Technique key literally in title/alias is strongest form correlation
  if (technique) {
    const techPhrase = technique.replace(/-/g, " ");
    if (title.includes(techPhrase) || aliasHay.includes(techPhrase)) score += 55;
    // e.g. technique bird-dog and title "Bird Dog Exercise"
    const compact = technique.replace(/-/g, "");
    if (title.replace(/\s+/g, "").includes(compact) || aliasHay.replace(/\s+/g, "").includes(compact)) {
      score += 20;
    }
  }

  // —— Kind alignment ——
  const kind = opts.kind || inferKindFromName(name);
  if (kind && v.kind && v.kind !== "both") {
    if (v.kind === kind) score += 16;
    else score -= 35; // stretch must not get strength workout; exercise must not get yoga stretch
  }
  if (
    kind === "stretch" &&
    /strength|workout|pushup|push-up|band|weights/i.test(v.title) &&
    !/stretch|flexibility|yoga|mobility/i.test(v.title)
  ) {
    score -= 40;
  }
  if (
    kind === "exercise" &&
    /yoga|cool down|flexibility exercises/i.test(v.title) &&
    !/strength|balance|form|exercise|pushup|stand/i.test(v.title)
  ) {
    score -= 40;
  }

  // —— Accuracy tier ——
  if (v.accuracyTier === "technique") score += 18;
  else if (v.accuracyTier === "regional") score += 4;
  else if (v.accuracyTier === "general") score -= 30;

  // Generic lifestyle / “minute” fillers lose when we have a named movement
  if (
    tokens.length >= 1 &&
    /minute|importance|move more|full workout|15-minute|wellness|podcast|between surgery|or-stretch/i.test(
      v.title
    )
  ) {
    score -= 50;
  }

  return score;
}

const STOP_WORDS = new Set([
  "with",
  "from",
  "that",
  "this",
  "your",
  "for",
  "the",
  "and",
  "proper",
  "form",
  "technique",
  "institutional",
  "education",
  "stretch",
  "exercise",
]);

function inferKindFromName(name: string): "stretch" | "exercise" | undefined {
  if (/\b(set|bridge|row|push|stand|raise|step|isometric|strength|activation|hinge|carry|balance|tke|slr)\b/.test(name)) {
    return "exercise";
  }
  if (/\b(stretch|mobility|flex|pose|open|tuck|tilt)\b/.test(name)) {
    return "stretch";
  }
  return undefined;
}

function formatMatchedVideo(
  v: InstitutionalVideo,
  movementName?: string
): {
  youtubeId: string;
  title: string;
  source: string;
  institution: string;
} {
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
 * Best catalog video for a written stretch/exercise.
 * When a technique key is known, the VIDEO_BY_TECHNIQUE primary is locked unless
 * another entry *explicitly owns the same technique* and scores higher —
 * or a catalog video has a clear title/alias hit on the written movement name
 * and owns the technique (specificity wins over weak map defaults).
 */
export function bestCatalogVideoForMovement(opts: {
  name?: string;
  technique?: TechniqueKey | string;
  region?: VideoRegion | string;
  bodyParts?: string[];
  tags?: string[];
  kind?: "stretch" | "exercise";
}): InstitutionalVideo {
  const inferredTech =
    (opts.technique as TechniqueKey) ||
    inferTechniqueFromMovement({
      name: opts.name,
      tags: opts.tags,
      kind: opts.kind,
    });
  const region =
    (opts.region as VideoRegion) ||
    inferRegionFromBodyParts(opts.bodyParts) ||
    "general";

  const scoreOpts = {
    name: opts.name,
    technique: inferredTech,
    region,
    bodyParts: opts.bodyParts,
    tags: opts.tags,
    kind: opts.kind,
    requireTechnique: Boolean(inferredTech),
  };

  // —— Technique lock path ——
  if (inferredTech && inferredTech in VIDEO_BY_TECHNIQUE) {
    const mapKey = VIDEO_BY_TECHNIQUE[inferredTech as TechniqueKey];
    const primaryRaw = INSTITUTIONAL_VIDEOS[mapKey];
    const primary = isAllowedHealthcareInstitution(primaryRaw.institution)
      ? enrichCatalogVideo(primaryRaw)
      : enrichCatalogVideo(VIDEO_BY_REGION.general);
    let best = primary;
    // Modest map bias — not so large that a title-true peer can't win
    let bestScore =
      scoreCatalogVideoMatch(primary, { ...scoreOpts, requireTechnique: false }) + 40;

    // Peers that own the same technique can dethrone the map primary (allowlisted only)
    for (const raw of Object.values(INSTITUTIONAL_VIDEOS)) {
      if (!isAllowedHealthcareInstitution(raw.institution)) continue;
      const v = enrichCatalogVideo(raw);
      if (v.youtubeId === primary.youtubeId) continue;
      if (!videoOwnsTechnique(v, inferredTech)) continue;
      const s = scoreCatalogVideoMatch(v, scoreOpts);
      if (s > bestScore) {
        bestScore = s;
        best = v;
      }
    }

    // Safety: if primary is general-tier and a technique-tier owner exists, prefer owner
    if ((primary.accuracyTier === "general" || primary.accuracyTier === "regional") && inferredTech) {
      for (const raw of Object.values(INSTITUTIONAL_VIDEOS)) {
        if (!isAllowedHealthcareInstitution(raw.institution)) continue;
        const v = enrichCatalogVideo(raw);
        if (!videoOwnsTechnique(v, inferredTech)) continue;
        if (v.accuracyTier !== "technique") continue;
        const s = scoreCatalogVideoMatch(v, scoreOpts);
        if (s + 10 >= bestScore) {
          best = v;
          bestScore = s + 10;
        }
      }
    }

    return best;
  }

  // —— No technique: score full catalog with kind/name, reject weak general fillers ——
  let best: InstitutionalVideo | undefined;
  let bestScore = -Infinity;
  for (const raw of Object.values(INSTITUTIONAL_VIDEOS)) {
    if (!isAllowedHealthcareInstitution(raw.institution)) continue;
    const v = enrichCatalogVideo(raw);
    const s = scoreCatalogVideoMatch(v, { ...scoreOpts, requireTechnique: false });
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }

  if (best && bestScore >= 20) return best;

  // Region primary as last resort (still institutional)
  return enrichCatalogVideo(VIDEO_BY_REGION[region] || INSTITUTIONAL_VIDEOS.nia_flexibility_6);
}

/**
 * How specifically a catalog video matches a written movement (0–100 style).
 * Used by resolver to decide whether preferred ID may be overridden.
 */
export function movementVideoMatchScore(opts: {
  video: InstitutionalVideo;
  name?: string;
  technique?: string;
  region?: string;
  bodyParts?: string[];
  tags?: string[];
  kind?: "stretch" | "exercise";
}): number {
  return scoreCatalogVideoMatch(enrichCatalogVideo(opts.video), {
    name: opts.name,
    technique: opts.technique,
    region: opts.region,
    bodyParts: opts.bodyParts,
    tags: opts.tags,
    kind: opts.kind,
    requireTechnique: Boolean(opts.technique),
  });
}

/**
 * Technique-specific video for proper demonstration.
 * Title is ALWAYS the real institutional video title (never a fake stretch name).
 * Optional movementName is stored only in source attribution.
 */
export function videoForTechnique(
  technique: TechniqueKey | string,
  movementName?: string,
  opts?: {
    bodyParts?: string[];
    tags?: string[];
    kind?: "stretch" | "exercise";
  }
) {
  // Infer kind from technique map entry when caller omits it (stretch vs exercise demos)
  let kind = opts?.kind;
  if (!kind && technique in VIDEO_BY_TECHNIQUE) {
    const key = VIDEO_BY_TECHNIQUE[technique as TechniqueKey];
    const mapped = enrichCatalogVideo(INSTITUTIONAL_VIDEOS[key]);
    if (mapped.kind === "stretch" || mapped.kind === "exercise") kind = mapped.kind;
  }

  const v = bestCatalogVideoForMovement({
    technique,
    name: movementName,
    bodyParts: opts?.bodyParts,
    tags: opts?.tags,
    kind,
  });
  return formatMatchedVideo(v, movementName);
}

/**
 * Resolve the most specific institutional video for a library item.
 * Scores catalog by written name + technique + tags + kind so demos track content.
 */
export function videoForMovement(opts: {
  technique?: TechniqueKey | string;
  region?: VideoRegion | string;
  /** Written stretch/exercise name — used for content matching */
  title?: string;
  name?: string;
  bodyParts?: string[];
  tags?: string[];
  kind?: "stretch" | "exercise";
}) {
  const movementName = opts.name || opts.title;
  const inferred =
    opts.technique ||
    inferTechniqueFromMovement({
      name: movementName,
      tags: opts.tags,
      kind: opts.kind,
    });
  const v = bestCatalogVideoForMovement({
    technique: inferred,
    region: opts.region,
    name: movementName,
    bodyParts: opts.bodyParts,
    tags: opts.tags,
    kind: opts.kind,
  });
  return formatMatchedVideo(v, movementName);
}

/** Flat list of every catalog youtubeId (for audits / oEmbed re-checks) */
export function allCatalogYoutubeIds(): string[] {
  // MotionRx region/technique catalog + PhysioPath curated movement demos
  const ids = new Set(allCatalogVideos().map((v) => v.youtubeId));
  for (const cur of Object.values(CURATED_MOVEMENT_VIDEOS)) {
    if (isAllowedHealthcareInstitution(cur.institution)) ids.add(cur.youtubeId);
  }
  return Array.from(ids);
}

/**
 * Every catalog video that passes the institutional allowlist.
 * Runtime safety net: drops any entry that fails publisher rules.
 */
export function allCatalogVideos(): InstitutionalVideo[] {
  return Object.values(INSTITUTIONAL_VIDEOS)
    .filter((v) => isAllowedHealthcareInstitution(v.institution))
    .map((v) => enrichCatalogVideo(v));
}

/** Lookup catalog entry by YouTube ID (allowlisted institutions only) */
export function getCatalogVideoById(youtubeId: string): InstitutionalVideo | undefined {
  const id = (youtubeId || "").trim();
  if (!id) return undefined;
  const v = Object.values(INSTITUTIONAL_VIDEOS).find((x) => x.youtubeId === id);
  if (v) {
    if (!isAllowedHealthcareInstitution(v.institution)) return undefined;
    return enrichCatalogVideo(v);
  }
  // PhysioPath curated movement IDs (not in region catalog)
  for (const [key, cur] of Object.entries(CURATED_MOVEMENT_VIDEOS)) {
    if (cur.youtubeId === id && isAllowedHealthcareInstitution(cur.institution)) {
      return {
        youtubeId: cur.youtubeId,
        title: key.replace(/\b\w/g, (c) => c.toUpperCase()),
        institution: cur.institution,
        source: `PhysioPath curated · checked ${VIDEO_VERIFIED} · Educational match for: ${key}`,
        regions: ["general"],
        techniques: [key.replace(/\s+/g, "-")],
        kind: "both",
        aliases: [key],
        accuracyTier: "technique",
      };
    }
  }
  return undefined;
}

/**
 * Audit helper: returns catalog keys that fail institutional allowlist
 * (should always be empty in production).
 */
export function auditNonInstitutionalCatalogEntries(): Array<{
  key: string;
  institution: string;
  youtubeId: string;
}> {
  return Object.entries(INSTITUTIONAL_VIDEOS)
    .filter(([, v]) => !isAllowedHealthcareInstitution(v.institution))
    .map(([key, v]) => ({
      key,
      institution: v.institution,
      youtubeId: v.youtubeId,
    }));
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

  for (const v of allCatalogVideos()) {
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


