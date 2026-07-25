import { NextResponse } from "next/server";
import { resolveLiveVideo } from "@/lib/youtube-resolver";
import type { VideoRegion } from "@/data/video-catalog";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/videos/resolve?youtubeId=&region=&title=&bodyParts=neck,shoulders
 * Returns a guaranteed-live institutional video (auto-swaps dead IDs).
 */
export async function GET(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`videos-resolve:${ip}`, { limit: 120, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const url = new URL(req.url);
  const youtubeId = url.searchParams.get("youtubeId") || undefined;
  const region = (url.searchParams.get("region") || undefined) as VideoRegion | undefined;
  const title = url.searchParams.get("title") || undefined;
  const kindRaw = url.searchParams.get("kind");
  const kind =
    kindRaw === "stretch" || kindRaw === "exercise" ? kindRaw : undefined;
  const tagsRaw = url.searchParams.get("tags");
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const bodyPartsRaw = url.searchParams.get("bodyParts");
  const bodyParts = bodyPartsRaw
    ? bodyPartsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  try {
    const video = await resolveLiveVideo({
      preferredId: youtubeId,
      region,
      titleOverride: title,
      bodyParts,
      tags,
      kind,
    });

    return NextResponse.json(
      {
        video,
        embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeId}`,
        watchUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
      },
      {
        headers: {
          // Short browser cache; server health cache is the source of truth
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    console.error("[videos/resolve]", e);
    return NextResponse.json({ error: "Unable to resolve video" }, { status: 500 });
  }
}
