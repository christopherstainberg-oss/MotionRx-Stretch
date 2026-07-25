"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MEDICATION_CLASS_LABELS,
  MEDICATION_FREQUENCY_OPTIONS,
  MEDICATION_ROUTE_LABELS,
  MEDICATION_STATS,
  buildMedicationParagraphSnippet,
  createCustomMedicationEntry,
  getBaseMedication,
  matchMedicationsFromText,
  medicationEntriesFromBaseIds,
  searchMedications,
  type Medication,
  type MedicationClass,
  type MedicationRoute,
  type UserMedicationEntry,
} from "@/data/medications";
import { cn } from "@/lib/utils";
import { Pill, Plus, Search, X } from "lucide-react";

const CLASSES = Object.keys(MEDICATION_CLASS_LABELS) as MedicationClass[];

export function MedicationPicker({
  value,
  onChange,
  maxSelect = 20,
  concernParagraph = "",
  onInsertParagraph,
  compact = false,
}: {
  value: UserMedicationEntry[];
  onChange: (entries: UserMedicationEntry[]) => void;
  maxSelect?: number;
  /** Assessment story text — used to detect mentioned meds */
  concernParagraph?: string;
  /** Append listed meds + doses into the Assessment paragraph */
  onInsertParagraph?: (snippet: string) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState<MedicationClass | "all">("all");
  const [draft, setDraft] = useState<Medication | null>(null);
  const [strength, setStrength] = useState("");
  const [route, setRoute] = useState<MedicationRoute | "">("");
  const [doseText, setDoseText] = useState("1 tablet");
  const [frequency, setFrequency] = useState<string>("once daily");
  const [asNeeded, setAsNeeded] = useState(false);
  const [notes, setNotes] = useState("");
  const [customName, setCustomName] = useState("");
  const [customStrength, setCustomStrength] = useState("");
  const [customDose, setCustomDose] = useState("1 tablet");
  const [customFreq, setCustomFreq] = useState("once daily");
  const [showCustom, setShowCustom] = useState(false);

  const textMatches = useMemo(
    () => matchMedicationsFromText(concernParagraph, 8),
    [concernParagraph]
  );

  const results = useMemo(
    () =>
      searchMedications({
        query,
        classId,
        basesOnly: true,
        limit: query.trim() ? 48 : 36,
      }),
    [query, classId]
  );

  const draftBase = useMemo(
    () => (draft ? getBaseMedication(draft.baseId || draft.id) : undefined),
    [draft]
  );

  useEffect(() => {
    if (!draft || !draftBase) return;
    setStrength(draftBase.commonStrengths[0] || draft.strength || "as labeled");
    setRoute(draftBase.defaultRoute || draft.route);
    setDoseText(
      draft.routeCategory === "inhaled"
        ? "1–2 puffs"
        : draft.routeCategory === "injectable"
          ? "as labeled"
          : "1 tablet"
    );
  }, [draft, draftBase]);

  function addEntry() {
    if (!draft || !draftBase || !strength || !route) return;
    if (value.length >= maxSelect) return;

    const entry: UserMedicationEntry = {
      medicationId: `${draftBase.id}__${strength.replace(/\s+/g, "-").slice(0, 40)}__${route}`,
      genericName: draftBase.genericName,
      brandName: draftBase.brandNames[0],
      strength,
      route: route as MedicationRoute,
      routeLabel: MEDICATION_ROUTE_LABELS[route as MedicationRoute] || route,
      doseText: doseText.trim() || "as labeled",
      frequency: asNeeded ? "as needed (PRN)" : frequency,
      asNeeded,
      notes: notes.trim() || undefined,
      primaryUse: draftBase.primaryUse,
      classLabel: MEDICATION_CLASS_LABELS[draftBase.classId],
    };

    onChange([...value, entry]);
    setDraft(null);
    setQuery("");
    setNotes("");
    setAsNeeded(false);
    setFrequency("once daily");
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function applyTextMatches() {
    const drafts = medicationEntriesFromBaseIds(textMatches, value);
    if (!drafts.length) return;
    onChange([...value, ...drafts].slice(0, maxSelect));
  }

  function addCustom() {
    const entry = createCustomMedicationEntry({
      name: customName,
      strength: customStrength || undefined,
      doseText: customDose,
      frequency: customFreq,
      route: "oral-tablet",
    });
    if (!entry || value.length >= maxSelect) return;
    onChange([...value, entry]);
    setCustomName("");
    setCustomStrength("");
    setCustomDose("1 tablet");
    setCustomFreq("once daily");
    setShowCustom(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-950">
            <Pill className="h-4 w-4 text-brand-600" />
            Current medications & doses
          </h3>
          <p className="mt-0.5 text-xs text-brand-500">
            Search the clinical library (
            <strong>{MEDICATION_STATS.totalCount.toLocaleString()}</strong> entries) or add a
            custom med. Set strength, dose, route, and frequency—then optionally add them to your
            Assessment story.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {textMatches.length > 0 && (
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={applyTextMatches}>
              Apply {textMatches.length} from story
            </button>
          )}
          {value.length > 0 && onInsertParagraph && (
            <button
              type="button"
              className="btn-secondary py-1.5 text-xs"
              onClick={() => onInsertParagraph(buildMedicationParagraphSnippet(value))}
            >
              <Plus className="h-3.5 w-3.5" />
              Add meds to my story
            </button>
          )}
          <p className="text-xs font-medium text-brand-600">
            {value.length}/{maxSelect} listed
          </p>
        </div>
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((e, i) => (
            <li
              key={`${e.medicationId}-${i}`}
              className="flex items-start justify-between gap-2 rounded-xl border border-brand-100 bg-brand-50/40 px-3 py-2.5 dark:border-brand-800 dark:bg-brand-950/40"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-950">
                  {e.genericName}
                  {e.brandName ? (
                    <span className="font-normal text-brand-500"> ({e.brandName})</span>
                  ) : null}
                </p>
                <p className="text-xs text-brand-700">
                  {e.strength} · {e.routeLabel} · {e.doseText} · {e.frequency}
                </p>
                {e.primaryUse && (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-brand-500">
                    Primary use: {e.primaryUse}
                  </p>
                )}
                {e.notes && (
                  <p className="mt-0.5 text-[11px] italic text-brand-500">Note: {e.notes}</p>
                )}
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg p-1.5 text-brand-500 hover:bg-white hover:text-brand-900 dark:hover:bg-brand-900"
                aria-label={`Remove ${e.genericName}`}
                onClick={() => removeAt(i)}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!draft ? (
        <div className="space-y-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500"
              aria-hidden
            />
            <input
              className="input w-full pl-9"
              placeholder="Search medication (e.g. metformin, Eliquis, gabapentin)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          {!compact && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setClassId("all")}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                  classId === "all"
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-brand-200 text-brand-700 dark:border-brand-700"
                )}
              >
                All classes
              </button>
              {CLASSES.slice(0, 14).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClassId(c)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    classId === c
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-brand-200 text-brand-700 dark:border-brand-700"
                  )}
                >
                  {MEDICATION_CLASS_LABELS[c].split(/[&/]/)[0]!.trim()}
                </button>
              ))}
            </div>
          )}
          <ul
            className={cn(
              "space-y-0 overflow-y-auto rounded-xl border border-brand-100 dark:border-brand-800",
              compact ? "max-h-44" : "max-h-56"
            )}
          >
            {results.map((m) => (
              <li key={m.id} className="border-b border-brand-50 last:border-0 dark:border-brand-900">
                <button
                  type="button"
                  disabled={value.length >= maxSelect}
                  onClick={() => setDraft(m)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-brand-50 dark:hover:bg-brand-900/50 disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-brand-950">
                    {m.genericName}
                    {m.brandNames[0] ? (
                      <span className="font-normal text-brand-500"> · {m.brandNames[0]}</span>
                    ) : null}
                  </span>
                  <span className="text-[11px] text-brand-500">
                    {m.classLabel}
                    {m.controlledSchedule !== "none"
                      ? ` · Controlled schedule ${m.controlledSchedule}`
                      : ""}
                  </span>
                  <span className="line-clamp-1 text-xs text-brand-600">{m.primaryUse}</span>
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-brand-500">
                No matches. Try a generic/brand name, or add a custom medication below.
              </li>
            )}
          </ul>

          <div className="rounded-xl border border-dashed border-brand-200 p-3 dark:border-brand-700">
            <button
              type="button"
              className="text-xs font-semibold text-brand-700 hover:underline"
              onClick={() => setShowCustom((s) => !s)}
            >
              {showCustom ? "Hide custom medication" : "+ Add custom medication (not in list)"}
            </button>
            {showCustom && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="label">Medication name</span>
                  <input
                    className="input"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="As on the bottle or from your clinician"
                  />
                </label>
                <label className="block text-sm">
                  <span className="label">Strength</span>
                  <input
                    className="input"
                    value={customStrength}
                    onChange={(e) => setCustomStrength(e.target.value)}
                    placeholder="e.g. 500 mg"
                  />
                </label>
                <label className="block text-sm">
                  <span className="label">Dose amount</span>
                  <input
                    className="input"
                    value={customDose}
                    onChange={(e) => setCustomDose(e.target.value)}
                    placeholder="e.g. 1 tablet"
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="label">Frequency</span>
                  <select
                    className="input"
                    value={customFreq}
                    onChange={(e) => setCustomFreq(e.target.value)}
                  >
                    {MEDICATION_FREQUENCY_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn-primary sm:col-span-2"
                  onClick={addCustom}
                  disabled={!customName.trim()}
                >
                  <Plus className="h-4 w-4" />
                  Add custom med & dose
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-brand-200 bg-white p-4 dark:border-brand-700 dark:bg-brand-950">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-brand-950">{draft.genericName}</p>
              <p className="text-xs text-brand-500">
                {draft.classLabel}
                {draft.brandNames.length
                  ? ` · also ${draft.brandNames.slice(0, 3).join(", ")}`
                  : ""}
              </p>
            </div>
            <button type="button" className="btn-ghost p-2 text-xs" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>

          <div className="rounded-lg bg-brand-50/80 p-3 text-xs leading-relaxed text-brand-800 dark:bg-brand-900/40 dark:text-brand-100">
            <p>
              <span className="font-semibold">Primary use: </span>
              {draft.primaryUse}
            </p>
            {draft.offLabelUses.length > 0 && (
              <p className="mt-1.5">
                <span className="font-semibold">Common off-label / adjunct contexts: </span>
                {draft.offLabelUses.join("; ")}
              </p>
            )}
            <p className="mt-1.5 text-brand-600 dark:text-brand-300">{draft.evidenceNote}</p>
            {draft.ptRelevantNotes && (
              <p className="mt-1.5 font-medium text-amber-900 dark:text-amber-100">
                Movement/rehab note: {draft.ptRelevantNotes}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="label">Strength / concentration</span>
              <select
                className="input"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
              >
                {(draftBase?.commonStrengths || [draft.strength]).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="label">Route</span>
              <select
                className="input"
                value={route}
                onChange={(e) => setRoute(e.target.value as MedicationRoute)}
              >
                {(draftBase?.routes || draft.routes).map((r) => (
                  <option key={r} value={r}>
                    {MEDICATION_ROUTE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="label">Dose amount</span>
              <input
                className="input"
                value={doseText}
                onChange={(e) => setDoseText(e.target.value)}
                placeholder="e.g. 1 tablet, 2 puffs, 10 mg"
              />
            </label>
            <label className="block text-sm">
              <span className="label">Frequency</span>
              <select
                className="input"
                value={frequency}
                disabled={asNeeded}
                onChange={(e) => setFrequency(e.target.value)}
              >
                {MEDICATION_FREQUENCY_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-brand-800">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={asNeeded}
              onChange={(e) => setAsNeeded(e.target.checked)}
            />
            As needed (PRN)
          </label>

          <label className="block text-sm">
            <span className="label">Notes (optional)</span>
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. hold morning dose on session days…"
            />
          </label>

          <button type="button" className="btn-primary w-full py-2.5" onClick={addEntry}>
            <Plus className="h-4 w-4" />
            Add to my medication list
          </button>
          {onInsertParagraph && (
            <p className="text-center text-[11px] text-brand-500">
              After adding, use “Add meds to my story” to put doses into your Assessment paragraph.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
