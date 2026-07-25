import { NextResponse } from "next/server";
import { getActorId, getSessionUser } from "@/lib/auth";
import { correlateInsights } from "@/lib/insights";
import { readDb } from "@/lib/storage";

export async function GET() {
  const { userId } = await getActorId();
  const user = await getSessionUser();
  const db = await readDb();
  const sessions = db.sessions.filter((s) => s.userId === userId);
  const journal = db.journal.filter((j) => j.userId === userId);
  const routines = db.routines.filter((r) => r.userId === userId);
  const goals = user?.goals ?? [];
  const jeffery = db.jefferyThreads.find((t) => t.userId === userId) ?? null;
  const painHistory = db.painProfiles
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const insights = correlateInsights({
    sessions,
    journal,
    routines,
    goals,
    jeffery,
    painProfile: painHistory[0] ?? null,
    painHistory,
  });
  return NextResponse.json({ insights, painProfile: painHistory[0] ?? null });
}
