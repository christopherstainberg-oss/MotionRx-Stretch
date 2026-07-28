import { NextResponse } from "next/server";
import {
  healthSummary,
  maybeBackgroundRefresh,
  refreshCatalogHealth,
  resetHealthCache,
} from "@/lib/youtube-health";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/security";
import { getSessionUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/videos/refresh
 * - Default: TTL-gated full catalog refresh (auto-refresh path used by the app shell)
 * - ?force=1 / ?reset=1: admin session + same-origin only
 * - ?status=1: summary only, no probe
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

    // Destructive / expensive ops: require same-origin + admin
    if (force || reset) {
      if (!assertSameOrigin(req)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const user = await getSessionUser();
      if (!user || !isAdminUser(user)) {
        return NextResponse.json({ error: "Admin required" }, { status: 403 });
      }
      if (reset) {
        await resetHealthCache();
      }
      const result = await refreshCatalogHealth({ force: true });
      return NextResponse.json({
        ok: true,
        mode: reset ? "reset+force" : "force",
        result,
        summary: await healthSummary(),
      });
    }

    // Background TTL refresh: same-origin preferred; still rate-limited
    if (!assertSameOrigin(req) && req.headers.get("x-motionrx-client") !== "web") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

/** POST: admin force refresh only */
export async function POST(req: Request) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = await getSessionUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

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
