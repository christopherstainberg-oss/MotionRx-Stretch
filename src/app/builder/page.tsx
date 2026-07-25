"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BASE_EXERCISES, getExerciseById } from "@/data/exercise-library";
import { BASE_STRETCHES, getStretchById } from "@/data/stretch-library";
import {
  addMovementToRoutine,
  ensureRoutineItems,
  removeItemFromRoutine,
  removeModalityFromRoutine,
  rotateEntireRoutine,
  rotateRoutineItem,
  updateRoutineModality,
  STARTER_ROUTINES,
} from "@/lib/routine-engine";
import type { Routine } from "@/lib/types";
import { getModalityById } from "@/data/modalities";
import { AddModalitiesToProgram } from "@/components/AddModalitiesToProgram";
import { ListPlus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { v4 as uuid } from "uuid";

function BuilderInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [msg, setMsg] = useState("");
  const appliedQuery = useRef<string>("");

  useEffect(() => {
    const raw = localStorage.getItem("active-routine");
    if (raw) {
      try {
        setRoutine(ensureRoutineItems(JSON.parse(raw)));
        return;
      } catch {
        /* fall through */
      }
    }
    const starter = STARTER_ROUTINES[0]!;
    const r: Routine = {
      ...starter,
      id: uuid(),
      createdAt: new Date().toISOString(),
      items: starter.items.map((i) => ({ ...i, id: uuid() })),
    };
    setRoutine(r);
    localStorage.setItem("active-routine", JSON.stringify(r));
  }, []);

  // Apply addStretch / addExercise once routine is ready (fixes prior race)
  useEffect(() => {
    if (!routine) return;
    const addS = params.get("addStretch");
    const addE = params.get("addExercise");
    if (!addS && !addE) return;

    const key = `${addS || ""}|${addE || ""}`;
    if (appliedQuery.current === key) return;
    appliedQuery.current = key;

    let next = routine;
    if (addS && getStretchById(addS)) {
      next = addMovementToRoutine(next, addS, "stretch");
      setMsg("Stretch added from library.");
    } else if (addS) {
      setMsg("That stretch could not be found.");
    }
    if (addE && getExerciseById(addE)) {
      next = addMovementToRoutine(next, addE, "exercise");
      setMsg((m) => (m.includes("Stretch") ? `${m} Exercise added.` : "Exercise added from library."));
    } else if (addE) {
      setMsg("That exercise could not be found.");
    }

    setRoutine(next);
    localStorage.setItem("active-routine", JSON.stringify(next));
    localStorage.setItem(`routine:${next.id}`, JSON.stringify(next));
    fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {});

    // Clear query so refresh doesn't re-add
    router.replace("/builder", { scroll: false });
  }, [routine, params, router]);

  function persist(next: Routine) {
    setRoutine(next);
    localStorage.setItem("active-routine", JSON.stringify(next));
    localStorage.setItem(`routine:${next.id}`, JSON.stringify(next));
    fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {});
  }

  const resolved = useMemo(() => {
    if (!routine) return [];
    return ensureRoutineItems(routine).items.map((item) => {
      const m =
        item.kind === "stretch"
          ? getStretchById(item.movementId)
          : getExerciseById(item.movementId);
      return { item, m };
    });
  }, [routine]);

  if (!routine) {
    return <div className="card p-8 text-center">Loading builder…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-950">
            <ListPlus className="h-7 w-7 text-brand-600" />
            Routine builder
          </h1>
          <p className="mt-1 text-sm text-brand-700/85">
            Add stretches, exercises, and PT modalities (with pre-visit / post-visit flags). Rotate
            movements and keep a clinically balanced plan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const next = rotateEntireRoutine(ensureRoutineItems(routine));
              persist(next);
              setMsg("Entire routine rotated to related clinical alternatives.");
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Rotate entire routine
          </button>
          <Link href={`/routines/session?id=${routine.id}`} className="btn-primary">
            Start session
          </Link>
        </div>
      </div>

      {msg && (
        <p className="rounded-xl bg-brand-50 px-4 py-2 text-sm text-brand-800" role="status">
          {msg}
        </p>
      )}

      <section className="card p-5">
        <label className="label" htmlFor="routine-name">
          Routine name
        </label>
        <input
          id="routine-name"
          className="input text-lg font-semibold"
          value={routine.name}
          onChange={(e) => persist({ ...routine, name: e.target.value.slice(0, 120) })}
        />
        <label className="label mt-3" htmlFor="routine-desc">
          Description
        </label>
        <textarea
          id="routine-desc"
          className="input min-h-[70px]"
          value={routine.description}
          onChange={(e) =>
            persist({ ...routine, description: e.target.value.slice(0, 2000) })
          }
        />
        <p className="mt-2 text-xs text-brand-600">
          ~{routine.estimatedMinutes} min · {routine.difficulty} · rotations:{" "}
          {routine.rotationCount ?? 0} · {resolved.length} movements ·{" "}
          {(routine.modalities || []).length} modalities
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold text-brand-900">
            <Sparkles className="h-5 w-5 text-brand-600" />
            Program modalities (pre / post visit)
          </h2>
          <Link href="/modalities" className="text-sm font-semibold text-brand-700 hover:underline">
            Modality hub
          </Link>
        </div>
        {(routine.modalities || []).length === 0 ? (
          <p className="card p-4 text-sm text-brand-600">
            No modalities on this program yet—use the picker below to multi-select and flag
            pre-visit and/or post-visit.
          </p>
        ) : (
          <ul className="space-y-2">
            {(routine.modalities || []).map((rm) => {
              const mod = getModalityById(rm.modalityId);
              return (
                <li
                  key={rm.id}
                  className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-brand-900">{mod?.name || rm.modalityId}</p>
                    <p className="text-xs text-brand-600">
                      {[
                        rm.preVisit && "Pre-visit",
                        rm.postVisit && "Post-visit",
                        rm.preSession && "Pre-session",
                        rm.postSession && "Post-session",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No timing flagged"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/modalities/${rm.modalityId}`}
                      className="btn-secondary px-2 py-1 text-xs"
                    >
                      Set-up guide
                    </Link>
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-xs text-red-700"
                      onClick={() => {
                        persist(removeModalityFromRoutine(routine, rm.id));
                        setMsg("Modality removed from program.");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                  <div className="flex w-full flex-wrap gap-3 text-xs sm:w-auto">
                    {(
                      [
                        ["preVisit", "Pre-visit"],
                        ["postVisit", "Post-visit"],
                        ["preSession", "Pre-session"],
                        ["postSession", "Post-session"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          className="accent-brand-600"
                          checked={Boolean(rm[key])}
                          onChange={(e) =>
                            persist(
                              updateRoutineModality(routine, rm.id, {
                                [key]: e.target.checked,
                              })
                            )
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <AddModalitiesToProgram
          showProgramList={false}
          onRoutineChange={(r) => {
            setRoutine(r);
            setMsg("Program modalities updated.");
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-brand-900">Current plan</h2>
        {resolved.length === 0 && (
          <p className="card p-4 text-sm text-brand-600">
            No movements yet—add from the lists below.
          </p>
        )}
        {resolved.map(({ item, m }, idx) => (
          <article
            key={item.id}
            className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start"
          >
            <div className="flex-1">
              <p className="text-xs font-bold uppercase text-brand-500">
                {idx + 1}. {item.kind}
              </p>
              <h3 className="font-semibold text-brand-900">{m?.name ?? item.movementId}</h3>
              {m && (
                <>
                  <p className="mt-1 text-sm text-brand-700">{m.clinical.whatItDoes}</p>
                  <p className="mt-1 text-xs text-brand-600">
                    <strong>Why it matters:</strong> {m.clinical.whyImportant}
                  </p>
                </>
              )}
              {!m && (
                <p className="mt-1 text-sm text-amber-700">
                  Movement data missing—rotate or remove this item.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={() => {
                  const next = rotateRoutineItem(ensureRoutineItems(routine), item.id);
                  persist(next);
                  setMsg(`Rotated item: ${m?.name ?? item.movementId}`);
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Rotate this
              </button>
              <button
                type="button"
                className="btn-ghost text-xs text-red-700"
                onClick={() => {
                  persist(removeItemFromRoutine(routine, item.id));
                  setMsg("Removed from plan.");
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </article>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">Add stretch from library</h2>
          <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {BASE_STRETCHES.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{s.name}</span>
                <button
                  type="button"
                  className="btn-secondary px-2 py-1 text-xs"
                  onClick={() => {
                    persist(addMovementToRoutine(routine, s.id, "stretch"));
                    setMsg(`Added stretch: ${s.name}`);
                  }}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
          <Link href="/library" className="mt-3 inline-block text-sm font-semibold text-brand-700">
            Browse full stretch library →
          </Link>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold">Add exercise from library</h2>
          <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {BASE_EXERCISES.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{e.name}</span>
                <button
                  type="button"
                  className="btn-secondary px-2 py-1 text-xs"
                  onClick={() => {
                    persist(addMovementToRoutine(routine, e.id, "exercise"));
                    setMsg(`Added exercise: ${e.name}`);
                  }}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
          <Link href="/exercises" className="mt-3 inline-block text-sm font-semibold text-brand-700">
            Browse full exercise library →
          </Link>
        </section>
      </div>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="card p-8 text-center">Loading builder…</div>}>
      <BuilderInner />
    </Suspense>
  );
}
