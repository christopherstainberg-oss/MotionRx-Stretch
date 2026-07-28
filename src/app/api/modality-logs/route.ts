import { NextResponse } from "next/server";
import { getActorId, ownsRecord, signInRequiredResponse } from "@/lib/auth";
import { getModalityById } from "@/data/modalities";
import { readDb, updateDb } from "@/lib/storage";
import type { ModalityLog } from "@/lib/types";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk } from "@/lib/security";
import { v4 as uuid } from "uuid";

export async function GET() {
  const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
  const db = await readDb();
  const logs = db.modalityLogs
    .filter((l) => l.userId === userId)
    .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
    .slice(0, 50);
  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!contentLengthOk(req, 16_384)) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const limited = rateLimit(`modality-logs:${clientIp(req)}`, {
    limit: 40,
    windowMs: 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as Partial<ModalityLog> | null;
  if (!body?.modalityId || !getModalityById(String(body.modalityId))) {
    return NextResponse.json({ error: "Valid modalityId required" }, { status: 400 });
  }

  const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
  const log: ModalityLog = {
    id: body.id || uuid(),
    userId,
    modalityId: String(body.modalityId),
    timing: String(body.timing || "between-visits"),
    usedAt: body.usedAt || new Date().toISOString(),
    painBefore:
      body.painBefore !== undefined
        ? Math.max(0, Math.min(10, Number(body.painBefore)))
        : undefined,
    painAfter:
      body.painAfter !== undefined
        ? Math.max(0, Math.min(10, Number(body.painAfter)))
        : undefined,
    helpful: typeof body.helpful === "boolean" ? body.helpful : undefined,
    notes: body.notes ? sanitizeText(body.notes, 500) : undefined,
    descriptorIds: Array.isArray(body.descriptorIds)
      ? body.descriptorIds.map(String).slice(0, 16)
      : undefined,
    context: body.context,
  };

  await updateDb((db) => {
    const existing = db.modalityLogs.find((l) => l.id === log.id);
    if (existing && !ownsRecord(existing.userId, userId)) return;
    if (existing) {
      const i = db.modalityLogs.findIndex((l) => l.id === log.id);
      db.modalityLogs[i] = log;
    } else {
      db.modalityLogs.unshift(log);
    }
    db.modalityLogs = db.modalityLogs.slice(0, 500);
  });

  return NextResponse.json({ log });
}
