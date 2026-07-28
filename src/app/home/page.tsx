import Link from "next/link";
import {
  BookOpen,
  Bot,
  ChevronRight,
  Dumbbell,
  HeartPulse,
  Library,
  ListChecks,
  Moon,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { DEFAULT_APP_NAME } from "@/data/names";
import { ClinicalCorrelationCard } from "@/components/ClinicalCorrelationCard";
import { HomeTodaySection } from "@/components/HomeTodaySection";

export const metadata = { title: "Home" };

const PLAN_STEPS = [
  { n: 1, href: "/assessment", title: "Assess", icon: Stethoscope },
  { n: 2, href: "/routines", title: "Plan", icon: ListChecks },
  { n: 3, href: "/journal", title: "Journal", icon: BookOpen },
  { n: 4, href: "/jeffery", title: "Jeffery", icon: Bot },
] as const;

const TOOLS = [
  { href: "/library", title: "Stretches", icon: Library },
  { href: "/exercises", title: "Exercises", icon: Dumbbell },
  { href: "/modalities", title: "Modalities", icon: Sparkles },
  { href: "/sleep", title: "Sleep", icon: Moon },
  { href: "/health", title: "Health", icon: HeartPulse },
] as const;

export default function HomePage() {
  return (
    <div className="page-narrow stack pb-2">
      {/* Hero — one focus */}
      <section className="pt-2 sm:pt-4">
        <p className="section-label">Home</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl dark:text-brand-50">
          {DEFAULT_APP_NAME.name}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-brand-600 dark:text-brand-300">
          {DEFAULT_APP_NAME.tagline}. Assess, practice, and check in—without the clutter.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/assessment" className="btn-primary sm:min-w-[11rem]">
            <Stethoscope className="h-4 w-4" />
            Start assessment
          </Link>
          <Link href="/routines/session" className="btn-ghost text-brand-700">
            Resume session
            <ChevronRight className="h-4 w-4 opacity-60" />
          </Link>
        </div>
      </section>

      {/* Today — single calm strip (dashboard component handles density) */}
      <HomeTodaySection />

      {/* Plan path — one row, not four heavy cards */}
      <section>
        <h2 className="section-label mb-3">Plan path</h2>
        <nav
          className="card flex divide-x divide-brand-100/80 overflow-hidden dark:divide-brand-800/80"
          aria-label="Your plan path"
        >
          {PLAN_STEPS.map((s) => (
            <Link
              key={s.n}
              href={s.href}
              className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 px-2 py-4 text-center transition hover:bg-brand-50/60 dark:hover:bg-brand-900/40"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800 group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-900 dark:text-brand-100">
                {s.n}
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-brand-800 dark:text-brand-100">
                <s.icon className="hidden h-3.5 w-3.5 opacity-70 sm:inline" aria-hidden />
                {s.title}
              </span>
            </Link>
          ))}
        </nav>
      </section>

      {/* Clinical link — compact one-liner, not a wall of insights */}
      <ClinicalCorrelationCard variant="compact" section="home" />

      {/* Tools — text list, not a grid of cards */}
      <section>
        <h2 className="section-label mb-3">Libraries & tools</h2>
        <ul className="card divide-y divide-brand-100/80 dark:divide-brand-800/80">
          {TOOLS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-brand-900 transition hover:bg-brand-50/50 dark:text-brand-50 dark:hover:bg-brand-900/40"
              >
                <item.icon className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                <span className="flex-1">{item.title}</span>
                <ChevronRight className="h-4 w-4 text-brand-300" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-brand-400">
        Educational support—not a substitute for licensed care.
      </p>
    </div>
  );
}
