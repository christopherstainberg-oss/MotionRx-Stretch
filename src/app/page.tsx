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
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { APP_NAME_OPTIONS, DEFAULT_APP_NAME } from "@/data/names";
import { ICON_SET } from "@/data/icons";
import { LIBRARY_STATS } from "@/data/stretch-library";
import { EXERCISE_STATS } from "@/data/exercise-library";
import { STARTER_ROUTINES } from "@/lib/routine-engine";
import { AppLogo, IconMap } from "@/components/Icons";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="card relative overflow-hidden p-8 sm:p-10">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-100/80 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-accent-400/20 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 ring-1 ring-brand-100">
              <AppLogo className="h-5 w-5" />
              Clinically guided · Pain-aware · Installable PWA
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
              {DEFAULT_APP_NAME.name}
              <span className="mt-2 block text-xl font-semibold text-brand-700 sm:text-2xl">
                {DEFAULT_APP_NAME.tagline}
              </span>
            </h1>
            <p className="mt-4 text-brand-800/80 leading-relaxed">
              Separate stretch and exercise libraries, paragraph-based clinical intake, pain-aware
              self-adjusting plans, routine rotation, correlated insights, and{" "}
              <strong>Jeffery</strong>—your AI mobility coach.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/assess" className="btn-primary">
                <Stethoscope className="h-4 w-4" />
                Describe your concerns
              </Link>
              <Link href="/jeffery" className="btn-secondary">
                <Bot className="h-4 w-4" />
                Ask Jeffery
              </Link>
              <Link href="/exercises" className="btn-ghost">
                <Dumbbell className="h-4 w-4" />
                Exercises
              </Link>
            </div>
          </div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
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
              { label: "Pain scale", value: "0–10", hint: "Self-adjust + Jeffery" },
              { label: "PWA", value: "On", hint: "Offline + install" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-brand-100 bg-white/80 p-4">
                <p className="text-2xl font-bold text-brand-800">{stat.value}</p>
                <p className="text-sm font-medium text-brand-900">{stat.label}</p>
                <p className="text-xs text-brand-600">{stat.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-brand-950">Starter routines</h2>
            <p className="text-sm text-brand-700/80">Realistic, evidence-informed session templates</p>
          </div>
          <Link href="/routines" className="text-sm font-semibold text-brand-700 hover:underline">
            All routines
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {STARTER_ROUTINES.map((r) => (
            <div key={r.name} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-brand-900">{r.name}</h3>
                <span className="chip capitalize">{r.difficulty}</span>
              </div>
              <p className="mt-2 text-sm text-brand-700/80">{r.description}</p>
              <p className="mt-3 text-xs text-brand-600">
                ~{r.estimatedMinutes} min · {r.stretchIds.length} movements
              </p>
              <Link href="/routines" className="btn-secondary mt-4 w-full">
                <ListChecks className="h-4 w-4" />
                Open routines
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/assess",
            icon: Stethoscope,
            title: "Paragraph + symptom plans",
            text: "Write your concerns; get stretch and/or exercise suggestions with pain-aware dosing.",
          },
          {
            href: "/library",
            icon: Library,
            title: "Stretch library",
            text: "Mobility holds with clinical what/why/outcome education—separate from exercises.",
          },
          {
            href: "/exercises",
            icon: Dumbbell,
            title: "Exercise library",
            text: "Strength, activation, balance, and functional drills with variations.",
          },
          {
            href: "/builder",
            icon: ListChecks,
            title: "Rotate & customize",
            text: "Add from either library; rotate one item or the entire routine.",
          },
          {
            href: "/jeffery",
            icon: Bot,
            title: "Jeffery AI coach",
            text: "Ask questions; Jeffery knows your adjustments and can update the plan.",
          },
          {
            href: "/insights",
            icon: Network,
            title: "Correlated insights",
            text: "Sessions, journal, pain, goals, and Jeffery changes analyzed together.",
          },
          {
            href: "/progress",
            icon: TrendingUp,
            title: "Progress & goals",
            text: "Log sessions and outcomes the way a clinic tracks re-evals.",
          },
          {
            href: "/journal",
            icon: BookOpen,
            title: "Journal",
            text: "Reflect and optionally mark entries to share with a professional.",
          },
          {
            href: "/account",
            icon: Bell,
            title: "Reminders & PWA",
            text: "Install offline, set reminders, secure login.",
          },
          {
            href: "/assess",
            icon: Gauge,
            title: "Pain-scale dosing",
            text: "Progress, hold, or regress intensity based on feedback.",
          },
          {
            href: "/learn",
            icon: ShieldCheck,
            title: "Safety first",
            text: "Kid-friendly steps, form cues, institutional video sources.",
          },
        ].map((f) => (
          <Link key={f.title} href={f.href} className="card p-5 transition hover:shadow-soft">
            <f.icon className="h-6 w-6 text-brand-600" />
            <h3 className="mt-3 font-semibold text-brand-900">{f.title}</h3>
            <p className="mt-1 text-sm text-brand-700/80">{f.text}</p>
          </Link>
        ))}
      </section>

      <section className="card p-6 sm:p-8">
        <h2 className="text-xl font-bold text-brand-950">Choose an app name (10 options)</h2>
        <p className="mt-1 text-sm text-brand-700/80">
          Official brand: <strong>{DEFAULT_APP_NAME.name}</strong>. Other options remain listed for reference.
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
              <p className="mt-2 text-xs text-brand-600">{opt.rationale}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-brand-950">Icon set</h2>
        <p className="mt-1 text-sm text-brand-700/80">
          Feature icons for logo, navigation, and clinical tools
        </p>
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
                  <p className="mt-1 text-[11px] text-brand-500">{icon.relatesTo}</p>
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
