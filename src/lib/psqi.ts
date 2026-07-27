/**
 * Pittsburgh Sleep Quality Index (PSQI) — educational scoring + suggestions.
 * Based on Buysse et al. (1989) / Hartford Institute PSQI instrument.
 * Educational self-tracking only — not diagnosis or medical care.
 */

export const PSQI_STORAGE_KEY = "motionrx-psqi-logs";

/** Frequency scale used by Q5–Q7 (and related). */
export const PSQI_FREQ_OPTIONS = [
  { value: 0, label: "Not during the past month" },
  { value: 1, label: "Less than once a week" },
  { value: 2, label: "Once or twice a week" },
  { value: 3, label: "Three or more times a week" },
] as const;

export const PSQI_QUALITY_OPTIONS = [
  { value: 0, label: "Very good" },
  { value: 1, label: "Fairly good" },
  { value: 2, label: "Fairly bad" },
  { value: 3, label: "Very bad" },
] as const;

export const PSQI_ENTHUSIASM_OPTIONS = [
  { value: 0, label: "No problem at all" },
  { value: 1, label: "Only a very slight problem" },
  { value: 2, label: "Somewhat of a problem" },
  { value: 3, label: "A very big problem" },
] as const;

export const PSQI_DISTURBANCE_ITEMS: { key: keyof PsqiAnswers["disturbances"]; label: string }[] =
  [
    { key: "a", label: "Cannot get to sleep within 30 minutes" },
    { key: "b", label: "Wake up in the middle of the night or early morning" },
    { key: "c", label: "Have to get up to use the bathroom" },
    { key: "d", label: "Cannot breathe comfortably" },
    { key: "e", label: "Cough or snore loudly" },
    { key: "f", label: "Feel too cold" },
    { key: "g", label: "Feel too hot" },
    { key: "h", label: "Have bad dreams" },
    { key: "i", label: "Have pain" },
    { key: "j", label: "Other reason(s)" },
  ];

export type PsqiFreq = 0 | 1 | 2 | 3;

export type PsqiAnswers = {
  /** Q1 — usual bedtime HH:MM */
  bedtime: string;
  /** Q2 — minutes to fall asleep */
  latencyMinutes: number;
  /** Q3 — usual wake time HH:MM */
  wakeTime: string;
  /** Q4 — hours of actual sleep */
  hoursSleep: number;
  /** Q5a–j */
  disturbances: {
    a: PsqiFreq;
    b: PsqiFreq;
    c: PsqiFreq;
    d: PsqiFreq;
    e: PsqiFreq;
    f: PsqiFreq;
    g: PsqiFreq;
    h: PsqiFreq;
    i: PsqiFreq;
    j: PsqiFreq;
  };
  otherReason?: string;
  /** Q6 — sleep medication */
  sleepMeds: PsqiFreq;
  /** Q7 — trouble staying awake */
  daytimeSleepiness: PsqiFreq;
  /** Q8 — enthusiasm / daytime dysfunction */
  enthusiasm: PsqiFreq;
  /** Q9 — overall sleep quality */
  subjectiveQuality: PsqiFreq;
};

export type PsqiComponents = {
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  c6: number;
  c7: number;
};

export type PsqiQualityBand =
  | "good"
  | "fair"
  | "poor"
  | "needs-attention";

export type PsqiScoreResult = {
  components: PsqiComponents;
  global: number;
  /** 0–100 style “how far from worst” for UI badges */
  qualityPercent: number;
  band: PsqiQualityBand;
  bandLabel: string;
  hoursInBed: number;
  sleepEfficiency: number;
  hoursSleep: number;
};

export type PsqiLogEntry = {
  id: string;
  createdAt: string;
  answers: PsqiAnswers;
  result: PsqiScoreResult;
};

export type SleepSuggestion = {
  id: string;
  title: string;
  detail: string;
  priority: number;
  relatedComponent?: keyof PsqiComponents;
};

export function defaultPsqiAnswers(): PsqiAnswers {
  return {
    bedtime: "22:30",
    latencyMinutes: 15,
    wakeTime: "06:30",
    hoursSleep: 7,
    disturbances: {
      a: 0,
      b: 0,
      c: 0,
      d: 0,
      e: 0,
      f: 0,
      g: 0,
      h: 0,
      i: 0,
      j: 0,
    },
    otherReason: "",
    sleepMeds: 0,
    daytimeSleepiness: 0,
    enthusiasm: 0,
    subjectiveQuality: 0,
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3, Math.round(n)));
}

