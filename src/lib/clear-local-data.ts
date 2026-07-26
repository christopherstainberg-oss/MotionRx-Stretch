/**
 * Clear device-local MotionRx user data (localStorage / sessionStorage).
 * Keeps theme preference so the UI does not flash after wipe/logout.
 */

import { THEME_STORAGE_KEY } from "@/lib/theme";

/** Known fixed keys used across the app */
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
  "motionrx-pwa-dismissed",
] as const;

/** Prefix patterns for per-item keys (routine:id, session:id, etc.) */
const PREFIXES = ["routine:", "session:"] as const;

/** Keys that are typically "today's work" rather than long-lived plan config */
const DAILY_FIXED_KEYS = [
  "journal-entries",
  "jeffery-journal-bridge",
  "motionrx-assessment-qa",
] as const;

function localDayBoundsMs(): { start: number; end: number } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

function isoInLocalDay(iso: unknown, start: number, end: number): boolean {
  if (typeof iso !== "string") return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= start && t < end;
}

/**
 * Wipe local user data. Preserves theme unless `preserveTheme` is false.
 * scope "daily" only removes today's session/journal-style local items.
 */
export function clearLocalUserData(
  options: { preserveTheme?: boolean; scope?: "all" | "daily" } = {}
): void {
  if (typeof window === "undefined") return;
  const preserveTheme = options.preserveTheme !== false;
  const scope = options.scope === "daily" ? "daily" : "all";

  let theme: string | null = null;
  try {
    if (preserveTheme) theme = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    /* ignore */
  }

  try {
    if (scope === "daily") {
      clearLocalDailyData();
    } else {
      for (const key of FIXED_KEYS) {
        localStorage.removeItem(key);
      }

      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (PREFIXES.some((p) => k.startsWith(p))) {
          toRemove.push(k);
        }
        // Catch leftover motionrx-* user state except theme
        if (k.startsWith("motionrx-") && k !== THEME_STORAGE_KEY) {
          toRemove.push(k);
        }
      }
      for (const k of toRemove) {
        localStorage.removeItem(k);
      }
    }

    if (preserveTheme && theme) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch {
    /* private mode / quota */
  }

  if (scope === "all") {
    try {
      sessionStorage.removeItem("motionrx:video-catalog-refresh");
    } catch {
      /* ignore */
    }
  }
}

/** Remove only local items that belong to the current local calendar day. */
export function clearLocalDailyData(): void {
  if (typeof window === "undefined") return;
  const { start, end } = localDayBoundsMs();

  try {
    for (const key of DAILY_FIXED_KEYS) {
      if (key === "journal-entries") {
        const raw = localStorage.getItem("journal-entries");
        if (!raw) continue;
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const kept = arr.filter(
              (e) =>
                !isoInLocalDay(
                  e && typeof e === "object" ? (e as { createdAt?: string }).createdAt : undefined,
                  start,
                  end
                )
            );
            localStorage.setItem("journal-entries", JSON.stringify(kept));
          } else {
            localStorage.removeItem("journal-entries");
          }
        } catch {
          localStorage.removeItem("journal-entries");
        }
      } else {
        localStorage.removeItem(key);
      }
    }

    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("session:")) continue;
      try {
        const raw = localStorage.getItem(k);
        if (!raw) {
          toRemove.push(k);
          continue;
        }
        const s = JSON.parse(raw) as { startedAt?: string; completedAt?: string };
        if (isoInLocalDay(s.startedAt, start, end) || isoInLocalDay(s.completedAt, start, end)) {
          toRemove.push(k);
        }
      } catch {
        /* leave non-json */
      }
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** Local midnight bounds for the current device calendar day (ISO). */
export function getLocalDayBoundsIso(): { dayStart: string; dayEnd: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { dayStart: start.toISOString(), dayEnd: end.toISOString() };
}
