"use client";

import { useEffect, useMemo, useState } from "react";
import {
  OCCUPATION_CATEGORY_LABELS,
  OCCUPATION_EMPLOYMENT_LABELS,
  OCCUPATION_PHYSICAL_LOAD_LABELS,
  OCCUPATION_SENIORITY_LABELS,
  OCCUPATION_SETTING_LABELS,
  OCCUPATION_SHIFT_LABELS,
  OCCUPATION_STATS,
  buildOccupationParagraphSnippet,
  createCustomOccupationEntry,
  getBaseOccupation,
  matchOccupationsFromText,
  searchOccupations,
  userOccupationFromCatalog,
  type Occupation,
  type OccupationCategory,
  type OccupationEmployment,
  type OccupationSeniority,
  type OccupationSetting,
  type OccupationShift,
  type UserOccupationEntry,
} from "@/data/occupations";
import { cn } from "@/lib/utils";
import { Briefcase, Plus, Search, X } from "lucide-react";

const CATEGORIES = (
  Object.keys(OCCUPATION_CATEGORY_LABELS) as OccupationCategory[]
).filter((c) => c !== "unknown");

export function OccupationPicker({
  value,
  onChange,
  maxSelect = 3,
  concernParagraph = "",
  onInsertParagraph,
  compact = false,
}: {
  value: UserOccupationEntry[];
  onChange: (entries: UserOccupationEntry[]) => void;
  maxSelect?: number;
  concernParagraph?: string;
  onInsertParagraph?: (snippet: string) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<OccupationCategory | "all">("all");
  const [draft, setDraft] = useState<Occupation | null>(null);
  const [setting, setSetting] = useState<OccupationSetting | "">("");
  const [seniority, setSeniority] = useState<OccupationSeniority>("mid");
  const [employment, setEmployment] = useState<OccupationEmployment>("full-time");
  const [shift, setShift] = useState<OccupationShift>("day");
  const [hoursNote, setHoursNote] = useState("");
  const [notes, setNotes] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const textMatches = useMemo(
    () => matchOccupationsFromText(concernParagraph, 6),
    [concernParagraph]
  );

  const results = useMemo(
    () =>
      searchOccupations({
        query,
        category,
        basesOnly: true,
        limit: query.trim() ? 48 : 36,
      }),
    [query, category]
  );

  const draftBase = useMemo(
    () => (draft ? getBaseOccupation(draft.baseId || draft.id) : undefined),
    [draft]
  );

  useEffect(() => {
    if (!draft || !draftBase) return;
    setSetting(draftBase.commonSettings[0] || draft.setting || "office");
    setSeniority("mid");
    setEmployment("full-time");
    setShift("day");
  }, [draft, draftBase]);

  function addEntry() {
    if (!draft || !draftBase || value.length >= maxSelect) return;
    const settingVal = (setting ||
      draftBase.commonSettings[0] ||
      "mixed-sites") as OccupationSetting;
    const occ: Occupation = {
      ...draft,
      setting: settingVal,
      settingLabel: OCCUPATION_SETTING_LABELS[settingVal],
      seniority,
      seniorityLabel: OCCUPATION_SENIORITY_LABELS[seniority],
      employment,
      employmentLabel: OCCUPATION_EMPLOYMENT_LABELS[employment],
      shift,
      shiftLabel: OCCUPATION_SHIFT_LABELS[shift],
      isBase: false,
      displayTitle: [
        draftBase.title,
        OCCUPATION_SENIORITY_LABELS[seniority],
        OCCUPATION_SETTING_LABELS[settingVal],
        OCCUPATION_EMPLOYMENT_LABELS[employment],
        OCCUPATION_SHIFT_LABELS[shift],
      ].join(" · "),
      id: `${draftBase.id}__${settingVal}__${seniority}__${employment}__${shift}`,
    };
    const entry = userOccupationFromCatalog(occ, {
      hoursNote: hoursNote.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onChange([...value, entry]);
    setDraft(null);
    setQuery("");
    setHoursNote("");
    setNotes("");
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function addFromTextMatch(baseId: string) {
    if (value.length >= maxSelect) return;
    if (value.some((v) => v.baseId === baseId)) return;
    const base = getBaseOccupation(baseId);
    if (!base) return;
    const occ = searchOccupations({ query: base.title, basesOnly: true, limit: 1 })[0];
    if (!occ) return;
    onChange([...value, userOccupationFromCatalog(occ)]);
  }

  function addCustom() {
    if (!customTitle.trim() || value.length >= maxSelect) return;
    onChange([
      ...value,
      createCustomOccupationEntry(customTitle.trim(), {
        hoursNote: hoursNote.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    ]);
    setCustomTitle("");
    setShowCustom(false);
    setHoursNote("");
    setNotes("");
  }

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-brand-600">
        <Briefcase className="h-3.5 w-3.5" />
        <span>
          Catalog:{" "}
          <strong className="text-brand-800">
            {OCCUPATION_STATS.totalCount.toLocaleString()}
          </strong>{" "}
          editions · {OCCUPATION_STATS.baseCount.toLocaleString()} base titles
        </span>
      </div>

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((e, i) => (
            <li
              key={`${e.occupationId}-${i}`}
              className="flex items-start justify-between gap-2 rounded-lg border border-brand-100 bg-white px-3 py-2 text-sm dark:border-brand-800 dark:bg-brand-950"
            >
              <div>
                <p className="font-medium text-brand-950 dark:text-brand-50">
                  {e.displayTitle || e.title}
                </p>
                <p className="text-xs text-brand-600">
                  {e.categoryLabel}
                  {e.physicalLoad
                    ? ` · ${OCCUPATION_PHYSICAL_LOAD_LABELS[e.physicalLoad]}`
                    : ""}
                  {e.hoursNote ? ` · ${e.hoursNote}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="rounded p-1 text-brand-500 hover:bg-brand-50 hover:text-brand-800"
                onClick={() => removeAt(i)}
                aria-label="Remove occupation"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {textMatches.length > 0 && (
        <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-2 dark:border-sky-900 dark:bg-sky-950/30">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200">
            Detected in your story
          </p>
          <div className="flex flex-wrap gap-1.5">
            {textMatches.map((id) => {
              const b = getBaseOccupation(id);
              if (!b) return null;
              const already = value.some((v) => v.baseId === id);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={already || value.length >= maxSelect}
                  onClick={() => addFromTextMatch(id)}
                  className="rounded-full border border-sky-200 bg-white px-2.5 py-0.5 text-xs font-medium text-sky-900 disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100"
                >
                  {already ? "✓ " : "+ "}
                  {b.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {value.length < maxSelect && !draft && (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[12rem] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-brand-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 100,000 occupations…"
                className="w-full rounded-lg border border-brand-200 bg-white py-2 pl-8 pr-3 text-sm dark:border-brand-700 dark:bg-brand-950"
              />
            </div>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as OccupationCategory | "all")
              }
              className="rounded-lg border border-brand-200 bg-white px-2 py-2 text-sm dark:border-brand-700 dark:bg-brand-950"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {OCCUPATION_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-brand-100 dark:border-brand-800">
            {results.map((occ) => (
              <li key={occ.id}>
                <button
                  type="button"
                  onClick={() => setDraft(occ)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-900/40"
                >
                  <span className="font-medium text-brand-950 dark:text-brand-50">
                    {occ.title}
                  </span>
                  <span className="text-[11px] text-brand-600">
                    {occ.categoryLabel} · {occ.sector} · {occ.physicalLoadLabel}
                  </span>
                </button>
              </li>
            ))}
            {!results.length && (
              <li className="px-3 py-4 text-center text-xs text-brand-500">
                No matches — try another term or add custom.
              </li>
            )}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setShowCustom((s) => !s)}
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" />
              Custom title
            </button>
            {value.length > 0 && onInsertParagraph && (
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() =>
                  onInsertParagraph(buildOccupationParagraphSnippet(value))
                }
              >
                Add occupation to my story
              </button>
            )}
          </div>

          {showCustom && (
            <div className="flex flex-wrap gap-2 rounded-lg border border-brand-100 bg-brand-50/40 p-3 dark:border-brand-800">
              <input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Vintage bike restorer"
                className="min-w-[12rem] flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-950"
              />
              <button type="button" className="btn-primary text-xs" onClick={addCustom}>
                Add custom
              </button>
            </div>
          )}
        </>
      )}

      {draft && draftBase && (
        <div className="space-y-2 rounded-xl border border-brand-200 bg-white p-3 dark:border-brand-700 dark:bg-brand-950">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-brand-950 dark:text-brand-50">
                {draftBase.title}
              </p>
              <p className="text-xs text-brand-600">
                {OCCUPATION_CATEGORY_LABELS[draftBase.category]} ·{" "}
                {OCCUPATION_PHYSICAL_LOAD_LABELS[draftBase.physicalLoad]}
              </p>
              <p className="mt-1 text-xs text-brand-500">{draftBase.mskNotes}</p>
            </div>
            <button
              type="button"
              className="text-brand-500"
              onClick={() => setDraft(null)}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs">
              <span className="mb-0.5 block font-medium text-brand-700">Setting</span>
              <select
                value={setting}
                onChange={(e) => setSetting(e.target.value as OccupationSetting)}
                className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm dark:border-brand-700 dark:bg-brand-900"
              >
                {(draftBase.commonSettings.length
                  ? draftBase.commonSettings
                  : (Object.keys(OCCUPATION_SETTING_LABELS) as OccupationSetting[])
                ).map((s) => (
                  <option key={s} value={s}>
                    {OCCUPATION_SETTING_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="mb-0.5 block font-medium text-brand-700">Seniority</span>
              <select
                value={seniority}
                onChange={(e) =>
                  setSeniority(e.target.value as OccupationSeniority)
                }
                className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm dark:border-brand-700 dark:bg-brand-900"
              >
                {(Object.keys(OCCUPATION_SENIORITY_LABELS) as OccupationSeniority[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {OCCUPATION_SENIORITY_LABELS[s]}
                    </option>
                  )
                )}
              </select>
            </label>
            <label className="text-xs">
              <span className="mb-0.5 block font-medium text-brand-700">Employment</span>
              <select
                value={employment}
                onChange={(e) =>
                  setEmployment(e.target.value as OccupationEmployment)
                }
                className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm dark:border-brand-700 dark:bg-brand-900"
              >
                {(
                  Object.keys(OCCUPATION_EMPLOYMENT_LABELS) as OccupationEmployment[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {OCCUPATION_EMPLOYMENT_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              <span className="mb-0.5 block font-medium text-brand-700">Shift</span>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as OccupationShift)}
                className="w-full rounded-lg border border-brand-200 px-2 py-1.5 text-sm dark:border-brand-700 dark:bg-brand-900"
              >
                {(Object.keys(OCCUPATION_SHIFT_LABELS) as OccupationShift[]).map((s) => (
                  <option key={s} value={s}>
                    {OCCUPATION_SHIFT_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <input
            value={hoursNote}
            onChange={(e) => setHoursNote(e.target.value)}
            placeholder="Hours note (e.g. 40 hrs/week, 12h shifts)"
            className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-900"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes (desk setup, lift demands…)"
            className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-900"
          />
          <button type="button" className="btn-primary text-sm" onClick={addEntry}>
            Add occupation
          </button>
        </div>
      )}
    </div>
  );
}
