"use client";

import { cn, painLabel } from "@/lib/utils";

export function PainScale({
  value,
  onChange,
  label = "Pain (0–10)",
  id,
}: {
  value: number;
  onChange: (n: number) => void;
  label?: string;
  id?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="label mb-0">
          {label}
        </label>
        <span className="text-sm font-semibold text-brand-800">
          {value}/10 · {painLabel(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-600"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value}
        aria-valuetext={`${value} out of 10, ${painLabel(value)}`}
      />
      <div className="flex justify-between gap-0.5">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={cn(
              "h-2 flex-1 rounded-full transition",
              i <= value
                ? i <= 2
                  ? "bg-emerald-500"
                  : i <= 4
                    ? "bg-lime-500"
                    : i <= 6
                      ? "bg-amber-500"
                      : i <= 8
                        ? "bg-orange-500"
                        : "bg-red-600"
                : "bg-brand-100"
            )}
            aria-label={`Set pain to ${i}`}
          />
        ))}
      </div>
      <p className="text-xs text-brand-600/80">
        Clinic-style guide: ≤3 often OK to progress · 4–5 modify · ≥6 ease intensity and consider
        professional care if persistent.
      </p>
    </div>
  );
}
