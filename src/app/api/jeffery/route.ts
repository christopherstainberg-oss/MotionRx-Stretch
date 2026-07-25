import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { jefferyReply, newThread } from "@/lib/jeffery";
import { readDb, updateDb } from "@/lib/storage";
import { v4 as uuid } from "uuid";

export async function GET() {
  const user = await getSessionUser();
  const userId = user?.id ?? "local";
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
  const body = await req.json().catch(() => ({}));
  const text = String(body.message || "").trim();
  if (!text) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const user = await getSessionUser();
  const userId = user?.id ?? "local";
  const db = await readDb();

  let thread = db.jefferyThreads.find((t) => t.userId === userId);
  if (!thread) thread = newThread(userId);

  const userMsg = {
    id: uuid(),
    role: "user" as const,
    content: text,
    createdAt: new Date().toISOString(),
  };
  thread.messages.push(userMsg);

  const routines = db.routines.filter((r) => r.userId === userId || !r.userId);
  const sessions = db.sessions.filter((s) => s.userId === userId || s.userId === "local" || s.userId === "anonymous");
  const journal = db.journal.filter((j) => j.userId === userId || j.userId === "local" || j.userId === "anonymous");

  const reply = await jefferyReply(text, {
    routines,
    sessions,
    journal,
    thread,
  });

  thread.messages.push(reply.message);
  thread.updatedAt = new Date().toISOString();
  if (reply.message.meta?.painMentioned !== undefined) {
    thread.lastPainInsight = reply.message.meta.painMentioned;
  }
  if (reply.adjustedRoutine) {
    thread.knownAdjustments.push(
      ...reply.adjustedRoutine.selfAdjustHistory.slice(-1).map((a) => a.details)
    );
  }

  await updateDb((d) => {
    const idx = d.jefferyThreads.findIndex((t) => t.userId === userId);
    if (idx >= 0) d.jefferyThreads[idx] = thread!;
    else d.jefferyThreads.push(thread!);

    if (reply.adjustedRoutine) {
      const r = { ...reply.adjustedRoutine, userId };
      const ri = d.routines.findIndex((x) => x.id === r.id);
      if (ri >= 0) d.routines[ri] = r;
      else d.routines.push(r);
    }
  });

  return NextResponse.json({
    thread,
    message: reply.message,
    adjustedRoutine: reply.adjustedRoutine ?? null,
  });
}
