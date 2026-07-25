import { NextResponse } from "next/server";
import { healthSummary, maybeBackgroundRefresh } from "@/lib/youtube-health";
import { authSecretReady } from "@/lib/auth";
import { assertDataDirWritable, getDataDir } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Liveness + auth/storage readiness + optional video catalog health */
export async function GET() {
  // Keep catalog warm on health probes (e.g. container orchestrators)
  void maybeBackgroundRefresh().catch(() => {});

  let videos: Awaited<ReturnType<typeof healthSummary>> | null = null;
  try {
    videos = await healthSummary();
  } catch {
    videos = null;
  }

  const authOk = authSecretReady();
  let storageOk = false;
  let storageError: string | null = null;
  try {
    await assertDataDirWritable();
    storageOk = true;
  } catch (e) {
    storageError = e instanceof Error ? e.message : String(e);
  }

  const ready = authOk && storageOk;

  return NextResponse.json(
    {
      ok: ready,
      service: "motionrx-stretch",
      time: new Date().toISOString(),
      auth: { secretConfigured: authOk },
      storage: {
        writable: storageOk,
        dataDir: getDataDir(),
        ...(storageError ? { error: storageError } : {}),
      },
      videos,
    },
    { status: ready ? 200 : 503 }
  );
}
