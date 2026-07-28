import { NextResponse } from "next/server";
import { getActorId, ownsRecord, signInRequiredResponse } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/storage";
import type { Routine } from "@/lib/types";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk } from "@/lib/security";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
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
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!contentLengthOk(req, 128_000)) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
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

  const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
  const db = await readDb();
  const existing = db.routines.find((r) => r.id === body.id);
  if (existing?.userId && !ownsRecord(existing.userId, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const routine: Routine = {
    ...body,
    userId,
    name: sanitizeText(String(body.name || "My routine"), 120) || "My routine",
    description: sanitizeText(String(body.description || ""), 2000),
    stretchIds: body.stretchIds.slice(0, 40),
    exerciseIds: (body.exerciseIds || []).slice(0, 40),
    items: body.items.slice(0, 40),
    modalities: Array.isArray(body.modalities)
      ? body.modalities.slice(0, 30).map((m) => ({
          id: String(m.id),
          modalityId: String(m.modalityId),
          preVisit: Boolean(m.preVisit),
          postVisit: Boolean(m.postVisit),
          preSession: m.preSession !== undefined ? Boolean(m.preSession) : undefined,
          postSession: m.postSession !== undefined ? Boolean(m.postSession) : undefined,
          variantId: m.variantId ? String(m.variantId) : undefined,
          notes: m.notes ? String(m.notes).slice(0, 500) : undefined,
          order: typeof m.order === "number" ? m.order : undefined,
        }))
      : [],
  };

  await updateDb((d) => {
    const idx = d.routines.findIndex((r) => r.id === routine.id);
    if (idx >= 0) d.routines[idx] = routine;
    else d.routines.push(routine);
  });
  return NextResponse.json({ routine });
}
