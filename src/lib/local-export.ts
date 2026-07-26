/**
 * Collect device-local data to merge into export packages / restore on import.
 */

const FIXED_KEYS = [
  "nameChoice",
  "preferredName",
  "active-routine",
  "goals",
  "journal-entries",
  "modality-plan",
  "jeffery-journal-bridge",
  "motionrx-pain-profile",
  "motionrx-clinical-context",
  "motionrx-assessment-qa",
  "clinical-history-profile",
  "motionrx-conversation-speed-ms",
] as const;

const PREFIXES = ["routine:", "session:"] as const;

export function collectLocalExportBlob(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const out: Record<string, unknown> = {};
  try {
    for (const key of FIXED_KEYS) {
      const v = localStorage.getItem(key);
      if (v != null) {
        try {
          out[key] = JSON.parse(v);
        } catch {
          out[key] = v;
        }
      }
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (PREFIXES.some((p) => k.startsWith(p))) {
        const v = localStorage.getItem(k);
        if (v == null) continue;
        try {
          out[k] = JSON.parse(v);
        } catch {
          out[k] = v;
        }
      }
    }
  } catch {
    /* private mode */
  }
  return out;
}

/** Restore local keys from an import package's local bag (best-effort). */
export function restoreLocalExportBlob(local: Record<string, unknown> | null | undefined): number {
  if (!local || typeof window === "undefined") return 0;
  let n = 0;
  try {
    for (const [k, v] of Object.entries(local)) {
      if (!k || k === "motionrx-theme") continue;
      try {
        localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
        n += 1;
      } catch {
        /* skip */
      }
    }
  } catch {
    /* ignore */
  }
  return n;
}
