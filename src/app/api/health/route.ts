import { NextResponse } from "next/server";
import { healthSummary, maybeBackgroundRefresh } from "@/lib/youtube-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Liveness + optional video catalog health (auto-refresh is TTL-gated) */
export async function GET() {
  // Keep catalog warm on health probes (e.g. container orchestrators)
  void maybeBackgroundRefresh().catch(() => {});

  let videos: Awaited<ReturnType<typeof healthSummary>> | null = null;
  try {
    videos = await healthSummary();
  } catch {
    videos = null;
  }

  return NextResponse.json({
    ok: true,
    service: "motionrx-stretch",
    time: new Date().toISOString(),
    videos,
  });
}
