"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

export function ExerciseFilters({
  bodyParts,
  categories,
}: {
  bodyParts: { value: string; label: string }[];
  categories: { value: string; label: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      next.delete("page");
      start(() => router.push(`/exercises?${next.toString()}`));
    },
    [params, router]
  );

  return (
    <form
      className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        update("q", String(fd.get("q") || ""));
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
        <label className="label" htmlFor="category">
          Category
        </label>
        <select
          id="category"
          className="input"
          defaultValue={params.get("category") || "all"}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
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
        <label className="label" htmlFor="q">
          Search
        </label>
        <div className="flex gap-2">
          <input
            id="q"
            name="q"
            className="input"
            placeholder="bridge, balance, core…"
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
