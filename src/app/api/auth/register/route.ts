import { NextResponse } from "next/server";
import {
  applyClearGuestCookie,
  applySessionCookie,
  createToken,
  publicUser,
  registerUser,
  peekGuestId,
  migrateGuestData,
} from "@/lib/auth";
import { assertDataDirWritable, updateDb } from "@/lib/storage";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`register:${clientIp(req)}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    if (!contentLengthOk(req, 4_096)) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    if (!assertSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fail fast with a clear config error before hashing/writing users
    await assertDataDirWritable();

    const body = await req.json().catch(() => ({}));
    const result = await registerUser({
      // Email/password/name normalized inside registerUser (keyboard + person-name rules)
      email: String(body.email || ""),
      password: String(body.password || ""),
      name: String(body.name || ""),
      preferredName: String(body.preferredName || ""),
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const guestId = peekGuestId();
    if (guestId) {
      await updateDb((db) => {
        migrateGuestData(db, guestId, result.user.id);
      });
    }

    const token = await createToken(result.user.id, result.user.sessionVersion ?? 0);
    const res = NextResponse.json({ user: publicUser(result.user) });
    applySessionCookie(res, token);
    if (guestId) applyClearGuestCookie(res);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("register_failed", { err: message });
    // Surface config mistakes (missing AUTH_SECRET, unwritable DATA_DIR) without leaking stacks
    const isConfig =
      /AUTH_SECRET|EACCES|ENOENT|EROFS|DATA_DIR|permission|not writable/i.test(
        message
      );
    return NextResponse.json(
      {
        error: isConfig
          ? "Registration failed: server configuration error. Check AUTH_SECRET and data volume permissions."
          : "Registration failed",
      },
      { status: 500 }
    );
  }
}
