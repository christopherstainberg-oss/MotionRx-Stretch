/**
 * Injury / symptom onset timeline + evidence-informed progress outlook.
 *
 * Parses free-text “when it started” into weeks / months / years since onset
 * and suggests realistic milestones using common outpatient PT outcome framing
 * (NPRS/NRS pain 0–10, PSFS-style function, irritability/traffic-light dosing,
 * phase-based rehab timelines). Educational synthesis of common evidence themes
 * (acute protection → mobility → motor control → capacity → function return) —
 * not a prognosis, diagnosis, or substitute for licensed care.
 */

export type TimeUnit = "days" | "weeks" | "months" | "years";

export type InjurySinceBucket =
  | "0-weeks" // today / 0–6 days
  | "1-week"
  | "2-weeks"
  | "3-weeks"
  | "4-weeks"
  | "5-weeks"
  | "6-weeks"
  | "7-12-weeks"
  | "3-6-months"
  | "6-12-months"
  | "1-2-years"
  | "2-plus-years"
  | "unknown";

export type ProgressMilestone = {
  id: string;
  /** Relative window from *now* (or from a typical program start) */
  windowLabel: string;
  /** Earliest week offset from *today* when this may show (approx) */
  fromWeeks: number;
  toWeeks: number;
  /** What to look for (realistic, measurable) */
  lookFor: string;
  /** Outcome measure framing */
  measures: string[];
  evidenceNote: string;
  priority: number;
};

