import { Suspense } from "react";
import Link from "next/link";
import {
  EXERCISE_CATEGORY_LABELS,
  EXERCISE_STATS,
  listExercises,
} from "@/data/exercise-library";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import type { BodyPart, Difficulty, ExerciseCategory } from "@/lib/types";
import { Dumbbell, Layers } from "lucide-react";
import { ExerciseFilters } from "./ExerciseFilters";

export const metadata = { title: "Exercise Library" };

export default function ExercisesPage({
  searchParams,
}: {
  searchParams: {
    bodyPart?: string;
    difficulty?: string;
    category?: string;
    q?: string;
    page?: string;
  };
}) {
  const page = Math.max(1, Number(searchParams.page || 1));
  const limit = 24;
  const offset = (page - 1) * limit;
  const bodyPart = (searchParams.bodyPart as BodyPart | "all") || "all";
  const difficulty = (searchParams.difficulty as Difficulty | "all") || "all";
  const category = (searchParams.category as ExerciseCategory | "all") || "all";
  const q = searchParams.q || "";

  const { items, total, capacity } = listExercises({
    offset,
    limit,
    bodyPart,
    difficulty,
    category,
    query: q,
  });

  const totalPages = Math.max(1, Math.ceil(Math.min(total, 5000) / limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-950">
          <Dumbbell className="h-7 w-7 text-brand-600" />
          Exercise library
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-brand-700/85">
          <strong>Separate from stretches.</strong> Clinician-styled strength, activation, balance,
          and functional exercises with variations, step-by-step (kid-friendly) guidance, and
          clinical “what / why / outcome” education. Catalog capacity:{" "}
          <span className="font-semibold">{capacity.toLocaleString()}</span> entries (
          {EXERCISE_STATS.baseCount} clinical bases × dosing/context modifiers).{" "}
          {EXERCISE_STATS.note}
        </p>
        <p className="mt-2 text-sm">
          Looking for mobility holds?{" "}
          <Link href="/library" className="font-semibold text-brand-700 underline">
            Open Stretch Library
          </Link>
        </p>
      </div>

      <Suspense fallback={<div className="card p-4 text-sm text-brand-600">Loading filters…</div>}>
        <ExerciseFilters
          bodyParts={Object.entries(BODY_PART_LABELS).map(([value, label]) => ({ value, label }))}
          categories={Object.entries(EXERCISE_CATEGORY_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </Suspense>

      <p className="text-sm text-brand-600">
        Showing {items.length} · page {page}
        {total < capacity ? ` · filtered ~${total}` : ` · catalog ${capacity.toLocaleString()}`}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((ex) => (
          <Link
            key={ex.id}
            href={`/exercises/${ex.slug}`}
            className="card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-soft"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-brand-900 group-hover:text-brand-700">{ex.name}</h2>
              <span className="chip capitalize">{ex.difficulty}</span>
            </div>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-500">
              {EXERCISE_CATEGORY_LABELS[ex.category]} · {ex.defaultSets}×{ex.defaultReps}
            </p>
            <p className="mt-2 line-clamp-2 text-sm text-brand-700/80">{ex.clinical.whatItDoes}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ex.bodyParts.slice(0, 3).map((bp) => (
                <span key={bp} className="chip">
                  {BODY_PART_LABELS[bp]}
                </span>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1 text-xs text-brand-600">
              <Layers className="h-3.5 w-3.5" />
              {ex.variations.length} variations · {ex.video.institution}
            </p>
          </Link>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        {page > 1 && (
          <Link
            href={`/exercises?page=${page - 1}&bodyPart=${bodyPart}&difficulty=${difficulty}&category=${category}&q=${encodeURIComponent(q)}`}
            className="btn-secondary"
          >
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={`/exercises?page=${page + 1}&bodyPart=${bodyPart}&difficulty=${difficulty}&category=${category}&q=${encodeURIComponent(q)}`}
            className="btn-primary"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
