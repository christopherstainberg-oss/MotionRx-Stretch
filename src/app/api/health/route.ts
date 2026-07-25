import { NextResponse } from "next/server";
import { healthSummary, maybeBackgroundRefresh } from "@/lib/youtube-health";
import { authSecretReady } from "@/lib/auth";
import { assertDataDirWritable, getDataDir } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Liveness for Docker/Portainer healthchecks.
 *
 * Always returns HTTP 200 when the Node process can answer. BusyBox `wget` (used
 * by the image HEALTHCHECK) treats non-2xx as failure, so returning 503 for
 * degraded auth/storage made Portainer show the container as Unhealthy even
 * when the app was up.
 *
 * Readiness is reported in the JSON body as `ready` / `auth` / `storage`.
 */
export async function GET() {
  // Fire-and-forget catalog warm (must not block or fail the probe)
  void maybeBackgroundRefresh().catch(() => {});

  let videos: Awaited<ReturnType<typeof healthSummary>> | null = null;
  try {
    videos = await healthSummary();
  } catch {
    videos = null;
  }

  let authOk = false;
  try {
    authOk = authSecretReady();
  } catch {
    authOk = false;
  }

  let storageOk = false;
  let storageError: string | null = null;
  try {
    await assertDataDirWritable();
    storageOk = true;
  } catch (e) {
    storageError = e instanceof Error ? e.message : String(e);
  }

  const ready = authOk && storageOk;

  // Always 200 once the server is listening — Docker/Portainer liveness.
  return NextResponse.json({
    ok: true,
    ready,
    service: "motionrx-stretch",
    time: new Date().toISOString(),
    auth: { secretConfigured: authOk },
    storage: {
      writable: storageOk,
      dataDir: getDataDir(),
      ...(storageError ? { error: storageError } : {}),
    },
    videos,
  });
}