/** Minutes from midnight; wake after midnight adds 24h when before bed. */
export function parseTimeToMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function hoursInBedFromTimes(bedtime: string, wakeTime: string): number {
  const bed = parseTimeToMinutes(bedtime);
  const wake = parseTimeToMinutes(wakeTime);
  if (bed == null || wake == null) return 0;
  let end = wake;
  if (end <= bed) end += 24 * 60;
  return Math.max(0, (end - bed) / 60);
}

function latencyComponentScore(minutes: number): number {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m < 0) return 0;
  if (m <= 15) return 0;
  if (m <= 30) return 1;
  if (m <= 60) return 2;
  return 3;
}

function durationComponentScore(hours: number): number {
  const h = Number(hours);
  if (!Number.isFinite(h) || h < 0) return 3;
  if (h > 7) return 0;
  if (h >= 6) return 1;
  if (h >= 5) return 2;
  return 3;
}

function efficiencyComponentScore(pct: number): number {
  if (!Number.isFinite(pct)) return 3;
  if (pct > 85) return 0;
  if (pct >= 75) return 1;
  if (pct >= 65) return 2;
  return 3;
}

function mapSumToComponent(sum: number): number {
  if (sum <= 0) return 0;
  if (sum <= 2) return 1;
  if (sum <= 4) return 2;
  return 3;
}

function disturbanceSumComponent(sum: number): number {
  if (sum <= 0) return 0;
  if (sum <= 9) return 1;
  if (sum <= 18) return 2;
  return 3;
}

export function qualityBandFromGlobal(global: number): {
  band: PsqiQualityBand;
  label: string;
} {
  const g = Math.max(0, Math.min(21, Math.round(global)));
  if (g <= 4) return { band: "good", label: "Good Sleep Quality" };
  if (g <= 8) return { band: "fair", label: "Fair Sleep Quality" };
  if (g <= 12) return { band: "poor", label: "Poor Sleep Quality" };
  return { band: "needs-attention", label: "Poor — Needs Attention" };
}

export function scorePsqi(answers: PsqiAnswers): PsqiScoreResult {
  const hoursSleep = Math.max(0, Number(answers.hoursSleep) || 0);
  const hoursInBed = hoursInBedFromTimes(answers.bedtime, answers.wakeTime);
  const sleepEfficiency =
    hoursInBed > 0
      ? Math.min(100, Math.round((hoursSleep / hoursInBed) * 1000) / 10)
      : 0;

  // C1 — subjective sleep quality (Q9)
  const c1 = clampScore(answers.subjectiveQuality);

  // C2 — sleep latency: Q2 + Q5a
  const q2 = latencyComponentScore(answers.latencyMinutes);
  const q5a = clampScore(answers.disturbances.a);
  const c2 = mapSumToComponent(q2 + q5a);

  // C3 — sleep duration (Q4)
  const c3 = durationComponentScore(hoursSleep);

  // C4 — habitual sleep efficiency
  const c4 = efficiencyComponentScore(sleepEfficiency);

  // C5 — sleep disturbances Q5b–j (missing j treated as 0 per instrument update)
  const d = answers.disturbances;
  const distSum =
    clampScore(d.b) +
    clampScore(d.c) +
    clampScore(d.d) +
    clampScore(d.e) +
    clampScore(d.f) +
    clampScore(d.g) +
    clampScore(d.h) +
    clampScore(d.i) +
    clampScore(d.j);
  const c5 = disturbanceSumComponent(distSum);

  // C6 — sleep medication (Q6)
  const c6 = clampScore(answers.sleepMeds);

  // C7 — daytime dysfunction Q7 + Q8
  const c7 = mapSumToComponent(
    clampScore(answers.daytimeSleepiness) + clampScore(answers.enthusiasm)
  );

  const components: PsqiComponents = { c1, c2, c3, c4, c5, c6, c7 };
  const global = c1 + c2 + c3 + c4 + c5 + c6 + c7;
  const { band, label } = qualityBandFromGlobal(global);
  // Higher quality % = better sleep (inverse of global / 21)
  const qualityPercent = Math.round(((21 - global) / 21) * 100);

  return {
    components,
    global,
    qualityPercent,
    band,
    bandLabel: label,
    hoursInBed: Math.round(hoursInBed * 10) / 10,
    sleepEfficiency,
    hoursSleep: Math.round(hoursSleep * 10) / 10,
  };
}

export function bandBadgeClass(band: PsqiQualityBand): string {
  switch (band) {
    case "good":
      return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
    case "fair":
      return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30";
    case "poor":
      return "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/35";
    case "needs-attention":
      return "bg-orange-500/20 text-orange-200 ring-1 ring-orange-500/40";
  }
}

