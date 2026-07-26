import { NextResponse } from "next/server";
import { getActorId, signInRequiredResponse } from "@/lib/auth";
import { jefferyReply, newThread } from "@/lib/jeffery";
import { readDb, updateDb } from "@/lib/storage";
import { v4 as uuid } from "uuid";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";

export async function GET() {
  const actor = await getActorId();
  if (!actor) return signInRequiredResponse();
  const { userId } = actor;
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
  const clinicalContext =
    typeof body.clinicalContext === "string"
      ? sanitizeText(body.clinicalContext, 6000)
      : "";

  const actor = await getActorId();
  if (!actor) return signInRequiredResponse();
  const { userId } = actor;
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

  // Prefer live Assessment story from client correlation blob when present
  let freeText = painProfile?.freeText;
  let pastMedicalHistory = painProfile?.pastMedicalHistory;
  let currentMedicalHistory = painProfile?.currentMedicalHistory;
  let sex = painProfile?.sex;
  let preferredName: string | undefined;
  if (clinicalContext) {
    const storyM = clinicalContext.match(/Assessment story:\s*([^\n]+(?:\n(?![A-Z][a-z]+:)[^\n]+)*)/i);
    if (storyM?.[1]) freeText = storyM[1].trim().slice(0, 2000);
    const pmhM = clinicalContext.match(/PMH:\s*([^\n]+)/i);
    if (pmhM?.[1]) pastMedicalHistory = pmhM[1].trim().slice(0, 500);
    const cmhM = clinicalContext.match(/Current Hx:\s*([^\n]+)/i);
    if (cmhM?.[1]) currentMedicalHistory = cmhM[1].trim().slice(0, 500);
    const sexM = clinicalContext.match(/Sex:\s*([^\n]+)/i);
    if (sexM?.[1]) sex = sexM[1].trim().slice(0, 40) as typeof sex;
    const nameM = clinicalContext.match(/Preferred name:\s*([^\n]+)/i);
    if (nameM?.[1]) preferredName = nameM[1].trim().slice(0, 40);
  }

  const reply = await jefferyReply(text, {
    routines,
    sessions,
    journal,
    thread,
    painDescriptorIds: painProfile?.descriptorIds,
    sex,
    pastMedicalHistory,
    currentMedicalHistory,
    freeText: freeText
      ? `${freeText}${clinicalContext ? `\n\n[Assessment Q&A context]\n${clinicalContext.slice(0, 2500)}` : ""}`
      : clinicalContext || undefined,
    preferredName,
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
