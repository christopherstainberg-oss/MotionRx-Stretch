"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  correlateAcrossApp,
  type CrossSectionCorrelation,
} from "@/lib/clinical-context";
import {
  BookOpen,
  Bot,
  Briefcase,
  ListChecks,
  Moon,
  Sparkles,
  Stethoscope,
} from "lucide-react";

type Props = {
  /** Compact single-line vs full multi-insight card */
  variant?: "full" | "compact";
  className?: string;
  /** Which section is viewing (highlights related insight) */
  section?:
    | "home"
    | "journal"
    | "jeffery"
    | "routines"
    | "modalities"
    | "insights"
    | "assessment"
    | "sleep";
};

/**
 * Cross-section banner: Assessment story + Q&A correlated into the current page.
 */
export function ClinicalCorrelationCard({
  variant = "full",
  className = "",
  section,
}: Props) {
  const [data, setData] = useState<CrossSectionCorrelation | null>(null);

  useEffect(() => {
    let routine = null;
    try {
      const raw = localStorage.getItem("active-routine");
      if (raw) routine = JSON.parse(raw);
    } catch {
      routine = null;
    }
    setData(correlateAcrossApp({ routine }));
  }, []);

  if (!data) {
    return (
      <div className={`card p-4 text-sm text-brand-600 ${className}`}>
        Loading clinical correlation…
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2.5 text-xs text-brand-800 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-100 ${className}`}
      >
        {data.hasStory ? (
          <>
            <span className="font-semibold text-brand-900 dark:text-brand-50">
              Assessment linked
            </span>
            {" · "}
            <span className="line-clamp-2">{data.storySnippet}</span>
            {data.sleep?.hasData ? (
              <>
                {" · "}
                <span className="font-semibold text-sky-800 dark:text-sky-200">
                  Sleep PSQI {data.sleep.global}/21
                </span>
              </>
            ) : null}
            {" "}
            <Link href="/assessment" className="font-semibold text-brand-700 underline">
              Update story
            </Link>
            {" · "}
            <Link href="/sleep" className="font-semibold text-sky-700 underline">
              Sleep
            </Link>
          </>
        ) : (
          <>
            No Assessment story yet.{" "}
            <Link href="/assessment" className="font-semibold text-brand-700 underline">
              Add one
            </Link>{" "}
            so Plan, Journal, and Jeffery stay aligned.
            {data.sleep?.hasData ? (
              <>
                {" "}
                Sleep PSQI {data.sleep.global}/21 is already correlating recovery.
              </>
            ) : (
              <>
                {" "}
                <Link href="/sleep" className="font-semibold text-sky-700 underline">
                  Log Sleep PSQI
                </Link>{" "}
                to correlate recovery.
              </>
            )}
          </>
        )}
      </div>
    );
  }

  const icons: Record<string, typeof Stethoscope> = {
    "story-core": Stethoscope,
    "qa-latest": Sparkles,
    "plan-approach": ListChecks,
    "jeffery-bridge": Bot,
    "journal-bridge": BookOpen,
    "modality-safety": Sparkles,
    "generate-plan": ListChecks,
    "start-assess": Stethoscope,
    "sleep-core": Moon,
    "start-sleep": Moon,
    "sleep-modalities": Moon,
    "injury-timeline": Sparkles,
    "injury-timeline-missing": Sparkles,
    occupation: Briefcase,
    "occupation-missing": Briefcase,
  };

  return (
    <section className={`card space-y-3 p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            Cross-app correlation
          </p>
          <h2 className="text-base font-bold text-brand-950">
            {data.preferredName}&apos;s clinical thread
          </h2>
          <p className="mt-0.5 text-xs text-brand-600">
            Story, occupation, Q&amp;A, Sleep PSQI, history, and plan signals shared across
            sections
            {section ? ` · viewing ${section}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/assessment" className="btn-secondary text-xs">
            Assessment
          </Link>
          <Link href="/sleep" className="btn-secondary text-xs">
            Sleep
          </Link>
        </div>
      </div>

      {data.summaryLines.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {data.summaryLines.slice(0, 6).map((line) => (
            <li
              key={line}
              className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-800 dark:bg-brand-900 dark:text-brand-100"
            >
              {line}
            </li>
          ))}
        </ul>
      )}

      <ul className="space-y-2">
        {data.insights.slice(0, 5).map((ins) => {
          const Icon = icons[ins.id] || Stethoscope;
          return (
            <li key={ins.id}>
              <Link
                href={ins.href}
                className="flex gap-2.5 rounded-xl border border-brand-100 px-3 py-2.5 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-brand-800 dark:hover:bg-brand-900/40"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-950">{ins.title}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-brand-700 dark:text-brand-200">
                    {ins.body}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
