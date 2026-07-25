import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/storage";
import type { Routine } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const db = await readDb();
  if (id) {
    const routine = db.routines.find((r) => r.id === id);
    return NextResponse.json({ routine: routine ?? null });
  }
  const user = await getSessionUser();
  const routines = user
    ? db.routines.filter((r) => r.userId === user.id || !r.userId)
    : db.routines.slice(-20);
  return NextResponse.json({ routines });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Routine | null;
  if (!body?.id || !body.stretchIds) {
    return NextResponse.json({ error: "Invalid routine" }, { status: 400 });
  }
  const user = await getSessionUser();
  const routine: Routine = {
    ...body,
    userId: user?.id ?? body.userId,
  };
  await updateDb((db) => {
    const idx = db.routines.findIndex((r) => r.id === routine.id);
    if (idx >= 0) db.routines[idx] = routine;
    else db.routines.push(routine);
  });
  return NextResponse.json({ routine });
}
