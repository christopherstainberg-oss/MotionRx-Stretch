"use client";

import { useEffect, useRef, useState } from "react";
import { APP_NAME_OPTIONS } from "@/data/names";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useThemeOptional } from "@/components/ThemeProvider";
import { apiFetch } from "@/lib/api-client";
import { clearLocalUserData, getLocalDayBoundsIso } from "@/lib/clear-local-data";
import { collectLocalExportBlob, restoreLocalExportBlob } from "@/lib/local-export";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Download,
  Fingerprint,
  LogOut,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  Upload,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import type { ThemePreference } from "@/lib/theme";
import { isThemePreference, writeStoredTheme } from "@/lib/theme";

interface PublicUser {
  id: string;
  email: string;
  name: string;
  preferredName?: string | null;
  displayName?: string;
  twoFactorEnabled: boolean;
  twoFactorEnrolled?: boolean;
  biometricsEnabled?: boolean;
  biometricDeviceCount?: number;
  hasAvatar?: boolean;
  hasUploadAvatar?: boolean;
  avatarKey?: string | null;
  avatarSource?: "upload" | "gravatar" | "none";
  gravatarUrl?: string | null;
  avatarDisplayUrl?: string | null;
  isAdmin?: boolean;
  createdAt?: string;
  preferences: {
    reminderTimes: string[];
    notificationsEnabled: boolean;
    nameChoice?: string;
    sessionLengthMinutes: number;
    theme?: ThemePreference;
  };
}

interface BioCred {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string | null;
}

type AccountAction = "logout" | "reset-all" | "reset-daily";

const RESET_CONFIRM = "Reset";

