import { NextResponse } from "next/server";
import {
  ensureRoutineItems,
  rotateEntireRoutine,
  rotateRoutineItem,
} from "@/lib/routine-engine";
import { updateDb } from "@/lib/storage";
import type { Routine } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const routine = body.routine as Routine | undefined;
  if (!routine?.id) {
    return NextResponse.json({ error: "routine required" }, { status: 400 });
  }
  const mode = body.mode === "item" ? "item" : "all";
  const base = ensureRoutineItems(routine);
  const next =
    mode === "item" && body.itemId
      ? rotateRoutineItem(base, String(body.itemId))
      : rotateEntireRoutine(base);

  await updateDb((db) => {
    const idx = db.routines.findIndex((r) => r.id === next.id);
    if (idx >= 0) db.routines[idx] = next;
    else db.routines.push(next);
  });

  return NextResponse.json({ routine: next });
}
