import Link from "next/link";
import type { Stretch } from "@/lib/types";
import { BODY_PART_LABELS } from "@/data/stretch-library";
import { Clock, Layers, PlayCircle } from "lucide-react";

export function StretchCard({ stretch }: { stretch: Stretch }) {
  return (
    <Link
      href={`/library/${stretch.slug}`}
      className="card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-brand-900 group-hover:text-brand-700">
          {stretch.name}
        </h3>
        <span className="chip capitalize">{stretch.difficulty}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-brand-700/75">
        {stretch.benefits[0]}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {stretch.bodyParts.slice(0, 3).map((bp) => (
          <span key={bp} className="chip">
            {BODY_PART_LABELS[bp]}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs text-brand-600">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {Math.round(stretch.durationSeconds / 60)}+ min
        </span>
        <span className="inline-flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" />
          {stretch.variations.length} variations
        </span>
        <span className="inline-flex items-center gap-1">
          <PlayCircle className="h-3.5 w-3.5" />
          Video
        </span>
      </div>
      <p className="mt-2 text-[11px] text-brand-500">
        Video: {stretch.video.institution}
      </p>
    </Link>
  );
}
