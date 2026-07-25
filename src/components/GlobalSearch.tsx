"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  defaultSearchSuggestions,
  searchAppIndex,
  type AppSearchItem,
} from "@/data/app-search-index";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Compact header style vs full mobile drawer style */
  variant?: "header" | "drawer" | "hero";
  className?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
};

export function GlobalSearch({
  variant = "header",
  className,
  autoFocus,
  onNavigate,
}: Props) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return defaultSearchSuggestions(variant === "hero" ? 8 : 6);
    return searchAppIndex(q, 12);
  }, [query, variant]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    function onDoc(e: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, []);

  // Ctrl/Cmd+K to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback(
    (item: AppSearchItem) => {
      setOpen(false);
      setQuery("");
      onNavigate?.();
      router.push(item.href);
    },
    [router, onNavigate]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]!);
    }
  }

  const shell =
    variant === "hero"
      ? "relative w-full"
      : variant === "drawer"
        ? "relative w-full"
        : "relative w-full max-w-md flex-1";

  return (
    <div ref={rootRef} className={cn(shell, className)}>
      <label className="sr-only" htmlFor={`global-search-${listId}`}>
        Search the app
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500"
          aria-hidden
        />
        <input
          ref={inputRef}
          id={`global-search-${listId}`}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-opt-${active}` : undefined}
          className={cn(
            "w-full rounded-xl border border-brand-200 bg-white py-2.5 pl-9 pr-16 text-sm outline-none transition",
            "placeholder:text-brand-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200",
            "dark:border-brand-700 dark:bg-brand-950 dark:text-brand-50 dark:placeholder:text-brand-500 dark:focus:ring-brand-800",
            variant === "hero" && "min-h-[48px] rounded-2xl py-3 text-base shadow-sm"
          )}
          placeholder={
            variant === "hero"
              ? "Search Assessment, Journal, stretches, safety…"
              : "Search app…"
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay so option click can register before close
            window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {query && (
            <button
              type="button"
              className="rounded-lg p-1.5 text-brand-500 hover:bg-brand-50 hover:text-brand-800 dark:hover:bg-brand-900"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {variant === "header" && (
            <kbd className="hidden rounded border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-500 sm:inline dark:border-brand-700 dark:bg-brand-900">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-50 mt-1.5 max-h-[min(70vh,22rem)] w-full overflow-y-auto rounded-2xl border border-brand-100 bg-white py-1 shadow-soft",
            "dark:border-brand-700 dark:bg-brand-950"
          )}
        >
          {!query.trim() && results.length > 0 && (
            <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-400">
              Suggested
            </li>
          )}
          {query.trim() && results.length > 0 && (
            <li className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-400">
              Categories, sections & pages
            </li>
          )}
          {results.length === 0 && query.trim() ? (
            <li className="px-3 py-4 text-center text-sm text-brand-500">
              No matches for “{query.trim()}”. Try Assessment, ice, knee, or journal.
            </li>
          ) : (
            results.map((item, i) => {
              const isActive = i === active;
              return (
                <li key={item.id} role="option" aria-selected={isActive} id={`${listId}-opt-${i}`}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition",
                      isActive
                        ? "bg-brand-50 dark:bg-brand-900"
                        : "hover:bg-brand-50/80 dark:hover:bg-brand-900/60"
                    )}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item)}
                  >
                    <span className="text-sm font-semibold text-brand-950 dark:text-brand-50">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-brand-500">
                      {item.category}
                      {item.subcategory ? ` · ${item.subcategory}` : ""}
                    </span>
                    <span className="line-clamp-1 text-xs text-brand-600 dark:text-brand-300">
                      {item.description}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
