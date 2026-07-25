import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSessionUser,
  publicUser,
  verifyPassword,
  bumpSessionVersion,
  assertCanEditProfile,
  createToken,
  setSessionCookie,
  hashPassword,
} from "@/lib/auth";
import { updateDb } from "@/lib/storage";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";
import {
  assertSameOrigin,
  clampInt,
  contentLengthOk,
  sanitizeDisplayName,
} from "@/lib/security";

const AccountPatchSchema = z
  .object({
    reminderTimes: z
      .array(z.string().regex(/^\d{1,2}:\d{2}$/))
      .max(8)
      .optional(),
    notificationsEnabled: z.boolean().optional(),
    nameChoice: z.string().max(40).optional(),
    theme: z.enum(["auto", "light", "dark"]).optional(),
    sessionLengthMinutes: z.number().finite().optional(),
    /** Display name — requires currentPassword */
    name: z.string().max(80).optional(),
    /** Optional step-up for security-sensitive updates */
    currentPassword: z.string().min(8).max(128).optional(),
  })
  .strict();

export async function PATCH(req: Request) {
  try {
    const limited = rateLimit(`account:${clientIp(req)}`, {
      limit: 20,
      windowMs: 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many updates. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    if (!contentLengthOk(req, 8_192)) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    if (!assertSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    // Self-only authorization — never take target id from body
    if (!assertCanEditProfile(user.id, user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = AccountPatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const body = parsed.data;

    // Name change is security-adjacent: require re-auth
    if (body.name !== undefined) {
      if (!body.currentPassword) {
        return NextResponse.json(
          { error: "Re-authentication required to change name" },
          { status: 401 }
        );
      }
      const ok = await verifyPassword(body.currentPassword, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    // twoFactorEnabled is NEVER accepted from client (CWE-807)

    await updateDb((db) => {
      const u = db.users.find((x) => x.id === user.id);
      if (!u) return;

      if (body.reminderTimes) {
        u.preferences.reminderTimes = body.reminderTimes
          .map((t) => sanitizeText(t, 8))
          .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
          .slice(0, 8);
      }
      if (typeof body.notificationsEnabled === "boolean") {
        u.preferences.notificationsEnabled = body.notificationsEnabled;
      }
      if (typeof body.nameChoice === "string") {
        u.preferences.nameChoice = sanitizeText(body.nameChoice, 40).replace(
          /[<>"'`\\]/g,
          ""
        );
      }
      if (body.theme) {
        u.preferences.theme = body.theme;
      }
      if (body.sessionLengthMinutes !== undefined) {
        u.preferences.sessionLengthMinutes = clampInt(
          body.sessionLengthMinutes,
          5,
          60,
          u.preferences.sessionLengthMinutes ?? 15
        );
      }
      if (body.name !== undefined) {
        u.name = sanitizeDisplayName(body.name, 80) || u.name;
      }
    });

    const fresh = await getSessionUser();
    return NextResponse.json({ user: fresh ? publicUser(fresh) : null });
  } catch (e) {
    console.error("account_patch_failed", { err: String(e) });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/** POST: security actions (password change → session bump) */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(`account-sec:${clientIp(req)}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    if (!assertSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!contentLengthOk(req, 4_096)) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const schema = z
      .object({
        action: z.literal("change-password"),
        currentPassword: z.string().min(8).max(128),
        newPassword: z.string().min(8).max(128),
      })
      .strict();

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);

    await updateDb((db) => {
      const u = db.users.find((x) => x.id === user.id);
      if (!u) return;
      u.passwordHash = passwordHash;
    });

    const sv = await bumpSessionVersion(user.id);
    const token = await createToken(user.id, sv);
    await setSessionCookie(token);

    const fresh = await getSessionUser();
    return NextResponse.json({
      user: fresh ? publicUser(fresh) : null,
      message: "Password changed. Other sessions were signed out.",
    });
  } catch (e) {
    console.error("account_post_failed", { err: String(e) });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
