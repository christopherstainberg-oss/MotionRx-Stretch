"use client";

import { useEffect, useState } from "react";
import type { CorrelatedInsight, ModalityPlan, PainProfile } from "@/lib/types";
import { correlateInsights } from "@/lib/insights";
import type { JournalEntry, Routine, SessionLog, Goal } from "@/lib/types";
import { loadLocalPainProfile } from "@/lib/pain-profile";
import { getDescriptorById } from "@/data/pain-descriptors";
import { getModalityById } from "@/data/modalities";
import { Network, Sparkles } from "lucide-react";
import Link from "next/link";
import { ClinicalCorrelationCard } from "@/components/ClinicalCorrelationCard";

export default function InsightsPage() {
  const [insights, setInsights] = useState<CorrelatedInsight[]>([]);
  const [painProfile, setPainProfile] = useState<PainProfile | null>(null);
  const [modalityPlan, setModalityPlan] = useState<ModalityPlan | null>(null);

  useEffect(() => {
    // Local correlation first (offline)
    const sessions: SessionLog[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("session:")) {
        try {
          sessions.push(JSON.parse(localStorage.getItem(key)!));
        } catch {
          /* skip */
        }
      }
    }
    const journal: JournalEntry[] = JSON.parse(localStorage.getItem("journal-entries") || "[]");
    const goals: Goal[] = JSON.parse(localStorage.getItem("goals") || "[]");
    let routines: Routine[] = [];
    const active = localStorage.getItem("active-routine");
    if (active) routines = [JSON.parse(active)];
    const localProfile = loadLocalPainProfile();
    let localModPlan: ModalityPlan | null = null;
    try {
      const raw = localStorage.getItem("modality-plan");
      if (raw) localModPlan = JSON.parse(raw) as ModalityPlan;
    } catch {
      localModPlan = null;
    }
    setPainProfile(localProfile);
    setModalityPlan(localModPlan);
    setInsights(
      correlateInsights({
        sessions,
        journal,
        routines,
        goals,
        painProfile: localProfile,
        modalityPlans: localModPlan ? [localModPlan] : [],
      })
    );

    fetch("/api/insights")
      .then((r) => r.json())
      .then((d) => {
        if (d.insights?.length) setInsights(d.insights);
        if (d.painProfile) setPainProfile(d.painProfile);
        if (d.modalityPlan) setModalityPlan(d.modalityPlan);
      })
      .catch(() => {});
  }, []);

  const color = {
    info: "border-brand-200 bg-white",
    positive: "border-emerald-200 bg-emerald-50/50",
    caution: "border-amber-200 bg-amber-50/50",
    action: "border-accent-400/40 bg-orange-50/40",
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-950">
          <Network className="h-7 w-7 text-brand-600" />
          Correlated insights
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-brand-700/85">
          Clinical pain descriptors, modalities, sessions, journal, goals, routines, and Jeffery
          are analyzed together—like an outpatient re-eval of the full story, not one number alone.
        </p>
      </div>

      <ClinicalCorrelationCard section="insights" />

      {painProfile && (painProfile.descriptorIds || []).length > 0 && (
        <section className="card border-brand-200 bg-brand-50/40 p-5">
          <h2 className="font-semibold text-brand-950">Current pain description profile</h2>
          <p className="mt-1 text-sm text-brand-700">
            Last updated {new Date(painProfile.updatedAt).toLocaleString()} · overall{" "}
            {painProfile.overallPain}/10 · source {painProfile.source}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {painProfile.descriptorIds.map((id) => (
              <span key={id} className="chip">
                {getDescriptorById(id)?.label || id}
              </span>
            ))}
          </div>
          <Link href="/assessment" className="btn-secondary mt-4 inline-flex text-xs">
            Update on Assessment
          </Link>
        </section>
      )}

      {modalityPlan && (
        <section className="card border-brand-200 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-brand-950">
            <Sparkles className="h-5 w-5 text-brand-600" />
            Linked modality plan
          </h2>
          <p className="mt-1 text-sm text-brand-700">
            Pain ~{modalityPlan.painScore}/10 · {modalityPlan.preVisit.length} pre-visit ·{" "}
            {modalityPlan.postVisit.length} post-visit suggestions
          </p>
          <p className="mt-2 text-sm text-brand-800/90 line-clamp-3">{modalityPlan.narrative}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[...modalityPlan.preVisit, ...modalityPlan.postVisit]
              .slice(0, 6)
              .map((m) => (
                <span key={m.modalityId} className="chip">
                  {m.name}
                </span>
              ))}
          </div>
          <Link href="/modalities" className="btn-secondary mt-4 inline-flex text-xs">
            Open modalities hub
          </Link>
        </section>
      )}

      <div className="grid gap-4">
        {insights.map((ins) => (
          <article key={ins.id} className={`card border p-5 ${color[ins.severity]}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-semibold text-brand-950">{ins.title}</h2>
              <span className="chip capitalize">{ins.severity}</span>
            </div>
            <p className="mt-2 text-sm text-brand-800">{ins.summary}</p>
            {ins.recommendation && (
              <p className="mt-2 text-sm font-medium text-brand-900">→ {ins.recommendation}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ins.sources.map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
              {(ins.relatedDescriptorIds || []).slice(0, 4).map((id) => (
                <span key={id} className="chip">
                  {getDescriptorById(id)?.label || id}
                </span>
              ))}
              {(ins.relatedModalityIds || []).slice(0, 4).map((id) => (
                <span key={id} className="chip">
                  {getModalityById(id)?.name || id}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/jeffery" className="btn-primary">
          Ask Jeffery
        </Link>
        <Link href="/progress" className="btn-secondary">
          Progress detail
        </Link>
        <Link href="/builder" className="btn-ghost">
          Adjust routine
        </Link>
      </div>
    </div>
  );
}
