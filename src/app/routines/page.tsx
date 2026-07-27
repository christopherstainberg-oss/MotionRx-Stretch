import Link from "next/link";
import { STARTER_ROUTINES } from "@/lib/routine-engine";
import { ListChecks } from "lucide-react";
import { ClinicalCorrelationCard } from "@/components/ClinicalCorrelationCard";
import { HomeTodaySection } from "@/components/HomeTodaySection";

export const metadata = { title: "Routines" };

export default function RoutinesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-950">
            <ListChecks className="h-7 w-7 text-brand-600" />
            Stretch + exercise routines
          </h1>
          <p className="mt-1 text-sm text-brand-700/85">
            Hybrid outpatient-style templates combining stretches and exercises. Personalize from a
            written concern, rotate items or whole plans in Builder, and self-adjust with pain feedback
            or Jeffery. Use the progress gate before advancing load.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/assessment" className="btn-primary">
            Start Assessment
          </Link>
          <Link href="/builder" className="btn-secondary">
            Open builder
          </Link>
        </div>
      </div>

      <HomeTodaySection />
      <ClinicalCorrelationCard section="routines" />

      <div className="grid gap-4 md:grid-cols-2">
        {STARTER_ROUTINES.map((r) => (
          <article key={r.name} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-brand-900">{r.name}</h2>
              <span className="chip capitalize">{r.difficulty}</span>
            </div>
            <p className="mt-2 flex-1 text-sm text-brand-700/85">{r.description}</p>
            <p className="mt-3 text-xs text-brand-600">
              Focus: {r.focusAreas.join(", ")} · ~{r.estimatedMinutes} min ·{" "}
              {r.stretchIds.length} stretches · {r.exerciseIds?.length || 0} exercises
            </p>
            <Link
              href={`/routines/session?starter=${encodeURIComponent(r.name)}`}
              className="btn-secondary mt-4"
            >
              Start session
            </Link>
          </article>
        ))}
      </div>

      <div className="card border-dashed p-6 text-sm text-brand-700">
        <p className="font-semibold text-brand-900">How self-adjust works</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Log pain before and after each session (0–10).</li>
          <li>Pain ≤3 and easy effort → optional progression.</li>
          <li>Pain 4–5 → hold or modify variations.</li>
          <li>Pain ≥6 or rise of 2+ points → regress difficulty and volume.</li>
        </ul>
      </div>
    </div>
  );
}
