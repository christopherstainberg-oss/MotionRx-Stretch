import { NextResponse } from "next/server";
import { getActorId, getSessionUser, signInRequiredResponse } from "@/lib/auth";
import { readDb } from "@/lib/storage";
import { buildExportPackage } from "@/lib/user-data-export";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/security";

export async function GET(req: Request) {
  try {
    const limited = rateLimit(`export:${clientIp(req)}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many exports. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    if (!assertSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const user = await getSessionUser();
    const actorId = actor.userId;

    const db = await readDb();
    const pkg = buildExportPackage({
      db,
      actorId,
      isGuest: false,
      user: user || null,
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `motionrx-export-${stamp}.json`;

    return new NextResponse(JSON.stringify(pkg, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[account/export]", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
