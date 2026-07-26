import { NextResponse } from "next/server";
import { getActorId, signInRequiredResponse } from "@/lib/auth";
import { readDb } from "@/lib/storage";
import { computeAnalytics } from "@/lib/analytics";

export async function GET() {
  try {
    const actor = await getActorId();
    if (!actor) return signInRequiredResponse();
    const { userId } = actor;
    const db = await readDb();
    const sessions = db.sessions.filter((s) => s.userId === userId);
    const journal = db.journal.filter((j) => j.userId === userId);
    const routines = db.routines.filter((r) => r.userId === userId);
    const painProfiles = db.painProfiles.filter((p) => p.userId === userId);
    const modalityLogs = db.modalityLogs.filter((l) => l.userId === userId);

    const analytics = computeAnalytics({
      sessions,
      journal,
      routines,
      painProfiles,
      modalityLogs,
    });

    return NextResponse.json({ analytics });
  } catch (e) {
    console.error("[analytics]", e);
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 500 });
  }
}
