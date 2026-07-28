import { NextResponse } from "next/server";
import { resolveLiveVideo } from "@/lib/youtube-resolver";
import type { VideoRegion } from "@/data/video-catalog";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type { VideoCaveatContext } from "@/lib/youtube-management";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/videos/resolve?youtubeId=&region=&title=&bodyParts=neck,shoulders
 *   &wb=pwb&flags=sternal,pregnancy&strict=1
 * Returns a live institutional video (PhysioPath curated map → technique → catalog).
 * Auto-swaps dead IDs; hides embed when no specific match (strict default for named titles).
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
  const wb = url.searchParams.get("wb") || undefined;
  const flagsRaw = url.searchParams.get("flags");
  const flags = flagsRaw
    ? flagsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const strictParam = url.searchParams.get("strict");
  // Default: PhysioPath requireSpecificMatch when a title is present
  const requireSpecificMatch =
    strictParam === "0" || strictParam === "false"
      ? false
      : strictParam === "1" || strictParam === "true"
        ? true
        : Boolean(title);

  const caveatCtx: VideoCaveatContext = {
    weightBearingStatus: wb,
    flags,
    precautionIds: flags,
  };

  try {
    const video = await resolveLiveVideo({
      preferredId: youtubeId,
      region,
      titleOverride: title,
      bodyParts,
      tags,
      kind,
      caveatCtx,
      policy: { requireSpecificMatch },
    });

    const canEmbed = Boolean(video.youtubeId && !video.hide);
    return NextResponse.json(
      {
        video,
        embedUrl: canEmbed
          ? `https://www.youtube-nocookie.com/embed/${video.youtubeId}`
          : null,
        watchUrl: canEmbed
          ? video.watchUrl || `https://www.youtube.com/watch?v=${video.youtubeId}`
          : null,
        hide: Boolean(video.hide || !video.youtubeId),
        caveat: video.caveat,
        attribution: video.attribution,
        verified: video.verified,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    console.error("[videos/resolve]", e);
    return NextResponse.json({ error: "Unable to resolve video" }, { status: 500 });
  }
}
