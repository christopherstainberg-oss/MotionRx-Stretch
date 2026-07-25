"use client";

import { useEffect, useState } from "react";
import { APP_NAME_OPTIONS } from "@/data/names";
import { Bell, Download, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface PublicUser {
  id: string;
  email: string;
  name: string;
  twoFactorEnabled: boolean;
  preferences: {
    reminderTimes: string[];
    notificationsEnabled: boolean;
    nameChoice?: string;
    sessionLengthMinutes: number;
  };
}

export default function AccountPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [nameChoice, setNameChoice] = useState("motionrx");
  const [reminders, setReminders] = useState("08:00, 12:30, 18:00");
  const [notifications, setNotifications] = useState(true);
  const [twoFa, setTwoFa] = useState(false);
  const [msg, setMsg] = useState("");
  const [sessionLen, setSessionLen] = useState(15);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setNameChoice(d.user.preferences?.nameChoice || "motionrx");
          setReminders((d.user.preferences?.reminderTimes || []).join(", "));
          setNotifications(!!d.user.preferences?.notificationsEnabled);
          setTwoFa(!!d.user.twoFactorEnabled);
          setSessionLen(d.user.preferences?.sessionLengthMinutes || 15);
        }
      })
      .catch(() => {});
    const stored = localStorage.getItem("nameChoice");
    if (stored) setNameChoice(stored);
  }, []);

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem("nameChoice", nameChoice);
    const times = reminders
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setMsg("Preferences saved on this device.");
    if (typeof window !== "undefined" && "Notification" in window && notifications) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission === "granted") {
        setMsg(
          (m) =>
            m +
            ` Reminders set for ${times.join(", ")} (browser notifications when the app is open; use OS install for richer push).`
        );
      }
    }
    try {
      await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameChoice,
          reminderTimes: times,
          notificationsEnabled: notifications,
          twoFactorEnabled: twoFa,
          sessionLengthMinutes: sessionLen,
        }),
      });
    } catch {
      /* offline */
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMsg("Signed out.");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-950">Account & settings</h1>
        <p className="mt-1 text-sm text-brand-700/85">
          Secure login, branding choice, reminders, 2FA preference, and PWA install tips.
        </p>
      </div>

      <section className="card p-5">
        {user ? (
          <div className="space-y-2">
            <p className="font-semibold text-brand-900">{user.name}</p>
            <p className="text-sm text-brand-600">{user.email}</p>
            <button type="button" className="btn-secondary mt-2" onClick={logout}>
              Sign out
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-brand-700">You are browsing as a guest.</p>
            <Link href="/login" className="btn-primary mt-3 inline-flex">
              <ShieldCheck className="h-4 w-4" />
              Sign in or register
            </Link>
          </div>
        )}
      </section>

      <form onSubmit={savePrefs} className="card space-y-5 p-5">
        <div>
          <h2 className="font-semibold text-brand-900">App name (10 options)</h2>
          <select
            className="input mt-2"
            value={nameChoice}
            onChange={(e) => setNameChoice(e.target.value)}
          >
            {APP_NAME_OPTIONS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} — {n.tagline}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-brand-500">
            Selection is stored for your account/device. Official brand is{" "}
            <strong>MotionRx Stretch</strong>.
          </p>
        </div>

        <div>
          <label className="label flex items-center gap-2" htmlFor="reminders">
            <Bell className="h-4 w-4" /> Reminder times (comma-separated HH:MM)
          </label>
          <input
            id="reminders"
            className="input"
            value={reminders}
            onChange={(e) => setReminders(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="sessionLen">
            Default session length (minutes)
          </label>
          <input
            id="sessionLen"
            type="number"
            min={5}
            max={60}
            className="input"
            value={sessionLen}
            onChange={(e) => setSessionLen(Number(e.target.value))}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-brand-600"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
          />
          Enable practice reminders / notifications
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-brand-600"
            checked={twoFa}
            onChange={(e) => setTwoFa(e.target.checked)}
          />
          Prefer two-factor authentication (TOTP wiring for production SSO)
        </label>

        <button type="submit" className="btn-primary">
          Save preferences
        </button>
        {msg && <p className="text-sm text-brand-700">{msg}</p>}
      </form>

      <section className="card space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-brand-900">
          <Download className="h-5 w-5" /> PWA install & offline
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-brand-800">
          <li>
            <strong>Desktop (Chrome/Edge):</strong> install icon in the address bar, or Menu →
            Install app.
          </li>
          <li>
            <strong>iPhone/iPad:</strong> Share → Add to Home Screen (Safari).
          </li>
          <li>
            <strong>Android:</strong> browser prompt or Menu → Install app / Add to Home screen.
          </li>
          <li>
            <strong>Offline:</strong> service worker caches shell + library routes; journal/session
            data can store locally and sync when online.
          </li>
          <li>
            <strong>Self-updating:</strong> on each launch the SW checks for new assets; Docker
            Watchtower keeps container images current from ghcr.io.
          </li>
        </ul>
      </section>

      <section className="card p-5 text-sm text-brand-700">
        <h2 className="font-semibold text-brand-900">Privacy & security</h2>
        <p className="mt-2">
          Passwords are hashed (bcrypt). Sessions use HTTP-only cookies. Deploy with a strong{" "}
          <code className="rounded bg-brand-50 px-1">AUTH_SECRET</code>, HTTPS, and restrict data
          volume access. Align retention policies with your local privacy requirements for health-related
          notes.
        </p>
      </section>
    </div>
  );
}
