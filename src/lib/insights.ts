import type {
  CorrelatedInsight,
  JournalEntry,
  Routine,
  SessionLog,
  Goal,
  JefferyThread,
  PainProfile,
} from "@/lib/types";
import { getDescriptorsByIds, summarizeDescriptors } from "@/data/pain-descriptors";
import { v4 as uuid } from "uuid";

export function correlateInsights(input: {
  sessions: SessionLog[];
  journal: JournalEntry[];
  routines: Routine[];
  goals: Goal[];
  jeffery?: JefferyThread | null;
  painProfile?: PainProfile | null;
  painHistory?: PainProfile[];
}): CorrelatedInsight[] {
  const insights: CorrelatedInsight[] = [];
  const now = new Date().toISOString();
  const completed = input.sessions.filter((s) => s.completed);

  // —— Pain descriptors correlation ——
  const fromRoutines = input.routines.flatMap(
    (r) => r.generatedFrom?.painDescriptorIds || []
  );
  const fromSessions = completed.flatMap((s) => s.painDescriptorIds || []);
  const fromJournal = input.journal.flatMap((j) => j.painDescriptorIds || []);
  const fromProfile = input.painProfile?.descriptorIds || [];
  const fromJeffery = input.jeffery?.lastDescriptorIds || [];

  const allDesc = [...fromRoutines, ...fromSessions, ...fromJournal, ...fromProfile, ...fromJeffery];
  const freq = new Map<string, number>();
  for (const id of allDesc) freq.set(id, (freq.get(id) || 0) + 1);
  const topDesc = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  if (topDesc.length) {
    const labels = getDescriptorsByIds(topDesc).map((d) => d.label);
    const hints = summarizeDescriptors(topDesc);
    insights.push({
      id: uuid(),
      title: "Pain descriptors across your app data",
      summary: `Most consistent descriptors: ${labels.join(", ")}. These appear across assess, sessions, journal, and/or Jeffery. Effective irritability boost ~${hints.effectivePainBoost.toFixed(1)}.`,
      severity: hints.redFlags.length || hints.effectivePainBoost >= 2 ? "caution" : "info",
      sources: ["descriptors", "pain", "sessions", "journal", "routines"],
      recommendation: hints.biases.includes("defer-to-provider")
        ? "Screening descriptors suggest professional evaluation before progressing intensity."
        : hints.stretchBias > hints.exerciseBias
          ? "Your descriptors favor mobility-first programming—keep gentle mobility volume higher."
          : "Your descriptors support controlled strength/activation alongside mobility.",
      relatedDescriptorIds: topDesc,
      at: now,
    });

    if (hints.redFlags.length) {
      insights.push({
        id: uuid(),
        title: "Safety descriptors detected",
        summary: hints.redFlags.slice(0, 3).join(" "),
        severity: "action",
        sources: ["descriptors", "pain"],
        recommendation: "Do not self-progress aggressive plans. Seek appropriate medical/PT care.",
        relatedDescriptorIds: topDesc,
        at: now,
      });
    }
  }

  // Descriptor drift: profile vs latest session
  const latestSession = completed[0];
  if (input.painProfile?.descriptorIds?.length && latestSession?.painDescriptorIds?.length) {
    const profileSet = new Set(input.painProfile.descriptorIds);
    const sessionSet = new Set(latestSession.painDescriptorIds);
    const onlySession = latestSession.painDescriptorIds.filter((id) => !profileSet.has(id));
    const onlyProfile = input.painProfile.descriptorIds.filter((id) => !sessionSet.has(id));
    if (onlySession.length || onlyProfile.length) {
      insights.push({
        id: uuid(),
        title: "Descriptor pattern is shifting",
        summary: `Your latest session descriptors differ from your saved profile (${onlySession.length} new, ${onlyProfile.length} no longer selected). Recalibrate plans on Assess when the story changes.`,
        severity: "info",
        sources: ["descriptors", "sessions", "pain"],
        recommendation: "Update Assess descriptors and regenerate your plan if symptoms changed.",
        at: now,
      });
    }
  }

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
          ? "Open your routine → rotate suspect items, refine pain descriptors, or talk to Jeffery."
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
      recommendation: "Attach the same pain descriptors in journal and sessions for cleaner trends.",
      at: now,
    });
  }

  // Routines built with descriptors
  const descRoutines = input.routines.filter(
    (r) => (r.generatedFrom?.painDescriptorIds || []).length > 0
  );
  if (descRoutines.length) {
    const latest = descRoutines.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    )[0]!;
    insights.push({
      id: uuid(),
      title: "Plans linked to pain descriptors",
      summary: `${descRoutines.length} routine(s) were built using clinical descriptors. Latest: “${latest.name}” — ${(latest.generatedFrom?.descriptorSummary || []).slice(0, 4).join(", ") || "custom descriptors"}.`,
      severity: "positive",
      sources: ["routines", "descriptors"],
      recommendation: "If descriptors change, regenerate on Assess so the program stays matched.",
      relatedDescriptorIds: latest.generatedFrom?.painDescriptorIds,
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
        "Select clinical pain descriptors on Assess, complete a session, journal, or talk with Jeffery—MotionRx Stretch weaves those signals into clinically styled insights.",
      severity: "info",
      sources: ["sessions", "journal", "goals", "jeffery", "descriptors"],
      recommendation: "Begin on Assess: write concerns and choose pain descriptors.",
      at: now,
    });
  }

  return insights;
}
