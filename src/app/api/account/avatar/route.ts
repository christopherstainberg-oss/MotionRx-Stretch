import { NextResponse } from "next/server";
import { getSessionUser, publicUser } from "@/lib/auth";
import { updateDb } from "@/lib/storage";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/security";
import {
  AVATAR_MAX_BYTES,
  deleteUploadKey,
  saveAvatarBuffer,
  resolveUploadPath,
} from "@/lib/upload-security";
import { promises as fs } from "fs";

/** GET: stream own avatar (auth required) */
export async function GET() {
  const user = await getSessionUser();
  if (!user?.avatarKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const dest = resolveUploadPath(user.avatarKey);
  if (!dest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const buf = await fs.readFile(dest);
    const ext = user.avatarKey.split(".").pop()?.toLowerCase();
    const mime =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(buf.length),
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": 'inline; filename="avatar"',
        "Cache-Control": "private, max-age=3600",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

/** POST: upload avatar (magic-byte validated, path-safe) */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(`avatar:${clientIp(req)}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json({ error: "Too many uploads" }, { status: 429 });
    }
    if (!assertSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
    const file = form.get("avatar");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "avatar file required" }, { status: 400 });
    }
    if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) {
      return NextResponse.json(
        { error: "File must be at most 2MB" },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const saved = await saveAvatarBuffer(user.id, buf);
    if ("error" in saved) {
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }

    const previous = user.avatarKey;
    await updateDb((db) => {
      const u = db.users.find((x) => x.id === user.id);
      if (!u) return;
      u.avatarKey = saved.key;
      u.avatarSource = "upload";
    });
    await deleteUploadKey(previous);

    const fresh = await getSessionUser();
    return NextResponse.json({
      user: fresh ? publicUser(fresh) : null,
      mime: saved.mime,
    });
  } catch (e) {
    console.error("avatar_upload_failed", { err: String(e) });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

/** DELETE: remove avatar */
export async function DELETE(req: Request) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const previous = user.avatarKey;
  await updateDb((db) => {
    const u = db.users.find((x) => x.id === user.id);
    if (!u) return;
    delete u.avatarKey;
    if (u.avatarSource === "upload") {
      u.avatarSource = "none";
    }
  });
  await deleteUploadKey(previous);
  const fresh = await getSessionUser();
  return NextResponse.json({ user: fresh ? publicUser(fresh) : null });
}
