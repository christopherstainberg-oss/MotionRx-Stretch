import { NextResponse } from "next/server";
import {
  healthSummary,
  maybeBackgroundRefresh,
  refreshCatalogHealth,
  resetHealthCache,
} from "@/lib/youtube-health";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/videos/refresh
 * - Default: TTL-gated full catalog refresh (auto-refresh path used by the app shell)
 * - ?force=1: re-probe every catalog ID immediately
 * - ?status=1: summary only, no probe
 * - ?reset=1: clear health cache then force refresh
 */
export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`videos-refresh:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const statusOnly = url.searchParams.get("status") === "1";
  const reset = url.searchParams.get("reset") === "1";

  try {
    if (statusOnly) {
      return NextResponse.json({ ok: true, summary: await healthSummary() });
    }

    if (reset) {
      await resetHealthCache();
    }

    if (force || reset) {
      const result = await refreshCatalogHealth({ force: true });
      return NextResponse.json({
        ok: true,
        mode: reset ? "reset+force" : "force",
        result,
        summary: await healthSummary(),
      });
    }

    const ran = await maybeBackgroundRefresh();
    return NextResponse.json({
      ok: true,
      mode: ran ? "refreshed" : "fresh",
      summary: await healthSummary(),
    });
  } catch (e) {
    console.error("[videos/refresh]", e);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}

/** POST allows scheduled/ops refresh with same semantics as GET ?force=1 when body.force */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`videos-refresh-post:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let force = false;
  try {
    const body = (await req.json().catch(() => ({}))) as { force?: boolean };
    force = Boolean(body.force);
  } catch {
    force = false;
  }

  try {
    const result = await refreshCatalogHealth({ force });
    return NextResponse.json({
      ok: true,
      mode: force ? "force" : "incremental",
      result,
      summary: await healthSummary(),
    });
  } catch (e) {
    console.error("[videos/refresh POST]", e);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
