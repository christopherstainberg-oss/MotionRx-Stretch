"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  Bot,
  CheckCircle2,
  Dumbbell,
  Eye,
  EyeOff,
  Gauge,
  Library,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { AppLogo } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiFetch } from "@/lib/api-client";
import { DEFAULT_APP_NAME } from "@/data/names";

const FEATURES = [
  {
    icon: Stethoscope,
    title: "Personalized plans",
    text: "Describe how you feel—get stretch and exercise suggestions tailored to you.",
  },
  {
    icon: Library,
    title: "Stretch library",
    text: "Clear, step-by-step mobility work with easy-to-follow cues.",
  },
  {
    icon: Dumbbell,
    title: "Exercise library",
    text: "Strength, balance, and functional moves—separate from stretches.",
  },
  {
    icon: Gauge,
    title: "Pain-aware dosing",
    text: "Your 0–10 pain scale helps the plan progress safely or ease up.",
  },
  {
    icon: Bot,
    title: "Jeffery AI coach",
    text: "Ask questions and get clinical-style education about your program.",
  },
  {
    icon: BookOpen,
    title: "Journal & progress",
    text: "Track sessions, goals, and reflections in one place.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // If already signed in, go straight to the home dashboard
  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace("/home");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          ...(mode === "register" ? { preferredName } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      if (mode === "register") {
        const display =
          (data.user?.preferredName as string | undefined)?.trim() ||
          preferredName.trim() ||
          name.trim();
        if (display) {
          try {
            localStorage.setItem("preferredName", display);
          } catch {
            /* ignore */
          }
        }
      }
      router.push("/home");
      router.refresh();
    } catch {
      setError(
        "We could not reach the server. Check your connection, or continue as a guest on this device."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-50/50">
        <p className="text-sm font-medium text-brand-700">Starting {DEFAULT_APP_NAME.name}…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh bg-gradient-to-b from-brand-50 via-[#f4faf9] to-white"
      style={{
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
      }}
    >
      <div className="mx-auto grid min-h-dvh max-w-6xl lg:grid-cols-2">
        {/* App description / welcome panel */}
        <section className="flex flex-col justify-center px-5 py-8 sm:px-10 sm:py-12 lg:py-16">
          <div className="mb-6 inline-flex items-center gap-3">
            <AppLogo className="h-12 w-12" />
            <div>
              <p className="text-xl font-bold tracking-tight text-brand-950">
                {DEFAULT_APP_NAME.name}
              </p>
              <p className="text-sm font-medium text-brand-600">{DEFAULT_APP_NAME.tagline}</p>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-brand-950 sm:text-4xl">
            Welcome to safer, smarter home mobility
          </h1>

          <div className="mt-5 space-y-4 text-base leading-relaxed text-brand-800/90">
            <p>
              <strong>{DEFAULT_APP_NAME.name}</strong> is a clinically inspired app for guided
              stretching and exercise. It helps you move better with clear instructions, realistic
              routines, and pain-aware adjustments—similar to how an outpatient physical therapy plan
              is built and progressed.
            </p>
            <p>
              Tell us what is bothering you in plain language, practice with step-by-step guidance
              (including simple “easy words” cues), track how you feel, and get help from{" "}
              <strong>Jeffery</strong>, your educational AI mobility coach.
            </p>
            <p className="rounded-xl border border-brand-200 bg-white/80 p-4 text-sm text-brand-700">
              <strong className="text-brand-900">Important:</strong> This app provides educational
              support only. It does not diagnose conditions or replace care from a licensed clinician.
              Stop for sharp pain or worrying symptoms and seek professional care when needed.
            </p>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="flex gap-3 rounded-2xl border border-brand-100 bg-white/90 p-3 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <f.icon className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-brand-900">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-brand-700/85">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium text-brand-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100/80 px-3 py-1">
              <Activity className="h-3.5 w-3.5" /> Installable PWA
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100/80 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure account
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100/80 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Pain-aware plans
            </span>
          </div>
        </section>

        {/* Sign-in form */}
        <section className="flex flex-col justify-center border-t border-brand-100 bg-white/80 px-5 py-8 shadow-[0_-12px_40px_-20px_rgba(15,61,58,0.15)] sm:px-10 sm:py-12 lg:border-l lg:border-t-0 lg:py-16 lg:shadow-none dark:border-brand-800 dark:bg-brand-950/80">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-5">
              <ThemeToggle compact />
            </div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-brand-950">
                {mode === "login" ? "Sign in to continue" : "Create your free account"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-700/90">
                {mode === "login"
                  ? "Use your email and password to open your routines, journal, and progress."
                  : "Create an account so your plans and progress stay saved and private to you."}
              </p>
            </div>

            {/* Friendly mode tabs */}
            <div
              className="mb-5 grid grid-cols-2 rounded-xl bg-brand-50 p-1"
              role="tablist"
              aria-label="Account mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                  mode === "login"
                    ? "bg-white text-brand-900 shadow-sm"
                    : "text-brand-600 hover:text-brand-900"
                }`}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                  mode === "register"
                    ? "bg-white text-brand-900 shadow-sm"
                    : "text-brand-600 hover:text-brand-900"
                }`}
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Create account
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label className="label" htmlFor="name">
                      Your name
                    </label>
                    <input
                      id="name"
                      className="input py-3"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      placeholder="e.g. Christopher Stainberg"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="preferredName">
                      Preferred name
                    </label>
                    <input
                      id="preferredName"
                      className="input py-3"
                      value={preferredName}
                      onChange={(e) => setPreferredName(e.target.value)}
                      autoComplete="nickname"
                      placeholder="e.g. Chris (what we call you in plans)"
                    />
                    <p className="mt-1.5 text-xs text-brand-500">
                      Used in your Assessment answers and written plan. Optional — defaults to your
                      first name.
                    </p>
                  </div>
                </>
              )}
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input py-3"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  inputMode="email"
                />
              </div>
              <div>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input py-3 pr-12"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-brand-600 hover:bg-brand-50"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "register" && (
                  <p className="mt-1.5 text-xs text-brand-500">
                    Tip: a short phrase you will remember is stronger than a single word.
                  </p>
                )}
              </div>

              {error && (
                <p
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary w-full py-3.5 text-base"
                disabled={loading}
              >
                {loading
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign in & open app"
                    : "Create account & get started"}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-brand-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white/70 px-3 font-medium uppercase tracking-wide text-brand-500">
                  or
                </span>
              </div>
            </div>

            <Link
              href="/home"
              className="btn-secondary flex w-full py-3.5 text-center text-base font-semibold"
            >
              Continue as guest
            </Link>
            <p className="mt-3 text-center text-xs leading-relaxed text-brand-500">
              Guest mode keeps data on this device. Create an account anytime to protect and sync
              progress more securely.
            </p>

            <p className="mt-8 text-center text-[11px] leading-relaxed text-brand-400">
              Email & password only in this version · Educational use · Not medical advice
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
