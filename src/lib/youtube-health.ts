/**
 * YouTube ID health checks via oEmbed + durable cache.
 * Dead / private / removed videos are marked failed and retried sooner than healthy ones.
 *
 * Uses Node https (not Next.js patched fetch) so oEmbed probes work in App Router routes.
 */

import { promises as fs } from "fs";
import path from "path";
import { get as httpsGet } from "https";
import { get as httpGet } from "http";
import { allCatalogYoutubeIds } from "@/data/video-catalog";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const CACHE_FILE = path.join(DATA_DIR, "youtube-health.json");

/** Healthy results stay warm longer; failures recheck more often so recoveries stick. */
export const HEALTHY_TTL_MS = 12 * 60 * 60 * 1000; // 12h
export const FAILED_TTL_MS = 30 * 60 * 1000; // 30m
/** Transient network blips — do not permanently blacklist a catalog ID */
export const UNKNOWN_TTL_MS = 5 * 60 * 1000; // 5m
export const FULL_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

export type YoutubeHealthEntry = {
  /** true = live, false = confirmed dead, null = probe inconclusive (keep using preferred) */
  ok: boolean | null;
  checkedAt: number;
  title?: string;
  author?: string;
  error?: string;
};

export type YoutubeHealthCache = {
  updatedAt: number;
  lastFullRefreshAt: number;
  entries: Record<string, YoutubeHealthEntry>;
};

const memory: {
  cache: YoutubeHealthCache | null;
  inflight: Map<string, Promise<YoutubeHealthEntry>>;
  refreshInflight: Promise<unknown> | null;
  /** Serialize disk writes to avoid Windows rename races under concurrency */
  writeChain: Promise<void>;
} = {
  cache: null,
  inflight: new Map(),
  refreshInflight: null,
  writeChain: Promise.resolve(),
};

function emptyCache(): YoutubeHealthCache {
  return { updatedAt: 0, lastFullRefreshAt: 0, entries: {} };
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function loadHealthCache(): Promise<YoutubeHealthCache> {
  if (memory.cache) return memory.cache;
  await ensureDir();
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<YoutubeHealthCache>;
    memory.cache = {
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
      lastFullRefreshAt:
        typeof parsed.lastFullRefreshAt === "number" ? parsed.lastFullRefreshAt : 0,
      entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {},
    };
  } catch {
    memory.cache = emptyCache();
  }
  return memory.cache;
}

async function saveHealthCache(cache: YoutubeHealthCache): Promise<void> {
  memory.cache = cache;
  const payload = JSON.stringify(cache, null, 2);
  // Chain writes so concurrent probes never clobber/rename the same file
  memory.writeChain = memory.writeChain
    .catch(() => {})
    .then(async () => {
      await ensureDir();
      const tmp = `${CACHE_FILE}.${process.pid}.${Date.now()}.${Math.random()
        .toString(36)
        .slice(2)}.tmp`;
      try {
        await fs.writeFile(tmp, payload, "utf8");
        await fs.rename(tmp, CACHE_FILE);
      } catch (e) {
        await fs.unlink(tmp).catch(() => {});
        // Fallback: direct write if rename races on some FS
        await fs.writeFile(CACHE_FILE, payload, "utf8");
      }
    });
  await memory.writeChain;
}

function ttlFor(entry: YoutubeHealthEntry): number {
  if (entry.ok === true) return HEALTHY_TTL_MS;
  if (entry.ok === false) return FAILED_TTL_MS;
  return UNKNOWN_TTL_MS;
}

function isFresh(entry: YoutubeHealthEntry | undefined, now = Date.now()): boolean {
  if (!entry) return false;
  return now - entry.checkedAt < ttlFor(entry);
}

type JsonFetchResult =
  | { kind: "ok"; status: number; json: Record<string, unknown> }
  | { kind: "http"; status: number }
  | { kind: "network"; error: string };

/** Raw Node HTTP(S) GET — bypasses Next.js fetch instrumentation */
function nodeGetJson(url: string, timeoutMs = 8000): Promise<JsonFetchResult> {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? httpsGet : httpGet;
    const req = lib(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "MotionRx-Stretch/1.0 (institutional video health check)",
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
          if (data.length > 200_000) {
            res.destroy();
            resolve({ kind: "network", error: "response_too_large" });
          }
        });
        res.on("end", () => {
          if (status < 200 || status >= 300) {
            resolve({ kind: "http", status });
            return;
          }
          try {
            resolve({
              kind: "ok",
              status,
              json: JSON.parse(data) as Record<string, unknown>,
            });
          } catch {
            resolve({ kind: "network", error: "invalid_json" });
          }
        });
      }
    );
    req.on("error", (e) =>
      resolve({ kind: "network", error: e instanceof Error ? e.message : "network" })
    );
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ kind: "network", error: "timeout" });
    });
  });
}

