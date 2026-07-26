"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Goal, SessionLog } from "@/lib/types";
import { TrendingUp, Target } from "lucide-react";
import { v4 as uuid } from "uuid";
import Link from "next/link";
import { loadClinicalContext } from "@/lib/clinical-context";

const GOAL_STARTERS = [
  "Stretch 4 days this week",
  "Complete 3 full sessions",
  "Walk 15–20 minutes most days",
  "Reduce morning stiffness before work",
  "Practice balance drills 3× this week",
];

export default function ProgressPage() {
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalMetric, setGoalMetric] = useState("sessions per week");
  const [goalNotes, setGoalNotes] = useState("");
  const [autoFillGoals, setAutoFillGoals] = useState(true);
  const goalEditedRef = useRef(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const localSessions: SessionLog[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("session:")) {
        try {
          localSessions.push(JSON.parse(localStorage.getItem(key)!));
        } catch {
          /* skip */
        }
      }
    }
    localSessions.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    setSessions(localSessions);

    const g = localStorage.getItem("goals");
    if (g) setGoals(JSON.parse(g));

    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d) => {
        if (d.sessions?.length) setSessions(d.sessions);
      })
      .catch(() => {});

    // Auto-suggestions from Assessment clinical context
    try {
      const ctx = loadClinicalContext();
      const fromCtx = (ctx?.goals || []).map((x) => String(x).trim()).filter(Boolean);
      const next = Array.from(new Set([...fromCtx, ...GOAL_STARTERS])).slice(0, 12);
      setSuggestions(next);
      if (autoFillGoals && !goalEditedRef.current && fromCtx[0]) {
        setGoalTitle(fromCtx[0]);
        setGoalNotes(
          fromCtx.length > 1
            ? fromCtx.slice(1).join("\n")
            : "Stay consistent with short sessions and track pain before/after."
        );
        setGoalMetric("sessions per week");
      }
    } catch {
      setSuggestions(GOAL_STARTERS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const stats = useMemo(() => {
    const completed = sessions.filter((s) => s.completed);
    const totalMin = completed.reduce((n, s) => n + s.durationMinutes, 0);
    const avgBefore =
      completed.length === 0
        ? 0
        : completed.reduce((n, s) => n + s.averagePainBefore, 0) / completed.length;
    const avgAfter =
      completed.length === 0
        ? 0
        : completed.reduce((n, s) => n + s.averagePainAfter, 0) / completed.length;
    return {
      count: completed.length,
      totalMin,
      avgBefore: avgBefore.toFixed(1),
      avgAfter: avgAfter.toFixed(1),
      delta: (avgAfter - avgBefore).toFixed(1),
    };
  }, [sessions]);

  function applySuggestion(text: string) {
    goalEditedRef.current = true;
    setGoalTitle(text);
  }

  function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    const title = goalNotes.trim()
      ? `${goalTitle.trim()}${goalNotes.trim() ? ` — ${goalNotes.trim().split("\n")[0]}` : ""}`
      : goalTitle.trim();
    const goal: Goal = {
      id: uuid(),
      title: title.slice(0, 240),
      metric: goalMetric,
      status: "active",
      createdAt: new Date().toISOString(),
      current: sessions.filter((s) => s.completed).length,
      baseline: 0,
    };
    const next = [goal, ...goals];
    setGoals(next);
    localStorage.setItem("goals", JSON.stringify(next));
    setGoalTitle("");
    setGoalNotes("");
    goalEditedRef.current = false;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-950">
          <TrendingUp className="h-7 w-7 text-brand-600" />
          Progress & goals
        </h1>
        <p className="mt-1 text-sm text-brand-700/85">
          Track sessions, pain trends, and goals—similar to how outpatient PT reviews outcomes over
          time.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Completed sessions", value: String(stats.count) },
          { label: "Minutes practiced", value: String(stats.totalMin) },
          { label: "Avg pain before", value: stats.avgBefore },
          { label: "Avg pain after", value: stats.avgAfter },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-2xl font-bold text-brand-800">{s.value}</p>
            <p className="text-sm text-brand-600">{s.label}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-brand-700">
        Average pain change (after − before):{" "}
        <strong className={Number(stats.delta) <= 0 ? "text-emerald-700" : "text-amber-700"}>
          {stats.delta}
        </strong>{" "}
        (negative usually means sessions left you feeling better)
      </p>

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold text-brand-900">
            <Target className="h-5 w-5" /> Goals
          </h2>
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-brand-700">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-brand-600"
              checked={autoFillGoals}
              onChange={(e) => {
                setAutoFillGoals(e.target.checked);
                if (e.target.checked && suggestions[0] && !goalEditedRef.current) {
                  setGoalTitle(suggestions[0]);
                }
              }}
            />
            Auto-fill suggestions
          </label>
        </div>
        <p className="mt-1 text-xs text-brand-600">
          Free-text goals auto-populate from your Assessment when available—edit or pick a chip.
        </p>

        <form onSubmit={addGoal} className="mt-3 space-y-2">
          <input
            className="input"
            list="goal-title-suggestions"
            placeholder="Goal title (auto-fills from Assessment when available)"
            value={goalTitle}
            onChange={(e) => {
              goalEditedRef.current = true;
              setGoalTitle(e.target.value);
            }}
            aria-label="Goal title"
          />
          <datalist id="goal-title-suggestions">
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <textarea
            className="input min-h-[88px] resize-y text-sm leading-relaxed"
            placeholder="Optional details — one idea per line (auto-suggested from your plan goals)"
            value={goalNotes}
            onChange={(e) => {
              goalEditedRef.current = true;
              setGoalNotes(e.target.value);
            }}
            aria-label="Goal free text details"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="input sm:max-w-xs"
              value={goalMetric}
              onChange={(e) => setGoalMetric(e.target.value)}
              placeholder="Metric (e.g. sessions per week)"
              aria-label="Goal metric"
            />
            <button type="submit" className="btn-primary shrink-0">
              Add goal
            </button>
          </div>
        </form>

        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-800 hover:border-brand-400 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-100"
                onClick={() => applySuggestion(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {goals.length === 0 && (
            <li className="text-sm text-brand-600">No goals yet—set one to stay motivated.</li>
          )}
          {goals.map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-brand-900">{g.title}</p>
                <p className="text-xs text-brand-600">
                  {g.metric} · {g.status}
                </p>
              </div>
              <span className="chip">Logged sessions: {g.current ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-brand-900">Recent sessions</h2>
        <ul className="mt-3 divide-y divide-brand-100">
          {sessions.length === 0 && (
            <li className="py-4 text-sm text-brand-600">
              No sessions logged yet.{" "}
              <Link href="/routines" className="font-semibold text-brand-700 underline">
                Start a routine
              </Link>
            </li>
          )}
          {sessions.slice(0, 15).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-medium text-brand-900">
                  {new Date(s.startedAt).toLocaleString()}
                </p>
                <p className="text-xs text-brand-600">
                  {s.durationMinutes} min · {s.stretchIds.length} stretches · effort{" "}
                  {s.difficultyFelt}/5
                </p>
                {s.notes && <p className="mt-1 text-brand-700">{s.notes}</p>}
              </div>
              <span className="chip">
                Pain {s.averagePainBefore}→{s.averagePainAfter}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
