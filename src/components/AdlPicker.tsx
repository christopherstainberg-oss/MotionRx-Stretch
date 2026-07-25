"use client";

import { useMemo, useState } from "react";
import {
  ADL_ASSISTANCE_LABELS,
  ADL_CATALOG,
  ADL_DOMAIN_LABELS,
  buildAdlParagraphSnippet,
  suggestAdlsFromFindings,
  type AdlAssistanceLevel,
  type AdlDomain,
  type AdlItem,
  type UserAdlEntry,
} from "@/data/adls";
import type { BodyPart } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Home, Lightbulb, Plus } from "lucide-react";

const LEVELS = Object.keys(ADL_ASSISTANCE_LABELS) as AdlAssistanceLevel[];

export function AdlPicker({
  value,
  onChange,
  areas = [],
  painLevels = {},
  assistiveDeviceIds = [],
  concernParagraph = "",
  onInsertParagraph,
}: {
  value: UserAdlEntry[];
  onChange: (entries: UserAdlEntry[]) => void;
  areas?: BodyPart[];
  painLevels?: Partial<Record<BodyPart, number>>;
  assistiveDeviceIds?: string[];
  concernParagraph?: string;
  onInsertParagraph?: (snippet: string) => void;
}) {
  const [domain, setDomain] = useState<AdlDomain | "all" | "suggested">("suggested");
  const [showAll, setShowAll] = useState(false);

  const suggested = useMemo(
    () =>
      suggestAdlsFromFindings({
        areas,
        painLevels,
        assistiveDeviceIds,
        concernParagraph,
        limit: 8,
      }),
    [areas, painLevels, assistiveDeviceIds, concernParagraph]
  );

  const list: AdlItem[] = useMemo(() => {
    if (domain === "suggested") return suggested;
    if (domain === "all") return ADL_CATALOG;
    return ADL_CATALOG.filter((a) => a.domain === domain);
  }, [domain, suggested]);

  function upsert(adl: AdlItem, assistance: AdlAssistanceLevel) {
    const existing = value.find((v) => v.adlId === adl.id);
    if (existing) {
      onChange(
        value.map((v) => (v.adlId === adl.id ? { ...v, assistance, label: adl.label, domain: adl.domain } : v))
      );
    } else {
      onChange([
        ...value,
        { adlId: adl.id, label: adl.label, domain: adl.domain, assistance },
      ]);
    }
  }

  function remove(id: string) {
    onChange(value.filter((v) => v.adlId !== id));
  }

  const tips = useMemo(() => {
    const out: string[] = [];
    for (const e of value) {
      const item = ADL_CATALOG.find((a) => a.id === e.adlId);
      if (item && e.assistance !== "independent") out.push(...item.coachingTips.slice(0, 1));
    }
    for (const s of suggested.slice(0, 3)) {
      if (!value.some((v) => v.adlId === s.id)) out.push(s.coachingTips[0]!);
    }
    return Array.from(new Set(out)).slice(0, 5);
  }, [value, suggested]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-xs text-brand-500">
          Rate how you manage daily activities. Limited ADLs and devices shape a safer, more functional
          home program (seated options, balance, shorter volume).
        </p>
        {value.length > 0 && onInsertParagraph && (
          <button
            type="button"
            className="btn-secondary py-1.5 text-xs"
            onClick={() => onInsertParagraph(buildAdlParagraphSnippet(value))}
          >
            <Plus className="h-3.5 w-3.5" />
            Add ADLs to my story
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["suggested", "Suggested for you"],
            ["all", "All ADLs"],
            ...Object.entries(ADL_DOMAIN_LABELS).map(([k, v]) => [k, v] as const),
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setDomain(id as AdlDomain | "all" | "suggested")}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              domain === id
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-brand-200 text-brand-700 dark:border-brand-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {value.length > 0 && (
        <ul className="space-y-1.5 rounded-xl border border-brand-100 bg-brand-50/40 p-2.5 dark:border-brand-800 dark:bg-brand-950/40">
          {value.map((e) => (
            <li key={e.adlId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-brand-900">
                {e.label}{" "}
                <span className="text-xs font-normal text-brand-600">
                  · {ADL_ASSISTANCE_LABELS[e.assistance]}
                </span>
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-brand-600 hover:underline"
                onClick={() => remove(e.adlId)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5">
        {(showAll ? list : list.slice(0, 8)).map((adl) => {
          const selected = value.find((v) => v.adlId === adl.id);
          const reason =
            domain === "suggested"
              ? (suggested.find((s) => s.id === adl.id) as { reason?: string } | undefined)?.reason
              : undefined;
          return (
            <div
              key={adl.id}
              className={cn(
                "rounded-xl border p-3",
                selected
                  ? "border-brand-400 bg-brand-50/60 dark:border-brand-600 dark:bg-brand-900/40"
                  : "border-brand-100 dark:border-brand-800"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-950">{adl.label}</p>
                  <p className="text-[11px] text-brand-500">{ADL_DOMAIN_LABELS[adl.domain]}</p>
                  <p className="mt-1 text-xs text-brand-700">{adl.plainLanguage}</p>
                  {reason && (
                    <p className="mt-1 text-[11px] font-medium text-brand-600">Why suggested: {reason}</p>
                  )}
                </div>
              </div>
              <label className="mt-2 block text-xs">
                <span className="label text-[11px]">Assistance level</span>
                <select
                  className="input py-1.5 text-sm"
                  value={selected?.assistance || ""}
                  onChange={(e) => {
                    const v = e.target.value as AdlAssistanceLevel;
                    if (!v) remove(adl.id);
                    else upsert(adl, v);
                  }}
                >
                  <option value="">Not rated</option>
                  {LEVELS.map((lv) => (
                    <option key={lv} value={lv}>
                      {ADL_ASSISTANCE_LABELS[lv]}
                    </option>
                  ))}
                </select>
              </label>
              {selected && selected.assistance !== "independent" && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-brand-600">
                  {adl.evidenceNote}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {list.length > 8 && (
        <button
          type="button"
          className="text-xs font-semibold text-brand-700 hover:underline"
          onClick={() => setShowAll((s) => !s)}
        >
          {showAll ? "Show fewer" : `Show all ${list.length}`}
        </button>
      )}

      {tips.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-950 dark:text-amber-100">
            <Lightbulb className="h-3.5 w-3.5" />
            Evidence-based ADL tips for you
          </p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-amber-950 dark:text-amber-50">
            {tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-200">
            <Home className="h-3 w-3" />
            Limited ADLs bias your routine toward safer home-friendly options.
          </p>
        </div>
      )}
    </div>
  );
}
