"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MODALITIES,
  MODALITY_CATEGORY_LABELS,
  getModalityById,
  type ModalityCategory,
} from "@/data/modalities";
import { getModalityGuide } from "@/data/modality-guides";
import {
  addModalitiesToRoutine,
  ensureRoutineItems,
  removeModalityFromRoutine,
  updateRoutineModality,
} from "@/lib/routine-engine";
import type { Routine, RoutineModality } from "@/lib/types";
import { Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function loadActiveRoutine(): Routine | null {
  try {
    const raw = localStorage.getItem("active-routine");
    if (!raw) return null;
    return ensureRoutineItems(JSON.parse(raw) as Routine);
  } catch {
    return null;
  }
}

function saveRoutine(r: Routine) {
  localStorage.setItem("active-routine", JSON.stringify(r));
  localStorage.setItem(`routine:${r.id}`, JSON.stringify(r));
  fetch("/api/routines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(r),
  }).catch(() => {});
}

export function AddModalitiesToProgram({
  presetIds,
  onRoutineChange,
  showProgramList = true,
}: {
  /** Pre-check these modality IDs (e.g. from recommendations) */
  presetIds?: string[];
  onRoutineChange?: (r: Routine) => void;
  showProgramList?: boolean;
}) {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preVisit, setPreVisit] = useState(true);
  const [postVisit, setPostVisit] = useState(true);
  const [preSession, setPreSession] = useState(true);
  const [postSession, setPostSession] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ModalityCategory | "all">("all");
  const [msg, setMsg] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    setRoutine(loadActiveRoutine());
  }, []);

  useEffect(() => {
    if (presetIds?.length) {
      setSelected((prev) => {
        const n = new Set(prev);
        presetIds.forEach((id) => n.add(id));
        return n;
      });
    }
  }, [presetIds]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return MODALITIES.filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.plainLanguage.toLowerCase().includes(q) ||
        m.tags.some((t) => t.includes(q))
      );
    });
  }, [query, category]);

  function persist(next: Routine) {
    setRoutine(next);
    saveRoutine(next);
    onRoutineChange?.(next);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function addSelected() {
    if (!routine) {
      setMsg("Create or open a routine in Builder first.");
      return;
    }
    if (!selected.size) {
      setMsg("Select at least one modality.");
      return;
    }
    if (!preVisit && !postVisit && !preSession && !postSession) {
      setMsg("Choose Pre-visit and/or Post-visit (or session timing).");
      return;
    }
    const next = addModalitiesToRoutine(routine, Array.from(selected), {
      preVisit,
      postVisit,
      preSession,
      postSession,
    });
    persist(next);
    setMsg(
      `Added ${selected.size} modality(ies) to “${next.name}” (pre-visit: ${preVisit ? "yes" : "no"}, post-visit: ${postVisit ? "yes" : "no"}).`
    );
    setSelected(new Set());
  }

  const programMods: RoutineModality[] = routine?.modalities || [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-200 bg-white p-4 sm:p-5">
        <h3 className="flex items-center gap-2 font-bold text-brand-950">
          <Sparkles className="h-5 w-5 text-brand-600" />
          Add modalities to your stretch & exercise program
        </h3>
        <p className="mt-1 text-sm text-brand-700/85">
          Select multiple modalities, mark each batch as <strong>pre-visit</strong> and/or{" "}
          <strong>post-visit</strong> (optional session timings), then add them to your active
          routine. Open any modality for full set-up, settings, and kid-friendly steps.
        </p>
        {routine ? (
          <p className="mt-2 text-xs font-medium text-brand-600">
            Active program: {routine.name} · {programMods.length} modality(ies) attached
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-800">
            No active routine yet.{" "}
            <Link href="/builder" className="font-semibold underline">
              Open Builder
            </Link>{" "}
            or{" "}
            <Link href="/assessment" className="font-semibold underline">
              Assessment
            </Link>{" "}
            first.
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/50 px-3 py-2.5 text-sm font-semibold text-brand-900">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={preVisit}
              onChange={(e) => setPreVisit(e.target.checked)}
            />
            Pre-visit
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/50 px-3 py-2.5 text-sm font-semibold text-brand-900">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={postVisit}
              onChange={(e) => setPostVisit(e.target.checked)}
            />
            Post-visit
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-brand-100 px-3 py-2.5 text-sm text-brand-800">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={preSession}
              onChange={(e) => setPreSession(e.target.checked)}
            />
            Also before home sessions
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-brand-100 px-3 py-2.5 text-sm text-brand-800">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={postSession}
              onChange={(e) => setPostSession(e.target.checked)}
            />
            Also after home sessions
          </label>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Search modalities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as ModalityCategory | "all")}
          >
            <option value="all">All categories</option>
            {(Object.keys(MODALITY_CATEGORY_LABELS) as ModalityCategory[]).map((c) => (
              <option key={c} value={c}>
                {MODALITY_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
          {filtered.map((m) => {
            const on = selected.has(m.id);
            const inProgram = programMods.some((x) => x.modalityId === m.id);
            return (
              <li key={m.id}>
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-3 py-2.5",
                    on ? "border-brand-300 bg-brand-50" : "border-brand-100 bg-white"
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      on ? "border-brand-600 bg-brand-600 text-white" : "border-brand-300"
                    )}
                    aria-pressed={on}
                    onClick={() => toggle(m.id)}
                  >
                    {on && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-950">
                      {m.name}
                      {inProgram && (
                        <span className="ml-1.5 text-[10px] font-bold uppercase text-emerald-700">
                          in program
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-brand-600">{m.plainLanguage}</p>
                  </div>
                  <Link
                    href={`/modalities/${m.id}`}
                    className="shrink-0 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    Instructions
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="btn-primary mt-4 w-full py-3"
          onClick={addSelected}
          disabled={!selected.size}
        >
          <Plus className="h-4 w-4" />
          Add {selected.size || ""} selected to program
        </button>
        {msg && (
          <p className="mt-2 text-sm text-brand-800" role="status">
            {msg}
          </p>
        )}
      </div>

      {showProgramList && programMods.length > 0 && routine && (
        <div className="rounded-2xl border border-brand-100 bg-white p-4 sm:p-5">
          <h3 className="font-bold text-brand-950">Modalities on this program</h3>
          <ul className="mt-3 space-y-3">
            {programMods.map((rm) => {
              const mod = getModalityById(rm.modalityId);
              const guide = mod ? getModalityGuide(mod) : null;
              return (
                <li
                  key={rm.id}
                  className="rounded-xl border border-brand-100 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-brand-950">
                        {mod?.name || rm.modalityId}
                      </p>
                      <p className="text-xs text-brand-600">{mod?.plainLanguage}</p>
                      {guide && (
                        <p className="mt-1 text-[11px] text-brand-500">
                          {guide.types.length} type path(s) · setup ~{guide.estimatedSetupMinutes}{" "}
                          min
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        href={`/modalities/${rm.modalityId}`}
                        className="btn-secondary px-2 py-1 text-xs"
                      >
                        Full set-up guide
                      </Link>
                      <button
                        type="button"
                        className="btn-ghost px-2 py-1 text-xs text-red-700"
                        onClick={() => {
                          persist(removeModalityFromRoutine(routine, rm.id));
                          setMsg("Removed modality from program.");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="accent-brand-600"
                        checked={rm.preVisit}
                        onChange={(e) =>
                          persist(
                            updateRoutineModality(routine, rm.id, {
                              preVisit: e.target.checked,
                            })
                          )
                        }
                      />
                      Pre-visit
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="accent-brand-600"
                        checked={rm.postVisit}
                        onChange={(e) =>
                          persist(
                            updateRoutineModality(routine, rm.id, {
                              postVisit: e.target.checked,
                            })
                          )
                        }
                      />
                      Post-visit
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="accent-brand-600"
                        checked={Boolean(rm.preSession)}
                        onChange={(e) =>
                          persist(
                            updateRoutineModality(routine, rm.id, {
                              preSession: e.target.checked,
                            })
                          )
                        }
                      />
                      Pre-session
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        className="accent-brand-600"
                        checked={Boolean(rm.postSession)}
                        onChange={(e) =>
                          persist(
                            updateRoutineModality(routine, rm.id, {
                              postSession: e.target.checked,
                            })
                          )
                        }
                      />
                      Post-session
                    </label>
                  </div>
                  {guide && guide.types.length > 1 && (
                    <div className="mt-2">
                      <label className="label text-[11px]">Type / settings path</label>
                      <select
                        className="input text-sm"
                        value={rm.variantId || guide.types[0]!.id}
                        onChange={(e) =>
                          persist(
                            updateRoutineModality(routine, rm.id, {
                              variantId: e.target.value,
                            })
                          )
                        }
                      >
                        {guide.types.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {detailId === rm.modalityId ? (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-brand-700"
                      onClick={() => setDetailId(null)}
                    >
                      Hide quick steps
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-brand-700"
                      onClick={() => setDetailId(rm.modalityId)}
                    >
                      Show quick set-up steps
                    </button>
                  )}
                  {detailId === rm.modalityId && mod && guide && (
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-brand-800">
                      {(
                        guide.types.find((t) => t.id === rm.variantId) || guide.types[0]
                      )?.setupSteps
                        .slice(0, 6)
                        .map((s) => (
                          <li key={s.order}>
                            <strong>{s.title}:</strong> {s.instruction}
                          </li>
                        ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
