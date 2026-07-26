import { NextResponse } from "next/server";
import { getActorId, getSessionUser, signInRequiredResponse } from "@/lib/auth";
import { correlateInsights } from "@/lib/insights";
import { readDb } from "@/lib/storage";

export async function GET() {
  const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
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
  const modalityPlans = db.modalityPlans
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);
  const modalityLogs = db.modalityLogs
    .filter((l) => l.userId === userId)
    .sort((a, b) => new Date(b.usedAt).getTime() - new Date(a.usedAt).getTime())
    .slice(0, 40);
  const insights = correlateInsights({
    sessions,
    journal,
    routines,
    goals,
    jeffery,
    painProfile: painHistory[0] ?? null,
    painHistory,
    modalityPlans,
    modalityLogs,
  });
  return NextResponse.json({
    insights,
    painProfile: painHistory[0] ?? null,
    modalityPlan: modalityPlans[0] ?? null,
  });
}
