"use client";

import { useMemo, useState } from "react";
import type { Modality } from "@/data/modalities";
import { getModalityGuide } from "@/data/modality-guides";
import type { InstructionStep, ModalityTypeOption } from "@/data/modality-guide-types";
import { AlertTriangle, CheckCircle2, Baby, ListOrdered, Settings2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

function StepList({
  steps,
  kidMode,
}: {
  steps: InstructionStep[];
  kidMode: boolean;
}) {
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li
          key={`${s.order}-${s.title}`}
          className="rounded-xl border border-brand-100 bg-white p-3 sm:p-3.5"
        >
          <div className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {s.order}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-brand-950">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-brand-800">
                {kidMode ? s.kidFriendly : s.instruction}
              </p>
              {s.safetyNote && (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {s.safetyNote}
                </p>
              )}
              {s.tip && (
                <p className="mt-1 text-xs font-medium text-brand-600">Tip: {s.tip}</p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ModalityGuidePanel({
  modality,
  initialTypeId,
  compact,
}: {
  modality: Modality;
  initialTypeId?: string;
  compact?: boolean;
}) {
  const guide = useMemo(() => getModalityGuide(modality), [modality]);
  const [typeId, setTypeId] = useState(
    initialTypeId || guide.types[0]?.id || ""
  );
  const [kidMode, setKidMode] = useState(false);
  const [tab, setTab] = useState<"setup" | "settings" | "safety" | "troubleshoot">(
    "setup"
  );

  const type: ModalityTypeOption | undefined =
    guide.types.find((t) => t.id === typeId) || guide.types[0];

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
          Mission
        </p>
        <p className="mt-1 text-sm leading-relaxed text-brand-900">
          {kidMode ? guide.missionKid : guide.mission}
        </p>
        <p className="mt-2 text-xs text-brand-600">
          Setup time ~{guide.estimatedSetupMinutes} min · {guide.types.length} type
          {guide.types.length === 1 ? "" : "s"} / setting path
          {guide.types.length > 1 ? "s" : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1",
              kidMode
                ? "bg-accent-400/20 text-brand-950 ring-accent-400/40"
                : "bg-white text-brand-700 ring-brand-200"
            )}
            onClick={() => setKidMode((k) => !k)}
          >
            <Baby className="h-3.5 w-3.5" />
            {kidMode ? "Kid-friendly ON" : "Kid-friendly OFF"}
          </button>
        </div>
      </div>

      {guide.types.length > 1 && (
        <div>
          <p className="label mb-2">Type / version</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {guide.types.map((t) => {
              const on = t.id === type?.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeId(t.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    on
                      ? "border-brand-400 bg-brand-50 shadow-sm"
                      : "border-brand-100 bg-white hover:border-brand-200"
                  )}
                >
                  <p className="text-sm font-semibold text-brand-950">{t.name}</p>
                  <p className="mt-1 text-xs text-brand-700">
                    {kidMode ? t.kidFriendly : t.plainLanguage}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {type && (
        <div className="rounded-xl border border-brand-100 bg-white p-4">
          <h3 className="font-semibold text-brand-950">{type.name}</h3>
          <p className="mt-1 text-sm text-brand-800">
            {kidMode ? type.kidFriendly : type.plainLanguage}
          </p>
          <p className="mt-2 text-xs text-brand-600">
            <strong>How this differs:</strong> {type.differences}
          </p>
          <p className="mt-2 text-sm text-brand-800">
            <strong>Why use this type:</strong> {kidMode ? type.whyUseKid : type.whyUse}
          </p>
          {type.whenToUse.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-brand-700">
              {type.whenToUse.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["setup", "Set-up steps", ListOrdered],
            ["settings", "Settings", Settings2],
            ["safety", "Safety", AlertTriangle],
            ["troubleshoot", "Fix problems", Wrench],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
              tab === id ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-800"
            )}
            onClick={() => setTab(id)}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "setup" && type && (
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-bold text-brand-900">What you need</h4>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {(kidMode ? guide.whatYouNeedKid : guide.whatYouNeed).map((w) => (
                <li
                  key={w}
                  className="flex items-start gap-2 rounded-lg bg-brand-50/80 px-2.5 py-1.5 text-xs text-brand-800"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
          {guide.commonSetupSteps.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-brand-900">Before any type</h4>
              <StepList steps={guide.commonSetupSteps} kidMode={kidMode} />
            </div>
          )}
          <div>
            <h4 className="mb-2 text-sm font-bold text-brand-900">
              Set-up this type (step-by-step)
            </h4>
            <StepList steps={type.setupSteps} kidMode={kidMode} />
          </div>
          {type.duringUse.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-brand-900">While using</h4>
              <StepList steps={type.duringUse} kidMode={kidMode} />
            </div>
          )}
          <div>
            <h4 className="mb-2 text-sm font-bold text-brand-900">After</h4>
            <StepList steps={guide.afterUseSteps} kidMode={kidMode} />
          </div>
        </div>
      )}

      {tab === "settings" && type && (
        <div className="space-y-3">
          {type.controls.length === 0 && (
            <p className="text-sm text-brand-600">No adjustable settings for this type.</p>
          )}
          {type.controls.map((c) => (
            <article key={c.id} className="rounded-xl border border-brand-100 p-4">
              <h4 className="font-semibold text-brand-950">
                {kidMode ? c.kidFriendlyName : c.name}
              </h4>
              <p className="mt-1 text-sm text-brand-700">{c.description}</p>
              <p className="mt-2 text-xs font-medium text-brand-800">
                How to set: {kidMode ? c.howToSetKid : c.howToSet}
              </p>
              {c.recommendedDefault && (
                <p className="mt-1 text-xs text-emerald-800">
                  Recommended start:{" "}
                  {c.options.find((o) => o.value === c.recommendedDefault)?.label ||
                    c.recommendedDefault}
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {c.options.map((o) => (
                  <li
                    key={o.value}
                    className="rounded-lg border border-brand-50 bg-brand-50/40 px-3 py-2 text-xs"
                  >
                    <p className="font-semibold text-brand-900">{o.label}</p>
                    <p className="mt-0.5 text-brand-700">
                      <strong>When:</strong> {o.whenToUse}
                    </p>
                    <p className="text-brand-700">
                      <strong>Why:</strong> {o.whyThis}
                    </p>
                    {kidMode && (
                      <p className="mt-0.5 text-brand-600">{o.kidFriendly}</p>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      {tab === "safety" && (
        <div className="space-y-3">
          <ul className="space-y-2">
            {guide.safetyChecklist.map((s) => (
              <li
                key={s.item}
                className="flex gap-2 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-sm text-amber-950"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{kidMode ? s.kidFriendly : s.item}</span>
              </li>
            ))}
          </ul>
          <div>
            <h4 className="text-sm font-bold text-rose-900">Do not</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-900/90">
              {guide.doNotList.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-brand-900">Success markers</h4>
            <ul className="mt-2 space-y-1.5">
              {guide.successMarkers.map((s) => (
                <li key={s.marker} className="flex gap-2 text-sm text-brand-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {kidMode ? s.kidFriendly : s.marker}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-brand-900">Proficiency tips</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-800">
              {guide.proficiencyTips.map((t) => (
                <li key={t.tip}>{kidMode ? t.kidFriendly : t.tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "troubleshoot" && (
        <ul className="space-y-2">
          {guide.troubleshooting.map((t) => (
            <li key={t.problem} className="rounded-xl border border-brand-100 p-3">
              <p className="text-sm font-semibold text-brand-950">{t.problem}</p>
              <p className="mt-1 text-sm text-brand-800">
                {kidMode ? t.kidFriendly : t.fix}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
