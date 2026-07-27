/**
 * Light vitals tracking (NutriFit-inspired). Educational only.
 */

export const VITALS_KEY = "motionrx-vitals-log";

export type VitalKey =
  | "systolic"
  | "diastolic"
  | "heart_rate"
  | "spo2"
  | "temperature_f"
  | "weight_lb"
  | "resp_rate";

export type VitalReading = {
  id: string;
  at: string; // ISO
  systolic?: number;
  diastolic?: number;
  heart_rate?: number;
  spo2?: number;
  temperature_f?: number;
  weight_lb?: number;
  resp_rate?: number;
  notes?: string;
};

export type VitalDef = {
  key: VitalKey;
  label: string;
  unit: string;
  low?: number;
  high?: number;
  tipHigh?: string;
  tipLow?: string;
};

export const VITAL_DEFS: VitalDef[] = [
  {
    key: "systolic",
    label: "Systolic BP",
    unit: "mmHg",
    low: 90,
    high: 120,
    tipHigh: "Recheck; lifestyle + clinician follow-up if persistently high.",
    tipLow: "Often fine; if dizzy/faint, hydrate and get checked.",
  },
  {
    key: "diastolic",
    label: "Diastolic BP",
    unit: "mmHg",
    low: 60,
    high: 80,
    tipHigh: "Same steps as systolic: sodium, activity, weight, alcohol, stress.",
    tipLow: "Usually fine unless symptomatic.",
  },
  {
    key: "heart_rate",
    label: "Resting HR",
    unit: "bpm",
    low: 50,
    high: 100,
    tipHigh: "Can reflect stress, caffeine, illness, deconditioning — recheck at rest.",
    tipLow: "Often athletic; check if dizzy or new.",
  },
  {
    key: "spo2",
    label: "SpO₂",
    unit: "%",
    low: 95,
    high: 100,
    tipLow: "Below 95% needs attention; below 90% can be urgent with symptoms.",
  },
  {
    key: "temperature_f",
    label: "Temperature",
    unit: "°F",
    low: 97,
    high: 99.5,
    tipHigh: "≥100.4°F is fever range — rest, hydrate, seek care if high/persistent.",
    tipLow: "Can follow cold exposure; persistent lows → clinician.",
  },
  {
    key: "resp_rate",
    label: "Respiratory rate",
    unit: "/min",
    low: 12,
    high: 20,
    tipHigh: "Persistent high rate with breathlessness → seek care.",
  },
  {
    key: "weight_lb",
    label: "Weight",
    unit: "lb",
  },
];

export function loadVitals(): VitalReading[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VITALS_KEY);
    const arr = raw ? (JSON.parse(raw) as VitalReading[]) : [];
    return Array.isArray(arr) ? arr.slice(-120) : [];
  } catch {
    return [];
  }
}

export function saveVitals(list: VitalReading[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VITALS_KEY, JSON.stringify(list.slice(-120)));
  } catch {
    /* ignore */
  }
}

export function addVitalReading(
  partial: Omit<VitalReading, "id" | "at"> & { at?: string }
): VitalReading[] {
  const row: VitalReading = {
    id: `v-${Date.now()}`,
    at: partial.at || new Date().toISOString(),
    ...partial,
  };
  const next = [row, ...loadVitals()].slice(0, 120);
  saveVitals(next);
  return next;
}

export type VitalStatus = "low" | "normal" | "high" | "unknown";

export function statusOf(def: VitalDef, v: number): VitalStatus {
  if (!Number.isFinite(v)) return "unknown";
  if (def.high != null && v > def.high) return "high";
  if (def.low != null && v < def.low) return "low";
  return "normal";
}

export type VitalAnalysisItem = {
  key: VitalKey;
  label: string;
  unit: string;
  latest: number;
  status: VitalStatus;
  tip?: string;
  series: number[];
  rangeLabel: string;
};

/** history newest-first */
export function analyzeVitals(history?: VitalReading[]): VitalAnalysisItem[] {
  const rows = history || loadVitals();
  const items: VitalAnalysisItem[] = [];
  for (const def of VITAL_DEFS) {
    const series: number[] = [];
    for (const row of rows) {
      const v = Number(row[def.key]);
      if (Number.isFinite(v) && v > 0) series.push(v);
    }
    if (!series.length) continue;
    const latest = series[0]!;
    const status = def.low != null || def.high != null ? statusOf(def, latest) : "normal";
    let tip: string | undefined;
    if (status === "high") tip = def.tipHigh;
    if (status === "low") tip = def.tipLow;
    items.push({
      key: def.key,
      label: def.label,
      unit: def.unit,
      latest,
      status,
      tip,
      series: series.slice(0, 8).reverse(),
      rangeLabel:
        def.low != null && def.high != null
          ? `${def.low}–${def.high}`
          : def.high != null
            ? `<${def.high}`
            : def.low != null
              ? `>${def.low}`
              : "—",
    });
  }
  return items;
}

/** Soft HEP bias from concerning vitals (educational) */
export function vitalsPlanHints(history?: VitalReading[]): {
  minutesScale: number;
  avoidTags: string[];
  evidenceLines: string[];
  caution: boolean;
} {
  const items = analyzeVitals(history);
  let minutesScale = 1;
  const avoidTags: string[] = [];
  const evidenceLines: string[] = [];
  let caution = false;

  for (const it of items) {
    if (it.key === "spo2" && (it.status === "low" || it.latest < 92)) {
      caution = true;
      minutesScale = Math.min(minutesScale, 0.6);
      evidenceLines.push(
        "SpO₂ low on log — urgent clinician review if symptomatic; no aggressive HEP advice."
      );
    }
    if (it.key === "heart_rate" && it.status === "high" && it.latest >= 110) {
      caution = true;
      minutesScale = Math.min(minutesScale, 0.75);
      evidenceLines.push("Elevated resting HR logged — favor easy sessions until rest HR settles.");
    }
    if (
      it.key === "systolic" &&
      it.status === "high" &&
      it.latest >= 160
    ) {
      caution = true;
      minutesScale = Math.min(minutesScale, 0.7);
      avoidTags.push("heavy-load", "valsalva", "isometric-max");
      evidenceLines.push(
        "High systolic BP logged — avoid heavy isometrics/Valsalva; clinician follow-up."
      );
    }
    if (it.key === "temperature_f" && it.latest >= 100.4) {
      caution = true;
      minutesScale = Math.min(minutesScale, 0.5);
      evidenceLines.push("Fever-range temperature — rest preferred over training.");
    }
  }

  return { minutesScale, avoidTags, evidenceLines, caution };
}
