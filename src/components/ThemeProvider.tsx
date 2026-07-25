"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyResolvedTheme,
  readStoredTheme,
  resolveTheme,
  writeStoredTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("auto");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  const [ready, setReady] = useState(false);

  const apply = useCallback((pref: ThemePreference) => {
    const next = resolveTheme(pref);
    setResolved(next);
    applyResolvedTheme(next);
  }, []);

  useEffect(() => {
    const stored = readStoredTheme();
    setPreferenceState(stored);
    apply(stored);
    setReady(true);
  }, [apply]);

  // React to OS changes when preference is Auto
  useEffect(() => {
    if (!ready || preference !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("auto");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference, ready, apply]);

  const setPreference = useCallback(
    (pref: ThemePreference) => {
      setPreferenceState(pref);
      writeStoredTheme(pref);
      apply(pref);
    },
    [apply]
  );

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

/** Safe hook when provider may be absent (returns defaults) */
export function useThemeOptional(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  return (
    ctx || {
      preference: "auto",
      resolved: "light",
      setPreference: () => {},
    }
  );
}
