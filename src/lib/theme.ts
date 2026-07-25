/** Theme preference: Auto follows OS, Light/Dark force mode. */

export type ThemePreference = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "motionrx-theme";

export const THEME_OPTIONS: Array<{
  id: ThemePreference;
  label: string;
  description: string;
}> = [
  {
    id: "auto",
    label: "Auto",
    description: "Match your device light or dark setting",
  },
  {
    id: "light",
    label: "Light",
    description: "Always use the light clinical palette",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Always use the dark low-glare palette",
  },
];

export function isThemePreference(v: unknown): v is ThemePreference {
  return v === "auto" || v === "light" || v === "dark";
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "auto") return getSystemTheme();
  return pref;
}

export function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(raw)) return raw;
  } catch {
    /* private mode */
  }
  return "auto";
}

export function writeStoredTheme(pref: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
}

/** Apply resolved theme on <html> and meta theme-color */
export function applyResolvedTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  root.dataset.theme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0d2625" : "#2c756f");
  }
}

/** Inline boot script — keeps first paint free of flash */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"&&p!=="auto")p="auto";var d=p==="dark"||(p==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";r.dataset.theme=d?"dark":"light";}catch(e){}})();`;
