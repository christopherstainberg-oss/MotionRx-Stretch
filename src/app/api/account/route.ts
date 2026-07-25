import { NextResponse } from "next/server";
import { getSessionUser, publicUser } from "@/lib/auth";
import { updateDb } from "@/lib/storage";

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
      u.preferences.reminderTimes = body.reminderTimes.map(String);
    }
    if (typeof body.notificationsEnabled === "boolean") {
      u.preferences.notificationsEnabled = body.notificationsEnabled;
    }
    if (typeof body.nameChoice === "string") {
      u.preferences.nameChoice = body.nameChoice;
    }
    if (typeof body.sessionLengthMinutes === "number") {
      u.preferences.sessionLengthMinutes = body.sessionLengthMinutes;
    }
    if (typeof body.twoFactorEnabled === "boolean") {
      u.twoFactorEnabled = body.twoFactorEnabled;
    }
  });
  const fresh = await getSessionUser();
  return NextResponse.json({ user: fresh ? publicUser(fresh) : null });
}