export type InjuryTimeline = {
  /** Parsed duration when stated */
  amount?: number;
  unit?: TimeUnit;
  /** Normalized approximate weeks since onset (for phase math) */
  approxWeeksSince?: number;
  /** Approximate months since onset when ≥ ~4 weeks */
  approxMonthsSince?: number;
  /** Approximate years when ≥ ~12 months */
  approxYearsSince?: number;
  bucket: InjurySinceBucket;
  /** Human label e.g. “about 3 weeks” */
  label: string;
  /** Exact quote snippet when available */
  quote?: string;
  source: "stated" | "unknown";
  /** Acute | subacute | chronic framing */
  tissuePhase: "hyperacute" | "acute" | "subacute" | "late-subacute" | "chronic" | "unknown";
  /** Soft phase bias for HEP (merged with irritability) */
  phaseBias?: "protect-calm" | "mobility-restore" | "motor-control" | "capacity-load" | "function-return";
  minutesScale: number;
  progressOutlook: ProgressMilestone[];
  summaryLines: string[];
  /** Jeffery / coach injection */
  promptBlob: string;
  /** Follow-up question if timeline missing */
  askIfMissing: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function wordToNumber(w: string): number | undefined {
  const map: Record<string, number> = {
    a: 1,
    an: 1,
    one: 1,
    two: 2,
    couple: 2,
    three: 3,
    few: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    several: 4,
    half: 0.5,
  };
  const k = w.toLowerCase().trim();
  if (map[k] != null) return map[k];
  const n = Number(k);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Extract injury/symptom duration from free text.
 * Prefers “for X weeks”, “X weeks ago”, “since …”, “3 months”, “2 years”.
 */
export function parseInjuryTimeline(raw: string): InjuryTimeline {
  const text = (raw || "").replace(/\s+/g, " ").trim();
  if (!text) return emptyTimeline();

  type Hit = {
    amount: number;
    unit: TimeUnit;
    weeks: number;
    quote: string;
    score: number;
  };
  const hits: Hit[] = [];

  const push = (amount: number, unit: TimeUnit, quote: string, score: number) => {
    if (!Number.isFinite(amount) || amount < 0) return;
    let weeks = amount;
    if (unit === "days") weeks = amount / 7;
    if (unit === "months") weeks = amount * 4.345;
    if (unit === "years") weeks = amount * 52.14;
    hits.push({ amount, unit, weeks, quote: quote.slice(0, 80), score });
  };

  // Numeric + unit with onset framing nearby (for/since/ago/past/last/started)
  const patterns: Array<{ re: RegExp; unit: TimeUnit; score: number }> = [
    {
      re: /\b(?:for|since|past|last|about|around|over|nearly|almost)\s+(\d+(?:\.\d+)?|a|an|one|two|couple|few|several|three|four|five|six|seven|eight|nine|ten)\s*(days?|d)\b/gi,
      unit: "days",
      score: 10,
    },
    {
      re: /\b(\d+(?:\.\d+)?|a|an|one|two|couple|few|several|three|four|five|six)\s*(days?)\s+ago\b/gi,
      unit: "days",
      score: 12,
    },
    {
      re: /\b(?:for|since|past|last|about|around|over|nearly|almost)\s+(\d+(?:\.\d+)?|a|an|one|two|couple|few|several|three|four|five|six|seven|eight|nine|ten|twelve)\s*(weeks?|wks?)\b/gi,
      unit: "weeks",
      score: 14,
    },
    {
      re: /\b(\d+(?:\.\d+)?|a|an|one|two|couple|few|several|three|four|five|six|seven|eight)\s*(weeks?|wks?)\s+ago\b/gi,
      unit: "weeks",
      score: 16,
    },
    {
      re: /\b(?:for|since|past|last|about|around|over|nearly|almost)\s+(\d+(?:\.\d+)?|a|an|one|two|couple|few|several|three|four|five|six|eight|nine|ten|twelve|eighteen)\s*(months?|mos?)\b/gi,
      unit: "months",
      score: 15,
    },
    {
      re: /\b(\d+(?:\.\d+)?|a|an|one|two|few|several|three|four|five|six)\s*(months?|mos?)\s+ago\b/gi,
      unit: "months",
      score: 17,
    },
    {
      re: /\b(?:for|since|past|last|about|around|over)\s+(\d+(?:\.\d+)?|a|an|one|two|few|several|three|four|five|ten)\s*(years?|yrs?)\b/gi,
      unit: "years",
      score: 14,
    },
    {
      re: /\b(\d+(?:\.\d+)?|a|an|one|two|few|several)\s*(years?|yrs?)\s+ago\b/gi,
      unit: "years",
      score: 16,
    },
    // “this morning / today” with onset framing
    {
      re: /\b(?:started|began|since|woke up with|came on)\b[^.\n]{0,30}\b(today|this morning|last night)\b|\b(today|this morning)\b[^.\n]{0,30}\b(?:started|began|woke|hurt|pain)\b/gi,
      unit: "days",
      score: 11,
    },
  ];

  for (const { re, unit, score } of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const rawAmt = (m[1] || m[2] || "0").toString();
      if (/today|this morning|last night/i.test(m[0])) {
        push(0, "days", m[0], score);
        continue;
      }
      const amt = wordToNumber(rawAmt);
      if (amt == null) continue;
      push(amt, unit, m[0], score);
    }
  }

  // Zero-week language: “just happened”, “yesterday”, “day 0”
  if (/\b(just happened|just now|this (?:very )?moment|day\s*0|zero weeks?)\b/i.test(text)) {
    push(0, "days", "just happened / day 0", 13);
  }
  if (/\byesterday\b/i.test(text) && /\b(started|began|hurt|injured|pain|flare)\b/i.test(text)) {
    push(1, "days", "yesterday", 12);
  }

  // Chronic without number
  if (
    hits.length === 0 &&
    /\b(chronic|long[- ]standing|for years|years of|on and off for years)\b/i.test(text)
  ) {
    push(2, "years", "chronic / long-standing", 8);
  }

  if (!hits.length) return emptyTimeline();

  hits.sort((a, b) => b.score - a.score || b.weeks - a.weeks);
  const best = hits[0]!;
  const weeks = clamp(best.weeks, 0, 5200);
  const bucket = weeksToBucket(weeks);
  const tissuePhase = weeksToTissuePhase(weeks);
  const phaseBias = weeksToPhaseBias(weeks, tissuePhase);
  const minutesScale = weeksToMinutesScale(weeks);
  const label = formatDurationLabel(best.amount, best.unit, weeks);
  const months = weeks >= 4 ? Math.round((weeks / 4.345) * 10) / 10 : undefined;
  const years = weeks >= 52 ? Math.round((weeks / 52.14) * 10) / 10 : undefined;

  const progressOutlook = buildProgressOutlook({
    weeksSince: weeks,
    tissuePhase,
    bucket,
  });

  const summaryLines = [
    `Time since onset (stated): ${label} → ${bucketLabel(bucket)} · tissue framing: ${tissuePhase}.`,
    `Rehab phase bias from timeline: ${phaseBias || "not set"} (still balanced with irritability & 24h response).`,
    progressOutlook[0]
      ? `Near-term progress check: ${progressOutlook[0].windowLabel} — ${progressOutlook[0].lookFor}`
      : "",
  ].filter(Boolean);

  const promptBlob = [
    `Injury/symptom timeline: ${label} (≈${Math.round(weeks * 10) / 10} weeks since onset; bucket ${bucket}; ${tissuePhase}).`,
    phaseBias ? `Timeline phase bias: ${phaseBias}.` : "",
    progressOutlook
      .slice(0, 3)
      .map(
        (m) =>
          `Progress window ${m.windowLabel}: ${m.lookFor} Measures: ${m.measures.join("; ")}.`
      )
      .join(" "),
    "Educational timeline only — individual recovery varies; licensed PT/physician guidance wins.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    amount: best.amount,
    unit: best.unit,
    approxWeeksSince: Math.round(weeks * 10) / 10,
    approxMonthsSince: months,
    approxYearsSince: years,
    bucket,
    label,
    quote: best.quote,
    source: "stated",
    tissuePhase,
    phaseBias,
    minutesScale,
    progressOutlook,
    summaryLines,
    promptBlob,
    askIfMissing:
      "About how long has this been going on—days, weeks (0–6+), months, or years since it started?",
  };
}

function emptyTimeline(): InjuryTimeline {
  return {
    bucket: "unknown",
    label: "not stated",
    source: "unknown",
    tissuePhase: "unknown",
    minutesScale: 1,
    progressOutlook: defaultProgressOutlookUnknown(),
    summaryLines: [
      "Time since onset not stated — ask weeks/months/years before locking prognosis-style milestones.",
    ],
    promptBlob: "Injury timeline: not stated.",
    askIfMissing:
      "About how long has this been going on—0 weeks (just started), 1–6 weeks, months, or years?",
  };
}

export function weeksToBucket(weeks: number): InjurySinceBucket {
  if (weeks < 0.85) return "0-weeks"; // < ~6 days
  if (weeks < 1.5) return "1-week";
  if (weeks < 2.5) return "2-weeks";
  if (weeks < 3.5) return "3-weeks";
  if (weeks < 4.5) return "4-weeks";
  if (weeks < 5.5) return "5-weeks";
  if (weeks < 6.5) return "6-weeks";
  if (weeks < 13) return "7-12-weeks";
  if (weeks < 26) return "3-6-months";
  if (weeks < 52) return "6-12-months";
  if (weeks < 104) return "1-2-years";
  return "2-plus-years";
}

export function bucketLabel(b: InjurySinceBucket): string {
  switch (b) {
    case "0-weeks":
      return "0 weeks (days 0–6)";
    case "1-week":
      return "1 week";
    case "2-weeks":
      return "2 weeks";
    case "3-weeks":
      return "3 weeks";
    case "4-weeks":
      return "4 weeks";
    case "5-weeks":
      return "5 weeks";
    case "6-weeks":
      return "6 weeks";
    case "7-12-weeks":
      return "7–12 weeks";
    case "3-6-months":
      return "3–6 months";
    case "6-12-months":
      return "6–12 months";
    case "1-2-years":
      return "1–2 years";
    case "2-plus-years":
      return "2+ years";
    default:
      return "unknown duration";
  }
}

function weeksToTissuePhase(
  weeks: number
): InjuryTimeline["tissuePhase"] {
  if (weeks < 0.5) return "hyperacute";
  if (weeks < 2) return "acute";
  if (weeks < 6) return "subacute";
  if (weeks < 12) return "late-subacute";
  if (weeks >= 12) return "chronic";
  return "unknown";
}

function weeksToPhaseBias(
  weeks: number,
  tissue: InjuryTimeline["tissuePhase"]
): InjuryTimeline["phaseBias"] {
  if (tissue === "hyperacute" || weeks < 1) return "protect-calm";
  if (weeks < 3) return "protect-calm";
  if (weeks < 6) return "mobility-restore";
  if (weeks < 12) return "motor-control";
  if (weeks < 26) return "capacity-load";
  return "function-return";
}

function weeksToMinutesScale(weeks: number): number {
  if (weeks < 1) return 0.65;
  if (weeks < 2) return 0.75;
  if (weeks < 4) return 0.85;
  if (weeks < 6) return 0.92;
  return 1;
}

function formatDurationLabel(amount: number, unit: TimeUnit, weeks: number): string {
  if (weeks < 0.85 && unit === "days") {
    if (amount <= 0) return "0 weeks (started today / very recent)";
    if (amount === 1) return "about 1 day (0 weeks)";
    return `about ${amount} days (0 weeks)`;
  }
  if (unit === "weeks") {
    const w = Math.round(amount);
    return w === 1 ? "about 1 week" : `about ${w} weeks`;
  }
  if (unit === "months") {
    const m = Math.round(amount * 10) / 10;
    return m === 1 ? "about 1 month" : `about ${m} months`;
  }
  if (unit === "years") {
    const y = Math.round(amount * 10) / 10;
    return y === 1 ? "about 1 year" : `about ${y} years`;
  }
  return `about ${Math.round(weeks)} weeks`;
}

/**
 * Evidence-informed *educational* outlook: when meaningful change is often reassessed
 * in MSK rehab literature themes (not guarantees).
 *
 * Typical anchors used in clinical practice:
 * - NPRS/NRS pain 0–10 (MCID often ~1–2 points for many MSK conditions)
 * - PSFS / patient-specific function (MCID often ~1–2 points on 0–10)
 * - Global rating of change / session response (2–24h)
 * - Phase-based tissue tolerance (acute protection → progressive load)
 */
export function buildProgressOutlook(opts: {
  weeksSince: number;
  tissuePhase: InjuryTimeline["tissuePhase"];
  bucket: InjurySinceBucket;
}): ProgressMilestone[] {
  const w = opts.weeksSince;
  const out: ProgressMilestone[] = [];

  // From *today* — reassess windows for someone starting or continuing a HEP
  out.push({
    id: "session-response",
    windowLabel: "This week (session-to-session)",
    fromWeeks: 0,
    toWeeks: 1,
    lookFor:
      "Same-day or next-day response: symptoms settle within ~24h after gentle practice; confidence with 1–2 protected motions.",
    measures: [
      "24h traffic-light response (green/yellow/red)",
      "NPRS now vs after session (0–10)",
      "Ability to complete prescribed volume without next-day spike",
    ],
    evidenceNote:
      "Irritability-guided dosing: mild productive discomfort that settles ≤24h is commonly used to progress; delayed flares prompt volume cuts (~30–50%).",
    priority: 100,
  });

  out.push({
    id: "early-function",
    windowLabel: "1–2 weeks of consistent practice",
    fromWeeks: 1,
    toWeeks: 2,
    lookFor:
      "Small but meaningful ease: e.g. +1 point NPRS better most days, or slightly longer desk/walk/stair tolerance before flare.",
    measures: [
      "NPRS average day (MCID often ~1–2/10 in MSK cohorts)",
      "PSFS-style task 0–10 (one stated functional task)",
      "Minutes tolerated at aggravating task (desk, walk, stairs)",
    ],
    evidenceNote:
      "Early gains are often neurocognitive and motor-control related (confidence, pacing, reduced guarding) before large tissue remodeling.",
    priority: 90,
  });

  out.push({
    id: "short-term",
    windowLabel: "3–4 weeks",
    fromWeeks: 3,
    toWeeks: 4,
    lookFor:
      "Clearer function change: e.g. PSFS task +2 points, fewer night awakenings, or reliable sit-to-stand / reach / stairs with less guarding.",
    measures: [
      "PSFS primary task (MCID ~2/10 often cited)",
      "NPRS worst and average",
      "Sleep disturbance nights/week (if relevant)",
      "Reps or hold time at same effort (capacity)",
    ],
    evidenceNote:
      "Many outpatient MSK episodes reassess progress at ~2–4 weeks of adequate dose; lack of any directional change warrants plan review.",
    priority: 85,
  });

  out.push({
    id: "tissue-remodel",
    windowLabel: "6–8 weeks",
    fromWeeks: 6,
    toWeeks: 8,
    lookFor:
      "More durable capacity: graded load or range that previously flared is now greener; return toward work/sport building blocks.",
    measures: [
      "Graded load tolerance (reps × sets at stable NPRS)",
      "PSFS secondary tasks",
      "Global rating of change (e.g. somewhat/much improved)",
    ],
    evidenceNote:
      "Collagen remodeling and tendon/muscle capacity adaptations are often discussed on multi-week timescales; consistency beats intensity spikes.",
    priority: 75,
  });

  out.push({
    id: "medium-term",
    windowLabel: "10–12 weeks",
    fromWeeks: 10,
    toWeeks: 12,
    lookFor:
      "Functional return milestones: durable workday, recreational walk/hike, or sport-specific criteria when irritability stays low.",
    measures: [
      "Work/ADL endurance (hours)",
      "Return-to-activity checklist items",
      "NPRS with target activity ≤3/10 and settles ≤24h",
    ],
    evidenceNote:
      "Many non-operative MSK pathways use ~8–12 week blocks for meaningful functional change when dosing is adequate and red flags are absent.",
    priority: 70,
  });

  // Chronic onset: reframe expectations
  if (w >= 12 || opts.tissuePhase === "chronic") {
    out.push({
      id: "chronic-reframe",
      windowLabel: "Chronic timeline: 4–8 week review cycles",
      fromWeeks: 4,
      toWeeks: 8,
      lookFor:
        "With longer-standing symptoms, expect stepwise function gains and flare management skill—not linear pain-to-zero. Reassess every 4–8 weeks.",
      measures: [
        "PSFS trend over 4–8 weeks",
        "Flare frequency/duration",
        "Self-efficacy / confidence 0–10 with feared tasks",
      ],
      evidenceNote:
        "Persistent pain programs emphasize function, pacing, and graded exposure; timelines are longer and non-linear.",
      priority: 88,
    });
  }

  // Hyperacute: emphasize protection first
  if (opts.tissuePhase === "hyperacute" || opts.bucket === "0-weeks") {
    out.unshift({
      id: "hyperacute",
      windowLabel: "Days 0–7 (hyperacute / very early)",
      fromWeeks: 0,
      toWeeks: 1,
      lookFor:
        "Calm the system: protected range, relative rest from high-risk loads, early gentle motion as comfort allows—progress is “less threatened motion,” not max strength.",
      measures: [
        "Pain at rest vs with gentle motion",
        "Sleep disruption nights",
        "Ability to walk / dress / transfers safely",
      ],
      evidenceNote:
        "Early MSK care prioritizes irritability control and safe movement; aggressive stretching/loading is usually deferred.",
      priority: 105,
    });
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, 6);
}

function defaultProgressOutlookUnknown(): ProgressMilestone[] {
  return [
    {
      id: "need-timeline",
      windowLabel: "After timeline is known",
      fromWeeks: 0,
      toWeeks: 2,
      lookFor:
        "Once weeks/months/years since onset are stated, milestones can be tailored (acute protection vs chronic function focus).",
      measures: ["NPRS 0–10", "PSFS task 0–10", "24h session response"],
      evidenceNote:
        "Duration since onset is a core element of MSK history for phase selection and expectation setting.",
      priority: 100,
    },
    ...buildProgressOutlook({
      weeksSince: 4,
      tissuePhase: "subacute",
      bucket: "4-weeks",
    }).slice(0, 3),
  ];
}

/** Merge timeline phase with irritability-driven phase (more protective wins). */
export function mergePhaseBias(
  timelinePhase: InjuryTimeline["phaseBias"] | undefined,
  irritabilityPhase: InjuryTimeline["phaseBias"] | undefined
): InjuryTimeline["phaseBias"] | undefined {
  const order = [
    "protect-calm",
    "mobility-restore",
    "motor-control",
    "capacity-load",
    "function-return",
  ] as const;
  if (!timelinePhase) return irritabilityPhase;
  if (!irritabilityPhase) return timelinePhase;
  return order.indexOf(timelinePhase) <= order.indexOf(irritabilityPhase)
    ? timelinePhase
    : irritabilityPhase;
}

/** Compact lines for live clinical read / correlation cards */
export function injuryTimelineLiveLines(t: InjuryTimeline): string[] {
  if (t.source === "unknown") {
    return ["Time since onset: not stated (ask weeks / months / years)."];
  }
  const lines = [
    `Onset timeline: ${t.label}${t.approxWeeksSince != null ? ` (≈${t.approxWeeksSince} wk)` : ""}${
      t.approxMonthsSince != null ? ` · ≈${t.approxMonthsSince} mo` : ""
    }${t.approxYearsSince != null ? ` · ≈${t.approxYearsSince} yr` : ""}.`,
    `Tissue framing: ${t.tissuePhase}; phase bias ${t.phaseBias || "n/a"}.`,
  ];
  if (t.progressOutlook[0]) {
    lines.push(
      `Progress check ${t.progressOutlook[0].windowLabel}: ${t.progressOutlook[0].lookFor}`
    );
  }
  return lines;
}
