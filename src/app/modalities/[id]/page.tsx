"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getModalityById,
  MODALITY_CATEGORY_LABELS,
} from "@/data/modalities";
import { ModalityGuidePanel } from "@/components/ModalityGuidePanel";
import { AddModalitiesToProgram } from "@/components/AddModalitiesToProgram";
import { ArrowLeft, Home, Hospital } from "lucide-react";

export default function ModalityDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const modality = useMemo(() => getModalityById(id), [id]);

  if (!modality) {
    return (
      <div className="card space-y-3 p-6">
        <p>Modality not found.</p>
        <Link href="/modalities" className="btn-primary">
          Back to modalities
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/modalities"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        All modalities
      </Link>

      <header className="card p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
          {MODALITY_CATEGORY_LABELS[modality.category]}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-brand-950">{modality.name}</h1>
        <p className="mt-2 text-sm text-brand-800">{modality.plainLanguage}</p>
        <p className="mt-1 text-sm text-brand-600">{modality.kidFriendly}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
          <span className="chip inline-flex items-center gap-1">
            {modality.setting === "clinic" ? (
              <>
                <Hospital className="h-3 w-3" /> Clinic
              </>
            ) : (
              <>
                <Home className="h-3 w-3" /> {modality.setting}
              </>
            )}
          </span>
          {modality.durationMinutes && (
            <span className="chip">{modality.durationMinutes} min</span>
          )}
          {modality.timings.map((t) => (
            <span key={t} className="chip">
              {t.replace(/-/g, " ")}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-brand-700">
          <strong>Clinical intent:</strong> {modality.clinicalIntent}
        </p>
        <p className="mt-2 text-xs text-brand-600">{modality.evidenceNotes}</p>
      </header>

      <section className="card p-4 sm:p-6">
        <h2 className="text-lg font-bold text-brand-950">
          Safe & effective use — full guide
        </h2>
        <p className="mt-1 text-sm text-brand-700/85">
          Types/versions, control settings, step-by-step set-up, safety, troubleshooting, and
          kid-friendly wording. Toggle kid-friendly mode inside the guide.
        </p>
        <div className="mt-4">
          <ModalityGuidePanel modality={modality} />
        </div>
      </section>

      <AddModalitiesToProgram presetIds={[modality.id]} />
    </div>
  );
}
