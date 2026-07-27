/**
 * Local lab report storage + recovery correlation.
 */

import {
  LAB_TEST_BY_KEY,
  interpretLabValue,
  type LabReport,
  type LabValueEntry,
} from "@/data/labs";

export const LABS_KEY = "motionrx-lab-reports";

export function loadLabReports(): LabReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LABS_KEY);
    const arr = raw ? (JSON.parse(raw) as LabReport[]) : [];
    return Array.isArray(arr) ? arr.slice(0, 40) : [];
  } catch {
    return [];
  }
}

export function saveLabReports(reports: LabReport[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LABS_KEY, JSON.stringify(reports.slice(0, 40)));
  } catch {
    /* ignore */
  }
}

export function addLabReport(report: LabReport): LabReport[] {
  const next = [report, ...loadLabReports()].slice(0, 40);
  saveLabReports(next);
  return next;
}

export function deleteLabReport(id: string): LabReport[] {
  const next = loadLabReports().filter((r) => r.id !== id);
  saveLabReports(next);
  return next;
}

export function latestLabMap(reports?: LabReport[]): Map<string, LabValueEntry> {
  const map = new Map<string, LabValueEntry>();
  const list = reports || loadLabReports();
  for (const r of list) {
    for (const v of r.values) {
      if (!map.has(v.key)) map.set(v.key, v);
    }
  }
  return map;
}

export function labsPlanHints(reports?: LabReport[], sex?: string | null): {
  minutesScale: number;
  avoidTags: string[];
  evidenceLines: string[];
  caution: boolean;
  critical: boolean;
} {
  const map = latestLabMap(reports);
  let minutesScale = 1;
  const avoidTags: string[] = [];
  const evidenceLines: string[] = [];
  let caution = false;
  let critical = false;

  const check = (key: string, fn: (v: number, status: string) => void) => {
    const e = map.get(key);
    if (!e) return;
    const def = LAB_TEST_BY_KEY[key];
    if (!def) return;
    const interp = interpretLabValue(def, e.value, sex);
    fn(e.value, interp.status);
  };

  check("hemoglobin", (v, status) => {
    if (status === "low" || v < 11) {
      caution = true;
      minutesScale = Math.min(minutesScale, 0.8);
      evidenceLines.push(
        `Hemoglobin ${v} — endurance volume may need grading (fatigue risk).`
      );
    }
  });

  check("platelets", (v, status) => {
    if (status.startsWith("critical") || v < 50) {
      critical = true;
      caution = true;
      minutesScale = Math.min(minutesScale, 0.55);
      avoidTags.push("impact", "contact", "fall-risk-high");
      evidenceLines.push(
        `Platelets ${v} — high bleed/fall caution; seek clinician guidance.`
      );
    } else if (status === "low" || v < 100) {
      caution = true;
      minutesScale = Math.min(minutesScale, 0.75);
      avoidTags.push("impact");
      evidenceLines.push(`Platelets ${v} — prefer low-fall HEP.`);
    }
  });

  check("inr", (v, status) => {
    if (v >= 3.5 || status.startsWith("critical")) {
      caution = true;
      minutesScale = Math.min(minutesScale, 0.7);
      avoidTags.push("impact", "contact");
      evidenceLines.push(`INR ${v} — fall/bleed risk education (anticoagulation context).`);
    }
  });

  check("potassium", (v, status) => {
    if (status.startsWith("critical")) {
      critical = true;
      caution = true;
      minutesScale = Math.min(minutesScale, 0.5);
      evidenceLines.push(`Potassium ${v} critical range — medical review before hard sessions.`);
    }
  });

  check("troponin_i", (v, status) => {
    if (status === "high" || status.startsWith("critical") || v > 0.04) {
      critical = true;
      caution = true;
      minutesScale = Math.min(minutesScale, 0.4);
      evidenceLines.push(
        "Troponin elevation on file — stop exercise advice; emergency/clinician pathway."
      );
    }
  });

  check("egfr", (v, status) => {
    if (status === "low" || v < 45) {
      caution = true;
      minutesScale = Math.min(minutesScale, 0.85);
      evidenceLines.push(`eGFR ${v} — kidney-aware pacing; clinician context matters.`);
    }
  });

  check("ck", (v) => {
    if (v > 1000) {
      caution = true;
      minutesScale = Math.min(minutesScale, 0.75);
      evidenceLines.push(
        `CK ${v} elevated — can be post-exercise; if with dark urine/severe weakness, seek care.`
      );
    }
  });

  return { minutesScale, avoidTags, evidenceLines, caution, critical };
}
