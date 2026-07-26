"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Fingerprint } from "lucide-react";
import { AppLogo } from "@/components/Icons";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiFetch } from "@/lib/api-client";
import { DEFAULT_APP_NAME } from "@/data/names";

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
  const [bioLoading, setBioLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [bioSupported, setBioSupported] = useState(false);

  useEffect(() => {
    setBioSupported(
      typeof window !== "undefined" &&
        !!window.PublicKeyCredential &&
        typeof window.PublicKeyCredential === "function"
    );
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace("/home");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function signInWithBiometrics() {
    setError("");
    setBioLoading(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const optRes = await apiFetch("/api/auth/webauthn/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const optData = await optRes.json();
      if (!optRes.ok) {
        setError(
          optData.error ||
            "Enter the email for your account, or enable Face ID / Touch ID in Account first."
        );
        return;
      }
      const assertion = await startAuthentication({ optionsJSON: optData.options });
      const verRes = await apiFetch("/api/auth/webauthn/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: assertion,
          email: email.trim(),
          challengeKey: optData.challengeKey,
        }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) {
        setError(verData.error || "Biometric sign-in failed");
        return;
      }
      router.push("/home");
      router.refresh();
    } catch (e: unknown) {
      const name =
        e && typeof e === "object" && "name" in e
          ? String((e as { name: string }).name)
          : "";
      if (name === "NotAllowedError") {
        setError("Biometric prompt was cancelled.");
      } else {
        setError("Face ID / Touch ID sign-in failed. Try email and password.");
      }
    } finally {
      setBioLoading(false);
    }
  }

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
      setError("Could not reach the server. Check your connection, or continue as a guest.");
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
      className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 via-[#f4faf9] to-white dark:from-brand-950 dark:via-brand-950 dark:to-brand-900"
      style={{
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:px-6">
        {/* Brand — compact */}
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AppLogo className="h-11 w-11" />
            <div>
              <p className="text-lg font-bold tracking-tight text-brand-950 dark:text-brand-50">
                {DEFAULT_APP_NAME.name}
              </p>
              <p className="text-xs text-brand-600 dark:text-brand-400">
                {DEFAULT_APP_NAME.tagline}
              </p>
            </div>
          </div>
          <ThemeToggle compact />
        </div>

        <div className="rounded-2xl border border-brand-100 bg-white/95 p-6 shadow-sm dark:border-brand-800 dark:bg-brand-950/90 sm:p-8">
          <h1 className="text-xl font-bold text-brand-950 dark:text-brand-50">
            {mode === "login" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-brand-600 dark:text-brand-400">
            {mode === "login"
              ? "Open your plans, journal, and progress."
              : "Save your progress privately to this account."}
          </p>

          <div
            className="mt-5 grid grid-cols-2 rounded-xl bg-brand-50 p-1 dark:bg-brand-900/60"
            role="tablist"
            aria-label="Account mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-white text-brand-900 shadow-sm dark:bg-brand-800 dark:text-brand-50"
                  : "text-brand-600 hover:text-brand-900 dark:text-brand-400"
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
                  ? "bg-white text-brand-900 shadow-sm dark:bg-brand-800 dark:text-brand-50"
                  : "text-brand-600 hover:text-brand-900 dark:text-brand-400"
              }`}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Register
            </button>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {mode === "register" && (
              <>
                <div>
                  <label className="label" htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    className="input py-3"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="preferredName">
                    Preferred name{" "}
                    <span className="font-normal text-brand-500">(optional)</span>
                  </label>
                  <input
                    id="preferredName"
                    className="input py-3"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    autoComplete="nickname"
                    placeholder="What we call you"
                  />
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p
                className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3.5 text-base"
              disabled={loading || bioLoading}
            >
              {loading
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          {mode === "login" && bioSupported && (
            <button
              type="button"
              className="btn-secondary mt-3 flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold"
              disabled={loading || bioLoading}
              onClick={signInWithBiometrics}
            >
              <Fingerprint className="h-4 w-4" />
              {bioLoading ? "Waiting for device…" : "Sign in with Face ID / Touch ID"}
            </button>
          )}
          {mode === "login" && bioSupported && (
            <p className="mt-1.5 text-center text-[11px] text-brand-500">
              Enter your email first if you have multiple devices enrolled.
            </p>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-brand-100 dark:border-brand-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 font-medium text-brand-500 dark:bg-brand-950">
                or
              </span>
            </div>
          </div>

          <Link
            href="/home"
            className="btn-secondary flex w-full justify-center py-3 text-center text-sm font-semibold"
          >
            Continue as guest
          </Link>
          <p className="mt-2 text-center text-xs text-brand-500">
            Guest data stays on this device. Create an account anytime to save it.
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-brand-400">
          Educational use only · Not medical advice · Stop for sharp or concerning symptoms
        </p>
      </div>
    </div>
  );
}
