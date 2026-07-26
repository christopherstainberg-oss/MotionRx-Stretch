import { NextResponse } from "next/server";
import { getActorId, getSessionUser } from "@/lib/auth";
import { assertDataDirWritable, updateDb } from "@/lib/storage";
import {
  applyImportPackage,
  isExportPackage,
  type MotionRxExportPackage,
} from "@/lib/user-data-export";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk } from "@/lib/security";

const MAX_IMPORT_BYTES = 4 * 1024 * 1024; // 4 MiB

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`import:${clientIp(req)}`, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many imports. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    if (!contentLengthOk(req, MAX_IMPORT_BYTES)) {
      return NextResponse.json({ error: "Import file too large (max 4MB)." }, { status: 413 });
    }
    if (!assertSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await assertDataDirWritable();

    const user = await getSessionUser();
    const { userId } = await getActorId();
    const actorId = user?.id || userId;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Accept either raw package or { package, mergeProfile }
    let pkg: unknown = body;
    let mergeProfile = true;
    if (body && typeof body === "object" && "package" in (body as object)) {
      const b = body as { package?: unknown; mergeProfile?: boolean };
      pkg = b.package;
      mergeProfile = b.mergeProfile !== false;
    }

    if (!isExportPackage(pkg)) {
      return NextResponse.json(
        {
          error:
            "Unrecognized export file. Use a MotionRx Stretch JSON export (format motionrx-stretch-export).",
        },
        { status: 400 }
      );
    }

    const exportPkg = pkg as MotionRxExportPackage;
    let result = { imported: {} as Record<string, number> };

    await updateDb((db) => {
      result = applyImportPackage(db, actorId, exportPkg, {
        mergeProfile: mergeProfile && Boolean(user),
        user: user || null,
      });
    });

    return NextResponse.json({
      ok: true,
      imported: result.imported,
      message: "Data imported successfully. Refresh pages to see updates.",
      local: exportPkg.local || null,
    });
  } catch (e) {
    console.error("[account/import]", e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
