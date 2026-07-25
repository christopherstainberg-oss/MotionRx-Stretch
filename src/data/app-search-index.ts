/**
 * Global app search index: pages, plan steps, categories, and subsections.
 * Used by the header search autocomplete (client-side, instant).
 */

export type SearchCategory =
  | "Your plan"
  | "Libraries"
  | "Care tools"
  | "Track & reflect"
  | "Learn"
  | "Account"
  | "Body regions"
  | "Safety & devices"
  | "Modalities"
  | "Assessment steps"
  | "Journal steps";

export type AppSearchItem = {
  id: string;
  title: string;
  category: SearchCategory;
  subcategory?: string;
  /** Extra terms for matching */
  keywords: string[];
  href: string;
  description: string;
};

export const APP_SEARCH_INDEX: AppSearchItem[] = [
  // —— Plan path ——
  {
    id: "home",
    title: "Home",
    category: "Your plan",
    keywords: ["start", "dashboard", "welcome"],
    href: "/home",
    description: "Plan overview and quick next step",
  },
  {
    id: "assessment",
    title: "Assessment",
    category: "Your plan",
    subcategory: "Step 1 · Intake",
    keywords: ["intake", "pain", "paragraph", "symptoms", "safety", "precautions", "borg", "age"],
    href: "/assessment",
    description: "Describe symptoms and build a clinical plan",
  },
  {
    id: "assessment-story",
    title: "Assessment · Your story",
    category: "Assessment steps",
    subcategory: "Step 1",
    keywords: ["paragraph", "describe", "write", "story"],
    href: "/assessment",
    description: "Free-text clinical story intake",
  },
  {
    id: "assessment-body",
    title: "Assessment · Body & pain",
    category: "Assessment steps",
    subcategory: "Step 2",
    keywords: ["areas", "pain scale", "symptoms", "goals", "regions"],
    href: "/assessment",
    description: "Body regions, pain scores, goals",
  },
  {
    id: "assessment-safety",
    title: "Assessment · Safety & devices",
    category: "Assessment steps",
    subcategory: "Step 3",
    keywords: ["sternal", "weight bearing", "nwb", "implants", "pacemaker", "orthotics", "walker"],
    href: "/assessment",
    description: "Precautions, implants, braces, assistive devices",
  },
  {
    id: "assessment-medications",
    title: "Assessment · Current medications",
    category: "Assessment steps",
    subcategory: "Step 3 · Medications",
    keywords: [
      "medications",
      "meds",
      "doses",
      "prescription",
      "pill",
      "iv",
      "intramuscular",
      "drug",
      "pharmacy",
      "anticoagulant",
      "beta blocker",
    ],
    href: "/assessment",
    description: "Search 100k medication catalog; record dose, route, frequency",
  },
  {
    id: "assessment-prefs",
    title: "Assessment · Preferences",
    category: "Assessment steps",
    subcategory: "Step 4",
    keywords: ["minutes", "difficulty", "home based", "session"],
    href: "/assessment",
    description: "Session length, difficulty, home HEP",
  },
  {
    id: "assessment-plan",
    title: "Assessment · Your plan",
    category: "Assessment steps",
    subcategory: "Step 5",
    keywords: ["generate", "results", "routine"],
    href: "/assessment",
    description: "Generated stretch + exercise plan",
  },
  {
    id: "routines",
    title: "Routines",
    category: "Your plan",
    subcategory: "Step 2 · Follow plan",
    keywords: ["program", "session", "template", "hep"],
    href: "/routines",
    description: "Starter and personalized routines",
  },
  {
    id: "session",
    title: "Guided session",
    category: "Your plan",
    subcategory: "Step 2 · Practice",
    keywords: ["start session", "do workout", "home based checkbox", "practice"],
    href: "/routines/session",
    description: "Run your plan step by step with video demos",
  },
  {
    id: "builder",
    title: "Routine builder",
    category: "Your plan",
    keywords: ["customize", "edit plan", "rotate", "add stretch"],
    href: "/builder",
    description: "Customize and rotate plan items",
  },
  {
    id: "journal",
    title: "Daily journal",
    category: "Track & reflect",
    subcategory: "Step 3 · Reflect",
    keywords: ["diary", "lined paper", "pain score", "mood", "wins", "jeffery journal"],
    href: "/journal",
    description: "Daily reflection that can adjust your plan",
  },
  {
    id: "journal-write",
    title: "Journal · Write",
    category: "Journal steps",
    subcategory: "Step 1",
    keywords: ["starters", "lined paper", "reflection"],
    href: "/journal",
    description: "Open-ended starters and lined journal page",
  },
  {
    id: "journal-scores",
    title: "Journal · Scores",
    category: "Journal steps",
    subcategory: "Step 2",
    keywords: ["pain", "mood", "energy", "sleep"],
    href: "/journal",
    description: "Pain, mood, energy, and sleep scores",
  },
  {
    id: "journal-jeffery",
    title: "Journal · Jeffery feedback",
    category: "Journal steps",
    subcategory: "Step 3",
    keywords: ["wins", "improvements", "coach notes", "plan signal"],
    href: "/journal",
    description: "Coach notes and plan progress signals",
  },
  {
    id: "journal-adjust",
    title: "Journal · Plan adjust",
    category: "Journal steps",
    subcategory: "Step 4",
    keywords: ["progress", "maintain", "regress", "flare", "dosing"],
    href: "/journal",
    description: "How today's journal can adjust plan dosing",
  },
  {
    id: "jeffery",
    title: "Jeffery AI coach",
    category: "Your plan",
    subcategory: "Step 4 · Coach",
    keywords: ["chat", "coach", "ask", "adjust", "therapist questions"],
    href: "/jeffery",
    description: "Clinical coach with full app context",
  },
  {
    id: "insights",
    title: "Insights",
    category: "Track & reflect",
    keywords: ["correlation", "big picture", "patterns"],
    href: "/insights",
    description: "Correlated sessions, journal, pain, and goals",
  },
  {
    id: "progress",
    title: "Progress & goals",
    category: "Track & reflect",
    keywords: ["trends", "goals", "history"],
    href: "/progress",
    description: "Track practice and goals over time",
  },

  // —— Libraries ——
  {
    id: "library",
    title: "Stretch library",
    category: "Libraries",
    keywords: ["mobility", "flexibility", "holds", "catalog", "evidence based"],
    href: "/library",
    description: "Clinician-authored stretches with institutional form videos",
  },
  {
    id: "exercises",
    title: "Exercise library",
    category: "Libraries",
    keywords: ["strength", "balance", "activation", "functional"],
    href: "/exercises",
    description: "Strength and motor-control exercises with demos",
  },
  {
    id: "library-beginner",
    title: "Beginner stretches",
    category: "Libraries",
    subcategory: "Difficulty filter",
    keywords: ["easy", "gentle", "intro", "starter"],
    href: "/library?difficulty=beginner",
    description: "Lower-demand stretch catalog filter",
  },
  {
    id: "library-intermediate",
    title: "Intermediate stretches",
    category: "Libraries",
    subcategory: "Difficulty filter",
    keywords: ["moderate", "progress"],
    href: "/library?difficulty=intermediate",
    description: "Moderate stretch catalog filter",
  },
  {
    id: "library-advanced",
    title: "Advanced stretches",
    category: "Libraries",
    subcategory: "Difficulty filter",
    keywords: ["hard", "challenge", "advanced"],
    href: "/library?difficulty=advanced",
    description: "Higher-demand stretch catalog filter",
  },

  // —— Care tools ——
  {
    id: "modalities",
    title: "PT modalities",
    category: "Care tools",
    keywords: ["heat", "ice", "tens", "pre-visit", "post-visit", "pacing"],
    href: "/modalities",
    description: "Pre/post-visit and home modality education",
  },
  // Modality category sections
  ...(
    [
      ["thermal", "Heat / Thermal", "heat pack heating pad warm shower paraffin"],
      ["cryotherapy", "Cold / Cryotherapy", "ice cold pack ice massage cryotherapy"],
      ["electrotherapy", "Electrotherapy", "tens nmes estim electrical"],
      ["manual-soft-tissue", "Manual & soft tissue", "massage foam roll ball release"],
      ["movement-based", "Movement-based recovery", "walk active recovery graded"],
      ["load-management", "Load management & pacing", "pacing rest elevation workstation"],
      ["education-self-efficacy", "Education & self-efficacy", "pre-visit post-visit symptom log hep"],
      ["assistive-support", "Supportive devices", "brace cane crutches compression"],
      ["aquatic", "Aquatic therapy concepts", "pool water buoyancy"],
      ["mind-body", "Mind–body & recovery", "breathing graded exposure sleep"],
      ["clinic-procedure", "Clinic procedures", "ultrasound dry needling traction laser"],
    ] as const
  ).map(([slug, title, keys]) => ({
    id: `modality-cat-${slug}`,
    title,
    category: "Modalities" as SearchCategory,
    subcategory: "Category",
    keywords: [slug, ...keys.split(" ")],
    href: `/modalities?category=${encodeURIComponent(slug)}`,
    description: `Browse ${title.toLowerCase()} modality education`,
  })),
  {
    id: "modality-previsit",
    title: "Pre-visit modalities",
    category: "Modalities",
    subcategory: "Timing",
    keywords: ["before appointment", "prep", "questions", "symptom log"],
    href: "/modalities?timing=pre-visit",
    description: "Prep tools before a clinic visit",
  },
  {
    id: "modality-postvisit",
    title: "Post-visit modalities",
    category: "Modalities",
    subcategory: "Timing",
    keywords: ["after appointment", "flare plan", "hep schedule", "comfort"],
    href: "/modalities?timing=post-visit",
    description: "After-visit comfort and HEP scheduling",
  },
  {
    id: "modality-ice",
    title: "Ice pack / cold pack",
    category: "Modalities",
    subcategory: "Cryotherapy",
    keywords: ["ice", "cold", "swelling", "acute"],
    href: "/modalities/mod-ice-pack",
    description: "Home ice pack education",
  },
  {
    id: "modality-heat",
    title: "Moist heat pack",
    category: "Modalities",
    subcategory: "Thermal",
    keywords: ["heat", "warm", "stiffness", "moist heat"],
    href: "/modalities/mod-moist-heat",
    description: "Home moist heat education",
  },
  {
    id: "modality-tens",
    title: "TENS education",
    category: "Modalities",
    subcategory: "Electrotherapy",
    keywords: ["tens", "electrical", "nerve stimulation"],
    href: "/modalities/mod-tens-education",
    description: "TENS unit education (not a prescription)",
  },
  {
    id: "modality-pacing",
    title: "Activity pacing",
    category: "Modalities",
    subcategory: "Load management",
    keywords: ["pacing", "breaks", "energy", "flare prevention"],
    href: "/modalities/mod-pacing",
    description: "Time-contingent activity pacing",
  },
  {
    id: "learn",
    title: "Learn & safety",
    category: "Learn",
    keywords: ["education", "safety", "when to seek care", "articles"],
    href: "/learn",
    description: "Short education on form, recovery, and safety",
  },
  {
    id: "account",
    title: "Account & settings",
    category: "Account",
    keywords: ["profile", "reminders", "theme", "sign in"],
    href: "/account",
    description: "Profile, reminders, and preferences",
  },
  {
    id: "community",
    title: "Community",
    category: "Track & reflect",
    keywords: ["posts", "tips", "peers"],
    href: "/community",
    description: "Peer tips and shared encouragement",
  },

  // —— Body regions (deep links via library filters) ——
  ...(
    [
      ["neck", "Neck / cervical"],
      ["shoulders", "Shoulders"],
      ["thoracic", "Thoracic / mid-back"],
      ["lower-back", "Lower back / lumbar"],
      ["hips", "Hips"],
      ["hamstrings", "Hamstrings"],
      ["knee", "Knee"],
      ["ankles", "Ankles"],
      ["core", "Core"],
      ["wrists", "Wrists & hands"],
    ] as const
  ).map(([id, title]) => ({
    id: `region-${id}`,
    title,
    category: "Body regions" as SearchCategory,
    subcategory: "Stretch library filter",
    keywords: [id, title.toLowerCase(), "body part", "area"],
    href: `/library?bodyPart=${encodeURIComponent(id)}`,
    description: `Browse stretches for ${title.toLowerCase()}`,
  })),

  // —— Safety topics ——
  {
    id: "safety-wb",
    title: "Weight-bearing precautions",
    category: "Safety & devices",
    subcategory: "Assessment · Safety",
    keywords: ["nwb", "ttwb", "pwb", "wbat", "fwb", "crutches", "walker"],
    href: "/assessment",
    description: "NWB / TTWB / PWB / WBAT settings in Assessment",
  },
  {
    id: "safety-sternal",
    title: "Sternal precautions",
    category: "Safety & devices",
    keywords: ["open heart", "cabg", "sternotomy", "lift limit"],
    href: "/assessment",
    description: "Cardiac surgery sternal precautions",
  },
  {
    id: "safety-spinal",
    title: "Spinal precautions (BLT)",
    category: "Safety & devices",
    keywords: ["no bend lift twist", "fusion", "discectomy", "brace"],
    href: "/assessment",
    description: "Spinal post-op BLT precautions",
  },
  {
    id: "safety-implants",
    title: "Cardiac implants (pacemaker, ICD)",
    category: "Safety & devices",
    keywords: ["pacemaker", "icd", "crt", "lvad", "stent", "tavr"],
    href: "/assessment",
    description: "Implanted device education and dosing caps",
  },
  {
    id: "home-hep",
    title: "Home-based program",
    category: "Your plan",
    keywords: ["chair", "wall", "floor", "minimal equipment", "hep"],
    href: "/routines/session",
    description: "Toggle home variations on your session",
  },
  {
    id: "videos",
    title: "Institutional technique videos",
    category: "Libraries",
    subcategory: "Quality over quantity",
    keywords: [
      "youtube",
      "mayo",
      "nia",
      "cleveland",
      "form",
      "demonstration",
      "evidence based",
      "institutional",
      "quality",
    ],
    href: "/library",
    description: "Vetted medical-grade form demos—quality over quantity",
  },
  // Exercise library body regions
  ...(
    [
      ["neck", "Neck exercises"],
      ["shoulders", "Shoulder exercises"],
      ["lower-back", "Lower back exercises"],
      ["hips", "Hip exercises"],
      ["knee", "Knee exercises"],
      ["ankles", "Ankle exercises"],
      ["core", "Core exercises"],
    ] as const
  ).map(([id, title]) => ({
    id: `ex-region-${id}`,
    title,
    category: "Body regions" as SearchCategory,
    subcategory: "Exercise library filter",
    keywords: [id, "exercise", "strength", "activation"],
    href: `/exercises?bodyPart=${encodeURIComponent(id)}`,
    description: `Browse exercises for ${id.replace("-", " ")}`,
  })),
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/·\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ranked free-text search with simple autocomplete scoring */
export function searchAppIndex(query: string, limit = 12): AppSearchItem[] {
  const q = normalize(query);
  if (!q || q.length < 1) return [];

  const tokens = q.split(" ").filter(Boolean);

  const scored = APP_SEARCH_INDEX.map((item) => {
    const hay = normalize(
      [
        item.title,
        item.category,
        item.subcategory || "",
        item.description,
        item.keywords.join(" "),
      ].join(" ")
    );

    let score = 0;
    if (hay.startsWith(q)) score += 40;
    if (normalize(item.title).startsWith(q)) score += 50;
    if (normalize(item.title).includes(q)) score += 30;
    if (hay.includes(q)) score += 20;

    for (const t of tokens) {
      if (normalize(item.title).includes(t)) score += 12;
      if (item.keywords.some((k) => normalize(k).includes(t))) score += 10;
      if (normalize(item.category).includes(t)) score += 6;
      if (item.subcategory && normalize(item.subcategory).includes(t)) score += 8;
      if (normalize(item.description).includes(t)) score += 4;
    }

    // Prefer plan path slightly
    if (item.category === "Your plan") score += 3;

    return { item, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));

  return scored.slice(0, limit).map((x) => x.item);
}

/** Top suggestions when the box is focused with empty query */
export function defaultSearchSuggestions(limit = 8): AppSearchItem[] {
  const preferred = [
    "assessment",
    "session",
    "journal",
    "jeffery",
    "library",
    "exercises",
    "modalities",
    "insights",
  ];
  return preferred
    .map((id) => APP_SEARCH_INDEX.find((i) => i.id === id))
    .filter(Boolean)
    .slice(0, limit) as AppSearchItem[];
}
