import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isAdminUser, toAdminUserRow } from "@/lib/admin";
import { readDb } from "@/lib/storage";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/security";

/**
 * Administrator directory: total users, emails, account creation dates.
 * Only accessible to ADMIN_EMAILS / role=admin accounts.
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
    const users = [...db.users]
      .map(toAdminUserRow)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const withAvatar = users.filter(
      (u) => u.hasUploadAvatar || u.avatarSource === "gravatar"
    ).length;
    const withBiometrics = users.filter((u) => u.biometricsEnabled).length;
    const admins = users.filter((u) => u.role === "admin").length;

    // Newest / oldest for summary cards
    const newest = users[0] || null;
    const oldest =
      users.length > 0
        ? [...users].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )[0]
        : null;

    return NextResponse.json({
      ok: true,
      admin: true,
      summary: {
        totalUsers: users.length,
        withAvatar,
        withBiometrics,
        adminCount: admins,
        newestAccountCreatedAt: newest?.createdAt || null,
        oldestAccountCreatedAt: oldest?.createdAt || null,
      },
      users,
    });
  } catch (e) {
    console.error("[admin/users]", e);
    return NextResponse.json({ error: "Could not load admin directory" }, { status: 500 });
  }
}
