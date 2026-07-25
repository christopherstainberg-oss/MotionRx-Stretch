"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BASE_EXERCISES } from "@/data/exercise-library";
import { BASE_STRETCHES, getStretchById } from "@/data/stretch-library";
import { getExerciseById } from "@/data/exercise-library";
import {
  addMovementToRoutine,
  ensureRoutineItems,
  removeItemFromRoutine,
  rotateEntireRoutine,
  rotateRoutineItem,
  STARTER_ROUTINES,
} from "@/lib/routine-engine";
import type { Routine } from "@/lib/types";
import { ListPlus, RefreshCw, Trash2 } from "lucide-react";
import { v4 as uuid } from "uuid";

function BuilderInner() {
  const params = useSearchParams();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("active-routine");
    if (raw) {
      setRoutine(ensureRoutineItems(JSON.parse(raw)));
      return;
    }
    const starter = STARTER_ROUTINES[0]!;
    const r: Routine = {
      ...starter,
      id: uuid(),
      createdAt: new Date().toISOString(),
      items: starter.items.map((i) => ({ ...i, id: uuid() })),
    };
    setRoutine(r);
  }, []);

  useEffect(() => {
    if (!routine) return;
    const addS = params.get("addStretch");
    const addE = params.get("addExercise");
    if (addS) {
      const next = addMovementToRoutine(routine, addS, "stretch");
      setRoutine(next);
      localStorage.setItem("active-routine", JSON.stringify(next));
      setMsg("Stretch added from library.");
    }
    if (addE) {
      const next = addMovementToRoutine(routine, addE, "exercise");
      setRoutine(next);
      localStorage.setItem("active-routine", JSON.stringify(next));
      setMsg("Exercise added from library.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

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
            Add stretches or exercises from the libraries, rotate one item or the whole routine, and
            keep a clinically balanced plan.
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

      {msg && <p className="rounded-xl bg-brand-50 px-4 py-2 text-sm text-brand-800">{msg}</p>}

      <section className="card p-5">
        <input
          className="input text-lg font-semibold"
          value={routine.name}
          onChange={(e) => persist({ ...routine, name: e.target.value })}
        />
        <textarea
          className="input mt-2 min-h-[70px]"
          value={routine.description}
          onChange={(e) => persist({ ...routine, description: e.target.value })}
        />
        <p className="mt-2 text-xs text-brand-600">
          ~{routine.estimatedMinutes} min · {routine.difficulty} · rotations:{" "}
          {routine.rotationCount ?? 0}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-brand-900">Current plan</h2>
        {resolved.map(({ item, m }, idx) => (
          <article key={item.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
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
                onClick={() => persist(removeItemFromRoutine(routine, item.id))}
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
