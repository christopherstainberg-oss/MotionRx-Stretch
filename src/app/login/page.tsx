"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [twoFaNote, setTwoFaNote] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("Network error. You can still use offline journal and sessions on this device.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-brand-600" />
        <h1 className="mt-2 text-2xl font-bold text-brand-950">
          {mode === "login" ? "Secure sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-brand-700/85">
          Protect routines, journal entries, and progress. Strong passwords required; optional 2FA
          can be enabled in Account.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-6">
        {mode === "register" && (
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          <p className="mt-1 text-xs text-brand-500">Minimum 8 characters. Prefer a unique passphrase.</p>
        </div>

        {mode === "login" && (
          <label className="flex items-center gap-2 text-sm text-brand-800">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={twoFaNote}
              onChange={(e) => setTwoFaNote(e.target.checked)}
            />
            I use two-factor authentication (enable in Account after login)
          </label>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          className="btn-ghost w-full text-sm"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
        </button>

        <p className="text-center text-xs text-brand-500">
          Password recovery: contact your deployment admin or re-register in demo mode. Production
          deploys should wire SMTP reset tokens.
        </p>
      </form>

      <p className="text-center text-sm">
        <Link href="/" className="font-semibold text-brand-700 hover:underline">
          Continue without account
        </Link>
      </p>
    </div>
  );
}
