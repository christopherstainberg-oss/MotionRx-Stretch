import { NextResponse } from "next/server";
import { getActorId, ownsRecord, signInRequiredResponse } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/storage";
import type { SessionLog } from "@/lib/types";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk } from "@/lib/security";

export async function GET() {
  const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
  const db = await readDb();
  const sessions = db.sessions
    .filter((s) => s.userId === userId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!contentLengthOk(req, 32_768)) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const limited = rateLimit(`sessions:${clientIp(req)}`, {
    limit: 40,
    windowMs: 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as SessionLog | null;
  if (!body?.id || !Array.isArray(body.stretchIds)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
  const painBefore = clampPain(body.averagePainBefore);
  const painAfter = clampPain(body.averagePainAfter);
  const difficultyFelt = clampDifficulty(body.difficultyFelt);

  const session: SessionLog = {
    ...body,
    userId,
    stretchIds: body.stretchIds.slice(0, 40),
    exerciseIds: (body.exerciseIds || []).slice(0, 40),
    averagePainBefore: painBefore,
    averagePainAfter: painAfter,
    difficultyFelt,
    durationMinutes: Math.max(0, Math.min(180, Number(body.durationMinutes) || 0)),
    notes: body.notes ? sanitizeText(body.notes, 1000) : undefined,
    completed: Boolean(body.completed),
    painDescriptorIds: Array.isArray(body.painDescriptorIds)
      ? body.painDescriptorIds.map(String).slice(0, 24)
      : [],
    modalityIds: Array.isArray(body.modalityIds)
      ? body.modalityIds.map(String).slice(0, 24)
      : undefined,
  };

  await updateDb((db) => {
    const existing = db.sessions.find((s) => s.id === session.id);
    if (existing && !ownsRecord(existing.userId, userId)) return;
    if (existing) {
      const i = db.sessions.findIndex((s) => s.id === session.id);
      db.sessions[i] = session;
    } else {
      db.sessions.push(session);
    }
  });
  return NextResponse.json({ session });
}

function clampPain(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

function clampDifficulty(n: unknown): 1 | 2 | 3 | 4 | 5 {
  const v = Math.round(Number(n));
  if (v < 1) return 1;
  if (v > 5) return 5;
  return v as 1 | 2 | 3 | 4 | 5;
}