/** Educational suggestions prioritized by worst component scores + global band. */
export function sleepSuggestionsFromScore(result: PsqiScoreResult): SleepSuggestion[] {
  const { components: c, global, sleepEfficiency, hoursSleep } = result;
  const out: SleepSuggestion[] = [];
  const push = (s: SleepSuggestion) => out.push(s);

  if (c.c2 >= 2) {
    push({
      id: "latency",
      title: "Shorten time to fall asleep",
      detail:
        "Keep a 20–30 minute wind-down: dim lights, no stimulating screens, and the same pre-bed routine. Leave bed if still awake after ~20 minutes and return only when sleepy.",
      priority: 10 + c.c2,
      relatedComponent: "c2",
    });
  }
  if (c.c3 >= 2 || hoursSleep < 6) {
    push({
      id: "duration",
      title: "Protect a longer sleep window",
      detail:
        "Aim for a consistent bedtime that allows 7–9 hours in bed. Protect the last hour before bed from work and late caffeine (often cut caffeine 8+ hours before lights out).",
      priority: 10 + c.c3,
      relatedComponent: "c3",
    });
  }
  if (c.c4 >= 2 || sleepEfficiency < 85) {
    push({
      id: "efficiency",
      title: "Improve sleep efficiency",
      detail:
        "Use the bed mainly for sleep. If you are awake a long time, get up briefly in low light, then return when drowsy. Keep wake time fixed—even after a rough night.",
      priority: 11 + c.c4,
      relatedComponent: "c4",
    });
  }
  if (c.c5 >= 2) {
    push({
      id: "disturbances",
      title: "Reduce night-time disruptions",
      detail:
        "Cool, dark, quiet room helps many people. Address pain, reflux, or bathroom trips with daytime strategies (hydration timing, evening stretch/pain plan). Loud snoring/breathing issues deserve clinical review.",
      priority: 12 + c.c5,
      relatedComponent: "c5",
    });
  }
  if (c.c6 >= 1) {
    push({
      id: "meds",
      title: "Sleep medication check-in",
      detail:
        "If you use prescribed or OTC sleep aids often, review need, timing, and side effects with a licensed clinician—especially if mobility or fall risk is a concern.",
      priority: 9 + c.c6,
      relatedComponent: "c6",
    });
  }
  if (c.c7 >= 2) {
    push({
      id: "daytime",
      title: "Support daytime alertness",
      detail:
        "Get morning daylight, keep naps short (≤20–30 min) and early afternoon, and schedule movement earlier in the day when possible to avoid late overstimulation.",
      priority: 10 + c.c7,
      relatedComponent: "c7",
    });
  }
  if (c.c1 >= 2) {
    push({
      id: "quality",
      title: "Rebuild sleep confidence",
      detail:
        "Track one small win nightly (same wake time, wind-down done). Pair gentle evening mobility from your plan with consistent lights-out—progress often shows over 1–2 weeks.",
      priority: 8 + c.c1,
      relatedComponent: "c1",
    });
  }

  // Always offer general hygiene when global ≥ 5 (classic PSQI “poor sleeper” threshold)
  if (global >= 5) {
    push({
      id: "hygiene",
      title: "Core sleep hygiene baseline",
      detail:
        "Fixed wake time, morning light, caffeine/alcohol limits later in the day, and a cool dark bedroom. Global PSQI ≥ 5 often means patterns—not one bad night—need attention.",
      priority: 5,
    });
  } else {
    push({
      id: "maintain",
      title: "Keep what’s working",
      detail:
        "Your global score is in a healthier range. Maintain consistent schedule and protect wind-down time so gains stick through busy weeks.",
      priority: 1,
    });
  }

  // Pain / PT-specific educational tip for MotionRx context
  if (c.c5 >= 1 || c.c1 >= 1) {
    push({
      id: "pain-mobility",
      title: "Mobility & pain before bed",
      detail:
        "A short, calm mobility or stretch session earlier in the evening (not a hard workout right before bed) may ease position-related wake-ups. Match effort to your plan’s pain rules.",
      priority: 6,
    });
  }

  return out
    .sort((a, b) => b.priority - a.priority)
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
    .slice(0, 6);
}

