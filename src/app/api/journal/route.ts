import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/storage";
import type { JournalEntry } from "@/lib/types";

export async function GET() {
  const user = await getSessionUser();
  const db = await readDb();
  const entries = user
    ? db.journal.filter((j) => j.userId === user.id)
    : db.journal.slice(-20);
  entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as JournalEntry | null;
  if (!body?.id || !body.title) {
    return NextResponse.json({ error: "Invalid entry" }, { status: 400 });
  }
  const user = await getSessionUser();
  const entry: JournalEntry = {
    ...body,
    userId: user?.id ?? body.userId ?? "anonymous",
  };
  await updateDb((db) => {
    db.journal.unshift(entry);
  });
  return NextResponse.json({ entry });
}
