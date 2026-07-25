import Link from "next/link";
import {
  Bell,
  BookOpen,
  Bot,
  Dumbbell,
  Gauge,
  Library,
  ListChecks,
  Network,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { APP_NAME_OPTIONS, DEFAULT_APP_NAME } from "@/data/names";
import { ICON_SET } from "@/data/icons";
import { LIBRARY_STATS } from "@/data/stretch-library";
import { EXERCISE_STATS } from "@/data/exercise-library";
import { MODALITY_STATS } from "@/data/modalities";
import { STARTER_ROUTINES } from "@/lib/routine-engine";
import { AppLogo, IconMap } from "@/components/Icons";

export const metadata = { title: "Home" };

export default function HomePage() {
  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="card relative overflow-hidden p-5 sm:p-8 lg:p-10">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-100/80 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-accent-400/20 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
              <AppLogo className="h-5 w-5" />
              Welcome · Let&apos;s keep moving
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-950 sm:text-3xl lg:text-4xl">
              {DEFAULT_APP_NAME.name}
              <span className="mt-1.5 block text-lg font-semibold text-brand-700 sm:mt-2 sm:text-xl lg:text-2xl">
                {DEFAULT_APP_NAME.tagline}
              </span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-brand-800/85 sm:mt-4 sm:text-base">
              Start with how you feel today, pick a starter routine, or ask Jeffery. Simple, safe,
              and clear—like a home program from clinic.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
              <Link href="/assessment" className="btn-primary w-full py-3 sm:w-auto">
                <Stethoscope className="h-4 w-4" />
                Start Assessment
              </Link>
              <Link href="/jeffery" className="btn-secondary w-full py-3 sm:w-auto">
                <Bot className="h-4 w-4" />
                Ask Jeffery
              </Link>
              <Link href="/routines" className="btn-ghost w-full py-3 sm:w-auto">
                <ListChecks className="h-4 w-4" />
                Browse routines
              </Link>
              <Link href="/modalities" className="btn-ghost w-full py-3 sm:w-auto">
                <Sparkles className="h-4 w-4" />
                Pre/post-visit modalities
              </Link>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2.5 sm:gap-3 lg:max-w-sm">
            {[
              {
                label: "Stretch catalog",
                value: String(LIBRARY_STATS.totalEntries),
                hint: `${LIBRARY_STATS.baseCount} clinical bases`,
              },
              {
                label: "Exercise capacity",
                value: `${(EXERCISE_STATS.capacity / 1_000_000).toFixed(0)}M`,
                hint: `${EXERCISE_STATS.baseCount} clinical bases`,
              },
              {
                label: "PT modalities",
                value: String(MODALITY_STATS.total),
                hint: `${MODALITY_STATS.home} home-capable`,
              },
              { label: "PWA", value: "On", hint: "Install & go offline" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-brand-100 bg-white/90 p-3.5 sm:p-4"
              >
                <p className="text-xl font-bold text-brand-800 sm:text-2xl">{stat.value}</p>
                <p className="text-xs font-medium text-brand-900 sm:text-sm">{stat.label}</p>
                <p className="text-[11px] text-brand-600 sm:text-xs">{stat.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-brand-950">Easy ways to begin</h2>
            <p className="text-sm text-brand-700/80">
              Pick a ready-made session—or build your own after you describe your concerns.
            </p>
          </div>
          <Link href="/routines" className="text-sm font-semibold text-brand-700 hover:underline">
            All routines
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {STARTER_ROUTINES.map((r) => (
            <div key={r.name} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-brand-900">{r.name}</h3>
                <span className="chip capitalize">{r.difficulty}</span>
              </div>
              <p className="mt-2 flex-1 text-sm text-brand-700/80">{r.description}</p>
              <p className="mt-3 text-xs text-brand-600">
                About {r.estimatedMinutes} minutes · {r.stretchIds.length} stretches
                {r.exerciseIds?.length ? ` · ${r.exerciseIds.length} exercises` : ""}
              </p>
              <Link
                href={`/routines/session?starter=${encodeURIComponent(r.name)}`}
                className="btn-primary mt-4 w-full py-3"
              >
                <ListChecks className="h-4 w-4" />
                Start this session
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/assessment",
            icon: Stethoscope,
            title: "Assessment",
            text: "Write a short note about stiffness or pain—get a plan in plain language.",
          },
          {
            href: "/library",
            icon: Library,
            title: "Stretch library",
            text: "Browse mobility holds with clear steps and easy-word cues.",
          },
          {
            href: "/exercises",
            icon: Dumbbell,
            title: "Exercise library",
            text: "Strength, balance, and functional drills with variations.",
          },
          {
            href: "/builder",
            icon: ListChecks,
            title: "Build your routine",
            text: "Add moves, rotate options, and customize your session.",
          },
          {
            href: "/jeffery",
            icon: Bot,
            title: "Jeffery AI coach",
            text: "Ask questions; Jeffery can help adjust your program.",
          },
          {
            href: "/modalities",
            icon: Sparkles,
            title: "PT modalities",
            text: "Heat, ice, pacing, pre/post-visit prep—matched to your pain story.",
          },
          {
            href: "/insights",
            icon: Network,
            title: "See your big picture",
            text: "Sessions, journal, pain, modalities, and goals shown together.",
          },
          {
            href: "/progress",
            icon: TrendingUp,
            title: "Progress & goals",
            text: "Log practice and watch trends over time.",
          },
          {
            href: "/journal",
            icon: BookOpen,
            title: "Journal",
            text: "Reflect on how movement feels day to day.",
          },
          {
            href: "/account",
            icon: Bell,
            title: "Reminders & settings",
            text: "Install the app, set reminders, manage your account.",
          },
          {
            href: "/assessment",
            icon: Gauge,
            title: "Pain-scale dosing",
            text: "We use your 0–10 ratings from Assessment to keep plans comfortable.",
          },
          {
            href: "/learn",
            icon: ShieldCheck,
            title: "Learn & stay safe",
            text: "Short articles on form, recovery, and when to get help.",
          },
        ].map((f) => (
          <Link key={f.title} href={f.href} className="card-interactive p-4 sm:p-5">
            <f.icon className="h-6 w-6 text-brand-600" />
            <h3 className="mt-3 font-semibold text-brand-900">{f.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-brand-700/80">{f.text}</p>
          </Link>
        ))}
      </section>

      <section className="card p-6 sm:p-8">
        <h2 className="text-xl font-bold text-brand-950">Brand name</h2>
        <p className="mt-1 text-sm text-brand-700/80">
          Official brand: <strong>{DEFAULT_APP_NAME.name}</strong>. Other options remain listed for
          reference.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {APP_NAME_OPTIONS.map((opt, i) => (
            <div
              key={opt.id}
              className={`rounded-xl border p-4 ${
                opt.id === DEFAULT_APP_NAME.id
                  ? "border-brand-400 bg-brand-50/80"
                  : "border-brand-100 bg-white"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                Option {i + 1}
              </p>
              <p className="font-semibold text-brand-900">{opt.name}</p>
              <p className="text-sm text-brand-700">{opt.tagline}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-brand-950">Icon set</h2>
        <p className="mt-1 text-sm text-brand-700/80">Feature icons used across the app</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ICON_SET.map((icon) => {
            const Lucide = IconMap[icon.lucide] ?? AppLogo;
            return (
              <div key={icon.id} className="card flex gap-3 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Lucide className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-brand-900">{icon.name}</p>
                  <p className="text-xs text-brand-700/90">{icon.purpose}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 p-6 text-sm text-brand-800">
        <h2 className="font-bold text-brand-950">Clinical disclaimer</h2>
        <p className="mt-2 leading-relaxed">
          {DEFAULT_APP_NAME.name} provides educational stretching and mobility guidance based on
          common outpatient physical therapy principles. It does not diagnose conditions or replace
          evaluation by a licensed clinician. Stop for sharp pain, progressive neurological symptoms,
          or red-flag signs and seek appropriate care.
        </p>
      </section>
    </div>
  );
}
