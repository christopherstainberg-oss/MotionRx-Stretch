"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useThemeOptional } from "@/components/ThemeProvider";
import { THEME_OPTIONS, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ICONS: Record<ThemePreference, typeof Sun> = {
  auto: Monitor,
  light: Sun,
  dark: Moon,
};

export function ThemeToggle({
  compact = false,
  className,
  showLabels = true,
}: {
  compact?: boolean;
  className?: string;
  showLabels?: boolean;
}) {
  const { preference, setPreference, resolved } = useThemeOptional();

  return (
    <div className={cn("w-full", className)}>
      {!compact && (
        <div className="mb-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-brand-950 dark:text-brand-50">
              Appearance
            </p>
            <p className="text-xs text-brand-600 dark:text-brand-300">
              Auto follows your device · currently{" "}
              <span className="font-semibold capitalize">{resolved}</span>
            </p>
          </div>
        </div>
      )}
      <div
        role="radiogroup"
        aria-label="Theme"
        className={cn(
          "grid grid-cols-3 gap-1 rounded-2xl border border-brand-100 bg-brand-50/80 p-1 dark:border-brand-800 dark:bg-brand-950/80",
          compact && "rounded-xl p-0.5"
        )}
      >
        {THEME_OPTIONS.map((opt) => {
          const Icon = ICONS[opt.id];
          const selected = preference === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              title={opt.description}
              onClick={() => setPreference(opt.id)}
              className={cn(
                "flex min-h-[40px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-xs font-semibold transition",
                selected
                  ? "bg-white text-brand-900 shadow-sm dark:bg-brand-800 dark:text-brand-50"
                  : "text-brand-700 hover:bg-white/60 dark:text-brand-200 dark:hover:bg-brand-900/80",
                compact && "min-h-[36px] flex-row gap-1.5 py-1.5"
              )}
            >
              <Icon className={cn("h-4 w-4", selected && "text-brand-600 dark:text-brand-200")} />
              {showLabels && <span>{opt.label}</span>}
              <span className="sr-only">{opt.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Icon-only cycle button for tight header spaces */
export function ThemeCycleButton({ className }: { className?: string }) {
  const { preference, setPreference, resolved } = useThemeOptional();
  const order: ThemePreference[] = ["auto", "light", "dark"];
  const next = order[(order.indexOf(preference) + 1) % order.length]!;
  const Icon = ICONS[preference];

  return (
    <button
      type="button"
      className={cn(
        "btn-ghost min-h-[44px] min-w-[44px] p-2",
        className
      )}
      aria-label={`Theme: ${preference} (resolved ${resolved}). Click for ${next}.`}
      title={`Theme: ${preference} → tap for ${next}`}
      onClick={() => setPreference(next)}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