export function trendFromLogs(logs: PsqiLogEntry[]): "improving" | "worsening" | "stable" | "na" {
  if (logs.length < 2) return "na";
  // logs assumed newest-first
  const recent = logs.slice(0, Math.min(4, logs.length));
  const older = logs.slice(Math.min(4, logs.length), Math.min(8, logs.length));
  if (!older.length) {
    const first = logs[logs.length - 1]!.result.global;
    const last = logs[0]!.result.global;
    if (last < first - 1) return "improving";
    if (last > first + 1) return "worsening";
    return "stable";
  }
  const avg = (arr: PsqiLogEntry[]) =>
    arr.reduce((n, e) => n + e.result.global, 0) / arr.length;
  const r = avg(recent);
  const o = avg(older);
  if (r < o - 0.75) return "improving";
  if (r > o + 0.75) return "worsening";
  return "stable";
}

export function loadPsqiLogs(): PsqiLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PSQI_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => e && typeof e === "object" && e.result && e.answers)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ) as PsqiLogEntry[];
  } catch {
    return [];
  }
}

export function savePsqiLogs(logs: PsqiLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PSQI_STORAGE_KEY, JSON.stringify(logs.slice(0, 60)));
  } catch {
    /* quota */
  }
}

export const COMPONENT_LABELS: Record<keyof PsqiComponents, string> = {
  c1: "Sleep quality",
  c2: "Latency",
  c3: "Duration",
  c4: "Efficiency",
  c5: "Disturbances",
  c6: "Medication",
  c7: "Daytime",
};

// ─── Cross-app correlation (Assessment, Plan, Journal, Jeffery, Insights) ───

/** Compact snapshot other sections read without re-scoring full logs. */
export type SleepCorrelationSnapshot = {
  hasData: boolean;
  logCount: number;
  latestAt?: string;
  global?: number;
  band?: PsqiQualityBand;
  bandLabel?: string;
  qualityPercent?: number;
  sleepEfficiency?: number;
  hoursSleep?: number;
  trend: "improving" | "worsening" | "stable" | "na";
  /** Highest PSQI component codes (e.g. c5, c2) */
  worstComponents: Array<{ code: keyof PsqiComponents; label: string; score: number }>;
  /** Pain-at-night / disturbance signal from Q5i */
  painAtNight: boolean;
  /** Sleep meds used ≥ once/week (PSQI Q6 ≥ 1) */
  usesSleepMeds: boolean;
  /** Daytime dysfunction elevated */
  daytimeDysfunction: boolean;
  /** 1–5 journal-style sleep quality (derived from global; 5 = best) */
  journalSleepQuality: 1 | 2 | 3 | 4 | 5;
  /** Plan dosing: scale session minutes when recovery is limited */
  minutesScale: number;
  /** Soft irritability boost (0–1.5) for plan / modality engines */
  irritabilityBoost: number;
  maxDifficulty?: "beginner" | "intermediate";
  preferTags: string[];
  modalityIds: string[];
  summaryLines: string[];
  /** Jeffery / coach injection */
  promptBlob: string;
  topSuggestion?: SleepSuggestion;
};

export function getLatestPsqiLog(logs?: PsqiLogEntry[]): PsqiLogEntry | null {
  const list = logs ?? loadPsqiLogs();
  return list[0] || null;
}

/** Map PSQI global (0–21, lower better) → journal 1–5 sleep quality (higher better). */
export function psqiGlobalToJournalSleep(global: number): 1 | 2 | 3 | 4 | 5 {
  const g = Math.max(0, Math.min(21, Math.round(global)));
  if (g <= 3) return 5;
  if (g <= 5) return 4;
  if (g <= 8) return 3;
  if (g <= 12) return 2;
  return 1;
}

/**
 * Build sleep correlation payload from PSQI logs for the whole app.
 * Safe on server (returns empty when no window / no logs).
 */
