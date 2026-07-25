import { NextResponse } from "next/server";
import { getActorId, ownsRecord } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/storage";
import type { Routine } from "@/lib/types";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const { userId } = await getActorId();
  const db = await readDb();

  if (id) {
    const routine = db.routines.find((r) => r.id === id);
    if (!routine) return NextResponse.json({ routine: null });
    // Only owner (or unowned templates without userId created by this actor later)
    if (routine.userId && !ownsRecord(routine.userId, userId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ routine });
  }

  const routines = db.routines.filter((r) => r.userId === userId);
  return NextResponse.json({ routines });
}

export async function POST(req: Request) {
  const limited = rateLimit(`routines:${clientIp(req)}`, {
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as Routine | null;
  if (!body?.id || !Array.isArray(body.stretchIds)) {
    return NextResponse.json({ error: "Invalid routine" }, { status: 400 });
  }
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ error: "Invalid routine items" }, { status: 400 });
  }

  const { userId } = await getActorId();
  const db = await readDb();
  const existing = db.routines.find((r) => r.id === body.id);
  if (existing?.userId && !ownsRecord(existing.userId, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const routine: Routine = {
    ...body,
    userId,
    name: String(body.name || "My routine").slice(0, 120),
    description: String(body.description || "").slice(0, 2000),
    stretchIds: body.stretchIds.slice(0, 40),
    exerciseIds: (body.exerciseIds || []).slice(0, 40),
    items: body.items.slice(0, 40),
  };

  await updateDb((d) => {
    const idx = d.routines.findIndex((r) => r.id === routine.id);
    if (idx >= 0) d.routines[idx] = routine;
    else d.routines.push(routine);
  });
  return NextResponse.json({ routine });
}
