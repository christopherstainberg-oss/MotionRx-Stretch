import { Suspense } from "react";
import { StretchCard } from "@/components/StretchCard";
import { BODY_PART_LABELS, filterStretches, LIBRARY_STATS } from "@/data/stretch-library";
import type { BodyPart, Difficulty, DurationBucket } from "@/lib/types";
import { LibraryFilters } from "./LibraryFilters";

export const metadata = { title: "Stretch Library" };

export default function LibraryPage({
  searchParams,
}: {
  searchParams: {
    bodyPart?: string;
    difficulty?: string;
    duration?: string;
    q?: string;
  };
}) {
  const bodyPart = (searchParams.bodyPart as BodyPart | "all") || "all";
  const difficulty = (searchParams.difficulty as Difficulty | "all") || "all";
  const duration = (searchParams.duration as DurationBucket | "all") || "all";
  const q = searchParams.q || "";

  const results = filterStretches({ bodyPart, difficulty, duration, query: q });

  // Prefer showing unique base-like entries first for browsing UX
  const display = results.slice(0, 60);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-950">Stretch & exercise library</h1>
        <p className="mt-1 max-w-2xl text-sm text-brand-700/85">
          <strong>Stretch library only</strong> (exercises are separate). Categorized by body part,
          difficulty, and duration with step-by-step guidance, clinical “what/why/outcome” education,
          kid-friendly cues, variations, and institutional video links.{" "}
          <span className="font-medium">
            {LIBRARY_STATS.totalEntries} catalog entries
          </span>{" "}
          from {LIBRARY_STATS.baseCount} clinician-authored bases (+ {LIBRARY_STATS.variationCount}{" "}
          named variations). {LIBRARY_STATS.note}
        </p>
        <p className="mt-2 text-sm">
          Need strength, activation, or functional drills?{" "}
          <a href="/exercises" className="font-semibold text-brand-700 underline">
            Open Exercise Library
          </a>
        </p>
      </div>

      <Suspense fallback={<div className="card p-4 text-sm text-brand-600">Loading filters…</div>}>
        <LibraryFilters
          bodyParts={Object.entries(BODY_PART_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </Suspense>

      <p className="text-sm text-brand-600">
        Showing {display.length} of {results.length} matches
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {display.map((s) => (
          <StretchCard key={s.id} stretch={s} />
        ))}
      </div>

      {display.length === 0 && (
        <div className="card p-8 text-center text-brand-700">
          No stretches match those filters. Try another body part or clear search.
        </div>
      )}
    </div>
  );
}
