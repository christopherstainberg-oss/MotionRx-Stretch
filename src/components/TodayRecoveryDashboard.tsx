"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  addHydrationOz,
  buildTodayRecoverySnapshot,
  saveProgressionCheck,
  type ProgressionCheck,
  type TodayRecoverySnapshot,
} from "@/lib/recovery-today";
import {
  AlertTriangle,
  Droplets,
  HeartPulse,
  ListChecks,
  Moon,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeVitals } from "@/lib/vitals";
import { labsPlanHints, loadLabReports } from "@/lib/labs-store";

function readinessStyles(band: TodayRecoverySnapshot["readiness"]) {
  switch (band) {
    case "green":
      return "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800";
    case "red":
      return "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:ring-rose-800";
    case "yellow":
      return "bg-amber-50 text-amber-950 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800";
    default:
      return "bg-brand-50 text-brand-900 ring-brand-200 dark:bg-brand-900 dark:text-brand-100 dark:ring-brand-700";
  }
}

export function TodayRecoveryDashboard({
  surgeryId,
  surgeryDate,
  precautionIds,
}: {
  surgeryId?: string;
  surgeryDate?: string;
  precautionIds?: string[];
}) {
  const [snap, setSnap] = useState<TodayRecoverySnapshot | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [painNow, setPainNow] = useState(3);
  const [taskConfidence, setTaskConfidence] = useState(6);
  const [nextDayOk, setNextDayOk] = useState(true);
  const [romOk, setRomOk] = useState(true);
  const [hrLine, setHrLine] = useState<string | null>(null);
  const [labCaution, setLabCaution] = useState(false);

  const refresh = useCallback(() => {
    setSnap(
      buildTodayRecoverySnapshot({ surgeryId, surgeryDate, precautionIds })
    );
    const vit = analyzeVitals();
    const hr = vit.find((v) => v.key === "heart_rate");
    setHrLine(hr ? `RHR ${hr.latest} bpm (${hr.status})` : null);
    setLabCaution(labsPlanHints(loadLabReports()).caution);
  }, [surgeryId, surgeryDate, precautionIds]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!snap) {
    return (
      <section className="card animate-pulse space-y-3 p-5">
        <div className="h-4 w-40 rounded bg-brand-100" />
        <div className="h-16 rounded bg-brand-50" />
      </section>
    );
  }

  function logWater(oz: number) {
    addHydrationOz(oz);
    refresh();
  }

  function submitProgression() {
    const check: ProgressionCheck = {
      at: new Date().toISOString(),
      painNow,
      taskConfidence,
      nextDayOk,
      romOk,
    };
    saveProgressionCheck(check);
    setShowProgress(false);
    refresh();
  }

  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="section-label">Today</p>
          <h2 className="mt-1 text-base font-semibold text-brand-950 dark:text-brand-50">
            Readiness
          </h2>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1",
            readinessStyles(snap.readiness)
          )}
        >
          {snap.readiness}
        </span>
      </div>

      {snap.clearanceCaution && snap.clearanceBody && (
        <div className="flex gap-2 rounded-xl bg-amber-50/90 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs leading-relaxed">{snap.clearanceBody}</p>
        </div>
      )}

      {snap.readinessWhy[0] ? (
        <p className="text-sm leading-relaxed text-brand-600 dark:text-brand-300">
          {snap.readinessWhy[0]}
          {snap.readinessWhy.length > 1 ? (
            <span className="text-brand-400"> · +{snap.readinessWhy.length - 1} more</span>
          ) : null}
        </p>
      ) : null}

      {/* Metrics — softer cells, less nested chrome */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-brand-50/60 p-3 dark:bg-brand-900/30">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
            <Droplets className="h-3.5 w-3.5" />
            Hydration
          </div>
          <p className="mt-1 text-lg font-bold text-brand-950 dark:text-brand-50">
            {snap.hydrationOz}
            <span className="text-xs font-medium text-brand-500">
              /{snap.hydrationTarget} oz
            </span>
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{ width: `${snap.hydrationPct}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {[8, 12, 16].map((oz) => (
              <button
                key={oz}
                type="button"
                onClick={() => logWater(oz)}
                className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950 dark:text-sky-100 dark:ring-sky-800"
              >
                +{oz}oz
              </button>
            ))}
          </div>
        </div>

        <Link
          href="/sleep"
          className="rounded-xl border border-brand-100 bg-brand-50/50 p-3 transition hover:border-brand-300 dark:border-brand-800 dark:bg-brand-950/40"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
            <Moon className="h-3.5 w-3.5" />
            Sleep
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug text-brand-950 dark:text-brand-50">
            {snap.sleepLine}
          </p>
          <p className="mt-1 text-[11px] text-brand-500">Open PSQI →</p>
        </Link>

        <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3 dark:border-brand-800 dark:bg-brand-950/40">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
            <Stethoscope className="h-3.5 w-3.5" />
            Clinical
          </div>
          <p className="mt-1 text-xs font-medium text-brand-800 dark:text-brand-200">
            {snap.storyIrritability
              ? `Irritability ${snap.storyIrritability}`
              : "No story irritability yet"}
            {snap.phaseBias ? ` · ${snap.phaseBias}` : ""}
          </p>
          {snap.injuryLine && (
            <p className="mt-1 text-[11px] text-brand-500">{snap.injuryLine}</p>
          )}
          {snap.surgeryLine && (
            <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-200">
              {snap.surgeryLine}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowProgress((s) => !s)}
          className="rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-left transition hover:border-brand-300 dark:border-brand-800 dark:bg-brand-950/40"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <TrendingUp className="h-3.5 w-3.5" />
            Progress Gate
          </div>
          <p className="mt-1 text-xs font-medium text-brand-800 dark:text-brand-200">
            {snap.lastProgression
              ? `Last: Pain ${snap.lastProgression.painNow}/10 · Confidence ${snap.lastProgression.taskConfidence}/10`
              : "Log Ready-To-Progress Check"}
          </p>
          <p className="mt-1 text-[11px] text-brand-500">
            {showProgress ? "Hide form" : "Open check →"}
          </p>
        </button>
      </div>

      {showProgress && (
        <div className="space-y-3 rounded-xl border border-brand-200 bg-white p-3 dark:border-brand-700 dark:bg-brand-950">
          <p className="text-xs text-brand-600">{snap.progressionHint}</p>
          <label className="block text-xs font-medium text-brand-700">
            Pain most of day (0–10): {painNow}
            <input
              type="range"
              min={0}
              max={10}
              value={painNow}
              onChange={(e) => setPainNow(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-xs font-medium text-brand-700">
            Hardest task confidence (0–10): {taskConfidence}
            <input
              type="range"
              min={0}
              max={10}
              value={taskConfidence}
              onChange={(e) => setTaskConfidence(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-brand-800">
            <input
              type="checkbox"
              checked={nextDayOk}
              onChange={(e) => setNextDayOk(e.target.checked)}
            />
            No meaningful next-day flare after last session
          </label>
          <label className="flex items-center gap-2 text-xs text-brand-800">
            <input
              type="checkbox"
              checked={romOk}
              onChange={(e) => setRomOk(e.target.checked)}
            />
            Motion feels freer or more confident than last week
          </label>
          <button type="button" className="btn-primary w-full text-sm" onClick={submitProgression}>
            Save Progression Check
          </button>
        </div>
      )}

      {(hrLine || labCaution) && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-2 text-xs dark:border-brand-800 dark:bg-brand-950/40">
          <HeartPulse className="h-3.5 w-3.5 text-brand-600" />
          {hrLine && <span className="font-medium text-brand-800 dark:text-brand-100">{hrLine}</span>}
          {labCaution && (
            <span className="font-semibold text-amber-800 dark:text-amber-200">
              Lab Caution On File
            </span>
          )}
          <Link href="/health" className="ml-auto font-semibold text-brand-700 underline">
            Health →
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/routines/session" className="btn-primary flex-1 py-2.5 text-sm sm:flex-none">
          <ListChecks className="h-4 w-4" />
          Start Session
        </Link>
        <Link href="/health" className="btn-secondary flex-1 py-2.5 text-sm sm:flex-none">
          Vitals & Labs
        </Link>
        <Link href="/assessment" className="btn-secondary flex-1 py-2.5 text-sm sm:flex-none">
          Update Assess
        </Link>
        <Link href="/journal" className="btn-secondary flex-1 py-2.5 text-sm sm:flex-none">
          Journal
        </Link>
      </div>
    </section>
  );
}
