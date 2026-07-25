import { NextResponse } from "next/server";
import { getSessionUser, publicUser } from "@/lib/auth";
import { updateDb } from "@/lib/storage";
import { sanitizeText } from "@/lib/rate-limit";

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  await updateDb((db) => {
    const u = db.users.find((x) => x.id === user.id);
    if (!u) return;
    if (Array.isArray(body.reminderTimes)) {
      u.preferences.reminderTimes = body.reminderTimes
        .map((t: unknown) => sanitizeText(String(t), 8))
        .filter((t: string) => /^\d{1,2}:\d{2}$/.test(t))
        .slice(0, 8);
    }
    if (typeof body.notificationsEnabled === "boolean") {
      u.preferences.notificationsEnabled = body.notificationsEnabled;
    }
    if (typeof body.nameChoice === "string") {
      u.preferences.nameChoice = sanitizeText(body.nameChoice, 40);
    }
    if (typeof body.sessionLengthMinutes === "number") {
      u.preferences.sessionLengthMinutes = Math.max(
        5,
        Math.min(60, Math.round(body.sessionLengthMinutes))
      );
    }
    // 2FA is preference-only until TOTP is wired; do not claim enforcement
    if (typeof body.twoFactorEnabled === "boolean") {
      u.twoFactorEnabled = body.twoFactorEnabled;
    }
  });
  const fresh = await getSessionUser();
  return NextResponse.json({ user: fresh ? publicUser(fresh) : null });
}
