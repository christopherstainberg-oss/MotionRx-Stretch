/**
 * Occupation / work-role intelligence.
 *
 * Parses free-text job, school, and daily-role language into categories with
 * realistic physical demands. Feeds Story, Journal, Jeffery, Plan, routine
 * composition, and cross-app correlation.
 *
 * Educational synthesis of common occupational MSK load patterns
 * (prolonged sitting, standing endurance, lifting/handling, driving, sport,
 * student load) — not a job analysis or workplace medical clearance.
 */

export type OccupationCategory =
  | "desk"
  | "standing"
  | "labor"
  | "healthcare"
  | "driving"
  | "athlete"
  | "student"
  | "retired"
  | "caregiver"
  | "mixed"
  | "unknown";

export type OccupationDemand =
  | "prolonged-sitting"
  | "prolonged-standing"
  | "repetitive-upper"
  | "lifting-carrying"
  | "patient-handling"
  | "driving-seated"
  | "high-intensity-training"
  | "backpack-load"
  | "screen-focus"
  | "shift-work"
  | "low-physical-demand"
  | "mixed-postures";

export type OccupationProfile = {
  category: OccupationCategory;
  /** Free-text label when available (e.g. “nurse”, “software engineer”) */
  label: string;
  /** Exact quote snippet when available */
  quote?: string;
  source: "stated" | "unknown";
  demands: OccupationDemand[];
  /** Soft plan tags from occupational load */
  preferTags: string[];
  avoidTags: string[];
  movementKeywords: string[];
  /** Preferred library IDs for routine composition */
  preferredStretchIds: string[];
  preferredExerciseIds: string[];
  /** Mild volume scale (desk microbreaks ok; labor may need shorter bouts) */
  minutesScale: number;
  /** Soft phase nudge when irritability is not high */
  phaseHint?: "mobility-restore" | "motor-control" | "capacity-load" | "function-return";
  /** Session composition notes for PT-style HEP */
  sessionNotes: string[];
  summaryLines: string[];
  promptBlob: string;
  askIfMissing: string;
  /** 0–100 confidence from parse */
  confidence: number;
};

type CategoryRule = {
  category: OccupationCategory;
  re: RegExp;
  score: number;
  labelHint?: string;
};

