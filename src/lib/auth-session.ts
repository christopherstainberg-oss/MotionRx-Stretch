/**
 * In-memory / session auth cache so route changes stay snappy
 * without re-blocking the UI on every /api/auth/me round-trip.
 */

import { apiFetch } from "@/lib/api-client";

export type MeUser = {
  id?: string;
  email?: string;
  name?: string;
  preferredName?: string | null;
  displayName?: string;
  isAdmin?: boolean;
  [key: string]: unknown;
};

type Cache = { user: MeUser | null; at: number };

const TTL_MS = 90_000; // 90s — enough to cover normal navigation without spam
let mem: Cache | null = null;
let inflight: Promise<MeUser | null> | null = null;

const SS_KEY = "motionrx:me-cache";

function readSession(): Cache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cache;
    if (!parsed || typeof parsed.at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(c: Cache) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(c));
  } catch {
    /* private mode */
  }
}

function isFresh(c: Cache | null): boolean {
  return Boolean(c && Date.now() - c.at < TTL_MS);
}

/** Sync peek — used to avoid first-paint auth flash when cache is warm */
export function peekMeCache(): MeUser | null | undefined {
  if (mem && isFresh(mem)) return mem.user;
  const s = readSession();
  if (s && isFresh(s)) {
    mem = s;
    return s.user;
  }
  return undefined; // unknown / cold
}

export function setMeCache(user: MeUser | null) {
  mem = { user, at: Date.now() };
  writeSession(mem);
}

export function clearMeCache() {
  mem = null;
  inflight = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(SS_KEY);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Fetch current user with short TTL cache + single-flight dedupe.
 * force=true always hits the network.
 */
export async function getMeCached(force = false): Promise<MeUser | null> {
  if (!force && mem && isFresh(mem)) return mem.user;
  if (!force) {
    const s = readSession();
    if (s && isFresh(s)) {
      mem = s;
      return s.user;
    }
  }
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await apiFetch("/api/auth/me", { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      const user = (d?.user as MeUser) || null;
      setMeCache(user);
      return user;
    } catch {
      // Keep last known user if network blip mid-session
      if (mem?.user) return mem.user;
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
