import { NextResponse } from "next/server";
import { getActorId } from "@/lib/auth";
import { jefferyReply, newThread } from "@/lib/jeffery";
import { readDb, updateDb } from "@/lib/storage";
import { v4 as uuid } from "uuid";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";

export async function GET() {
  const { userId } = await getActorId();
  const db = await readDb();
  let thread = db.jefferyThreads.find((t) => t.userId === userId);
  if (!thread) {
    thread = newThread(userId);
    await updateDb((d) => {
      d.jefferyThreads.push(thread!);
    });
  }
  return NextResponse.json({ thread });
}

export async function POST(req: Request) {
  const limited = rateLimit(`jeffery:${clientIp(req)}`, {
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Jeffery is receiving many messages. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const text = sanitizeText(String(body.message || ""), 2000);
  if (!text) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const { userId } = await getActorId();
  const db = await readDb();

  let thread = db.jefferyThreads.find((t) => t.userId === userId);
  if (!thread) thread = newThread(userId);

  // Cap thread growth
  if (thread.messages.length > 200) {
    thread.messages = thread.messages.slice(-150);
  }

  const userMsg = {
    id: uuid(),
    role: "user" as const,
    content: text,
    createdAt: new Date().toISOString(),
  };
  thread.messages.push(userMsg);

  const routines = db.routines.filter((r) => r.userId === userId);
  const sessions = db.sessions.filter((s) => s.userId === userId).slice(0, 30);
  const journal = db.journal.filter((j) => j.userId === userId).slice(0, 20);
  const painProfile = db.painProfiles
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  const reply = await jefferyReply(text, {
    routines,
    sessions,
    journal,
    thread,
    painDescriptorIds: painProfile?.descriptorIds,
    sex: painProfile?.sex,
    pastMedicalHistory: painProfile?.pastMedicalHistory,
    currentMedicalHistory: painProfile?.currentMedicalHistory,
    freeText: painProfile?.freeText,
  });

  thread.messages.push(reply.message);
  thread.updatedAt = new Date().toISOString();
  if (reply.message.meta?.painMentioned !== undefined) {
    thread.lastPainInsight = reply.message.meta.painMentioned;
  }
  if (painProfile?.descriptorIds?.length) {
    thread.lastDescriptorIds = painProfile.descriptorIds;
  }
  if (reply.adjustedRoutine?.generatedFrom?.painDescriptorIds?.length) {
    thread.lastDescriptorIds = reply.adjustedRoutine.generatedFrom.painDescriptorIds;
  }
  if (reply.adjustedRoutine) {
    thread.knownAdjustments.push(
      ...reply.adjustedRoutine.selfAdjustHistory.slice(-1).map((a) => a.details)
    );
    thread.knownAdjustments = thread.knownAdjustments.slice(-40);
  }

  await updateDb((d) => {
    const idx = d.jefferyThreads.findIndex((t) => t.userId === userId);
    if (idx >= 0) d.jefferyThreads[idx] = thread!;
    else d.jefferyThreads.push(thread!);

    if (reply.adjustedRoutine) {
      const r = { ...reply.adjustedRoutine, userId };
      const ri = d.routines.findIndex((x) => x.id === r.id);
      if (ri >= 0) {
        if (d.routines[ri]!.userId === userId || !d.routines[ri]!.userId) {
          d.routines[ri] = r;
        }
      } else {
        d.routines.push(r);
      }
    }
  });

  return NextResponse.json({
    thread,
    message: reply.message,
    adjustedRoutine: reply.adjustedRoutine ?? null,
  });
}
