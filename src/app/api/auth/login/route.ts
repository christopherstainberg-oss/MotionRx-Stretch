import { NextResponse } from "next/server";
import {
  applyClearGuestCookie,
  applySessionCookie,
  createToken,
  loginUser,
  publicUser,
  peekGuestId,
  migrateGuestData,
} from "@/lib/auth";
import { updateDb } from "@/lib/storage";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`login:${clientIp(req)}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    if (!contentLengthOk(req, 4_096)) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    if (!assertSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const result = await loginUser({
      email: sanitizeText(String(body.email || ""), 254),
      password: String(body.password || ""),
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const guestId = peekGuestId();
    if (guestId) {
      await updateDb((db) => {
        migrateGuestData(db, guestId, result.user.id);
      });
    }

    const sv =
      typeof result.user.sessionVersion === "number" ? result.user.sessionVersion : 0;
    const token = await createToken(result.user.id, sv);
    const res = NextResponse.json({ user: publicUser(result.user) });
    applySessionCookie(res, token);
    if (guestId) applyClearGuestCookie(res);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("login_failed", { err: message });
    const isConfig =
      /AUTH_SECRET|EACCES|ENOENT|EROFS|DATA_DIR|permission/i.test(message);
    return NextResponse.json(
      {
        error: isConfig
          ? "Login failed: server configuration error. Check AUTH_SECRET and data volume permissions."
          : "Login failed",
      },
      { status: 500 }
    );
  }
}
