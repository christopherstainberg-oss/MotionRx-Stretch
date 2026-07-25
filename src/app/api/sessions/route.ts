import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/storage";
import type { SessionLog } from "@/lib/types";

export async function GET() {
  const user = await getSessionUser();
  const db = await readDb();
  const sessions = user
    ? db.sessions.filter((s) => s.userId === user.id)
    : db.sessions.slice(-30);
  sessions.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  return NextResponse.json({ sessions });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SessionLog | null;
  if (!body?.id) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }
  const user = await getSessionUser();
  const session: SessionLog = {
    ...body,
    userId: user?.id ?? body.userId ?? "anonymous",
  };
  await updateDb((db) => {
    db.sessions.push(session);
  });
  return NextResponse.json({ session });
}