export default function AccountPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [nameChoice, setNameChoice] = useState("motionrx");
  const [preferredName, setPreferredName] = useState("");
  const [reminders, setReminders] = useState("08:00, 12:30, 18:00");
  const [notifications, setNotifications] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [sessionLen, setSessionLen] = useState(15);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarBust, setAvatarBust] = useState(0);
  const [accountAction, setAccountAction] = useState<AccountAction>("logout");
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [bioCreds, setBioCreds] = useState<BioCred[]>([]);
  const [bioSupported, setBioSupported] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { preference: themePref, setPreference: setThemePref } = useThemeOptional();

  useEffect(() => {
    // Deep links from top-bar Account menu (#preferences, #security, #session-data)
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (hash) {
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }, []);

  useEffect(() => {
    setBioSupported(
      typeof window !== "undefined" &&
        !!window.PublicKeyCredential &&
        typeof window.PublicKeyCredential === "function"
    );

    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setNameChoice(d.user.preferences?.nameChoice || "motionrx");
          setPreferredName(
            d.user.preferredName ||
              d.user.displayName ||
              d.user.name?.split(/\s+/)[0] ||
              ""
          );
          setReminders((d.user.preferences?.reminderTimes || []).join(", "));
          setNotifications(!!d.user.preferences?.notificationsEnabled);
          setSessionLen(d.user.preferences?.sessionLengthMinutes || 15);
          const t = d.user.preferences?.theme;
          if (isThemePreference(t)) {
            setThemePref(t);
            writeStoredTheme(t);
          }
          setAccountAction("logout");
          return apiFetch("/api/auth/webauthn/credentials")
            .then((r) => r.json())
            .then((c) => {
              if (Array.isArray(c.credentials)) setBioCreds(c.credentials);
            })
            .catch(() => {});
        } else {
          setUser(null);
          setAccountAction("reset-all");
        }
      })
      .catch(() => {
        setUser(null);
        setAccountAction("reset-all");
      })
      .finally(() => setAuthChecked(true));
    const stored = localStorage.getItem("nameChoice");
    if (stored) setNameChoice(stored);
    const storedPref = localStorage.getItem("preferredName");
    if (storedPref && !preferredName) setPreferredName(storedPref);
  }, [setThemePref]);

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    localStorage.setItem("nameChoice", nameChoice);
    try {
      localStorage.setItem("preferredName", preferredName.trim());
    } catch {
      /* ignore */
    }
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
          preferredName: preferredName.trim(),
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
      setMsg("Uploaded photo removed.");
    } catch {
      setErr("Remove failed");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function setAvatarSource(source: "upload" | "gravatar" | "none") {
    if (!user) return;
    setAvatarBusy(true);
    setErr("");
    try {
      const res = await apiFetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarSource: source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Could not update photo preference");
        return;
      }
      if (data.user) setUser(data.user);
      setAvatarBust((n) => n + 1);
      setMsg(
        source === "gravatar"
          ? "Using Gravatar for your profile photo."
          : source === "upload"
            ? "Using your uploaded photo."
            : "Profile photo cleared (no image)."
      );
    } catch {
      setErr("Could not update photo preference");
    } finally {
      setAvatarBusy(false);
    }
  }

  function profilePhotoSrc(u: PublicUser): string | null {
    if (u.avatarSource === "gravatar" && u.gravatarUrl) return u.gravatarUrl;
    if (u.avatarSource === "upload" && u.hasUploadAvatar) {
      return `/api/account/avatar?t=${avatarBust}`;
    }
    // Legacy: uploaded file without explicit source
    if (u.hasUploadAvatar && u.avatarSource !== "none" && u.avatarSource !== "gravatar") {
      return `/api/account/avatar?t=${avatarBust}`;
    }
    if (u.avatarDisplayUrl?.startsWith("http")) return u.avatarDisplayUrl;
    if (u.avatarDisplayUrl === "/api/account/avatar") {
      return `/api/account/avatar?t=${avatarBust}`;
    }
    return null;
  }

  async function logout() {
    setActionBusy(true);
    setErr("");
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMsg("Signed out. Redirecting…");
      window.location.href = "/login";
    } catch {
      setErr("Could not sign out. Try again.");
      setActionBusy(false);
    }
  }

  async function resetData(scope: "all" | "daily") {
    if (resetConfirmText.trim() !== RESET_CONFIRM) {
      setErr(`Type "${RESET_CONFIRM}" exactly to confirm.`);
      return;
    }
    setActionBusy(true);
    setErr("");
    setMsg("");
    try {
      const body: Record<string, string> = {
        confirm: RESET_CONFIRM,
        scope,
      };
      if (scope === "daily") {
        const bounds = getLocalDayBoundsIso();
        body.dayStart = bounds.dayStart;
        body.dayEnd = bounds.dayEnd;
      }
      const res = await apiFetch("/api/auth/reset-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Reset failed");
        setActionBusy(false);
        return;
      }
      clearLocalUserData({ preserveTheme: true, scope });
      setResetConfirmText("");
      setMsg(data.message || (scope === "daily" ? "Daily data reset." : "All data reset."));
      // Stay signed in / stay guest — soft reload so pages pick up empty state
      window.location.href = "/home";
    } catch {
      // Offline: still honor typed confirm for device-local data
      clearLocalUserData({ preserveTheme: true, scope });
      setResetConfirmText("");
      setMsg(
        scope === "daily"
          ? "Local daily data cleared. Server sync when online may still hold older records."
          : "Local data cleared. Server sync when online may still hold older records."
      );
      window.location.href = "/home";
    }
  }

  async function runAccountAction(e: React.FormEvent) {
    e.preventDefault();
    if (accountAction === "logout") {
      await logout();
      return;
    }
    if (accountAction === "reset-all") {
      await resetData("all");
      return;
    }
    if (accountAction === "reset-daily") {
      await resetData("daily");
    }
  }

  async function exportData() {
    setExportBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await apiFetch("/api/account/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || "Export failed");
        return;
      }
      const pkg = await res.json();
      pkg.local = collectLocalExportBlob();
      const blob = new Blob([JSON.stringify(pkg, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `motionrx-export-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg("Export downloaded — keep this file private.");
    } catch {
      setErr("Export failed — check your connection.");
    } finally {
      setExportBusy(false);
    }
  }

  async function importData(file: File | null) {
    if (!file) return;
    setImportBusy(true);
    setErr("");
    setMsg("");
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setErr("File is not valid JSON.");
        return;
      }
      const res = await apiFetch("/api/account/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: parsed, mergeProfile: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Import failed");
        return;
      }
      let localN = 0;
      if (data.local && typeof data.local === "object") {
        localN = restoreLocalExportBlob(data.local as Record<string, unknown>);
      } else if (
        parsed &&
        typeof parsed === "object" &&
        (parsed as { local?: unknown }).local
      ) {
        localN = restoreLocalExportBlob(
          (parsed as { local: Record<string, unknown> }).local
        );
      }
      const counts = data.imported || {};
      const parts = Object.entries(counts)
        .filter(([, n]) => Number(n) > 0)
        .map(([k, n]) => `${n} ${k}`);
      setMsg(
        `Import complete${parts.length ? `: ${parts.join(", ")}` : ""}${
          localN ? ` · ${localN} local keys restored` : ""
        }.`
      );
    } catch {
      setErr("Import failed — check your connection and file.");
    } finally {
      setImportBusy(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function enableBiometrics() {
    if (!user) {
      setErr("Sign in with email and password first to enable Face ID / Touch ID.");
      return;
    }
    setBioBusy(true);
    setErr("");
    setMsg("");
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const optRes = await apiFetch("/api/auth/webauthn/register/options", {
        method: "POST",
      });
      const optData = await optRes.json();
      if (!optRes.ok) {
        setErr(optData.error || "Could not start biometric setup");
        return;
      }
      const attestation = await startRegistration({ optionsJSON: optData.options });
      const verRes = await apiFetch("/api/auth/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: attestation,
          deviceName: guessDeviceName(),
        }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) {
        setErr(verData.error || "Biometric enrollment failed");
        return;
      }
      if (verData.user) setUser(verData.user);
      if (verData.credential) {
        setBioCreds((prev) => {
          const rest = prev.filter((c) => c.id !== verData.credential.id);
          return [
            {
              id: verData.credential.id,
              name: verData.credential.name,
              createdAt: verData.credential.createdAt,
            },
            ...rest,
          ];
        });
      }
      setMsg(verData.message || "Face ID / Touch ID enabled.");
    } catch (e: unknown) {
      const name = e && typeof e === "object" && "name" in e ? String((e as { name: string }).name) : "";
      if (name === "NotAllowedError") {
        setErr("Biometric prompt was cancelled or blocked.");
      } else if (name === "InvalidStateError") {
        setErr("This device is already enrolled. Remove it below to re-register.");
      } else {
        setErr("Could not enable Face ID / Touch ID on this device.");
      }
    } finally {
      setBioBusy(false);
    }
  }

  async function removeBiometric(id: string) {
    setBioBusy(true);
    setErr("");
    try {
      const res = await apiFetch("/api/auth/webauthn/credentials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Could not remove device");
        return;
      }
      setBioCreds(Array.isArray(data.credentials) ? data.credentials : []);
      if (data.user) setUser(data.user);
      setMsg("Biometric device removed.");
    } catch {
      setErr("Could not remove biometric device.");
    } finally {
      setBioBusy(false);
    }
  }

  function guessDeviceName(): string {
    if (typeof navigator === "undefined") return "This device";
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad/.test(ua)) return "iPhone / iPad Face ID";
    if (/Macintosh/.test(ua)) return "Mac Touch ID";
    if (/Android/.test(ua)) return "Android biometrics";
    if (/Windows/.test(ua)) return "Windows Hello";
    return "This device";
  }

  const needsResetConfirm =
    accountAction === "reset-all" || accountAction === "reset-daily";
  const resetReady = resetConfirmText.trim() === RESET_CONFIRM;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-950">Account & settings</h1>
        <p className="mt-1 text-sm text-brand-700/85">
          Security, biometrics, export/import, appearance, and session controls.
        </p>
        <Link
          href="/analytics"
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900"
        >
          <BarChart3 className="h-4 w-4" />
          Open User Analytics
        </Link>
      </div>

      {(msg || err) && (
        <div
          className={
            err
              ? "rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
              : "rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-800 dark:bg-brand-900/40"
          }
          role={err ? "alert" : "status"}
        >
          {err || msg}
        </div>
      )}

      <section className="card p-5">
        <ThemeToggle />
      </section>

      <section id="profile" className="card scroll-mt-24 space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-brand-900">Profile details</h2>
          <p className="mt-0.5 text-xs text-brand-600">
            Name, email, member since, photo, and role — also available from the top-bar Account menu.
          </p>
        </div>
        {user ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 dark:border-brand-800">
                {profilePhotoSrc(user) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profilePhotoSrc(user)!}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserCircle className="h-10 w-10 text-brand-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-900">{user.name}</p>
                {(user.preferredName || user.displayName) &&
                  (user.preferredName || user.displayName) !== user.name && (
                    <p className="text-sm text-brand-700">
                      Preferred: {user.preferredName || user.displayName}
                    </p>
                  )}
                <p className="text-sm text-brand-600">{user.email}</p>
                <dl className="mt-2 grid gap-1 text-xs text-brand-600 sm:grid-cols-2">
                  <div>
                    <dt className="inline font-medium text-brand-500">Member since: </dt>
                    <dd className="inline">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-brand-500">Role: </dt>
                    <dd className="inline">{user.isAdmin ? "Administrator" : "Member"}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-brand-500">Photo: </dt>
                    <dd className="inline">
                      {user.avatarSource === "gravatar"
                        ? "Gravatar"
                        : user.avatarSource === "upload" || user.hasUploadAvatar
                          ? "Uploaded image"
                          : "None"}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-brand-500">Biometrics: </dt>
                    <dd className="inline">
                      {user.biometricsEnabled
                        ? `On (${user.biometricDeviceCount || 1} device)`
                        : "Off"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div>
              <p className="label mb-2">Profile photo</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  className={
                    user.avatarSource === "upload" ||
                    (!user.avatarSource && user.hasUploadAvatar)
                      ? "btn-primary justify-center py-2.5 text-sm"
                      : "btn-secondary justify-center py-2.5 text-sm"
                  }
                  disabled={avatarBusy || !user.hasUploadAvatar}
                  onClick={() => setAvatarSource("upload")}
                  title={
                    user.hasUploadAvatar
                      ? "Use your uploaded photo"
                      : "Upload an image first"
                  }
                >
                  Use uploaded
                </button>
                <button
                  type="button"
                  className={
                    user.avatarSource === "gravatar"
                      ? "btn-primary justify-center py-2.5 text-sm"
                      : "btn-secondary justify-center py-2.5 text-sm"
                  }
                  disabled={avatarBusy}
                  onClick={() => setAvatarSource("gravatar")}
                >
                  Use Gravatar
                </button>
                <button
                  type="button"
                  className={
                    user.avatarSource === "none"
                      ? "btn-primary justify-center py-2.5 text-sm"
                      : "btn-secondary justify-center py-2.5 text-sm"
                  }
                  disabled={avatarBusy}
                  onClick={() => setAvatarSource("none")}
                >
                  No photo
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="btn-secondary cursor-pointer">
                <Upload className="h-4 w-4" />
                {avatarBusy ? "Working…" : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={avatarBusy}
                  onChange={(e) => onAvatar(e.target.files?.[0] || null)}
                />
              </label>
              {user.hasUploadAvatar && (
                <button
                  type="button"
                  className="btn-ghost text-sm"
                  disabled={avatarBusy}
                  onClick={removeAvatar}
                >
                  Remove upload
                </button>
              )}
            </div>
            <p className="text-xs text-brand-500">
              Upload JPEG/PNG/WebP (max 2MB) or use{" "}
              <a
                href="https://gravatar.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                Gravatar
              </a>{" "}
              tied to your account email. Uploads are magic-byte validated and stored outside the web
              root.
            </p>
            {user.avatarSource === "gravatar" && user.gravatarUrl && (
              <p className="text-xs text-brand-500">
                Preview is loaded from Gravatar. If you see a generic icon, set a photo at gravatar.com
                for {user.email}.
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-brand-700">
              {authChecked
                ? "You are browsing as a guest. Progress stays on this device until you create an account."
                : "Checking session…"}
            </p>
            {authChecked && (
              <Link href="/login" className="btn-primary mt-3 inline-flex">
                <ShieldCheck className="h-4 w-4" />
                Sign in or register
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Export / Import */}
      <section id="data-portability" className="card scroll-mt-24 space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-brand-900">Export & import data</h2>
          <p className="mt-1 text-xs text-brand-600">
            Download a private JSON backup of your plans, sessions, journal, and device data—or
            restore one. Never share export files publicly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            disabled={exportBusy}
            onClick={exportData}
          >
            <Download className="h-4 w-4" />
            {exportBusy ? "Exporting…" : "Export data"}
          </button>
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            disabled={importBusy}
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {importBusy ? "Importing…" : "Import data"}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => importData(e.target.files?.[0] || null)}
          />
        </div>
      </section>

      {/* Face ID / Touch ID */}
      <section id="security" className="card scroll-mt-24 space-y-4 p-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-brand-900">
            <Fingerprint className="h-5 w-5 text-brand-600" />
            Security & biometrics
          </h2>
          <p className="mt-1 text-xs text-brand-600">
            Use your device biometrics (Face ID, Touch ID, Windows Hello, or fingerprint) for faster
            sign-in. Requires a registered account and a secure context (HTTPS or localhost).
          </p>
        </div>

        {!user ? (
          <p className="text-sm text-brand-700">
            Sign in or create an account, then return here to enable biometrics.
          </p>
        ) : !bioSupported ? (
          <p className="text-sm text-brand-700">
            This browser does not support WebAuthn biometrics.
          </p>
        ) : (
          <>
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2"
              disabled={bioBusy}
              onClick={enableBiometrics}
            >
              <ScanFace className="h-4 w-4" />
              {bioBusy
                ? "Waiting for device…"
                : bioCreds.length
                  ? "Add another device"
                  : "Enable Face ID / Touch ID"}
            </button>
            {bioCreds.length > 0 ? (
              <ul className="space-y-2">
                {bioCreds.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 px-3 py-2.5 text-sm dark:border-brand-800"
                  >
                    <div>
                      <p className="font-medium text-brand-900">{c.name || "Device"}</p>
                      <p className="text-xs text-brand-500">
                        Added {new Date(c.createdAt).toLocaleDateString()}
                        {c.lastUsedAt
                          ? ` · Last used ${new Date(c.lastUsedAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost text-xs text-rose-700"
                      disabled={bioBusy}
                      onClick={() => removeBiometric(c.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-brand-500">No biometric devices enrolled yet.</p>
            )}
          </>
        )}
      </section>

      {/* Logout / Reset selectors */}
      <section id="session-data" className="card scroll-mt-24 space-y-4 p-5">
        <div>
          <h2 className="font-semibold text-brand-900">Session & data</h2>
          <p className="mt-1 text-xs text-brand-600">
            Choose an action below. Resets clear data permanently and cannot be undone—export a
            backup first if you need one.
          </p>
        </div>

        <form onSubmit={runAccountAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="account-action">
              Action
            </label>
            <select
              id="account-action"
              className="input mt-1"
              value={accountAction}
              onChange={(e) => {
                setAccountAction(e.target.value as AccountAction);
                setResetConfirmText("");
                setErr("");
              }}
              disabled={actionBusy || !authChecked}
            >
              {user && <option value="logout">Log out</option>}
              <option value="reset-all">Reset all data</option>
              <option value="reset-daily">Reset daily data</option>
            </select>
          </div>

          {accountAction === "logout" && user && (
            <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-brand-800 dark:border-brand-800 dark:bg-brand-900/40">
              <p className="flex items-start gap-2">
                <LogOut className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <span>
                  Ends your secure session on this device. Your account and saved data stay on the
                  server so you can sign back in later.
                </span>
              </p>
            </div>
          )}

          {needsResetConfirm && (
            <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-900 dark:bg-rose-950/40">
              <p className="flex items-start gap-2 text-sm font-medium text-rose-900 dark:text-rose-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {accountAction === "reset-daily"
                    ? "This clears today's sessions, journal entries, modality logs, and related local daily items. Your account, plans, and older history stay."
                    : "This resets all plans, journal entries, sessions, Jeffery history, pain profiles, modalities, and device-local app data. Your login account stays active."}
                </span>
              </p>
              <div>
                <label className="label text-rose-900 dark:text-rose-100" htmlFor="reset-confirm">
                  Type <span className="font-mono font-bold">{RESET_CONFIRM}</span> to confirm
                </label>
                <input
                  id="reset-confirm"
                  className="input mt-1 border-rose-200 focus:border-rose-400 focus:ring-rose-200 dark:border-rose-800"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  autoComplete="off"
                  placeholder={RESET_CONFIRM}
                  spellCheck={false}
                  disabled={actionBusy}
                  aria-describedby="reset-confirm-hint"
                />
                <p id="reset-confirm-hint" className="mt-1 text-xs text-rose-700/90">
                  Confirmation is case-sensitive. You must type exactly: {RESET_CONFIRM}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            className={
              needsResetConfirm
                ? "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                : "btn-secondary w-full justify-center py-3"
            }
            disabled={
              actionBusy ||
              !authChecked ||
              (needsResetConfirm && !resetReady) ||
              (accountAction === "logout" && !user)
            }
          >
            {actionBusy ? (
              "Working…"
            ) : accountAction === "logout" ? (
              <>
                <LogOut className="h-4 w-4" />
                Log out
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                {accountAction === "reset-daily" ? "Reset daily data" : "Reset all data"}
              </>
            )}
          </button>
        </form>

        {msg && <p className="text-sm text-brand-700">{msg}</p>}
        {err && (
          <p className="text-sm text-rose-700" role="alert">
            {err}
          </p>
        )}
      </section>

      <form id="preferences" onSubmit={savePrefs} className="card scroll-mt-24 space-y-5 p-5">
        <div>
          <h2 className="font-semibold text-brand-900">Preferences</h2>
          <p className="mt-0.5 text-xs text-brand-600">
            Preferred name, branding, reminders, session length, and notifications.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="preferredName">
            Preferred name
          </label>
          <input
            id="preferredName"
            className="input"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            autoComplete="nickname"
            placeholder="What we should call you in plans & coaching"
            maxLength={40}
          />
          <p className="mt-1 text-xs text-brand-500">
            Used in Assessment Q&amp;A and your written plan of care (e.g. Chris instead of full legal
            name).
          </p>
        </div>

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
      </form>

      {user && (
        <form
          id="password"
          onSubmit={changePassword}
          className="card scroll-mt-24 space-y-4 p-5"
        >
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
          magic-byte validated and stored outside the web root. Data resets require typing{" "}
          <strong>{RESET_CONFIRM}</strong>. Deploy with a strong{" "}
          <code className="rounded bg-brand-50 px-1 dark:bg-brand-900">AUTH_SECRET</code> and HTTPS.
        </p>
      </section>
    </div>
  );
}
