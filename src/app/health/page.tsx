"use client";

import { HeartPulse } from "lucide-react";
import { VitalsLabsPanel } from "@/components/VitalsLabsPanel";
import { ClinicalCorrelationCard } from "@/components/ClinicalCorrelationCard";
import { HomeTodaySection } from "@/components/HomeTodaySection";
import { useEffect, useState } from "react";
import { loadLocalPainProfile } from "@/lib/pain-profile";
import { buildSportLatePhaseProgram } from "@/lib/sport-late-phase";
import { getSportById } from "@/data/sports";
import Link from "next/link";

export default function HealthPage() {
  const [sex, setSex] = useState<string | null>(null);
  const [sportProgram, setSportProgram] = useState<ReturnType<
    typeof buildSportLatePhaseProgram
  > | null>(null);

  useEffect(() => {
    const p = loadLocalPainProfile();
    setSex(p?.sex || null);
    const prog = buildSportLatePhaseProgram({
      sportIds: p?.sportIds,
      irritability: "moderate",
      earlyPostOp: false,
    });
    setSportProgram(prog);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-950">
          <HeartPulse className="h-7 w-7 text-brand-600" />
          Health · vitals & labs
        </h1>
        <p className="mt-1 text-sm text-brand-700">
          Light vitals, multi-format lab uploads, and sport late-phase criteria — educational
          only, not diagnosis or emergency care.
        </p>
      </div>

      <HomeTodaySection />

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="text-base font-bold text-brand-950">Vitals & lab reports</h2>
        <VitalsLabsPanel sex={sex} />
      </section>

      {sportProgram && (
        <section className="card space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-brand-950">
                Sport late-phase program
              </h2>
              <p className="text-xs text-brand-600">
                {sportProgram.sportName} · {sportProgram.impact} impact ·{" "}
                {sportProgram.allowed ? "load blocks unlocked" : "base-focused"}
              </p>
            </div>
            <Link href="/assessment" className="text-xs font-semibold text-brand-700 underline">
              Edit sports in Assess
            </Link>
          </div>
          <p className="text-sm text-brand-700">{sportProgram.blockWhy}</p>
          <ol className="space-y-3">
            {sportProgram.blocks.map((b, i) => (
              <li
                key={b.id}
                className="rounded-xl border border-brand-100 bg-brand-50/40 p-3 dark:border-brand-800 dark:bg-brand-950/40"
              >
                <p className="text-sm font-semibold text-brand-950 dark:text-brand-50">
                  {i + 1}. {b.title}
                  <span className="ml-2 text-[11px] font-normal text-brand-500">
                    {b.weeksHint}
                  </span>
                </p>
                <p className="mt-1 text-xs text-brand-700">{b.focus}</p>
                <ul className="mt-2 list-inside list-disc text-xs text-brand-600">
                  {b.criteria.slice(0, 4).map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                {b.sessionNotes[0] && (
                  <p className="mt-2 text-[11px] text-brand-500">{b.sessionNotes[0]}</p>
                )}
              </li>
            ))}
          </ol>
          {sportProgram.criteriaChecklist.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                RTP-style checklist (education)
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-brand-700">
                {sportProgram.criteriaChecklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {(sportProgram.sportId && getSportById(sportProgram.sportId)?.rtpNote) && (
            <p className="text-xs text-brand-500">
              {getSportById(sportProgram.sportId)?.rtpNote}
            </p>
          )}
        </section>
      )}

      <ClinicalCorrelationCard section="insights" />

      <p className="text-center text-[11px] text-brand-500">
        Critical labs or chest pain / breathlessness / neurologic red flags need emergency or
        licensed care — MotionRx does not diagnose.
      </p>
    </div>
  );
}
