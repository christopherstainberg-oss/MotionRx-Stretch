"use client";

import { useMemo, useState } from "react";
import {
  DESCRIPTOR_CATEGORY_LABELS,
  getDescriptorById,
  PAIN_DESCRIPTOR_STATS,
  searchPainDescriptors,
  type DescriptorCategory,
  type PainDescriptor,
} from "@/data/pain-descriptors";
import { cn } from "@/lib/utils";
import { AlertTriangle, Search, X } from "lucide-react";

const CATEGORIES = Object.keys(DESCRIPTOR_CATEGORY_LABELS) as DescriptorCategory[];

export function PainDescriptorPicker({
  value,
  onChange,
  maxSelect = 16,
  compact = false,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  maxSelect?: number;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DescriptorCategory | "all">("all");
  const [showExpanded, setShowExpanded] = useState(false);

  const selected = useMemo(() => {
    return value.map((id) => getDescriptorById(id)).filter(Boolean) as PainDescriptor[];
  }, [value]);

  const results = useMemo(() => {
    return searchPainDescriptors({
      query,
      category,
      limit: showExpanded ? 100 : 48,
      basesOnly: !showExpanded && !query,
    });
  }, [query, category, showExpanded]);

  const redFlags = selected.filter((d) => d.category === "red-flag-screen");

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else if (value.length < maxSelect) onChange([...value, id]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-semibold text-brand-900">Describe your pain</h2>
          <p className="text-sm text-brand-700/85">
            Choose clinical descriptors that match how it feels. Database:{" "}
            <strong>{PAIN_DESCRIPTOR_STATS.totalCount.toLocaleString()}</strong> entries (
            {PAIN_DESCRIPTOR_STATS.baseCount} core clinical bases). These adjust your stretch and
            exercise plan.
          </p>
        </div>
        <p className="text-xs font-medium text-brand-600">
          {value.length}/{maxSelect} selected
        </p>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => toggle(d.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-900"
            >
              {d.label}
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {redFlags.length > 0 && (
        <div
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
          role="alert"
        >
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Important safety notes
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {redFlags.map((d) => (
              <li key={d.id}>{d.redFlagEducation || d.plainLanguage}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            This app does not diagnose emergencies. Seek urgent care when red-flag symptoms apply.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
          <input
            className="input pl-9"
            placeholder="Search: burning, worse sitting, morning stiffness…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search pain descriptors"
          />
        </div>
        <select
          className="input sm:max-w-xs"
          value={category}
          onChange={(e) => setCategory(e.target.value as DescriptorCategory | "all")}
          aria-label="Descriptor category"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {DESCRIPTOR_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={cn("chip", !showExpanded && !query ? "ring-1 ring-brand-400" : "")}
          onClick={() => {
            setShowExpanded(false);
            setQuery("");
          }}
        >
          Core clinical list
        </button>
        <button
          type="button"
          className={cn("chip", showExpanded ? "ring-1 ring-brand-400" : "")}
          onClick={() => setShowExpanded(true)}
        >
          Browse expanded catalog
        </button>
      </div>

      <div
        className={cn(
          "grid gap-2 overflow-y-auto overscroll-contain sm:grid-cols-2",
          compact ? "max-h-64" : "max-h-[28rem]"
        )}
      >
        {results.map((d) => {
          const on = value.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => toggle(d.id)}
              className={cn(
                "rounded-2xl border p-3 text-left transition",
                on
                  ? "border-brand-500 bg-brand-50 shadow-sm"
                  : "border-brand-100 bg-white hover:border-brand-200 hover:bg-brand-50/40"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-brand-950">{d.label}</p>
                <span className="chip shrink-0">{DESCRIPTOR_CATEGORY_LABELS[d.category].split(" ")[0]}</span>
              </div>
              <p className="mt-1 text-xs font-medium text-brand-600">{d.clinicalTerm}</p>
              <p className="mt-1.5 text-sm leading-snug text-brand-800/90">{d.plainLanguage}</p>
              <p className="mt-1 text-[11px] text-brand-500">
                Easy words: {d.kidFriendly}
              </p>
            </button>
          );
        })}
        {results.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-brand-200 p-6 text-center text-sm text-brand-600">
            No descriptors match that search. Try “burning”, “sitting”, or “morning”.
          </p>
        )}
      </div>
    </div>
  );
}
