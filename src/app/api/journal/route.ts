import { NextResponse } from "next/server";
import { getActorId, ownsRecord, signInRequiredResponse } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/storage";
import type { JournalEntry } from "@/lib/types";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk } from "@/lib/security";

export async function GET() {
  const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
  const db = await readDb();
  const entries = db.journal
    .filter((j) => j.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!contentLengthOk(req, 64_000)) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
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

  const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
  const clamp15 = (n: unknown, fallback: 1 | 2 | 3 | 4 | 5 = 3): 1 | 2 | 3 | 4 | 5 =>
    ([1, 2, 3, 4, 5].includes(Number(n)) ? Number(n) : fallback) as 1 | 2 | 3 | 4 | 5;

  const signal = ["progress", "maintain", "regress", "flare"].includes(
    String(body.progressionSignal)
  )
    ? (body.progressionSignal as JournalEntry["progressionSignal"])
    : undefined;

  const entry: JournalEntry = {
    ...body,
    userId,
    title: sanitizeText(String(body.title), 160),
    body: sanitizeText(String(body.body || ""), 8000),
    flexibilityNote: body.flexibilityNote
      ? sanitizeText(body.flexibilityNote, 500)
      : undefined,
    didWell: body.didWell ? sanitizeText(String(body.didWell), 800) : undefined,
    improveNext: body.improveNext ? sanitizeText(String(body.improveNext), 800) : undefined,
    painOverall: Math.max(0, Math.min(10, Number(body.painOverall) || 0)),
    mood: clamp15(body.mood),
    energy: body.energy != null ? clamp15(body.energy) : undefined,
    sleepQuality: body.sleepQuality != null ? clamp15(body.sleepQuality) : undefined,
    sessionCompleted: Boolean(body.sessionCompleted),
    sharedWithProvider: Boolean(body.sharedWithProvider),
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 24).map(String) : [],
    bodyParts: Array.isArray(body.bodyParts) ? body.bodyParts.slice(0, 15) : [],
    painDescriptorIds: Array.isArray(body.painDescriptorIds)
      ? body.painDescriptorIds.map(String).slice(0, 24)
      : [],
    clinicalSymptomIds: Array.isArray(body.clinicalSymptomIds)
      ? body.clinicalSymptomIds.map(String).slice(0, 24)
      : undefined,
    adlEntries: Array.isArray(body.adlEntries)
      ? body.adlEntries.slice(0, 24).map((raw) => {
          const a = raw as {
            adlId?: string;
            label?: string;
            domain?: string;
            assistance?: string;
            notes?: string;
          };
          return {
            adlId: String(a.adlId || "").slice(0, 80),
            label: sanitizeText(String(a.label || ""), 120),
            domain: String(a.domain || "self-care").slice(
              0,
              40
            ) as import("@/data/adls").UserAdlEntry["domain"],
            assistance: String(a.assistance || "independent").slice(
              0,
              40
            ) as import("@/data/adls").UserAdlEntry["assistance"],
            notes: a.notes ? sanitizeText(String(a.notes), 200) : undefined,
          };
        })
      : undefined,
    modalityIds: Array.isArray(body.modalityIds)
      ? body.modalityIds.map(String).slice(0, 24)
      : undefined,
    progressionSignal: signal,
    jefferySummary: body.jefferySummary
      ? sanitizeText(String(body.jefferySummary), 2000)
      : undefined,
    jefferyQuestion: body.jefferyQuestion
      ? sanitizeText(String(body.jefferyQuestion), 500)
      : undefined,
    winsSuggested: Array.isArray(body.winsSuggested)
      ? body.winsSuggested.map((s) => sanitizeText(String(s), 300)).slice(0, 6)
      : undefined,
    improvementsSuggested: Array.isArray(body.improvementsSuggested)
      ? body.improvementsSuggested.map((s) => sanitizeText(String(s), 300)).slice(0, 6)
      : undefined,
    planAdjusted: Boolean(body.planAdjusted),
    planAdjustmentNote: body.planAdjustmentNote
      ? sanitizeText(String(body.planAdjustmentNote), 500)
      : undefined,
    promptId: body.promptId ? sanitizeText(String(body.promptId), 80) : undefined,
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
