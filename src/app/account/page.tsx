"use client";

import { useEffect, useState } from "react";
import { APP_NAME_OPTIONS } from "@/data/names";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useThemeOptional } from "@/components/ThemeProvider";
import { apiFetch } from "@/lib/api-client";
import { Bell, Download, ShieldCheck, Upload, UserCircle } from "lucide-react";
import Link from "next/link";
import type { ThemePreference } from "@/lib/theme";
import { isThemePreference, writeStoredTheme } from "@/lib/theme";

interface PublicUser {
  id: string;
  email: string;
  name: string;
  twoFactorEnabled: boolean;
  twoFactorEnrolled?: boolean;
  hasAvatar?: boolean;
  avatarKey?: string | null;
  preferences: {
    reminderTimes: string[];
    notificationsEnabled: boolean;
    nameChoice?: string;
    sessionLengthMinutes: number;
    theme?: ThemePreference;
  };
}

export default function AccountPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [nameChoice, setNameChoice] = useState("motionrx");
  const [reminders, setReminders] = useState("08:00, 12:30, 18:00");
  const [notifications, setNotifications] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [sessionLen, setSessionLen] = useState(15);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarBust, setAvatarBust] = useState(0);
  const { preference: themePref, setPreference: setThemePref } = useThemeOptional();

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setNameChoice(d.user.preferences?.nameChoice || "motionrx");
          setReminders((d.user.preferences?.reminderTimes || []).join(", "));
          setNotifications(!!d.user.preferences?.notificationsEnabled);
          setSessionLen(d.user.preferences?.sessionLengthMinutes || 15);
          const t = d.user.preferences?.theme;
          if (isThemePreference(t)) {
            setThemePref(t);
            writeStoredTheme(t);
          }
        }
      })
      .catch(() => {});
    const stored = localStorage.getItem("nameChoice");
    if (stored) setNameChoice(stored);
  }, [setThemePref]);

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    localStorage.setItem("nameChoice", nameChoice);
    writeStoredTheme(themePref);
    const times = reminders
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setMsg("Saving…");
    if (typeof window !== "undefined" && "Notification" in window && notifications) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    }
    try {
      const res = await apiFetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameChoice,
          reminderTimes: times,
          notificationsEnabled: notifications,
          sessionLengthMinutes: sessionLen,
          theme: themePref,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Save failed");
        setMsg("");
        return;
      }
      if (data.user) setUser(data.user);
      setMsg("Preferences saved securely on the server.");
    } catch {
      setErr("Network error — try again when online.");
      setMsg("");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const res = await apiFetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-password",
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Password change failed");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setMsg(data.message || "Password changed.");
      if (data.user) setUser(data.user);
    } catch {
      setErr("Network error");
    }
  }

  async function onAvatar(file: File | null) {
    if (!file || !user) return;
    setAvatarBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.set("avatar", file);
      const res = await apiFetch("/api/account/avatar", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Upload failed");
        return;
      }
      if (data.user) setUser(data.user);
      setAvatarBust((n) => n + 1);
      setMsg("Avatar updated.");
    } catch {
      setErr("Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setErr("");
    try {
      const res = await apiFetch("/api/account/avatar", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Remove failed");
        return;
      }
      if (data.user) setUser(data.user);
      setAvatarBust((n) => n + 1);
      setMsg("Avatar removed.");
    } catch {
      setErr("Remove failed");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMsg("Signed out. Redirecting to welcome…");
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-950">Account & settings</h1>
        <p className="mt-1 text-sm text-brand-700/85">
          Secure login, appearance, avatar, password, branding, and PWA install tips.
        </p>
      </div>

      <section className="card p-5">
        <ThemeToggle />
      </section>

      <section className="card p-5">
        {user ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 dark:border-brand-800">
                {user.hasAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/account/avatar?t=${avatarBust}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle className="h-10 w-10 text-brand-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-900">{user.name}</p>
                <p className="text-sm text-brand-600">{user.email}</p>
                <p className="mt-1 text-xs text-brand-500">
                  2FA:{" "}
                  {user.twoFactorEnrolled
                    ? "Enrolled"
                    : "Not enrolled (server-controlled only)"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="btn-secondary cursor-pointer">
                <Upload className="h-4 w-4" />
                {avatarBusy ? "Working…" : "Upload avatar"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={avatarBusy}
                  onChange={(e) => onAvatar(e.target.files?.[0] || null)}
                />
              </label>
              {user.hasAvatar && (
                <button
                  type="button"
                  className="btn-ghost text-sm"
                  disabled={avatarBusy}
                  onClick={removeAvatar}
                >
                  Remove avatar
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={logout}>
                Sign out
              </button>
            </div>
            <p className="text-xs text-brand-500">
              JPEG/PNG/WebP only · max 2MB · magic-byte validated · stored outside web root
            </p>
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
            Official brand is <strong>MotionRx Stretch</strong>.
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

        <button type="submit" className="btn-primary">
          Save preferences
        </button>
        {msg && <p className="text-sm text-brand-700">{msg}</p>}
        {err && <p className="text-sm text-rose-700">{err}</p>}
      </form>

      {user && (
        <form onSubmit={changePassword} className="card space-y-4 p-5">
          <h2 className="font-semibold text-brand-900">Change password</h2>
          <p className="text-xs text-brand-600">
            Requires current password. Rotates session version and signs out other sessions.
          </p>
          <div>
            <label className="label" htmlFor="cur-pw">
              Current password
            </label>
            <input
              id="cur-pw"
              type="password"
              className="input"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
            />
          </div>
          <div>
            <label className="label" htmlFor="new-pw">
              New password
            </label>
            <input
              id="new-pw"
              type="password"
              className="input"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
            />
          </div>
          <button type="submit" className="btn-secondary">
            Update password
          </button>
        </form>
      )}

      <section className="card space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-brand-900">
          <Download className="h-5 w-5" /> PWA install & offline
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-brand-800">
          <li>
            <strong>Desktop (Chrome/Edge):</strong> install icon in the address bar.
          </li>
          <li>
            <strong>iPhone/iPad:</strong> Share → Add to Home Screen (Safari).
          </li>
          <li>
            <strong>Android:</strong> Menu → Install app / Add to Home screen.
          </li>
        </ul>
      </section>

      <section className="card p-5 text-sm text-brand-700">
        <h2 className="font-semibold text-brand-900">Privacy & security</h2>
        <p className="mt-2">
          Passwords are hashed (bcrypt). Sessions use HTTP-only cookies with versioned JWTs (7-day
          max). Profile updates require same-origin requests, rate limits, and strict schemas. 2FA
          flags are server-controlled only after real enrollment—not client checkboxes. Avatars are
          magic-byte validated and stored outside the web root. Deploy with a strong{" "}
          <code className="rounded bg-brand-50 px-1 dark:bg-brand-900">AUTH_SECRET</code> and HTTPS.
        </p>
      </section>
    </div>
  );
}
