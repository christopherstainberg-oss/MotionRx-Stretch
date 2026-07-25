import Link from "next/link";
import {
  BookOpen,
  Bot,
  ChevronRight,
  Dumbbell,
  Library,
  ListChecks,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { DEFAULT_APP_NAME } from "@/data/names";
import { STARTER_ROUTINES } from "@/lib/routine-engine";
import { AppLogo } from "@/components/Icons";
import { HomeSearch } from "@/components/HomeSearch";
import { ClinicalCorrelationCard } from "@/components/ClinicalCorrelationCard";

export const metadata = { title: "Home" };

const PLAN_STEPS = [
  {
    n: 1,
    href: "/assessment",
    title: "Assess",
    text: "Tell us how you feel, safety limits, and goals.",
    icon: Stethoscope,
    cta: "Start Assessment",
  },
  {
    n: 2,
    href: "/routines",
    title: "Follow your plan",
    text: "Run a guided session with form videos.",
    icon: ListChecks,
    cta: "Open routines",
  },
  {
    n: 3,
    href: "/journal",
    title: "Journal today",
    text: "Log pain and progress—Jeffery can adjust dosing.",
    icon: BookOpen,
    cta: "Open journal",
  },
  {
    n: 4,
    href: "/jeffery",
    title: "Check in with Jeffery",
    text: "Ask questions with your full app context.",
    icon: Bot,
    cta: "Talk to Jeffery",
  },
] as const;

const SECONDARY = [
  { href: "/library", title: "Stretches", icon: Library, text: "Mobility library" },
  { href: "/exercises", title: "Exercises", icon: Dumbbell, text: "Strength & control" },
  { href: "/modalities", title: "Modalities", icon: Sparkles, text: "Heat, ice, pacing" },
  { href: "/insights", title: "Insights", icon: ListChecks, text: "Your big picture" },
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-4">
      {/* Hero — single focus */}
      <section className="card space-y-5 p-5 sm:p-7">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-100 dark:bg-brand-900 dark:text-brand-100 dark:ring-brand-700">
          <AppLogo className="h-4 w-4" />
          Your mobility plan
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-950 sm:text-3xl">
            {DEFAULT_APP_NAME.name}
          </h1>
          <p className="mt-1 text-base font-medium text-brand-700">{DEFAULT_APP_NAME.tagline}</p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-brand-600">
            Four clear steps. Search anything. Institutional technique videos stay quality-first.
          </p>
        </div>

        <HomeSearch />

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/assessment" className="btn-primary flex-1 py-3 sm:flex-none">
            <Stethoscope className="h-4 w-4" />
            Start with Assessment
          </Link>
          <Link href="/routines/session" className="btn-secondary flex-1 py-3 sm:flex-none">
            <ListChecks className="h-4 w-4" />
            Resume session
          </Link>
        </div>
      </section>

      <ClinicalCorrelationCard section="home" />

      {/* Plan path */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-brand-950">Your plan path</h2>
            <p className="text-sm text-brand-600">Follow in order—or jump to where you left off.</p>
          </div>
        </div>
        <ol className="space-y-2">
          {PLAN_STEPS.map((s) => (
            <li key={s.n}>
              <Link
                href={s.href}
                className="card group flex items-center gap-3 p-4 transition hover:border-brand-300 hover:bg-brand-50/40 dark:hover:border-brand-600 dark:hover:bg-brand-900/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {s.n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-semibold text-brand-950">
                    <s.icon className="h-4 w-4 text-brand-600" />
                    {s.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-brand-600">{s.text}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-brand-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* One starter, not a wall */}
      <section className="card space-y-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-brand-950">Quick start routine</h2>
          <Link href="/routines" className="text-xs font-semibold text-brand-700 hover:underline">
            All routines
          </Link>
        </div>
        {STARTER_ROUTINES[0] && (
          <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 dark:border-brand-800 dark:bg-brand-950/40">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold text-brand-900">{STARTER_ROUTINES[0].name}</h3>
              <span className="chip capitalize">{STARTER_ROUTINES[0].difficulty}</span>
            </div>
            <p className="mt-1.5 text-sm text-brand-700">{STARTER_ROUTINES[0].description}</p>
            <p className="mt-2 text-xs text-brand-500">
              ~{STARTER_ROUTINES[0].estimatedMinutes} min · {STARTER_ROUTINES[0].stretchIds.length}{" "}
              stretches
              {STARTER_ROUTINES[0].exerciseIds?.length
                ? ` · ${STARTER_ROUTINES[0].exerciseIds.length} exercises`
                : ""}
            </p>
            <Link
              href={`/routines/session?starter=${encodeURIComponent(STARTER_ROUTINES[0].name)}`}
              className="btn-primary mt-3 w-full py-2.5"
            >
              Start this session
            </Link>
          </div>
        )}
      </section>

      {/* Secondary tools — compact */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-500">
          More tools
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SECONDARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card flex flex-col items-start gap-1.5 p-3.5 transition hover:border-brand-300 dark:hover:border-brand-600"
            >
              <item.icon className="h-5 w-5 text-brand-600" />
              <span className="text-sm font-semibold text-brand-900">{item.title}</span>
              <span className="text-[11px] text-brand-500">{item.text}</span>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-center text-[11px] leading-relaxed text-brand-500">
        Educational support inspired by outpatient PT principles—not a substitute for personalized
        care. Videos are institutional technique demos only.
      </p>
    </div>
  );
}
