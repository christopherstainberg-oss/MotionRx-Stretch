import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
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
