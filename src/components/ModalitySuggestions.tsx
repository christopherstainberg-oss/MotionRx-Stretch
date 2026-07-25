"use client";

import { useState } from "react";
import Link from "next/link";
import { MODALITY_CATEGORY_LABELS, type ModalityCategory } from "@/data/modalities";
import type { ModalityPlan, ModalityRecommendation } from "@/lib/types";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Home,
  Hospital,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ConfidenceChip({ c }: { c: ModalityRecommendation["confidence"] }) {
  const styles =
    c === "high"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : c === "moderate"
        ? "bg-amber-50 text-amber-900 ring-amber-200"
        : "bg-slate-50 text-slate-700 ring-slate-200";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", styles)}>
      {c}
    </span>
  );
}

export function ModalityCard({
  rec,
  compact,
  onLog,
}: {
  rec: ModalityRecommendation;
  compact?: boolean;
  onLog?: (helpful: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [logged, setLogged] = useState<"up" | "down" | null>(null);
  const catLabel =
    MODALITY_CATEGORY_LABELS[rec.category as ModalityCategory] || rec.category;

  return (
    <article className="rounded-2xl border border-brand-100 bg-white p-3.5 shadow-sm sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-semibold text-brand-950">{rec.name}</h3>
            <ConfidenceChip c={rec.confidence} />
          </div>
          <p className="mt-1 text-sm text-brand-700/90">{rec.plainLanguage}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium text-brand-600">
            <span className="chip">{catLabel}</span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-50 px-2 py-0.5">
              {rec.homeSafe ? (
                <>
                  <Home className="h-3 w-3" /> Home-safe
                </>
              ) : (
                <>
                  <Hospital className="h-3 w-3" /> Clinic
                </>
              )}
            </span>
            {rec.durationMinutes && <span className="chip">{rec.durationMinutes} min</span>}
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost min-h-[40px] min-w-[40px] p-2"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {!compact && rec.reasons?.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-brand-600">
          {rec.reasons.slice(0, 3).map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-3 space-y-2 border-t border-brand-50 pt-3 text-sm text-brand-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">How to</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4">
              {rec.howTo.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              Evidence notes
            </p>
            <p className="mt-1 text-brand-700/90">{rec.evidenceNotes}</p>
          </div>
          {rec.precautions?.length > 0 && (
            <p className="text-xs text-amber-900">
              <strong>Precautions:</strong> {rec.precautions.join(" · ")}
            </p>
          )}
          {rec.contraindications?.length > 0 && (
            <p className="text-xs text-rose-800">
              <strong>Avoid if:</strong> {rec.contraindications.join(" · ")}
            </p>
          )}
          {rec.frequency && (
            <p className="text-xs text-brand-600">
              <strong>Frequency:</strong> {rec.frequency}
            </p>
          )}
        </div>
      )}

      {onLog && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-brand-600">Helpful?</span>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold",
              logged === "up"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-brand-100 text-brand-700"
            )}
            onClick={() => {
              setLogged("up");
              onLog(true);
            }}
          >
            <ThumbsUp className="h-3.5 w-3.5" /> Yes
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold",
              logged === "down"
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-brand-100 text-brand-700"
            )}
            onClick={() => {
              setLogged("down");
              onLog(false);
            }}
          >
            <ThumbsDown className="h-3.5 w-3.5" /> Not really
          </button>
          {logged && (
            <span className="inline-flex items-center gap-1 text-xs text-brand-600">
              <Check className="h-3.5 w-3.5 text-emerald-600" /> Logged
            </span>
          )}
        </div>
      )}
    </article>
  );
}

export function ModalityPlanPanels({
  plan,
  showLink,
  onLogModality,
}: {
  plan: ModalityPlan;
  showLink?: boolean;
  onLogModality?: (modalityId: string, timing: string, helpful: boolean) => void;
}) {
  const sections: Array<{
    key: string;
    title: string;
    blurb: string;
    items: ModalityRecommendation[];
  }> = [
    {
      key: "pre-visit",
      title: "Before your PT visit",
      blurb: "Prep logs, questions, and comfort strategies so the visit is productive.",
      items: plan.preVisit,
    },
    {
      key: "post-visit",
      title: "After your PT visit",
      blurb: "Home program support, flare plan, and recovery adjuncts from the visit day forward.",
      items: plan.postVisit,
    },
    {
      key: "pre-session",
      title: "Before a home session",
      blurb: "Warm-up and readiness modalities matched to your symptom pattern.",
      items: plan.preSession,
    },
    {
      key: "post-session",
      title: "After a home session",
      blurb: "Cool-down and symptom modulation based on your ratings.",
      items: plan.postSession,
    },
    {
      key: "acute-flare",
      title: "If symptoms flare",
      blurb: "Short-term calm-down options—still seek care for red flags.",
      items: plan.acuteFlare,
    },
    {
      key: "between-visits",
      title: "Between visits",
      blurb: "Day-to-day pacing, education, and supportive strategies.",
      items: plan.betweenVisits,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand-200 bg-brand-50/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-2">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-brand-950">Clinically informed suggestions</p>
            <p className="mt-1 text-sm leading-relaxed text-brand-800/90">{plan.narrative}</p>
            <p className="mt-2 text-xs text-brand-600">
              Pain ~{plan.painScore}/10
              {plan.effectivePain !== plan.painScore
                ? ` · descriptor-adjusted ~${plan.effectivePain.toFixed(1)}`
                : ""}{" "}
              · Educational adjuncts only—not a diagnosis or substitute for licensed care.
            </p>
            {plan.clinicalFlags && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {plan.clinicalFlags.stiffnessDominant && (
                  <span className="chip">Stiffness-dominant</span>
                )}
                {plan.clinicalFlags.acuteIrritability && (
                  <span className="chip">Higher irritability</span>
                )}
                {plan.clinicalFlags.inflammatoryPattern && (
                  <span className="chip">Swelling language</span>
                )}
                {plan.clinicalFlags.neurologicCaution && (
                  <span className="chip">Neural caution</span>
                )}
                {plan.clinicalFlags.postActivitySoreness && (
                  <span className="chip">Post-activity soreness</span>
                )}
                {plan.clinicalFlags.redFlags && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-900">
                    Screening flags
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {showLink && (
          <Link href="/modalities" className="btn-secondary mt-3 inline-flex text-sm">
            Open full modalities hub
          </Link>
        )}
      </div>

      {sections.map(
        (sec) =>
          sec.items.length > 0 && (
            <section key={sec.key}>
              <h2 className="text-lg font-bold text-brand-950">{sec.title}</h2>
              <p className="mt-0.5 text-sm text-brand-700/80">{sec.blurb}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {sec.items.map((rec) => (
                  <ModalityCard
                    key={`${sec.key}-${rec.modalityId}`}
                    rec={rec}
                    onLog={
                      onLogModality
                        ? (helpful) => onLogModality(rec.modalityId, rec.timing, helpful)
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )
      )}
    </div>
  );
}

export function ModalityMiniList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: ModalityRecommendation[];
  emptyText?: string;
}) {
  if (!items.length) {
    return emptyText ? (
      <p className="text-sm text-brand-600">{emptyText}</p>
    ) : null;
  }
  return (
    <div>
      <h3 className="text-sm font-bold text-brand-900">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.slice(0, 4).map((m) => (
          <li
            key={m.modalityId}
            className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm"
          >
            <p className="font-semibold text-brand-950">{m.name}</p>
            <p className="text-xs text-brand-600">{m.plainLanguage}</p>
            {m.reasons[0] && (
              <p className="mt-1 text-[11px] text-brand-500">Why: {m.reasons[0]}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
