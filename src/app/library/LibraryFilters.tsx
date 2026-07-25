"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

export function LibraryFilters({
  bodyParts,
}: {
  bodyParts: { value: string; label: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      start(() => router.push(`/library?${next.toString()}`));
    },
    [params, router]
  );

  return (
    <form
      className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const q = String(fd.get("q") || "");
        update("q", q);
      }}
    >
      <div>
        <label className="label" htmlFor="bodyPart">
          Body part
        </label>
        <select
          id="bodyPart"
          className="input"
          defaultValue={params.get("bodyPart") || "all"}
          onChange={(e) => update("bodyPart", e.target.value)}
        >
          <option value="all">All areas</option>
          {bodyParts.map((bp) => (
            <option key={bp.value} value={bp.value}>
              {bp.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="difficulty">
          Difficulty
        </label>
        <select
          id="difficulty"
          className="input"
          defaultValue={params.get("difficulty") || "all"}
          onChange={(e) => update("difficulty", e.target.value)}
        >
          <option value="all">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="duration">
          Duration
        </label>
        <select
          id="duration"
          className="input"
          defaultValue={params.get("duration") || "all"}
          onChange={(e) => update("duration", e.target.value)}
        >
          <option value="all">Any duration</option>
          <option value="under-1-min">Under 1 min</option>
          <option value="1-2-min">1–2 min</option>
          <option value="2-5-min">2–5 min</option>
          <option value="5-plus-min">5+ min</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="q">
          Search
        </label>
        <div className="flex gap-2">
          <input
            id="q"
            name="q"
            className="input"
            placeholder="hamstring, desk, posture…"
            defaultValue={params.get("q") || ""}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={pending}>
            Go
          </button>
        </div>
      </div>
    </form>
  );
}
