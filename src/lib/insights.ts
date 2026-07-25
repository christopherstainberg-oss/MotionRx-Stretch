import type {
  CorrelatedInsight,
  JournalEntry,
  Routine,
  SessionLog,
  Goal,
  JefferyThread,
  PainProfile,
  ModalityLog,
  ModalityPlan,
} from "@/lib/types";
import { getDescriptorsByIds, summarizeDescriptors } from "@/data/pain-descriptors";
import {
  getConditionsByIds,
  summarizeConditions,
} from "@/data/clinical-conditions";
import { getModalityById } from "@/data/modalities";
import { buildVisitModalityPlan } from "@/lib/modality-engine";
import { v4 as uuid } from "uuid";

export function correlateInsights(input: {
  sessions: SessionLog[];
  journal: JournalEntry[];
  routines: Routine[];
  goals: Goal[];
  jeffery?: JefferyThread | null;
  painProfile?: PainProfile | null;
  painHistory?: PainProfile[];
  modalityPlans?: ModalityPlan[];
  modalityLogs?: ModalityLog[];
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
      summary: `Most consistent descriptors: ${labels.join(", ")}. These appear across Assessment, sessions, journal, and/or Jeffery. Effective irritability boost ~${hints.effectivePainBoost.toFixed(1)}.`,
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

  // Clinical conditions from routines / profile
  const fromConditions = input.routines.flatMap((r) => r.generatedFrom?.conditionIds || []);
  const fromProfileConditions = input.painProfile?.conditionIds || [];
  const allCond = [...fromConditions, ...fromProfileConditions];
  const condFreq = new Map<string, number>();
  for (const id of allCond) condFreq.set(id, (condFreq.get(id) || 0) + 1);
  const topCond = Array.from(condFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);
  if (topCond.length) {
    const clabels = getConditionsByIds(topCond).map((c) => c.label);
    const ch = summarizeConditions(topCond);
    insights.push({
      id: uuid(),
      title: "Clinical conditions shaping your programs",
      summary: `Matched conditions: ${clabels.join(", ")}. Categories: ${ch.categories.slice(0, 4).join(", ")}. Sub-categories: ${ch.subcategories.slice(0, 4).join(", ")}. Irritability contribution ~${ch.effectivePainBoost.toFixed(1)}.`,
      severity: ch.clearanceRequired || ch.redFlags.length ? "caution" : "info",
      sources: ["routines", "pain", "descriptors"],
      recommendation: ch.clearanceRequired
        ? "Clearance-sensitive conditions detected—keep dosing conservative and follow your clinician protocol."
        : ch.biases.includes("neural-caution")
          ? "Neural caution is active—avoid aggressive end-range and favor controlled volume."
          : "Condition-matched biases are already influencing stretch/exercise mix and volume.",
      at: now,
    });
    if (ch.clinicalOutcomes.length) {
      insights.push({
        id: uuid(),
        title: "Evidence-informed outcomes linked to your conditions",
        summary: ch.clinicalOutcomes
          .slice(0, 4)
          .map((o) => `${o.label} (${o.timeframe})`)
          .join(" · "),
        severity: "positive",
        sources: ["routines", "goals", "pain"],
        recommendation: ch.clinicalOutcomes[0]
          ? `${ch.clinicalOutcomes[0].evidenceNote} Track: ${ch.clinicalOutcomes[0].measureHint}.`
          : "Track function weekly alongside pain scores.",
        at: now,
      });
    }
  }

  // Outcomes stored on latest personalized routine
  const outcomeRoutine = input.routines.find(
    (r) => (r.generatedFrom?.clinicalOutcomes || []).length > 0
  );
  if (outcomeRoutine?.generatedFrom?.clinicalOutcomes?.length) {
    const outs = outcomeRoutine.generatedFrom.clinicalOutcomes;
    insights.push({
      id: uuid(),
      title: `Outcomes for “${outcomeRoutine.name}”`,
      summary: `This routine is optimized toward: ${outs
        .slice(0, 5)
        .map((o) => o.label)
        .join("; ")}.`,
      severity: "info",
      sources: ["routines", "goals"],
      recommendation: outs[0]
        ? `Primary target — ${outs[0].label}: ${outs[0].evidenceNote}`
        : undefined,
      at: now,
    });
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
        summary: `Your latest session descriptors differ from your saved profile (${onlySession.length} new, ${onlyProfile.length} no longer selected). Recalibrate plans on Assessment when the story changes.`,
        severity: "info",
        sources: ["descriptors", "sessions", "pain"],
        recommendation: "Update Assessment descriptors and regenerate your plan if symptoms changed.",
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
      recommendation: "If descriptors change, regenerate on Assessment so the program stays matched.",
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

  // —— Modalities correlation ——
  const modPlans = input.modalityPlans || [];
  const modLogs = input.modalityLogs || [];
  const sessionModIds = completed.flatMap((s) => s.modalityIds || []);
  const journalModIds = input.journal.flatMap((j) => j.modalityIds || []);
  const planModIds = modPlans.flatMap((p) => [
    ...p.preVisit.map((m) => m.modalityId),
    ...p.postVisit.map((m) => m.modalityId),
  ]);
  const allModIds = [...sessionModIds, ...journalModIds, ...planModIds, ...modLogs.map((l) => l.modalityId)];
  const modFreq = new Map<string, number>();
  for (const id of allModIds) modFreq.set(id, (modFreq.get(id) || 0) + 1);
  const topMods = Array.from(modFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  if (modPlans.length || topMods.length) {
    const names = topMods
      .map((id) => getModalityById(id)?.name)
      .filter(Boolean)
      .slice(0, 4);
    const latestPlan = modPlans
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    insights.push({
      id: uuid(),
      title: "Modality plan linked to your pain data",
      summary: latestPlan
        ? `Latest modality plan (pain ~${latestPlan.painScore}/10) includes ${latestPlan.preVisit.length} pre-visit and ${latestPlan.postVisit.length} post-visit suggestions.${names.length ? ` Most referenced: ${names.join(", ")}.` : ""} ${latestPlan.narrative.slice(0, 180)}${latestPlan.narrative.length > 180 ? "…" : ""}`
        : `Modalities appear across sessions/journal: ${names.join(", ") || "several adjuncts"}.`,
      severity: latestPlan?.clinicalFlags.redFlags
        ? "action"
        : latestPlan?.clinicalFlags.highIrritability
          ? "caution"
          : "info",
      sources: ["modalities", "pain", "descriptors", "sessions"],
      recommendation: latestPlan?.clinicalFlags.stiffnessDominant
        ? "Stiffness-dominant pattern: prioritize heat/mobility prep pre-session; keep passive tools short and always bridge into active work."
        : latestPlan?.clinicalFlags.acuteIrritability
          ? "Higher irritability: favor short cold, pacing, traffic-light rules, and relative rest over aggressive passive work."
          : "Review pre-visit prep before appointments and log which modalities help on the Modalities page.",
      relatedModalityIds: topMods,
      relatedDescriptorIds: latestPlan?.descriptorIds?.slice(0, 8),
      at: now,
    });
  }

  const helpfulLogs = modLogs.filter((l) => l.helpful === true);
  const unhelpfulLogs = modLogs.filter((l) => l.helpful === false);
  if (helpfulLogs.length || unhelpfulLogs.length) {
    insights.push({
      id: uuid(),
      title: "What modalities helped you",
      summary: `You marked ${helpfulLogs.length} modality use(s) helpful and ${unhelpfulLogs.length} not helpful. This feedback should guide pre/post-visit choices.`,
      severity: helpfulLogs.length > unhelpfulLogs.length ? "positive" : "info",
      sources: ["modalities", "journal", "sessions"],
      recommendation:
        helpfulLogs.length > 0
          ? `Keep leaning on: ${helpfulLogs
              .slice(0, 3)
              .map((l) => getModalityById(l.modalityId)?.name || l.modalityId)
              .join(", ")}.`
          : "Log helpful/not helpful on modality cards so future suggestions personalize.",
      relatedModalityIds: [...helpfulLogs, ...unhelpfulLogs].map((l) => l.modalityId).slice(0, 8),
      at: now,
    });
  }

  // Live modality hint from current pain profile if no plan saved
  if (!modPlans.length && input.painProfile && (input.painProfile.overallPain >= 0 || input.painProfile.descriptorIds.length)) {
    const live = buildVisitModalityPlan({
      painScore: input.painProfile.overallPain,
      descriptorIds: input.painProfile.descriptorIds,
      experienceText: input.painProfile.freeText,
      recentSessions: completed.slice(0, 5),
      recentJournal: input.journal.slice(0, 5),
    });
    const topPre = live.preVisit[0];
    const topPost = live.postVisit[0];
    if (topPre || topPost) {
      insights.push({
        id: uuid(),
        title: "Suggested modalities from current pain profile",
        summary: [
          topPre ? `Pre-visit focus: ${topPre.name} — ${topPre.plainLanguage}` : "",
          topPost ? `Post-visit focus: ${topPost.name} — ${topPost.plainLanguage}` : "",
        ]
          .filter(Boolean)
          .join(" "),
        severity: "info",
        sources: ["modalities", "pain", "descriptors"],
        recommendation: "Open Modalities to generate and save a full pre/post-visit plan.",
        relatedModalityIds: [topPre?.modalityId, topPost?.modalityId].filter(Boolean) as string[],
        at: now,
      });
    }
  }

  if (!insights.length) {
    insights.push({
      id: uuid(),
      title: "Start correlating your story",
      summary:
        "Select clinical pain descriptors on Assessment, complete a session, journal, or talk with Jeffery—MotionRx Stretch weaves those signals into clinically styled insights.",
      severity: "info",
      sources: ["sessions", "journal", "goals", "jeffery", "descriptors"],
      recommendation: "Begin on Assessment: write concerns and choose pain descriptors.",
      at: now,
    });
  }

  return insights;
}
