"use client";

import { useMemo, useState } from "react";
import {
  CLINICAL_SYMPTOMS,
  SYMPTOM_CATEGORY_LABELS,
  buildSymptomParagraphSnippet,
  getClinicalSymptomById,
  matchSymptomsFromText,
  suggestSymptomsFromFindings,
  summarizeClinicalSymptoms,
  type ClinicalSymptom,
  type SymptomCategory,
} from "@/data/clinical-symptoms";
import type { BodyPart } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Lightbulb, Plus } from "lucide-react";

export function ClinicalSymptomPicker({
  value,
  onChange,
  areas = [],
  concernParagraph = "",
  maxSelect = 16,
  onInsertParagraph,
  compact = false,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  areas?: BodyPart[];
  concernParagraph?: string;
  maxSelect?: number;
  onInsertParagraph?: (snippet: string) => void;
  compact?: boolean;
}) {
  const [category, setCategory] = useState<SymptomCategory | "all" | "suggested">("suggested");
  const [query, setQuery] = useState("");

  const suggested = useMemo(
    () => suggestSymptomsFromFindings({ areas, concernParagraph, limit: 10 }),
    [areas, concernParagraph]
  );

  const autoFromText = useMemo(
    () => matchSymptomsFromText(concernParagraph, 8),
    [concernParagraph]
  );

  const summary = useMemo(() => summarizeClinicalSymptoms(value), [value]);

  const list: ClinicalSymptom[] = useMemo(() => {
    let base: ClinicalSymptom[] =
      category === "suggested"
        ? suggested
        : category === "all"
          ? CLINICAL_SYMPTOMS.filter((s) => !s.redFlag)
          : CLINICAL_SYMPTOMS.filter((s) => s.category === category);

    // Always allow browsing red flags in their category
    if (category === "red-flag-screen") {
      base = CLINICAL_SYMPTOMS.filter((s) => s.category === "red-flag-screen");
    }

    const q = query.trim().toLowerCase();
    if (q) {
      base = CLINICAL_SYMPTOMS.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.plainLanguage.toLowerCase().includes(q) ||
          s.searchTerms.some((t) => t.includes(q))
      );
    }
    return base;
  }, [category, suggested, query]);

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else if (value.length < maxSelect) onChange([...value, id]);
  }

  function applyTextMatches() {
    onChange(Array.from(new Set([...value, ...autoFromText])).slice(0, maxSelect));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-xs text-brand-500">
          Select clinically significant symptoms. These change routine dosing, safety caps, and
          coaching tips—same rules apply in Journal.
        </p>
        <div className="flex flex-wrap gap-2">
          {autoFromText.length > 0 && (
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={applyTextMatches}>
              Apply {autoFromText.length} from story
            </button>
          )}
          {value.length > 0 && onInsertParagraph && (
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => onInsertParagraph(buildSymptomParagraphSnippet(value))}
            >
              <Plus className="h-3.5 w-3.5" />
              Add symptoms to my story
            </button>
          )}
        </div>
      </div>

      <input
        className="input text-sm"
        placeholder="Search symptoms…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["suggested", "Suggested"],
            ["all", "Common MSK"],
            ...Object.entries(SYMPTOM_CATEGORY_LABELS),
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setCategory(id as SymptomCategory | "all" | "suggested");
              setQuery("");
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              category === id
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-brand-200 text-brand-700 dark:border-brand-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const s = getClinicalSymptomById(id);
            if (!s) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold",
                  s.redFlag
                    ? "border-rose-400 bg-rose-50 text-rose-900"
                    : "border-brand-300 bg-brand-100 text-brand-900"
                )}
              >
                {s.label} ×
              </button>
            );
          })}
        </div>
      )}

      {summary.redFlags.length > 0 && (
        <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-50">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p>
            <strong>Urgent screen selected:</strong> {summary.redFlags.join("; ")}. This app will
            cap your plan and urge medical review—not a substitute for emergency care.
          </p>
        </div>
      )}

      <div className={cn("space-y-1.5 overflow-y-auto pr-0.5", compact ? "max-h-52" : "max-h-72")}>
        {list.map((sx) => {
          const on = value.includes(sx.id);
          return (
            <label
              key={sx.id}
              className={cn(
                "flex cursor-pointer gap-2.5 rounded-xl border px-3 py-2.5 transition",
                on
                  ? sx.redFlag
                    ? "border-rose-400 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40"
                    : "border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-900/40"
                  : "border-brand-100 dark:border-brand-800"
              )}
            >
              <input
                type="checkbox"
                className="mt-1 accent-brand-600"
                checked={on}
                onChange={() => toggle(sx.id)}
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-950">
                  {sx.label}
                  {sx.redFlag && (
                    <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      SCREEN
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-brand-600">{sx.plainLanguage}</span>
                {on && (
                  <span className="mt-1 block text-[11px] leading-relaxed text-brand-700">
                    {sx.evidenceNote}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {summary.suggestions.length > 0 && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3 dark:border-brand-700 dark:bg-brand-950/50">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-900">
            <Lightbulb className="h-3.5 w-3.5 text-brand-600" />
            Suggestions based on your symptoms
          </p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-brand-800 dark:text-brand-100">
            {summary.suggestions.slice(0, 6).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
