import type {
  CorrelatedInsight,
  JournalEntry,
  Routine,
  SessionLog,
  Goal,
  JefferyThread,
} from "@/lib/types";
import { v4 as uuid } from "uuid";

export function correlateInsights(input: {
  sessions: SessionLog[];
  journal: JournalEntry[];
  routines: Routine[];
  goals: Goal[];
  jeffery?: JefferyThread | null;
}): CorrelatedInsight[] {
  const insights: CorrelatedInsight[] = [];
  const now = new Date().toISOString();
  const completed = input.sessions.filter((s) => s.completed);

  if (completed.length >= 2) {
    const recent = completed.slice(0, 5);
    const avgDelta =
      recent.reduce((n, s) => n + (s.averagePainAfter - s.averagePainBefore), 0) /
      recent.length;
    insights.push({
      id: uuid(),
      title: avgDelta <= 0 ? "Sessions tend to leave you better" : "Pain rising after some sessions",
      summary:
        avgDelta <= 0
          ? `Across your last ${recent.length} sessions, average pain change is ${avgDelta.toFixed(1)} (after − before). That pattern supports current dosing.`
          : `Across your last ${recent.length} sessions, average pain change is +${avgDelta.toFixed(1)}. Consider regressing intensity or rotating aggravating movements.`,
      severity: avgDelta <= 0 ? "positive" : "caution",
      sources: ["sessions", "pain"],
      recommendation:
        avgDelta > 0
          ? "Open your routine → rotate suspect items or talk to Jeffery about flares."
          : "Keep consistency; small progressions are reasonable if effort still feels easy.",
      at: now,
    });
  }

  const journalPain = input.journal.slice(0, 5);
  if (journalPain.length) {
    const avgJ =
      journalPain.reduce((n, j) => n + j.painOverall, 0) / journalPain.length;
    const sessionAfter =
      completed.length === 0
        ? null
        : completed.slice(0, 5).reduce((n, s) => n + s.averagePainAfter, 0) /
          Math.min(5, completed.length);
    insights.push({
      id: uuid(),
      title: "Journal ↔ session pain correlation",
      summary:
        sessionAfter === null
          ? `Journal average pain is ${avgJ.toFixed(1)}/10. Log sessions to correlate practice with day-to-day symptoms.`
          : `Journal pain averages ${avgJ.toFixed(1)}/10 while post-session pain averages ${sessionAfter.toFixed(1)}/10. ${
              avgJ - sessionAfter >= 1.5
                ? "Daily symptoms run higher than post-session scores—recovery, sleep, or work load may matter as much as the routine."
                : "Day-to-day and post-session scores are relatively aligned."
            }`,
      severity: "info",
      sources: ["journal", "sessions", "pain"],
      recommendation: "Share high-pain journal entries with your provider if symptoms persist.",
      at: now,
    });
  }

  const jefferyAdjusts = input.routines.flatMap((r) =>
    r.selfAdjustHistory.filter((a) => a.source === "jeffery" || a.action === "jeffery")
  );
  if (jefferyAdjusts.length) {
    const last = jefferyAdjusts[jefferyAdjusts.length - 1]!;
    insights.push({
      id: uuid(),
      title: "Jeffery-linked program changes",
      summary: `Your plan includes ${jefferyAdjusts.length} Jeffery-informed adjustment(s). Latest: ${last.details}`,
      severity: "action",
      sources: ["jeffery", "routines"],
      recommendation: "Review the updated routine in Builder before your next session.",
      at: now,
    });
  }

  if (input.jeffery?.lastPainInsight !== undefined) {
    insights.push({
      id: uuid(),
      title: "Pain signal from Jeffery chat",
      summary: `Jeffery noted pain around ${input.jeffery.lastPainInsight}/10 in conversation—this should influence dosing decisions.`,
      severity: input.jeffery.lastPainInsight >= 6 ? "caution" : "info",
      sources: ["jeffery", "pain"],
      at: now,
    });
  }

  for (const g of input.goals.filter((x) => x.status === "active").slice(0, 3)) {
    const progress = g.current ?? 0;
    insights.push({
      id: uuid(),
      title: `Goal check-in: ${g.title}`,
      summary: `Metric “${g.metric}” · logged value ${progress}. Completed sessions so far: ${completed.length}.`,
      severity: progress > 0 ? "positive" : "info",
      sources: ["goals", "sessions"],
      recommendation: "Tie each session note to this goal in your journal for clearer trends.",
      at: now,
    });
  }

  const rotations = input.routines.reduce((n, r) => n + (r.rotationCount ?? 0), 0);
  if (rotations > 0) {
    insights.push({
      id: uuid(),
      title: "Routine variety",
      summary: `You've applied ${rotations} full-routine rotation(s). Variety can reduce overuse irritation while keeping regional focus.`,
      severity: "info",
      sources: ["routines"],
      at: now,
    });
  }

  if (!insights.length) {
    insights.push({
      id: uuid(),
      title: "Start correlating your story",
      summary:
        "Complete a session, write a journal entry, set a goal, or talk with Jeffery—MotionRx Stretch will weave those signals into clinically styled insights.",
      severity: "info",
      sources: ["sessions", "journal", "goals", "jeffery"],
      recommendation: "Begin with a short written concern on the Assess page.",
      at: now,
    });
  }

  return insights;
}
