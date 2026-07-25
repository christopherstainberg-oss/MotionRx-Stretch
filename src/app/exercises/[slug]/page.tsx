import Link from "next/link";
import { notFound } from "next/navigation";
import { getExerciseBySlug, EXERCISE_CATEGORY_LABELS } from "@/data/exercise-library";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import { InstitutionalVideoEmbed } from "@/components/InstitutionalVideoEmbed";
import { AlertTriangle, CheckCircle2, GraduationCap } from "lucide-react";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const ex = getExerciseBySlug(params.slug);
  return { title: ex?.name ?? "Exercise" };
}

export default function ExerciseDetailPage({ params }: { params: { slug: string } }) {
  const ex = getExerciseBySlug(params.slug);
  if (!ex) notFound();

  return (
    <div className="space-y-6">
      <Link href="/exercises" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to exercise library
      </Link>

      <header className="card p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-500">
          Exercise · {EXERCISE_CATEGORY_LABELS[ex.category]}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-950">{ex.name}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ex.bodyParts.map((bp) => (
            <span key={bp} className="chip">
              {BODY_PART_LABELS[bp]}
            </span>
          ))}
          <span className="chip capitalize">{ex.difficulty}</span>
          <span className="chip">
            {ex.defaultSets}×{ex.defaultReps}
          </span>
        </div>
      </header>

      <section className="card space-y-3 border-brand-300 bg-brand-50/40 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-brand-950">
          <GraduationCap className="h-5 w-5 text-brand-600" />
          What it does & why it matters
        </h2>
        <p className="text-sm">
          <strong>What it does:</strong> {ex.clinical.whatItDoes}
        </p>
        <p className="text-sm">
          <strong>Why it is important:</strong> {ex.clinical.whyImportant}
        </p>
        <p className="text-sm">
          <strong>Clinical outcome education:</strong> {ex.clinical.clinicalOutcome}
        </p>
        <p className="text-sm text-brand-700">
          <strong>Outpatient rationale:</strong> {ex.clinical.outpatientRationale}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="card overflow-hidden p-4">
            <InstitutionalVideoEmbed
              video={ex.video}
              bodyParts={ex.bodyParts}
              tags={ex.tags}
              kind="exercise"
            />
            <p className="mt-2 text-xs text-brand-500">
              Institutional medical/university technique demos auto-match this exercise name.
              Dead links swap to the next vetted educational source.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold">Step-by-step</h2>
            <ol className="mt-4 space-y-4">
              {ex.steps.map((step) => (
                <li key={step.order} className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
                  <p className="text-xs font-bold uppercase text-brand-500">
                    Step {step.order}
                    {step.reps ? ` · ${step.reps} reps` : ""}
                    {step.sets ? ` · ${step.sets} sets` : ""}
                    {step.holdSeconds ? ` · hold ~${step.holdSeconds}s` : ""}
                  </p>
                  <p className="mt-1 font-medium text-brand-900">{step.instruction}</p>
                  <p className="mt-2 rounded-lg bg-white/80 p-3 text-sm">
                    <span className="font-semibold text-accent-600">Easy words: </span>
                    {step.kidFriendly}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <div className="card space-y-2 p-5 text-sm">
            <p>
              <strong>Breathing:</strong> {ex.breathing}
            </p>
            <p>
              <strong>Alignment:</strong> {ex.alignment}
            </p>
            <p>
              <strong>Posture:</strong> {ex.posture}
            </p>
            <p>
              <strong>Warm-up:</strong> {ex.warmUpNotes}
            </p>
          </div>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Benefits
            </h2>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {ex.benefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Risks
            </h2>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {ex.risks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="font-bold">Variations</h2>
            <ul className="mt-3 space-y-3">
              {ex.variations.map((v) => (
                <li key={v.id} className="rounded-xl border border-brand-100 p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium">{v.name}</p>
                    <span className="chip capitalize">{v.difficulty}</span>
                  </div>
                  <p className="mt-1 text-brand-700">{v.description}</p>
                </li>
              ))}
            </ul>
          </div>
          <Link
            href={`/builder?addExercise=${encodeURIComponent(ex.id)}`}
            className="btn-primary w-full"
          >
            Add to my routine
          </Link>
        </aside>
      </div>
    </div>
  );
}
