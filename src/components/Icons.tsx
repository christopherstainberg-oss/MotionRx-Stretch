import {
  Activity,
  Bell,
  BookOpen,
  Download,
  Flame,
  Gauge,
  GraduationCap,
  Heart,
  Home,
  Layers,
  Library,
  ListChecks,
  PlayCircle,
  ShieldCheck,
  Stethoscope,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export const IconMap: Record<string, LucideIcon> = {
  Activity,
  Home,
  Library,
  ListChecks,
  Stethoscope,
  Gauge,
  TrendingUp,
  BookOpen,
  Target,
  Users,
  GraduationCap,
  PlayCircle,
  Bell,
  ShieldCheck,
  Download,
  Heart,
  Layers,
  Flame,
};

export function AppLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="64" height="64" rx="16" fill="#2c756f" />
      <path
        d="M18 38c6-14 10-18 14-18s8 4 14 18"
        stroke="#f0f9f8"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="22" r="4" fill="#e8823d" />
      <path
        d="M22 44h20"
        stroke="#86cbc3"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
