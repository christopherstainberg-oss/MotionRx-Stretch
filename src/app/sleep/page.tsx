"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  COMPONENT_LABELS,
  PSQI_DISTURBANCE_ITEMS,
  PSQI_ENTHUSIASM_OPTIONS,
  PSQI_FREQ_OPTIONS,
  PSQI_QUALITY_OPTIONS,
  bandBadgeClass,
  defaultPsqiAnswers,
  loadPsqiLogs,
  savePsqiLogs,
  scorePsqi,
  sleepSuggestionsFromScore,
  trendFromLogs,
  type PsqiAnswers,
  type PsqiComponents,
  type PsqiFreq,
  type PsqiLogEntry,
} from "@/lib/psqi";
import { cn } from "@/lib/utils";
import {
  Moon,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Trash2,
} from "lucide-react";
import { v4 as uuid } from "uuid";

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function MetricTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-brand-100/80 bg-brand-50/40 p-3 dark:border-brand-800 dark:bg-brand-950/50">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">
        {label}
      </p>
      <div className="mt-1 text-lg font-bold tabular-nums text-brand-950 dark:text-brand-50">
        {value}
      </div>
      {sub ? (
        <p className="mt-0.5 text-[11px] text-brand-600 dark:text-brand-400">{sub}</p>
      ) : null}
    </div>
  );
}

function ComponentTile({
  code,
  label,
  score,
}: {
  code: string;
  label: string;
  score: number;
}) {
  return (
    <div className="rounded-xl border border-brand-100/70 bg-white/60 p-2.5 dark:border-brand-800 dark:bg-brand-950/40">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">
        {code} · {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums text-brand-900 dark:text-brand-50">
        {score}
      </p>
    </div>
  );
}

function PsqiTrendChart({ logs }: { logs: PsqiLogEntry[] }) {
  // oldest → newest for left-to-right
  const points = [...logs].reverse().slice(-12);
  if (points.length < 2) {
    return (
      <p className="text-xs text-brand-500">
        Log at least two scores to see your PSQI trend (lower is better).
      </p>
    );
  }
  const w = 280;
  const h = 88;
  const pad = 8;
  const maxY = 21;
  const xs = points.map((_, i) =>
    points.length === 1
      ? w / 2
      : pad + (i * (w - pad * 2)) / (points.length - 1)
  );
  const ys = points.map(
    (p) => pad + ((maxY - p.result.global) / maxY) * (h - pad * 2)
  );
  const poly = xs.map((x, i) => `${x},${ys[i]}`).join(" ");

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-brand-500">
        <span>PSQI over time</span>
        <span>lower is better</span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-24 w-full overflow-visible"
        role="img"
        aria-label="PSQI score trend chart"
      >
        <line
          x1={pad}
          y1={h - pad}
          x2={w - pad}
          y2={h - pad}
          className="stroke-brand-200 dark:stroke-brand-700"
          strokeWidth={1}
        />
        <polyline
          fill="none"
          stroke="currentColor"
          className="text-sky-400"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={poly}
        />
        {xs.map((x, i) => (
          <circle
            key={points[i]!.id}
            cx={x}
            cy={ys[i]}
            r={3.5}
            className="fill-sky-300"
          />
        ))}
      </svg>
      <div className="mt-0.5 flex justify-between text-[10px] text-brand-500">
        <span>{formatShortDate(points[0]!.createdAt)}</span>
        <span>{formatShortDate(points[points.length - 1]!.createdAt)}</span>
      </div>
    </div>
  );
}

