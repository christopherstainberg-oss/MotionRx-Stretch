import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { buildAdminDirectory, isAdminUser, PRIMARY_ADMIN_NAME } from "@/lib/admin";
import { readDb } from "@/lib/storage";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/security";

/**
 * Administrator directory + platform analytics.
 * Accounts created, usernames, emails, engagement metrics.
 * Access: Christopher Stainberg (built-in), role=admin, or ADMIN_EMAILS.
 */
export async function GET(req: Request) {
  try {
    const limited = rateLimit(`admin-users:${clientIp(req)}`, {
      limit: 30,
      windowMs: 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    if (!assertSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    if (!isAdminUser(user)) {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 }
      );
    }

    const db = await readDb();
    const { summary, users } = buildAdminDirectory(db);

    return NextResponse.json({
      ok: true,
      admin: true,
      primaryAdmin: PRIMARY_ADMIN_NAME,
      viewer: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: "admin",
      },
      summary,
      users,
    });
  } catch (e) {
    console.error("[admin/users]", e);
    return NextResponse.json({ error: "Could not load admin directory" }, { status: 500 });
  }
}
