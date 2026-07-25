"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BODY_PART_LABELS, getStretchById } from "@/data/stretch-library";
import { getExerciseById } from "@/data/exercise-library";
import { generateHybridPlan, parseConcernParagraph } from "@/lib/routine-engine";
import type { BodyPart, Difficulty, MovementKind, SymptomInput } from "@/lib/types";
import { PainScale } from "@/components/PainScale";
import { Stethoscope } from "lucide-react";

const AREAS = Object.keys(BODY_PART_LABELS) as BodyPart[];
const SYMPTOM_CHIPS = [
  "stiffness",
  "desk posture",
  "morning tightness",
  "after workout soreness",
  "limited mobility",
  "stress tension",
  "walking discomfort",
  "weakness",
];
const GOAL_CHIPS = [
  "improve flexibility",
  "build strength",
  "reduce stiffness",
  "move easier at work",
  "prepare for sport",
  "better posture",
  "recover gently",
];

export default function AssessPage() {
  const [paragraph, setParagraph] = useState("");
  const [areas, setAreas] = useState<BodyPart[]>([]);
  const [painLevels, setPainLevels] = useState<Partial<Record<BodyPart, number>>>({});
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(15);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [preferKinds, setPreferKinds] = useState<"auto" | MovementKind[]>("auto");
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [generated, setGenerated] = useState<ReturnType<typeof generateHybridPlan> | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const parsedPreview = useMemo(
    () => (paragraph.trim().length > 12 ? parseConcernParagraph(paragraph) : null),
    [paragraph]
  );

  function applyParagraphParse() {
    if (!parsedPreview) return;
    setAreas(parsedPreview.areas);
    setSymptoms(parsedPreview.symptoms);
    setGoals(parsedPreview.goals);
    setPreferKinds(parsedPreview.preferKinds);
    const pain: Partial<Record<BodyPart, number>> = {};
    for (const a of parsedPreview.areas) pain[a] = parsedPreview.estimatedPain;
    setPainLevels(pain);
  }

  const input: SymptomInput = useMemo(
    () => ({
      areas,
      symptoms,
      painLevels,
      goals,
      availableMinutes: minutes,
      difficulty,
      concernParagraph: paragraph,
      preferKinds,
    }),
    [areas, symptoms, painLevels, goals, minutes, difficulty, paragraph, preferKinds]
  );

  async function createPlan() {
    const routine = generateHybridPlan(input);
    setGenerated(routine);
    setSaving(true);
    try {
      localStorage.setItem(`routine:${routine.id}`, JSON.stringify(routine));
      localStorage.setItem("active-routine", JSON.stringify(routine));
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routine),
      });
      if (res.ok) {
        const data = await res.json();
        setRoutineId(data.routine?.id ?? routine.id);
      } else {
        setRoutineId(routine.id);
      }
    } catch {
      setRoutineId(routine.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-950">
          <Stethoscope className="h-7 w-7 text-brand-600" />
          Clinical intake & personalized plan
        </h1>
        <p className="mt-1 text-sm text-brand-700/85">
          Describe issues in a short paragraph. MotionRx Stretch suggests <strong>stretches and/or
          exercises</strong> using outpatient-style, pain-aware logic—then you can refine chips,
          pain scores, and preferences.
        </p>
      </div>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-brand-900">Brief written concerns (primary)</h2>
        <textarea
          className="input min-h-[120px]"
          value={paragraph}
          onChange={(e) => setParagraph(e.target.value)}
          placeholder="Example: I sit at a desk all day. My neck and upper back feel stiff by afternoon, pain about 3/10. Hips feel tight when I stand up. I want to move easier at work and not feel so rigid."
        />
        {parsedPreview && (
          <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
            <p className="font-medium">Detected from your paragraph</p>
            <p className="mt-1">
              Areas: {parsedPreview.areas.map((a) => BODY_PART_LABELS[a]).join(", ")}
            </p>
            <p>Symptoms: {parsedPreview.symptoms.join(", ")}</p>
            <p>Goals: {parsedPreview.goals.join(", ")}</p>
            <p>
              Suggested mix:{" "}
              {parsedPreview.preferKinds === "auto"
                ? "auto (stretches + exercises)"
                : parsedPreview.preferKinds.join(" + ")}{" "}
              · estimated pain ~{parsedPreview.estimatedPain}/10
            </p>
            <button type="button" className="btn-secondary mt-2 text-xs" onClick={applyParagraphParse}>
              Apply detected fields
            </button>
          </div>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-brand-900">Suggest</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["auto", "Auto (stretch + exercise)"],
              ["stretch", "Stretches emphasis"],
              ["exercise", "Exercises emphasis"],
              ["both", "Balanced both"],
            ] as const
          ).map(([key, label]) => {
            const active =
              key === "auto"
                ? preferKinds === "auto"
                : key === "both"
                  ? Array.isArray(preferKinds) &&
                    preferKinds.includes("stretch") &&
                    preferKinds.includes("exercise") &&
                    preferKinds[0] === "stretch"
                  : Array.isArray(preferKinds) && preferKinds[0] === key;
            return (
              <button
                key={key}
                type="button"
                className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
                  active ? "bg-brand-700 text-white ring-brand-700" : "bg-white ring-brand-200"
                }`}
                onClick={() => {
                  if (key === "auto") setPreferKinds("auto");
                  else if (key === "stretch") setPreferKinds(["stretch", "exercise"]);
                  else if (key === "exercise") setPreferKinds(["exercise", "stretch"]);
                  else setPreferKinds(["stretch", "exercise"]);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-brand-900">Areas of concern</h2>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((area) => {
            const on = areas.includes(area);
            return (
              <button
                key={area}
                type="button"
                onClick={() => {
                  setAreas(toggle(areas, area));
                  if (!painLevels[area]) setPainLevels((p) => ({ ...p, [area]: 3 }));
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
                  on
                    ? "bg-brand-600 text-white ring-brand-600"
                    : "bg-white text-brand-800 ring-brand-200 hover:bg-brand-50"
                }`}
              >
                {BODY_PART_LABELS[area]}
              </button>
            );
          })}
        </div>
      </section>

      {areas.length > 0 && (
        <section className="card space-y-5 p-5">
          <h2 className="font-semibold text-brand-900">Pain scale by area</h2>
          {areas.map((area) => (
            <PainScale
              key={area}
              id={`pain-${area}`}
              label={`${BODY_PART_LABELS[area]} pain`}
              value={painLevels[area] ?? 0}
              onChange={(n) => setPainLevels((p) => ({ ...p, [area]: n }))}
            />
          ))}
        </section>
      )}

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-brand-900">Symptoms & goals</h2>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_CHIPS.map((s) => {
            const on = symptoms.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSymptoms(toggle(symptoms, s))}
                className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
                  on ? "bg-accent-500 text-white ring-accent-500" : "bg-white ring-brand-200"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Add symptom note"
            value={customSymptom}
            onChange={(e) => setCustomSymptom(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (customSymptom.trim()) {
                setSymptoms((s) => [...s, customSymptom.trim()]);
                setCustomSymptom("");
              }
            }}
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {GOAL_CHIPS.map((g) => {
            const on = goals.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGoals(toggle(goals, g))}
                className={`rounded-full px-3 py-1.5 text-sm ring-1 ${
                  on ? "bg-brand-700 text-white ring-brand-700" : "bg-white ring-brand-200"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="minutes">
            Available minutes
          </label>
          <input
            id="minutes"
            type="number"
            min={5}
            max={45}
            className="input"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label" htmlFor="difficulty">
            Preferred difficulty
          </label>
          <select
            id="difficulty"
            className="input"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </section>

      <button
        type="button"
        className="btn-primary w-full py-3"
        onClick={createPlan}
        disabled={saving || (!paragraph.trim() && areas.length === 0)}
      >
        {saving ? "Building plan…" : "Generate clinical stretch + exercise plan"}
      </button>

      {generated && (
        <section className="card space-y-4 border-brand-300 p-5">
          <h2 className="text-lg font-bold text-brand-950">{generated.name}</h2>
          <p className="text-sm text-brand-700">{generated.description}</p>
          <p className="text-sm">
            ~{generated.estimatedMinutes} min · {generated.difficulty} ·{" "}
            {generated.items.length} movements (
            {generated.stretchIds.length} stretches · {generated.exerciseIds?.length || 0} exercises)
          </p>
          {generated.selfAdjustHistory[0] && (
            <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
              <strong>Dosing note:</strong> {generated.selfAdjustHistory[0].details}
            </p>
          )}
          <ol className="space-y-2">
            {generated.items.map((item, i) => {
              const m =
                item.kind === "stretch"
                  ? getStretchById(item.movementId)
                  : getExerciseById(item.movementId);
              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-brand-100 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {i + 1}. <span className="capitalize text-brand-500">{item.kind}</span> —{" "}
                      {m?.name ?? item.movementId}
                    </span>
                    {m && (
                      <Link
                        href={item.kind === "stretch" ? `/library/${m.slug}` : `/exercises/${m.slug}`}
                        className="font-semibold text-brand-700"
                      >
                        View
                      </Link>
                    )}
                  </div>
                  {m && (
                    <p className="mt-1 text-xs text-brand-600">{m.clinical.whyImportant}</p>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Link
              href={routineId ? `/routines/session?id=${routineId}` : "/routines"}
              className="btn-primary"
            >
              Start guided session
            </Link>
            <Link href="/builder" className="btn-secondary">
              Customize / rotate
            </Link>
            <Link href="/jeffery" className="btn-ghost">
              Discuss with Jeffery
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