export function buildSleepCorrelation(logs?: PsqiLogEntry[]): SleepCorrelationSnapshot {
  const list = logs ?? (typeof window !== "undefined" ? loadPsqiLogs() : []);
  const empty: SleepCorrelationSnapshot = {
    hasData: false,
    logCount: 0,
    trend: "na",
    worstComponents: [],
    painAtNight: false,
    usesSleepMeds: false,
    daytimeDysfunction: false,
    journalSleepQuality: 3,
    minutesScale: 1,
    irritabilityBoost: 0,
    preferTags: [],
    modalityIds: [],
    summaryLines: ["No PSQI sleep score logged yet — open Sleep to complete the questionnaire."],
    promptBlob: "",
  };
  if (!list.length) return empty;

  const latest = list[0]!;
  const r = latest.result;
  const a = latest.answers;
  const trend = trendFromLogs(list);
  const comps = r.components;
  const worst = (Object.keys(comps) as (keyof PsqiComponents)[])
    .map((code) => ({
      code,
      label: COMPONENT_LABELS[code],
      score: comps[code],
    }))
    .filter((x) => x.score >= 1)
    .sort((x, y) => y.score - x.score)
    .slice(0, 4);

  const painAtNight = clampScore(a.disturbances.i) >= 1;
  const usesSleepMeds = clampScore(a.sleepMeds) >= 1;
  const daytimeDysfunction = comps.c7 >= 2;
  const poor = r.global >= 5;
  const severe = r.global >= 10 || r.band === "needs-attention";

  // Recovery-limited dosing: poor sleep → slightly shorter sessions, gentler tags
  let minutesScale = 1;
  if (severe) minutesScale = 0.78;
  else if (r.global >= 8) minutesScale = 0.85;
  else if (poor) minutesScale = 0.92;

  let irritabilityBoost = 0;
  if (severe) irritabilityBoost = 1.2;
  else if (r.global >= 8) irritabilityBoost = 0.8;
  else if (poor) irritabilityBoost = 0.4;
  if (painAtNight) irritabilityBoost = Math.min(1.5, irritabilityBoost + 0.3);

  const preferTags: string[] = ["recovery", "sleep"];
  if (poor) preferTags.push("gentle", "protected", "warmup");
  if (comps.c5 >= 2 || painAtNight) preferTags.push("gentle", "mobility", "evening-calm");
  if (daytimeDysfunction) preferTags.push("short-volume", "energy-aware");
  if (comps.c2 >= 2) preferTags.push("wind-down", "evening");

  const modalityIds: string[] = [];
  if (poor || painAtNight || comps.c5 >= 1) {
    modalityIds.push("mod-sleep-hygiene", "mod-sleep-position");
  }
  if (comps.c2 >= 2 || comps.c1 >= 2) {
    modalityIds.push("mod-breathing-downreg");
  }

  const suggestions = sleepSuggestionsFromScore(r);
  const summaryLines: string[] = [
    `PSQI ${r.global}/21 · ${r.bandLabel} · efficiency ${r.sleepEfficiency}% · ${r.hoursSleep}h sleep`,
  ];
  if (trend !== "na") summaryLines.push(`Sleep trend: ${trend}.`);
  if (worst[0]) {
    summaryLines.push(
      `Priority sleep components: ${worst
        .slice(0, 3)
        .map((w) => `${w.label} ${w.score}/3`)
        .join(", ")}.`
    );
  }
  if (painAtNight) summaryLines.push("Pain-related night disturbance reported on PSQI.");
  if (usesSleepMeds) summaryLines.push("Sleep medication use reported (review with clinician as needed).");
  if (daytimeDysfunction) summaryLines.push("Daytime sleepiness / enthusiasm impact elevated.");

  const promptLines = [
    `Sleep (PSQI): global ${r.global}/21 (${r.bandLabel}), efficiency ${r.sleepEfficiency}%, usual sleep ${r.hoursSleep}h, trend ${trend}.`,
    worst.length
      ? `Worst components: ${worst.map((w) => `${w.label}=${w.score}`).join(", ")}.`
      : "",
    painAtNight ? "Pain contributes to night disturbance." : "",
    usesSleepMeds ? "Uses sleep medication at least occasionally." : "",
    daytimeDysfunction ? "Daytime dysfunction from sleep is elevated." : "",
    suggestions[0] ? `Top sleep tip: ${suggestions[0].title} — ${suggestions[0].detail.slice(0, 140)}` : "",
    "Correlate sleep with pain irritability, session volume, evening modality education, and journal sleep ratings.",
  ].filter(Boolean);

  return {
    hasData: true,
    logCount: list.length,
    latestAt: latest.createdAt,
    global: r.global,
    band: r.band,
    bandLabel: r.bandLabel,
    qualityPercent: r.qualityPercent,
    sleepEfficiency: r.sleepEfficiency,
    hoursSleep: r.hoursSleep,
    trend,
    worstComponents: worst,
    painAtNight,
    usesSleepMeds,
    daytimeDysfunction,
    journalSleepQuality: psqiGlobalToJournalSleep(r.global),
    minutesScale,
    irritabilityBoost,
    maxDifficulty: severe ? "beginner" : poor ? "beginner" : undefined,
    preferTags: Array.from(new Set(preferTags)),
    modalityIds: Array.from(new Set(modalityIds)),
    summaryLines,
    promptBlob: promptLines.join("\n"),
    topSuggestion: suggestions[0],
  };
}
