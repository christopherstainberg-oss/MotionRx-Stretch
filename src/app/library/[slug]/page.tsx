import Link from "next/link";
import { notFound } from "next/navigation";
import { getStretchBySlug, BODY_PART_LABELS } from "@/data/stretch-library";
import { InstitutionalVideoEmbed } from "@/components/InstitutionalVideoEmbed";
import { AlertTriangle, CheckCircle2, GraduationCap, Wind } from "lucide-react";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const stretch = getStretchBySlug(params.slug);
  return { title: stretch?.name ?? "Stretch" };
}

export default function StretchDetailPage({ params }: { params: { slug: string } }) {
  const stretch = getStretchBySlug(params.slug);
  if (!stretch) notFound();

  return (
    <div className="space-y-6">
      <Link href="/library" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Back to library
      </Link>

      <header className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-brand-950">{stretch.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {stretch.bodyParts.map((bp) => (
                <span key={bp} className="chip">
                  {BODY_PART_LABELS[bp]}
                </span>
              ))}
              <span className="chip capitalize">{stretch.difficulty}</span>
            </div>
          </div>
          <p className="text-sm text-brand-600">
            ~{Math.round(stretch.durationSeconds / 60)} min · {stretch.equipment.join(", ") || "No equipment"}
          </p>
        </div>
        <p className="mt-4 text-sm text-brand-800/85">{stretch.evidenceNotes}</p>
      </header>

      <section className="card space-y-3 border-brand-300 bg-brand-50/40 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-brand-950">
          <GraduationCap className="h-5 w-5 text-brand-600" />
          What it does & why it matters
        </h2>
        <p className="text-sm">
          <strong>What it does:</strong> {stretch.clinical.whatItDoes}
        </p>
        <p className="text-sm">
          <strong>Why it is important:</strong> {stretch.clinical.whyImportant}
        </p>
        <p className="text-sm">
          <strong>Clinical outcome education:</strong> {stretch.clinical.clinicalOutcome}
        </p>
        <p className="text-sm text-brand-700">
          <strong>Outpatient rationale:</strong> {stretch.clinical.outpatientRationale}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="card overflow-hidden p-4">
            <InstitutionalVideoEmbed
              video={stretch.video}
              bodyParts={stretch.bodyParts}
            />
            <p className="mt-2 text-xs text-brand-500">
              Links auto-refresh against institutional oEmbed health checks. If a preferred
              video is removed, MotionRx swaps to the next vetted educational source.
            </p>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold text-brand-950">Step-by-step guidance</h2>
            <p className="mt-1 text-sm text-brand-600">
              Detailed enough for safe home practice—with a kid-friendly version of each step.
            </p>
            <ol className="mt-5 space-y-4">
              {stretch.steps.map((step) => (
                <li key={step.order} className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-500">
                    Step {step.order}
                    {step.holdSeconds ? ` · hold ~${step.holdSeconds}s` : ""}
                    {step.breaths ? ` · ${step.breaths} breaths` : ""}
                  </p>
                  <p className="mt-1 font-medium text-brand-900">{step.instruction}</p>
                  <p className="mt-2 rounded-lg bg-white/80 p-3 text-sm text-brand-700">
                    <span className="font-semibold text-accent-600">Easy words: </span>
                    {step.kidFriendly}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {step.cues.map((c) => (
                      <li key={c} className="chip">
                        {c}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <div className="card space-y-3 p-5">
            <h2 className="font-bold text-brand-950">Form essentials</h2>
            <p className="text-sm">
              <Wind className="mr-1 inline h-4 w-4 text-brand-600" />
              <strong>Breathing:</strong> {stretch.breathing}
            </p>
            <p className="text-sm">
              <strong>Alignment:</strong> {stretch.alignment}
            </p>
            <p className="text-sm">
              <strong>Posture:</strong> {stretch.posture}
            </p>
            <p className="text-sm">
              <strong>Warm-up note:</strong> {stretch.warmUpNotes}
            </p>
          </div>

          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-bold text-brand-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Benefits
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-800">
              {stretch.benefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-bold text-brand-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Risks & care
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-800">
              {stretch.risks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-brand-600">
              Target muscles: {stretch.primaryMuscles.join(", ")}
            </p>
          </div>

          <div className="card p-5">
            <h2 className="font-bold text-brand-950">Variations</h2>
            <ul className="mt-3 space-y-3">
              {stretch.variations.map((v) => (
                <li key={v.id} className="rounded-xl border border-brand-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-brand-900">{v.name}</p>
                    <span className="chip capitalize">{v.difficulty}</span>
                  </div>
                  <p className="mt-1 text-sm text-brand-700">{v.description}</p>
                  <p className="mt-1 text-xs text-brand-500">
                    Pain max recommended: {v.painMaxRecommended}/10 before switching easier
                  </p>
                  {v.modifications.length > 0 && (
                    <p className="mt-1 text-xs text-brand-600">
                      Mods: {v.modifications.join("; ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <Link
            href={`/builder?addStretch=${encodeURIComponent(stretch.id)}`}
            className="btn-primary w-full"
          >
            Add to my routine
          </Link>
        </aside>
      </div>
    </div>
  );
}
