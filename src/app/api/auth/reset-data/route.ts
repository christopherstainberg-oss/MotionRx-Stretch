import { NextResponse } from "next/server";
import {
  getSessionUser,
  resetActorData,
  type ResetDataScope,
} from "@/lib/auth";
import { assertDataDirWritable, updateDb } from "@/lib/storage";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk } from "@/lib/security";

/** Exact confirmation phrase the client must type */
const CONFIRM_PHRASE = "Reset";

/**
 * Reset the current actor's data (account login is kept).
 * Body: { confirm: "Reset", scope: "all" | "daily", dayStart?, dayEnd? }
 * - all: wipe all owned app data (sessions, journal, plans, etc.)
 * - daily: wipe only records in the provided local-day window
 */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(`reset-data:${clientIp(req)}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many reset attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    if (!contentLengthOk(req, 2_048)) {
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
          error: `Type "${CONFIRM_PHRASE}" exactly to confirm data reset.`,
        },
        { status: 400 }
      );
    }

    const scopeRaw = String(body?.scope || "all");
    const scope: ResetDataScope = scopeRaw === "daily" ? "daily" : "all";

    let dayStart: string | undefined;
    let dayEnd: string | undefined;
    if (scope === "daily") {
      dayStart = typeof body?.dayStart === "string" ? body.dayStart : undefined;
      dayEnd = typeof body?.dayEnd === "string" ? body.dayEnd : undefined;
      if (!dayStart || !dayEnd) {
        // Fallback: UTC calendar day if client omitted bounds
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        dayStart = start.toISOString();
        dayEnd = end.toISOString();
      }
      const s = new Date(dayStart).getTime();
      const e = new Date(dayEnd).getTime();
      if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
        return NextResponse.json({ error: "Invalid day range for daily reset." }, { status: 400 });
      }
      // Cap window at 48h to avoid accidental mass wipes via bad clients
      if (e - s > 48 * 60 * 60 * 1000) {
        return NextResponse.json({ error: "Daily reset window is too large." }, { status: 400 });
      }
    }

    await assertDataDirWritable();

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const actorId = sessionUser.id;

    let removedRows = 0;
    await updateDb((db) => {
      const result = resetActorData(db, actorId, { scope, dayStart, dayEnd });
      removedRows = result.removedRows;
    });

    const message =
      scope === "daily"
        ? `Today's data was reset (${removedRows} record${removedRows === 1 ? "" : "s"} removed). Your account and long-term plans stay intact.`
        : `All app data was reset (${removedRows} record${removedRows === 1 ? "" : "s"} removed). Your login account is still active.`;

    return NextResponse.json({
      ok: true,
      reset: true,
      scope,
      wasGuest: false,
      removedRows,
      message,
    });
  } catch (e) {
    console.error("[auth/reset-data]", e);
    return NextResponse.json(
      { error: "Could not reset data. Try again later." },
      { status: 500 }
    );
  }
}
