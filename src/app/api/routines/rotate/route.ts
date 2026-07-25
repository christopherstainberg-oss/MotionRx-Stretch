import { NextResponse } from "next/server";
import { getActorId, ownsRecord } from "@/lib/auth";
import {
  ensureRoutineItems,
  rotateEntireRoutine,
  rotateRoutineItem,
} from "@/lib/routine-engine";
import { readDb, updateDb } from "@/lib/storage";
import type { Routine } from "@/lib/types";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = rateLimit(`rotate:${clientIp(req)}`, {
    limit: 40,
    windowMs: 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const routine = body.routine as Routine | undefined;
  if (!routine?.id) {
    return NextResponse.json({ error: "routine required" }, { status: 400 });
  }

  const { userId } = await getActorId();
  const db = await readDb();
  const existing = db.routines.find((r) => r.id === routine.id);
  if (existing?.userId && !ownsRecord(existing.userId, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mode = body.mode === "item" ? "item" : "all";
  const base = ensureRoutineItems({ ...routine, userId });
  const next =
    mode === "item" && body.itemId
      ? rotateRoutineItem(base, String(body.itemId))
      : rotateEntireRoutine(base);
  next.userId = userId;

  await updateDb((d) => {
    const idx = d.routines.findIndex((r) => r.id === next.id);
    if (idx >= 0) d.routines[idx] = next;
    else d.routines.push(next);
  });

  return NextResponse.json({ routine: next });
}
