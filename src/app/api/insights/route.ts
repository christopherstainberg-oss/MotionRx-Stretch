import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { correlateInsights } from "@/lib/insights";
import { readDb } from "@/lib/storage";

export async function GET() {
  const user = await getSessionUser();
  const userId = user?.id ?? "local";
  const db = await readDb();
  const sessions = db.sessions.filter(
    (s) => s.userId === userId || s.userId === "local" || s.userId === "anonymous"
  );
  const journal = db.journal.filter(
    (j) => j.userId === userId || j.userId === "local" || j.userId === "anonymous"
  );
  const routines = db.routines.filter((r) => r.userId === userId || !r.userId);
  const goals = user?.goals ?? [];
  const jeffery = db.jefferyThreads.find((t) => t.userId === userId) ?? null;
  const insights = correlateInsights({ sessions, journal, routines, goals, jeffery });
  return NextResponse.json({ insights });
}