const CATEGORY_RULES: CategoryRule[] = [
  // Explicit role language (higher score)
  {
    category: "healthcare",
    re: /\b(i'?m|i am|work(?:ing)? as|job as|occupation(?: is)?|i work)\b[^.\n]{0,40}\b(nurse|nursing|rn|lpn|cna|paramedic|emt|pt aide|physical therap(?:ist|y) aide|caregiver at (?:a )?(?:hospital|clinic)|hospital staff|or tech|or nurse)\b/i,
    score: 24,
  },
  {
    category: "healthcare",
    re: /\b(nurse|nursing aide|hospital tech|patient care|bedside|12[- ]hour shift|night shift at (?:the )?hospital)\b/i,
    score: 16,
  },
  {
    category: "labor",
    re: /\b(i'?m|i am|work(?:ing)? as|job as|i work)\b[^.\n]{0,40}\b(construction|warehouse|landscap(?:er|ing)|mechanic|electrician|plumber|roofer|mover|farm(?:er|ing)|factory|manufactur(?:er|ing)|oilfield|welder)\b/i,
    score: 24,
  },
  {
    category: "labor",
    re: /\b(construction worker|warehouse (?:job|work)|heavy lifting (?:at |for )?(?:work|job)|manual labor|on (?:a |the )?job site)\b/i,
    score: 18,
  },
  {
    category: "desk",
    re: /\b(i'?m|i am|work(?:ing)? as|job as|i work)\b[^.\n]{0,40}\b(software|engineer|developer|programmer|analyst|accountant|admin(?:istrative)?|office (?:job|work)|remote work|wfh|desk job|call center|customer service (?:rep|agent))\b/i,
    score: 24,
  },
  {
    category: "desk",
    re: /\b(desk job|office job|sit(?:ting)? (?:at (?:a |the )?desk|all day|for work)|computer (?:all day|work)|remote work|work from home|8\+?\s*hours? (?:at )?(?:the )?computer)\b/i,
    score: 18,
  },
  {
    category: "driving",
    re: /\b(i'?m|i am|work(?:ing)? as|job as|i work)\b[^.\n]{0,40}\b(truck(?:er| driver)|uber|lyft|rideshare|taxi|delivery driver|bus driver|long[- ]haul)\b/i,
    score: 24,
  },
  {
    category: "driving",
    re: /\b(truck driver|drive for (?:a )?living|drive all day|long (?:commute|haul)|hours? (?:of |behind the )wheel)\b/i,
    score: 17,
  },
  {
    category: "standing",
    re: /\b(i'?m|i am|work(?:ing)? as|job as|i work)\b[^.\n]{0,40}\b(retail|cashier|barista|server|waiter|waitress|chef|cook|hair stylist|barber|teacher|professor|security guard|host(?:ess)?)\b/i,
    score: 22,
  },
  {
    category: "standing",
    re: /\b(on my feet all day|standing (?:job|all day|for work)|retail job|restaurant work|teaching all day)\b/i,
    score: 17,
  },
  {
    category: "athlete",
    re: /\b(i'?m|i am)\b[^.\n]{0,30}\b(athlete|collegiate|pro (?:athlete|player)|semi[- ]pro)\b|\b(train(?:ing)? for (?:a )?(?:marathon|race|competition|season)|compete(?:s|ing)? in)\b/i,
    score: 20,
  },
  {
    category: "athlete",
    re: /\b(crossfit|powerlifting|soccer|basketball|football|hockey|baseball|softball|tennis|golf|running club|track and field)\b[^.\n]{0,30}\b(practice|train|season|team|compete)\b/i,
    score: 14,
  },
  {
    category: "student",
    re: /\b(i'?m|i am)\b[^.\n]{0,20}\b(a )?student\b|\b(college|university|grad school|high school)\b[^.\n]{0,30}\b(student|classes|studying)\b|\b(studying for|in school full[- ]time)\b/i,
    score: 20,
  },
  {
    category: "retired",
    re: /\b(i'?m|i am)\b[^.\n]{0,16}\bretired\b|\b(retired from|in retirement|stay[- ]at[- ]home (?:parent|mom|dad))\b/i,
    score: 20,
  },
  {
    category: "caregiver",
    re: /\b(full[- ]time )?caregiver\b|\bcare for (?:my )?(?:parent|mom|dad|spouse|partner|child|kids)\b|\bhome health aide\b/i,
    score: 18,
  },
  // Soft demand language (lower score — needs work framing nearby if possible)
  {
    category: "labor",
    re: /\b(lift(?:ing)? (?:and |\/ )?carry|pallet|forklift|repetitive lift)\b/i,
    score: 10,
  },
  {
    category: "desk",
    re: /\b(keyboard|mouse|typing all day|zoom meetings? all day|laptop posture)\b/i,
    score: 10,
  },
  {
    category: "mixed",
    re: /\b(hybrid (?:job|work)|sometimes desk sometimes|part desk part field|mixed duties)\b/i,
    score: 14,
  },
];

function categoryBundle(cat: OccupationCategory): Omit<
  OccupationProfile,
  "category" | "label" | "quote" | "source" | "summaryLines" | "promptBlob" | "askIfMissing" | "confidence"
> {
  switch (cat) {
    case "desk":
      return {
        demands: ["prolonged-sitting", "screen-focus", "repetitive-upper"],
        preferTags: [
          "desk",
          "posture",
          "thoracic",
          "extension",
          "scapular",
          "hip",
          "chin-tuck",
          "cervical",
          "mobility",
        ],
        avoidTags: ["plyo", "heavy-load"],
        movementKeywords: [
          "chin-tuck",
          "thoracic extension",
          "scapular rows",
          "hip flexor",
          "cat-cow",
          "doorway chest",
          "wrist mobility",
        ],
        preferredStretchIds: [
          "chin-tuck",
          "cat-cow",
          "open-book-thoracic",
          "doorway-chest-stretch",
          "half-kneeling-hip-flexor",
          "figure-four-glute",
        ],
        preferredExerciseIds: [
          "ex-scapular-rows-band",
          "ex-cervical-isometrics",
          "ex-thoracic-extension-foam",
          "ex-glute-bridge",
          "ex-dead-bug",
          "ex-wall-pushup",
        ],
        minutesScale: 0.95,
        phaseHint: "mobility-restore",
        sessionNotes: [
          "Desk role: micro-dose mobility (2–5 min breaks) + postural endurance; hip flexor / thoracic extension bias.",
          "Prefer chair/wall-friendly options for workday bouts; longer strength block after hours if irritability allows.",
        ],
      };
    case "standing":
      return {
        demands: ["prolonged-standing", "mixed-postures"],
        preferTags: [
          "standing-endurance",
          "glute",
          "calf",
          "foot",
          "hip",
          "balance",
          "posture",
          "core",
        ],
        avoidTags: ["plyo"],
        movementKeywords: [
          "calf stretch",
          "heel raise",
          "hip hinge",
          "glute bridge",
          "weight shift",
          "ankle mobility",
        ],
        preferredStretchIds: [
          "gastroc-wall",
          "half-kneeling-hip-flexor",
          "quad-standing",
          "figure-four-glute",
          "cat-cow",
        ],
        preferredExerciseIds: [
          "ex-heel-raises",
          "ex-glute-bridge",
          "ex-sit-to-stand",
          "ex-side-lying-abduction",
          "ex-tandem-balance",
          "ex-bird-dog",
        ],
        minutesScale: 0.9,
        phaseHint: "motor-control",
        sessionNotes: [
          "On-feet role: calf/foot load management, hip endurance, short recovery mobility between shifts.",
          "Avoid long floor programs if they cannot complete them after long standing days—prefer brief bouts.",
        ],
      };
    case "labor":
      return {
        demands: ["lifting-carrying", "mixed-postures", "repetitive-upper"],
        preferTags: [
          "hinge",
          "glute",
          "core",
          "functional",
          "motor-control",
          "hip",
          "load-management",
          "strength",
        ],
        avoidTags: ["plyo", "ballistic", "end-range"],
        movementKeywords: [
          "hip hinge",
          "dead bug",
          "bird-dog",
          "bridge",
          "farmer carry pattern",
          "squat to stand",
        ],
        preferredStretchIds: [
          "cat-cow",
          "childs-pose",
          "half-kneeling-hip-flexor",
          "supine-hamstring-strap",
          "thread-the-needle",
        ],
        preferredExerciseIds: [
          "ex-hip-hinge-dowel",
          "ex-glute-bridge",
          "ex-bird-dog",
          "ex-dead-bug",
          "ex-sit-to-stand",
          "ex-side-plank-knees",
        ],
        minutesScale: 0.85,
        phaseHint: "motor-control",
        sessionNotes: [
          "Manual work: hinge + core control first; rebuild capacity for lift/carry without heroics.",
          "Session after shift should be short if delayed flare history; prioritize quality hip hinge over volume.",
        ],
      };
    case "healthcare":
      return {
        demands: [
          "patient-handling",
          "prolonged-standing",
          "lifting-carrying",
          "shift-work",
        ],
        preferTags: [
          "hinge",
          "glute",
          "core",
          "scapular",
          "posture",
          "standing-endurance",
          "functional",
          "motor-control",
        ],
        avoidTags: ["plyo", "heavy-load"],
        movementKeywords: [
          "hip hinge",
          "glute bridge",
          "scapular rows",
          "calf",
          "thoracic",
          "dead bug",
        ],
        preferredStretchIds: [
          "cat-cow",
          "doorway-chest-stretch",
          "half-kneeling-hip-flexor",
          "gastroc-wall",
          "chin-tuck",
        ],
        preferredExerciseIds: [
          "ex-hip-hinge-dowel",
          "ex-glute-bridge",
          "ex-scapular-rows-band",
          "ex-sit-to-stand",
          "ex-bird-dog",
          "ex-heel-raises",
        ],
        minutesScale: 0.85,
        phaseHint: "motor-control",
        sessionNotes: [
          "Healthcare load: transfer/hinge mechanics + scapular endurance for charting/devices; respect shift fatigue.",
          "Micro-sessions between shifts beat one long session after nights.",
        ],
      };
    case "driving":
      return {
        demands: ["driving-seated", "prolonged-sitting", "screen-focus"],
        preferTags: [
          "seated",
          "hip",
          "thoracic",
          "cervical",
          "posture",
          "glute",
          "mobility",
          "desk",
        ],
        avoidTags: ["plyo"],
        movementKeywords: [
          "seated figure four",
          "chin-tuck",
          "thoracic rotation",
          "hip flexor",
          "glute bridge",
          "calf pump",
        ],
        preferredStretchIds: [
          "figure-four-glute",
          "chin-tuck",
          "open-book-thoracic",
          "half-kneeling-hip-flexor",
          "gastroc-wall",
        ],
        preferredExerciseIds: [
          "ex-glute-bridge",
          "ex-cervical-isometrics",
          "ex-dead-bug",
          "ex-scapular-rows-band",
          "ex-heel-raises",
        ],
        minutesScale: 0.9,
        phaseHint: "mobility-restore",
        sessionNotes: [
          "Driving: seated hip/glute activation, cervical/thoracic mobility, and stop-break microdoses.",
          "Prefer movements doable at rest stops or after a shift without floor space.",
        ],
      };
    case "athlete":
      return {
        demands: ["high-intensity-training", "mixed-postures"],
        preferTags: [
          "strength",
          "functional",
          "capacity",
          "motor-control",
          "balance",
          "mobility",
          "sport",
        ],
        avoidTags: [],
        movementKeywords: [
          "single leg",
          "hinge",
          "jump prep only if green",
          "rotational control",
          "ankle stiffness",
        ],
        preferredStretchIds: [
          "worlds-greatest-stretch",
          "half-kneeling-hip-flexor",
          "supine-hamstring-strap",
          "open-book-thoracic",
          "ankle-dorsiflexion-knee-to-wall",
        ],
        preferredExerciseIds: [
          "ex-hip-hinge-dowel",
          "ex-glute-bridge",
          "ex-sit-to-stand",
          "ex-dead-bug",
          "ex-heel-raises",
          "ex-side-plank-knees",
          "ex-tandem-balance",
        ],
        minutesScale: 1,
        phaseHint: "capacity-load",
        sessionNotes: [
          "Athlete: capacity and motor control when irritability is green; still respect delayed-worse red lights.",
          "Bias sport-adjacent control (hinge, single-leg balance) over generic stretch-only sessions.",
        ],
      };
    case "student":
      return {
        demands: ["prolonged-sitting", "backpack-load", "screen-focus"],
        preferTags: [
          "desk",
          "posture",
          "thoracic",
          "scapular",
          "hip",
          "cervical",
          "mobility",
          "core",
        ],
        avoidTags: ["plyo"],
        movementKeywords: [
          "chin-tuck",
          "thoracic",
          "backpack posture",
          "hip flexor",
          "rows",
        ],
        preferredStretchIds: [
          "chin-tuck",
          "cat-cow",
          "doorway-chest-stretch",
          "half-kneeling-hip-flexor",
          "figure-four-glute",
        ],
        preferredExerciseIds: [
          "ex-scapular-rows-band",
          "ex-cervical-isometrics",
          "ex-glute-bridge",
          "ex-dead-bug",
          "ex-wall-pushup",
        ],
        minutesScale: 0.95,
        phaseHint: "mobility-restore",
        sessionNotes: [
          "Student load: desk + bag/laptop posture; short library-friendly mobility blocks.",
          "Link sleep/stress when exam periods amplify symptoms.",
        ],
      };
    case "retired":
      return {
        demands: ["low-physical-demand", "mixed-postures"],
        preferTags: [
          "functional",
          "balance",
          "gentle",
          "mobility",
          "strength",
          "walk",
          "motor-control",
        ],
        avoidTags: ["plyo", "heavy-load", "impact"],
        movementKeywords: [
          "sit-to-stand",
          "heel raise",
          "balance",
          "hip hinge gentle",
          "walk tolerance",
        ],
        preferredStretchIds: [
          "cat-cow",
          "figure-four-glute",
          "gastroc-wall",
          "pelvic-tilt",
          "ankle-alphabet",
        ],
        preferredExerciseIds: [
          "ex-sit-to-stand",
          "ex-heel-raises",
          "ex-glute-bridge",
          "ex-tandem-balance",
          "ex-wall-pushup",
          "ex-bird-dog",
        ],
        minutesScale: 0.9,
        phaseHint: "function-return",
        sessionNotes: [
          "Retired / home-based day: function + fall-risk aware balance; build walking and sit-to-stand capacity.",
          "Prefer simple equipment-free sequences that map to ADLs.",
        ],
      };
    case "caregiver":
      return {
        demands: ["lifting-carrying", "patient-handling", "mixed-postures"],
        preferTags: [
          "hinge",
          "glute",
          "core",
          "functional",
          "scapular",
          "motor-control",
          "strength",
        ],
        avoidTags: ["plyo", "ballistic"],
        movementKeywords: [
          "hip hinge",
          "transfer mechanics",
          "glute bridge",
          "rows",
          "dead bug",
        ],
        preferredStretchIds: [
          "cat-cow",
          "half-kneeling-hip-flexor",
          "doorway-chest-stretch",
          "childs-pose",
        ],
        preferredExerciseIds: [
          "ex-hip-hinge-dowel",
          "ex-glute-bridge",
          "ex-sit-to-stand",
          "ex-scapular-rows-band",
          "ex-bird-dog",
        ],
        minutesScale: 0.85,
        phaseHint: "motor-control",
        sessionNotes: [
          "Caregiving: transfer/lift mechanics and recovery mobility; short sessions around care duties.",
        ],
      };
    case "mixed":
      return {
        demands: ["mixed-postures"],
        preferTags: ["functional", "mobility", "motor-control", "posture", "core"],
        avoidTags: [],
        movementKeywords: ["hip hinge", "thoracic", "sit-to-stand", "rows"],
        preferredStretchIds: [
          "cat-cow",
          "half-kneeling-hip-flexor",
          "chin-tuck",
          "open-book-thoracic",
        ],
        preferredExerciseIds: [
          "ex-glute-bridge",
          "ex-sit-to-stand",
          "ex-scapular-rows-band",
          "ex-bird-dog",
        ],
        minutesScale: 0.95,
        phaseHint: "motor-control",
        sessionNotes: [
          "Mixed role: balance seated mobility with standing/lift control based on the day’s dominant demand.",
        ],
      };
    default:
      return {
        demands: [],
        preferTags: [],
        avoidTags: [],
        movementKeywords: [],
        preferredStretchIds: [],
        preferredExerciseIds: [],
        minutesScale: 1,
        sessionNotes: [
          "Occupation not stated — ask work/school/day role to tailor HEP to real-life load.",
        ],
      };
  }
}

function categoryLabel(cat: OccupationCategory, quote?: string): string {
  const fromQuote = (quote || "").trim();
  if (fromQuote && fromQuote.length <= 48 && !/^\b(for|since)\b/i.test(fromQuote)) {
    // Prefer short human role snippets
  }
  switch (cat) {
    case "desk":
      return "desk / seated work";
    case "standing":
      return "on-feet / standing work";
    case "labor":
      return "manual / labor work";
    case "healthcare":
      return "healthcare / patient-care work";
    case "driving":
      return "driving / vehicle work";
    case "athlete":
      return "athlete / competitive training";
    case "student":
      return "student";
    case "retired":
      return "retired / home-based day";
    case "caregiver":
      return "caregiver";
    case "mixed":
      return "mixed work demands";
    default:
      return "occupation not stated";
  }
}

export function emptyOccupation(): OccupationProfile {
  const b = categoryBundle("unknown");
  return {
    category: "unknown",
    label: "occupation not stated",
    source: "unknown",
    ...b,
    summaryLines: [
      "Occupation / daily role not stated — ask desk, standing, lifting, driving, healthcare, school, sport, or retired.",
    ],
    promptBlob: "Occupation: not stated.",
    askIfMissing:
      "What does a typical day demand for work or school—mostly sitting at a desk, standing on your feet, lifting/carrying, driving, patient care, training/sport, caregiving, or are you retired?",
    confidence: 0,
  };
}

/**
 * Extract occupation from free text. Prefers explicit “I work as / desk job”
 * framing; soft demand language scores lower.
 */
export function parseOccupation(raw: string): OccupationProfile {
  const text = (raw || "").replace(/\s+/g, " ").trim();
  if (!text) return emptyOccupation();

  type Hit = { category: OccupationCategory; score: number; quote: string };
  const hits: Hit[] = [];

  for (const rule of CATEGORY_RULES) {
    rule.re.lastIndex = 0;
    const m = rule.re.exec(text);
    if (m) {
      hits.push({
        category: rule.category,
        score: rule.score,
        quote: m[0].slice(0, 80),
      });
    }
  }

  // Compound: desk + lifting → mixed
  const hasDesk = hits.some((h) => h.category === "desk");
  const hasLabor = hits.some((h) => h.category === "labor");
  if (hasDesk && hasLabor) {
    hits.push({ category: "mixed", score: 19, quote: "desk + physical duties" });
  }

  if (!hits.length) return emptyOccupation();

  hits.sort((a, b) => b.score - a.score);
  const best = hits[0]!;
  // Require minimum confidence for soft matches without work framing
  if (best.score < 12 && !/\b(work|job|occupation|employ|student|retired|career|shift)\b/i.test(text)) {
    return emptyOccupation();
  }

  const bundle = categoryBundle(best.category);
  const label = categoryLabel(best.category, best.quote);
  const summaryLines = [
    `Occupation (stated): ${label}${best.quote ? ` — “${best.quote.slice(0, 50)}”` : ""}.`,
    bundle.demands.length
      ? `Physical demands: ${bundle.demands.slice(0, 4).join(", ")}.`
      : "",
    bundle.sessionNotes[0] || "",
  ].filter(Boolean);

  const promptBlob = [
    `Occupation: ${label} (category ${best.category}; confidence ${best.score}).`,
    bundle.demands.length ? `Demands: ${bundle.demands.join(", ")}.` : "",
    bundle.preferTags.length
      ? `HEP bias tags: ${bundle.preferTags.slice(0, 8).join(", ")}.`
      : "",
    ...bundle.sessionNotes.slice(0, 2),
    "Tailor home program to real occupational load; irritability and 24h response still override.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    category: best.category,
    label,
    quote: best.quote,
    source: "stated",
    ...bundle,
    summaryLines,
    promptBlob,
    askIfMissing: emptyOccupation().askIfMissing,
    confidence: Math.min(100, best.score * 4),
  };
}

/** Compact lines for live clinical read / correlation cards */
export function occupationLiveLines(o: OccupationProfile): string[] {
  if (o.source === "unknown") {
    return ["Occupation / daily role: not stated (ask work, school, sport, or retired)."];
  }
  return [
    `Occupation: ${o.label}${o.demands[0] ? ` · ${o.demands.slice(0, 2).join(", ")}` : ""}.`,
    o.sessionNotes[0] ? `Workday HEP: ${o.sessionNotes[0]}` : "",
  ].filter(Boolean);
}

/**
 * Merge occupation into plan-style tags (returns new arrays; does not mutate).
 */
export function applyOccupationToPlanTags(opts: {
  occupation: OccupationProfile;
  preferTags: string[];
  avoidTags: string[];
  movementKeywords: string[];
  minutesScale: number;
}): {
  preferTags: string[];
  avoidTags: string[];
  movementKeywords: string[];
  minutesScale: number;
  evidenceLine?: string;
} {
  const o = opts.occupation;
  if (o.source !== "stated") {
    return {
      preferTags: opts.preferTags,
      avoidTags: opts.avoidTags,
      movementKeywords: opts.movementKeywords,
      minutesScale: opts.minutesScale,
    };
  }
  const uniq = (xs: string[]) => Array.from(new Set(xs.map((x) => x.toLowerCase()).filter(Boolean)));
  return {
    preferTags: uniq([...opts.preferTags, ...o.preferTags]),
    avoidTags: uniq([...opts.avoidTags, ...o.avoidTags]),
    movementKeywords: uniq([...opts.movementKeywords, ...o.movementKeywords]).slice(0, 20),
    minutesScale: Math.min(opts.minutesScale, o.minutesScale),
    evidenceLine: `Occupation ${o.label} → HEP bias ${o.preferTags.slice(0, 5).join(", ") || "functional"}; volume ×${o.minutesScale.toFixed(2)}.`,
  };
}

export function occupationCategoryLabel(c: OccupationCategory): string {
  return categoryLabel(c);
}