/** Live oEmbed probe — authoritative reachability without API key */
export async function probeYoutubeId(youtubeId: string): Promise<YoutubeHealthEntry> {
  const id = youtubeId.trim();
  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) {
    return { ok: false, checkedAt: Date.now(), error: "invalid_id" };
  }

  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${id}`
  )}&format=json`;

  const result = await nodeGetJson(url, 8000);
  const checkedAt = Date.now();

  if (result.kind === "ok") {
    return {
      ok: true,
      checkedAt,
      title: typeof result.json.title === "string" ? result.json.title : undefined,
      author:
        typeof result.json.author_name === "string" ? result.json.author_name : undefined,
    };
  }

  if (result.kind === "http") {
    // 401/404/403 from oEmbed typically mean unavailable / private / removed
    if (result.status === 404 || result.status === 401 || result.status === 403) {
      return { ok: false, checkedAt, error: `http_${result.status}` };
    }
    // Other HTTP codes (5xx, 429) → unknown, do not drop preferred video
    return { ok: null, checkedAt, error: `http_${result.status}` };
  }

  return { ok: null, checkedAt, error: result.error };
}

/** Check one ID: serve cache if fresh, otherwise probe and persist */
export async function checkYoutubeId(
  youtubeId: string,
  opts?: { force?: boolean }
): Promise<YoutubeHealthEntry> {
  const id = youtubeId.trim();
  const cache = await loadHealthCache();
  const existing = cache.entries[id];
  if (!opts?.force && isFresh(existing)) return existing;

  const inflight = memory.inflight.get(id);
  if (inflight) return inflight;

  const job = (async () => {
    const entry = await probeYoutubeId(id);
    const next = await loadHealthCache();
    // Merge into a clone so concurrent writers don't drop sibling keys
    const merged: YoutubeHealthCache = {
      updatedAt: Date.now(),
      lastFullRefreshAt: next.lastFullRefreshAt,
      entries: { ...next.entries, [id]: entry },
    };
    await saveHealthCache(merged);
    return entry;
  })().finally(() => {
    memory.inflight.delete(id);
  });

  memory.inflight.set(id, job);
  return job;
}

/** Confirmed live only */
export async function isYoutubeIdLive(
  youtubeId: string,
  opts?: { force?: boolean }
): Promise<boolean> {
  const entry = await checkYoutubeId(youtubeId, opts);
  return entry.ok === true;
}

/** Confirmed dead (do not use). Unknown/network keeps the ID usable. */
export async function isYoutubeIdDead(
  youtubeId: string,
  opts?: { force?: boolean }
): Promise<boolean> {
  const entry = await checkYoutubeId(youtubeId, opts);
  return entry.ok === false;
}

/** Refresh every catalog ID (rate-friendly sequential batches) */
export async function refreshCatalogHealth(opts?: {
  force?: boolean;
  concurrency?: number;
}): Promise<{
  total: number;
  healthy: number;
  failed: string[];
  unknown: string[];
  checked: number;
  skippedFresh: number;
}> {
  if (memory.refreshInflight && !opts?.force) {
    await memory.refreshInflight;
  }

  const run = (async () => {
    const ids = allCatalogYoutubeIds();
    const concurrency = Math.max(1, Math.min(opts?.concurrency ?? 4, 8));
    let healthy = 0;
    let checked = 0;
    let skippedFresh = 0;
    const failed: string[] = [];
    const unknown: string[] = [];

    let i = 0;
    async function worker() {
      while (i < ids.length) {
        const idx = i++;
        const id = ids[idx]!;
        const cache = await loadHealthCache();
        if (!opts?.force && isFresh(cache.entries[id])) {
          skippedFresh += 1;
          const e = cache.entries[id];
          if (e?.ok === true) healthy += 1;
          else if (e?.ok === false) failed.push(id);
          else unknown.push(id);
          continue;
        }
        const entry = await checkYoutubeId(id, { force: opts?.force });
        checked += 1;
        if (entry.ok === true) healthy += 1;
        else if (entry.ok === false) failed.push(id);
        else unknown.push(id);
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    const cache = await loadHealthCache();
    cache.lastFullRefreshAt = Date.now();
    cache.updatedAt = Date.now();
    await saveHealthCache(cache);

    return { total: ids.length, healthy, failed, unknown, checked, skippedFresh };
  })();

  memory.refreshInflight = run.finally(() => {
    memory.refreshInflight = null;
  });

  return run as Promise<{
    total: number;
    healthy: number;
    failed: string[];
    unknown: string[];
    checked: number;
    skippedFresh: number;
  }>;
}

/** Kick a full refresh if the last one is older than FULL_REFRESH_INTERVAL_MS */
export async function maybeBackgroundRefresh(): Promise<boolean> {
  const cache = await loadHealthCache();
  if (Date.now() - cache.lastFullRefreshAt < FULL_REFRESH_INTERVAL_MS) {
    return false;
  }
  await refreshCatalogHealth({ force: false });
  return true;
}

export async function healthSummary() {
  const cache = await loadHealthCache();
  const ids = allCatalogYoutubeIds();
  let healthy = 0;
  let failed = 0;
  let unknown = 0;
  for (const id of ids) {
    const e = cache.entries[id];
    if (!e || e.ok === null) unknown += 1;
    else if (e.ok === true) healthy += 1;
    else failed += 1;
  }
  return {
    total: ids.length,
    healthy,
    failed,
    unknown,
    lastFullRefreshAt: cache.lastFullRefreshAt
      ? new Date(cache.lastFullRefreshAt).toISOString()
      : null,
    updatedAt: cache.updatedAt ? new Date(cache.updatedAt).toISOString() : null,
  };
}

/** Wipe cache (e.g. after a bad probe implementation) */
export async function resetHealthCache(): Promise<void> {
  memory.cache = emptyCache();
  await saveHealthCache(memory.cache);
}
