"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getStretchById } from "@/data/stretch-library";
import { getExerciseById } from "@/data/exercise-library";
import {
  adjustRoutineFromFeedback,
  applyHomeBasedProgram,
  ensureRoutineItems,
  modalitiesForPhase,
  STARTER_ROUTINES,
} from "@/lib/routine-engine";
import type { ModalityRecommendation, Routine, RoutineModality } from "@/lib/types";
import { postSessionModalitySuggestions } from "@/lib/modality-engine";
import { getModalityById } from "@/data/modalities";
import { getModalityGuide } from "@/data/modality-guides";
import { PainScale } from "@/components/PainScale";
import { PainDescriptorPicker } from "@/components/PainDescriptorPicker";
import { ModalityMiniList } from "@/components/ModalitySuggestions";
import { InstitutionalVideoEmbed } from "@/components/InstitutionalVideoEmbed";
import { loadLocalPainProfile, saveLocalPainProfile } from "@/lib/pain-profile";
import { CheckCircle2, ChevronRight, Home, Sparkles } from "lucide-react";
import { v4 as uuid } from "uuid";

function ProgramModalityBlock({
  title,
  items,
}: {
  title: string;
  items: RoutineModality[];
}) {
  if (!items.length) return null;
  return (
    <div className="card space-y-3 p-5">
      <h2 className="flex items-center gap-2 font-semibold text-brand-950">
        <Sparkles className="h-5 w-5 text-brand-600" />
        {title}
      </h2>
      <ul className="space-y-3">
        {items.map((rm) => {
          const mod = getModalityById(rm.modalityId);
          const guide = mod ? getModalityGuide(mod) : null;
          const type =
            guide?.types.find((t) => t.id === rm.variantId) || guide?.types[0];
          return (
            <li key={rm.id} className="rounded-xl border border-brand-100 p-3">
              <p className="font-semibold text-brand-900">{mod?.name || rm.modalityId}</p>
              <p className="text-xs text-brand-600">{mod?.plainLanguage}</p>
              {type && (
                <p className="mt-1 text-[11px] text-brand-500">
                  Type: {type.name}
                </p>
              )}
              {type && (
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-brand-800">
                  {type.setupSteps.slice(0, 5).map((s) => (
                    <li key={s.order}>
                      <strong>{s.title}:</strong> {s.kidFriendly || s.instruction}
                    </li>
                  ))}
                </ol>
              )}
              <Link
                href={`/modalities/${rm.modalityId}`}
                className="mt-2 inline-block text-xs font-semibold text-brand-700 hover:underline"
              >
                Full set-up & settings →
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SessionInner() {
  const params = useSearchParams();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [step, setStep] = useState(0);
  const [painBefore, setPainBefore] = useState(3);
  const [painAfter, setPainAfter] = useState(2);
  const [difficultyFelt, setDifficultyFelt] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [phase, setPhase] = useState<"intro" | "pre-mod" | "active" | "post-mod" | "done">("intro");
  const [adjusted, setAdjusted] = useState<Routine | null>(null);
  const [notes, setNotes] = useState("");
  const [descriptorIds, setDescriptorIds] = useState<string[]>([]);
  const [postMods, setPostMods] = useState<ModalityRecommendation[]>([]);

  useEffect(() => {
    const profile = loadLocalPainProfile();
    if (profile?.descriptorIds?.length) setDescriptorIds(profile.descriptorIds);
    const id = params.get("id");
    const starter = params.get("starter");
    if (id) {
      const byId = localStorage.getItem(`routine:${id}`);
      if (byId) {
        setRoutine(ensureRoutineItems(JSON.parse(byId)));
        return;
      }
      const active = localStorage.getItem("active-routine");
      if (active) {
        const parsed = JSON.parse(active) as Routine;
        if (parsed.id === id) {
          setRoutine(ensureRoutineItems(parsed));
          return;
        }
      }
      fetch(`/api/routines?id=${id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.routine) setRoutine(ensureRoutineItems(d.routine));
        })
        .catch(() => {});
      return;
    }
    if (starter) {
      const found = STARTER_ROUTINES.find((r) => r.name === starter);
      if (found) {
        setRoutine(
          ensureRoutineItems({
            ...found,
            id: uuid(),
            createdAt: new Date().toISOString(),
            items: found.items.map((i) => ({ ...i, id: uuid() })),
          })
        );
      }
    }
  }, [params]);

  const movements = useMemo(() => {
    if (!routine) return [];
    const r = ensureRoutineItems(routine);
    return r.items.map((item) => {
      const m =
        item.kind === "stretch"
          ? getStretchById(item.movementId)
          : getExerciseById(item.movementId);
      return { item, m };
    });
  }, [routine]);

  const current = movements[step];

  async function finish() {
    if (!routine) return;
    const next = adjustRoutineFromFeedback(ensureRoutineItems(routine), {
      averagePainBefore: painBefore,
      averagePainAfter: painAfter,
      difficultyFelt,
    });
    const mods = postSessionModalitySuggestions({
      painBefore,
      painAfter,
      difficultyFelt,
      descriptorIds,
      notes,
    });
    setPostMods(mods);
    setAdjusted(next);
    setPhase("done");

    const session = {
      id: uuid(),
      userId: "local",
      routineId: routine.id,
      stretchIds: next.stretchIds,
      exerciseIds: next.exerciseIds,
      itemIds: next.items.map((i) => i.movementId),
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMinutes: routine.estimatedMinutes,
      averagePainBefore: painBefore,
      averagePainAfter: painAfter,
      painByArea: {},
      difficultyFelt,
      notes,
      completed: true,
      painDescriptorIds: descriptorIds,
      modalityIds: Array.from(
        new Set([
          ...mods.map((m) => m.modalityId),
          ...(routine.modalities || []).map((m) => m.modalityId),
        ])
      ),
    };
    localStorage.setItem(`session:${session.id}`, JSON.stringify(session));
    localStorage.setItem(`routine:${next.id}`, JSON.stringify(next));
    localStorage.setItem("active-routine", JSON.stringify(next));
    saveLocalPainProfile({
      userId: "local",
      descriptorIds,
      freeText: notes,
      overallPain: painAfter,
      areas: routine.focusAreas,
      source: "session",
    });
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      });
      await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      await fetch("/api/pain-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptorIds,
          freeText: notes,
          overallPain: painAfter,
          areas: routine.focusAreas,
          source: "session",
        }),
      });
    } catch {
      /* offline ok */
    }
  }

  if (!routine) {
    return (
      <div className="card p-8 text-center">
        <p className="text-brand-800">Loading session…</p>
        <Link href="/routines" className="btn-secondary mt-4 inline-flex">
          Back to routines
        </Link>
      </div>
    );
  }

  const preSessionMods = modalitiesForPhase(routine, "pre-session");
  const postSessionMods = modalitiesForPhase(routine, "post-session");
  const preVisitMods = modalitiesForPhase(routine, "pre-visit");
  const postVisitMods = modalitiesForPhase(routine, "post-visit");

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-brand-950">{routine.name}</h1>
        <p className="text-sm text-brand-700">{routine.description}</p>
        <div className="card p-5">
          <PainScale
            label="Pain before session"
            value={painBefore}
            onChange={setPainBefore}
            id="pain-before"
          />
        </div>
        {(routine.modalities || []).length > 0 && (
          <div className="card space-y-2 p-4 text-sm">
            <p className="font-semibold text-brand-900">Program modalities</p>
            <p className="text-xs text-brand-600">
              Pre-session: {preSessionMods.length} · Post-session: {postSessionMods.length} ·
              Pre-visit flags: {preVisitMods.length} · Post-visit flags: {postVisitMods.length}
            </p>
            <ul className="text-xs text-brand-700">
              {(routine.modalities || []).slice(0, 6).map((rm) => (
                <li key={rm.id}>
                  • {getModalityById(rm.modalityId)?.name || rm.modalityId}
                  {rm.preVisit ? " (pre-visit)" : ""}
                  {rm.postVisit ? " (post-visit)" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(routine.generatedFrom?.descriptorSummary || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {routine.generatedFrom!.descriptorSummary!.map((d) => (
              <span key={d} className="chip">
                {d}
              </span>
            ))}
          </div>
        )}
        <ol className="card divide-y divide-brand-100 p-2 text-sm">
          {movements.map(({ item, m }, i) => (
            <li key={item.id} className="flex justify-between px-3 py-2">
              <span>
                {i + 1}. <span className="capitalize text-brand-500">{item.kind}</span>{" "}
                {m?.name ?? item.movementId}
              </span>
              <span className="text-brand-500 capitalize">{m?.difficulty}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => setPhase(preSessionMods.length ? "pre-mod" : "active")}
        >
          {preSessionMods.length ? "Continue to pre-session modalities" : "Begin session"}
        </button>
      </div>
    );
  }

  if (phase === "pre-mod") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <ProgramModalityBlock
          title="Pre-session / pre-visit prep modalities"
          items={preSessionMods.length ? preSessionMods : preVisitMods}
        />
        <button type="button" className="btn-primary w-full" onClick={() => setPhase("active")}>
          Start stretch & exercise program
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className="btn-ghost w-full" onClick={() => setPhase("active")}>
          Skip modalities this time
        </button>
      </div>
    );
  }

  if (phase === "post-mod") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <ProgramModalityBlock
          title="Post-session / post-visit modalities"
          items={postSessionMods.length ? postSessionMods : postVisitMods}
        />
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => {
            setStep(movements.length);
            setPhase("active");
          }}
        >
          Continue to session feedback
        </button>
      </div>
    );
  }

  if (phase === "done" && adjusted) {
    const last = adjusted.selfAdjustHistory[adjusted.selfAdjustHistory.length - 1];
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="card p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-3 text-2xl font-bold text-brand-950">Session complete</h1>
          <p className="mt-2 text-sm text-brand-700">
            Plan adjusted using clinically styled pain + effort rules.
          </p>
        </div>
        <div className="card space-y-2 p-5 text-sm">
          <p>
            <strong>Action:</strong> <span className="capitalize">{last?.action}</span>
          </p>
          <p>{last?.details}</p>
          <p className="text-brand-600">
            Pain {painBefore} → {painAfter} · Effort {difficultyFelt}/5
          </p>
        </div>
        {postMods.length > 0 && (
          <div className="card space-y-3 p-5">
            <ModalityMiniList
              title="Post-session / recovery modalities for this rating"
              items={postMods}
            />
            <Link href="/modalities" className="text-sm font-semibold text-brand-700 hover:underline">
              Open full pre/post-visit modality plan →
            </Link>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href="/insights" className="btn-primary">
            Correlated insights
          </Link>
          <Link href="/modalities" className="btn-secondary">
            Modalities
          </Link>
          <Link href="/progress" className="btn-secondary">
            Progress
          </Link>
          <Link href="/jeffery" className="btn-ghost">
            Talk to Jeffery
          </Link>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-xl font-bold">Finish & feedback</h1>
        <div className="card space-y-4 p-5">
          <PainScale label="Pain after session" value={painAfter} onChange={setPainAfter} id="pain-after" />
          <div>
            <label className="label" htmlFor="effort">
              How hard did this feel? (1 easy – 5 very hard)
            </label>
            <input
              id="effort"
              type="range"
              min={1}
              max={5}
              value={difficultyFelt}
              onChange={(e) => setDifficultyFelt(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              className="w-full accent-brand-600"
            />
            <p className="text-sm font-medium text-brand-800">{difficultyFelt} / 5</p>
          </div>
          <div>
            <label className="label" htmlFor="notes">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              className="input min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <PainDescriptorPicker
            value={descriptorIds}
            onChange={setDescriptorIds}
            maxSelect={12}
            compact
          />
          <button type="button" className="btn-primary w-full" onClick={finish}>
            Save & adjust next routine
          </button>
        </div>
      </div>
    );
  }

  const { item, m } = current;
  if (!m) {
    return (
      <div className="card p-6">
        <p>Missing movement data for {item.movementId}.</p>
        <button type="button" className="btn-primary mt-4" onClick={() => setStep((s) => s + 1)}>
          Skip
        </button>
      </div>
    );
  }

  function toggleHomeBased(checked: boolean) {
    if (!routine) return;
    const next = applyHomeBasedProgram(ensureRoutineItems(routine), checked);
    setRoutine(next);
    try {
      localStorage.setItem(`routine:${next.id}`, JSON.stringify(next));
      localStorage.setItem("active-routine", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const activeVariation = item.variationId
    ? m.variations.find((v) => v.id === item.variationId)
    : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-sm text-brand-600">
        <span>
          Movement {step + 1} of {movements.length}
        </span>
        <span className="font-medium capitalize text-brand-800">
          {item.kind} · {routine.name}
        </span>
      </div>

      <label className="card flex cursor-pointer items-start gap-3 p-4">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-brand-600"
          checked={Boolean(routine.homeBasedProgram)}
          onChange={(e) => toggleHomeBased(e.target.checked)}
        />
        <span>
          <span className="flex items-center gap-2 text-sm font-semibold text-brand-950">
            <Home className="h-4 w-4 text-brand-600" />
            Home-based program
          </span>
          <span className="mt-0.5 block text-xs text-brand-600">
            Use chair/wall/floor/minimal-equipment variations for all stretches and exercises in
            this routine. Correlates with Assessment and stays saved on the plan.
          </span>
        </span>
      </label>

      <div className="h-2 overflow-hidden rounded-full bg-brand-100">
        <div
          className="h-full bg-brand-600 transition-all"
          style={{ width: `${((step + 1) / movements.length) * 100}%` }}
        />
      </div>

      <article className="card p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-500">{item.kind}</p>
        <h1 className="text-2xl font-bold text-brand-950">{m.name}</h1>
        {activeVariation && (
          <p className="mt-1 text-sm font-medium text-brand-700">
            Variation: {activeVariation.name} — {activeVariation.description}
          </p>
        )}
        <p className="mt-2 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">
          <strong>Why this matters:</strong> {m.clinical.whyImportant}
        </p>

        <div className="mt-4">
          <InstitutionalVideoEmbed
            video={m.video}
            bodyParts={m.bodyParts}
            tags={m.tags}
            kind={item.kind === "exercise" ? "exercise" : "stretch"}
          />
        </div>

        <ol className="mt-6 space-y-3">
          {m.steps.map((s) => (
            <li key={s.order} className="rounded-xl bg-brand-50/70 p-4">
              <p className="text-xs font-bold uppercase text-brand-500">Step {s.order}</p>
              <p className="font-medium text-brand-900">{s.instruction}</p>
              <p className="mt-2 text-sm text-brand-700">
                <span className="font-semibold text-accent-600">Easy words: </span>
                {s.kidFriendly}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <strong>Breathing:</strong> {m.breathing}
          </p>
          <p>
            <strong>Alignment:</strong> {m.alignment}
          </p>
        </div>
        <p className="mt-3 text-sm text-brand-700">
          <strong>Clinical outcome:</strong> {m.clinical.clinicalOutcome}
        </p>
      </article>

      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary flex-1"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </button>
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => {
            if (step + 1 >= movements.length) {
              const hasPost =
                modalitiesForPhase(routine, "post-session").length > 0 ||
                modalitiesForPhase(routine, "post-visit").length > 0;
              if (hasPost) setPhase("post-mod");
              else setStep((s) => s + 1);
            } else {
              setStep((s) => s + 1);
            }
          }}
        >
          {step + 1 >= movements.length ? "Finish" : "Next"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="card p-8 text-center">Loading session…</div>}>
      <SessionInner />
    </Suspense>
  );
}
