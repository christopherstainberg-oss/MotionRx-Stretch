import { NextResponse } from "next/server";
import {
  applyClearGuestCookie,
  applyClearSessionCookie,
  getSessionUser,
  peekGuestId,
  purgeActorData,
} from "@/lib/auth";
import { assertDataDirWritable, updateDb } from "@/lib/storage";
import { deleteUploadKey } from "@/lib/upload-security";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk } from "@/lib/security";

/** Exact confirmation phrase the client must type */
const CONFIRM_PHRASE = "Delete";

/**
 * Permanently wipe the current actor's data.
 * - Registered user: deletes account profile + all owned records + session
 * - Guest: deletes guest-owned records + guest cookie
 * Body: { confirm: "Delete" }
 */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(`delete-data:${clientIp(req)}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many delete attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    if (!contentLengthOk(req, 1_024)) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    if (!assertSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const confirm = typeof body?.confirm === "string" ? body.confirm.trim() : "";
    if (confirm !== CONFIRM_PHRASE) {
      return NextResponse.json(
        {
          error: `Type "${CONFIRM_PHRASE}" exactly to confirm permanent deletion.`,
        },
        { status: 400 }
      );
    }

    await assertDataDirWritable();

    const sessionUser = await getSessionUser();
    const guestId = peekGuestId();
    // Do not call getOrCreateGuestId — never invent an id just to wipe.
    const actorId = sessionUser?.id || guestId;
    const isRegistered = Boolean(sessionUser);

    let avatarKey: string | undefined;
    let summary = { removedRows: 0, removedUser: false };

    if (actorId) {
      await updateDb((db) => {
        const result = purgeActorData(db, actorId, {
          removeUserProfile: isRegistered,
        });
        summary = { removedRows: result.removedRows, removedUser: result.removedUser };
        avatarKey = result.avatarKey;
      });
      if (avatarKey) {
        await deleteUploadKey(avatarKey);
      }
    }

    const res = NextResponse.json({
      ok: true,
      deleted: true,
      wasGuest: !isRegistered,
      removedRows: summary.removedRows,
      removedUser: summary.removedUser,
      message: isRegistered
        ? "Your account and all associated data have been permanently deleted."
        : "Guest account data has been permanently deleted from this device session.",
    });

    applyClearSessionCookie(res);
    applyClearGuestCookie(res);
    return res;
  } catch (e) {
    console.error("[auth/delete-data]", e);
    return NextResponse.json(
      { error: "Could not delete data. Try again later." },
      { status: 500 }
    );
  }
}
