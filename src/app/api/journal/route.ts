import { NextResponse } from "next/server";
import { getActorId, ownsRecord } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/storage";
import type { JournalEntry } from "@/lib/types";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";

export async function GET() {
  const { userId } = await getActorId();
  const db = await readDb();
  const entries = db.journal
    .filter((j) => j.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const limited = rateLimit(`journal:${clientIp(req)}`, {
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as JournalEntry | null;
  if (!body?.id || !body.title) {
    return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
  }

  const { userId } = await getActorId();
  const entry: JournalEntry = {
    ...body,
    userId,
    title: sanitizeText(String(body.title), 160),
    body: sanitizeText(String(body.body || ""), 5000),
    flexibilityNote: body.flexibilityNote
      ? sanitizeText(body.flexibilityNote, 500)
      : undefined,
    painOverall: Math.max(0, Math.min(10, Number(body.painOverall) || 0)),
    mood: ([1, 2, 3, 4, 5].includes(Number(body.mood))
      ? Number(body.mood)
      : 3) as 1 | 2 | 3 | 4 | 5,
    sharedWithProvider: Boolean(body.sharedWithProvider),
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 20).map(String) : [],
    bodyParts: Array.isArray(body.bodyParts) ? body.bodyParts.slice(0, 15) : [],
    painDescriptorIds: Array.isArray(body.painDescriptorIds)
      ? body.painDescriptorIds.map(String).slice(0, 24)
      : [],
    modalityIds: Array.isArray(body.modalityIds)
      ? body.modalityIds.map(String).slice(0, 24)
      : undefined,
  };

  await updateDb((db) => {
    const existing = db.journal.find((j) => j.id === entry.id);
    if (existing && !ownsRecord(existing.userId, userId)) return;
    if (existing) {
      const i = db.journal.findIndex((j) => j.id === entry.id);
      db.journal[i] = entry;
    } else {
      db.journal.unshift(entry);
    }
  });
  return NextResponse.json({ entry });
}
