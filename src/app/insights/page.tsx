"use client";

import { useEffect, useState } from "react";
import type { CorrelatedInsight } from "@/lib/types";
import { correlateInsights } from "@/lib/insights";
import type { JournalEntry, Routine, SessionLog, Goal } from "@/lib/types";
import { Network } from "lucide-react";
import Link from "next/link";

export default function InsightsPage() {
  const [insights, setInsights] = useState<CorrelatedInsight[]>([]);

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
    setInsights(correlateInsights({ sessions, journal, routines, goals }));

    fetch("/api/insights")
      .then((r) => r.json())
      .then((d) => {
        if (d.insights?.length) setInsights(d.insights);
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
          Sessions, pain, journal, goals, routine rotations, and Jeffery adjustments are analyzed
          together—similar to how an outpatient PT re-evaluates the whole picture, not one number
          alone.
        </p>
      </div>

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