function FreqSelect({
  value,
  onChange,
  id,
  options = PSQI_FREQ_OPTIONS,
}: {
  value: PsqiFreq;
  onChange: (v: PsqiFreq) => void;
  id: string;
  options?: readonly { value: number; label: string }[];
}) {
  return (
    <select
      id={id}
      className="input text-sm"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) as PsqiFreq)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function SleepPage() {
  const [answers, setAnswers] = useState<PsqiAnswers>(() => defaultPsqiAnswers());
  const [logs, setLogs] = useState<PsqiLogEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLogs(loadPsqiLogs());
    setReady(true);
  }, []);

  const live = useMemo(() => scorePsqi(answers), [answers]);
  const liveSuggestions = useMemo(
    () => sleepSuggestionsFromScore(live),
    [live]
  );

  const latest = logs[0] ?? null;
  const metricsSource = latest?.result ?? live;
  const suggestions = latest
    ? sleepSuggestionsFromScore(latest.result)
    : liveSuggestions;

  const nightsLogged = logs.length;
  const avgGlobal =
    nightsLogged === 0
      ? live.global
      : Math.round(
          (logs.reduce((n, e) => n + e.result.global, 0) / nightsLogged) * 10
        ) / 10;
  const avgSleep =
    nightsLogged === 0
      ? live.hoursSleep
      : Math.round(
          (logs.reduce((n, e) => n + e.result.hoursSleep, 0) / nightsLogged) *
            10
        ) / 10;
  const avgEff =
    nightsLogged === 0
      ? live.sleepEfficiency
      : Math.round(
          (logs.reduce((n, e) => n + e.result.sleepEfficiency, 0) /
            nightsLogged) *
            10
        ) / 10;
  const best =
    nightsLogged === 0
      ? live.global
      : Math.min(...logs.map((e) => e.result.global));

  const trend = trendFromLogs(logs);

  function setField<K extends keyof PsqiAnswers>(key: K, value: PsqiAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function setDisturbance(key: keyof PsqiAnswers["disturbances"], value: PsqiFreq) {
    setAnswers((prev) => ({
      ...prev,
      disturbances: { ...prev.disturbances, [key]: value },
    }));
  }

  function logScore() {
    const result = scorePsqi(answers);
    const entry: PsqiLogEntry = {
      id: uuid(),
      createdAt: new Date().toISOString(),
      answers: structuredClone(answers),
      result,
    };
    const next = [entry, ...logs].slice(0, 60);
    setLogs(next);
    savePsqiLogs(next);
  }

  function removeLog(id: string) {
    const next = logs.filter((e) => e.id !== id);
    setLogs(next);
    savePsqiLogs(next);
  }

  const components: PsqiComponents = live.components;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <PageHeader
        title="Sleep"
        description="Score your sleep quality with a full month PSQI-style interview, track trends, and get practical ways to improve."
        eyebrow="Recovery & rest"
      />

      <p className="text-xs leading-relaxed text-brand-500 dark:text-brand-400">
        Educational self-tracking based on the Pittsburgh Sleep Quality Index (PSQI)
        instrument (Buysse et al., 1989 / Hartford Institute). Not a diagnosis or medical
        advice. Global scores range 0–21; lower is better. A global score ≥ 5 often
        indicates poor sleep quality patterns.
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {/* ── Left: questionnaire ── */}
        <section className="card space-y-5 p-4 sm:p-5">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/15 text-sky-400">
              <Moon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-brand-900 dark:text-brand-50">
                Sleep quality — PSQI
              </h2>
              <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-400">
                Answer for your usual habits during the past month.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">1. Usual bedtime</span>
              <input
                type="time"
                className="input"
                value={answers.bedtime}
                onChange={(e) => setField("bedtime", e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">3. Usual wake time</span>
              <input
                type="time"
                className="input"
                value={answers.wakeTime}
                onChange={(e) => setField("wakeTime", e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">2. Minutes to fall asleep</span>
              <input
                type="number"
                min={0}
                max={240}
                className="input"
                value={answers.latencyMinutes}
                onChange={(e) =>
                  setField("latencyMinutes", Math.max(0, Number(e.target.value) || 0))
                }
              />
            </label>
            <label className="block">
              <span className="label">4. Hours of actual sleep</span>
              <input
                type="number"
                min={0}
                max={16}
                step={0.25}
                className="input"
                value={answers.hoursSleep}
                onChange={(e) =>
                  setField("hoursSleep", Math.max(0, Number(e.target.value) || 0))
                }
              />
            </label>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-medium text-brand-800 dark:text-brand-100">
              5. During the past month, trouble sleeping because you…
            </p>
            {PSQI_DISTURBANCE_ITEMS.map((item, idx) => (
              <label key={item.key} className="block">
                <span className="mb-1 block text-xs text-brand-600 dark:text-brand-300">
                  {String.fromCharCode(97 + idx)}. {item.label}
                </span>
                <FreqSelect
                  id={`dist-${item.key}`}
                  value={answers.disturbances[item.key]}
                  onChange={(v) => setDisturbance(item.key, v)}
                />
              </label>
            ))}
            {answers.disturbances.j > 0 ? (
              <label className="block">
                <span className="label">Other reason (describe)</span>
                <input
                  type="text"
                  className="input"
                  value={answers.otherReason || ""}
                  onChange={(e) => setField("otherReason", e.target.value)}
                  placeholder="Optional description"
                />
              </label>
            ) : null}
          </div>

          <label className="block">
            <span className="label">
              6. How often have you taken medicine to help you sleep?
            </span>
            <FreqSelect
              id="q6"
              value={answers.sleepMeds}
              onChange={(v) => setField("sleepMeds", v)}
            />
          </label>

          <label className="block">
            <span className="label">
              7. Trouble staying awake (driving, meals, social activity)?
            </span>
            <FreqSelect
              id="q7"
              value={answers.daytimeSleepiness}
              onChange={(v) => setField("daytimeSleepiness", v)}
            />
          </label>

          <label className="block">
            <span className="label">
              8. Problem keeping up enthusiasm to get things done?
            </span>
            <FreqSelect
              id="q8"
              value={answers.enthusiasm}
              onChange={(v) => setField("enthusiasm", v)}
              options={PSQI_ENTHUSIASM_OPTIONS}
            />
          </label>

          <label className="block">
            <span className="label">9. Overall sleep quality?</span>
            <FreqSelect
              id="q9"
              value={answers.subjectiveQuality}
              onChange={(v) => setField("subjectiveQuality", v)}
              options={PSQI_QUALITY_OPTIONS}
            />
          </label>

          {/* Live global + components */}
          <div
            className={cn(
              "rounded-2xl border p-4",
              live.band === "good"
                ? "border-emerald-500/30 bg-emerald-500/10"
                : live.band === "fair"
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-rose-500/30 bg-rose-500/10"
            )}
          >
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">
                  Global PSQI
                </p>
                <p className="text-3xl font-bold tabular-nums text-brand-950 dark:text-brand-50">
                  {live.global}
                  <span className="text-base font-semibold text-brand-500">/21</span>
                </p>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                    bandBadgeClass(live.band)
                  )}
                >
                  {live.bandLabel}
                </span>
                <p className="mt-1 text-[11px] text-brand-500">
                  Sleep quality edge {live.qualityPercent}%
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              Object.keys(COMPONENT_LABELS) as (keyof PsqiComponents)[]
            ).map((key) => (
              <ComponentTile
                key={key}
                code={key.toUpperCase()}
                label={COMPONENT_LABELS[key]}
                score={components[key]}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={logScore}
            className="btn-primary w-full py-3 text-base"
          >
            <Plus className="h-4 w-4" />
            Log sleep score
          </button>

          {/* History */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-500">
              Logged sleep scores
            </h3>
            {!ready ? (
              <p className="text-sm text-brand-500">Loading…</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-brand-500">
                No scores yet — complete the form and tap Log sleep score.
              </p>
            ) : (
              <ul className="divide-y divide-brand-100 dark:divide-brand-800">
                {logs.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold tabular-nums text-brand-900 dark:text-brand-50">
                          PSQI {entry.result.global}/21
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            bandBadgeClass(entry.result.band)
                          )}
                        >
                          {entry.result.bandLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-brand-500">
                        {formatShortDate(entry.createdAt)} · quality edge{" "}
                        {entry.result.qualityPercent}%
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-brand-400 hover:bg-brand-50 hover:text-rose-500 dark:hover:bg-brand-900"
                      aria-label="Delete log"
                      onClick={() => removeLog(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Right: metrics + suggestions ── */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <section className="card space-y-4 p-4 sm:p-5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-brand-900 dark:text-brand-50">
                  Sleep metrics
                </h2>
                <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-400">
                  Trends from your logged PSQI scores.
                </p>
              </div>
            </div>

            <div
              className={cn(
                "rounded-2xl border p-4",
                metricsSource.band === "good"
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : metricsSource.band === "fair"
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "border-rose-500/35 bg-rose-500/10"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-3xl font-bold tabular-nums text-brand-950 dark:text-brand-50">
                    {latest ? latest.result.global : live.global}
                    <span className="text-base font-semibold text-brand-500">
                      /21
                    </span>
                  </p>
                  <p className="text-xs text-brand-500">
                    {latest
                      ? `Latest · ${formatShortDate(latest.createdAt)}`
                      : "Live draft (not logged yet)"}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    bandBadgeClass(metricsSource.band)
                  )}
                >
                  {metricsSource.bandLabel}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-brand-500">
                Quality edge {metricsSource.qualityPercent}%
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MetricTile label="Nights logged" value={nightsLogged} />
              <MetricTile
                label="Avg PSQI"
                value={
                  <>
                    {avgGlobal}
                    <span className="text-sm font-semibold text-brand-500">/21</span>
                  </>
                }
              />
              <MetricTile
                label="Sleep efficiency"
                value={`${avgEff}%`}
                sub={
                  latest
                    ? `Latest ${latest.result.sleepEfficiency}%`
                    : `Draft ${live.sleepEfficiency}%`
                }
              />
              <MetricTile
                label="Avg sleep"
                value={`${avgSleep} h`}
                sub={
                  latest
                    ? `Latest ${latest.result.hoursSleep} h`
                    : `Draft ${live.hoursSleep} h`
                }
              />
              <MetricTile
                label="Best night"
                value={
                  <>
                    {best}
                    <span className="text-sm font-semibold text-brand-500">/21</span>
                  </>
                }
                sub="lowest PSQI"
              />
              <MetricTile
                label="Trend"
                value={
                  <span className="inline-flex items-center gap-1 text-base">
                    {trend === "improving" ? (
                      <>
                        <TrendingDown className="h-4 w-4 text-emerald-400" />
                        <span className="text-emerald-300">Improving</span>
                      </>
                    ) : trend === "worsening" ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-rose-400" />
                        <span className="text-rose-300">Worsening</span>
                      </>
                    ) : trend === "stable" ? (
                      <>
                        <Minus className="h-4 w-4 text-brand-400" />
                        <span className="text-brand-300">Stable</span>
                      </>
                    ) : (
                      <span className="text-brand-400">—</span>
                    )}
                  </span>
                }
                sub="lower PSQI = better"
              />
            </div>

            <PsqiTrendChart logs={logs} />
          </section>

          <section className="card space-y-3 p-4 sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-brand-900 dark:text-brand-50">
              Ways to improve
            </h2>
            <p className="text-xs text-brand-600 dark:text-brand-400">
              Suggestions follow your highest-scoring PSQI components (areas that need
              the most attention). Educational only.
            </p>
            <ul className="space-y-3">
              {suggestions.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-brand-100/80 bg-brand-50/30 p-3 dark:border-brand-800 dark:bg-brand-950/40"
                >
                  <p className="text-sm font-semibold text-brand-900 dark:text-brand-50">
                    {s.title}
                    {s.relatedComponent ? (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-brand-500">
                        {s.relatedComponent.toUpperCase()}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-brand-600 dark:text-brand-300">
                    {s.detail}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
