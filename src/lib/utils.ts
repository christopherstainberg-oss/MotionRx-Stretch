import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Title Case for UI headers: capitalize first letter of each word.
 * Keeps short acronyms (PSQI, ACL, ID) and small connectors when mid-phrase.
 */
export function toTitleCase(input: string): string {
  const s = (input || "").trim();
  if (!s) return s;
  const small = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "via", "with"]);
  return s
    .split(/(\s+|\/|&|-)/)
    .map((part, i, arr) => {
      if (!part || /^(\s+|\/|&|-)$/.test(part)) return part;
      // Preserve all-caps short tokens (PSQI, ACL, ID, HR)
      if (/^[A-Z0-9]{2,6}$/.test(part) && part === part.toUpperCase()) return part;
      const lower = part.toLowerCase();
      const isFirst = i === 0 || (i > 0 && /^\s+$/.test(arr[i - 1] || ""));
      // First word always capitalized; small words mid-phrase stay lower unless after separator
      const prev = arr[i - 1] || "";
      const afterBreak = !prev || /^\s+$/.test(prev) || prev === "/" || prev === "&" || prev === "-";
      if (!afterBreak && !isFirst && small.has(lower) && part.length <= 3) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

export function formatMinutes(min: number) {
  if (min < 1) return "<1 min";
  return `${Math.round(min)} min`;
}

export function painLabel(n: number): string {
  if (n <= 0) return "No pain";
  if (n <= 2) return "Mild";
  if (n <= 4) return "Moderate";
  if (n <= 6) return "Significant";
  if (n <= 8) return "Severe";
  return "Very severe";
}

export function painColor(n: number): string {
  if (n <= 2) return "bg-emerald-500";
  if (n <= 4) return "bg-lime-500";
  if (n <= 6) return "bg-amber-500";
  if (n <= 8) return "bg-orange-500";
  return "bg-red-600";
}
