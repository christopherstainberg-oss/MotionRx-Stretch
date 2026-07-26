"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  ChevronDown,
  Download,
  Fingerprint,
  LogOut,
  Palette,
  RotateCcw,
  Settings,
  ShieldCheck,
  Upload,
  User,
  UserCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { collectLocalExportBlob, restoreLocalExportBlob } from "@/lib/local-export";
import { cn } from "@/lib/utils";
import { ThemeCycleButton } from "./ThemeToggle";

type MeUser = {
  id: string;
  email: string;
  name: string;
  preferredName?: string | null;
  displayName?: string;
  createdAt?: string;
  isAdmin?: boolean;
  biometricsEnabled?: boolean;
  avatarSource?: "upload" | "gravatar" | "none";
  gravatarUrl?: string | null;
  hasUploadAvatar?: boolean;
  hasAvatar?: boolean;
  avatarDisplayUrl?: string | null;
};

/**
 * Top-bar Account section: profile summary + Logout, Reset, Import, Export, Analytics,
 * and other account shortcuts (settings, biometrics, preferences, theme).
 */
export function AccountMenu({ className = "" }: { className?: string }) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [avatarBust, setAvatarBust] = useState(0);

  const refreshMe = useCallback(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user || null);
      })
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }

  async function logout() {
    setBusy("logout");
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* still leave */
    }
    setUser(null);
    setOpen(false);
    window.location.href = "/login";
  }

  async function exportData() {
    setBusy("export");
    try {
      const res = await apiFetch("/api/account/export");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || "Export failed");
        return;
      }
      const pkg = await res.json();
      pkg.local = collectLocalExportBlob();
      const blob = new Blob([JSON.stringify(pkg, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motionrx-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Export downloaded");
      setOpen(false);
    } catch {
      showToast("Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function importFile(file: File | null) {
    if (!file) return;
    setBusy("import");
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        showToast("Invalid JSON file");
        return;
      }
      const res = await apiFetch("/api/account/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: parsed, mergeProfile: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Import failed");
        return;
      }
      if (data.local && typeof data.local === "object") {
        restoreLocalExportBlob(data.local as Record<string, unknown>);
      } else if (
        parsed &&
        typeof parsed === "object" &&
        (parsed as { local?: unknown }).local
      ) {
        restoreLocalExportBlob((parsed as { local: Record<string, unknown> }).local);
      }
      showToast("Import complete — reloading…");
      setOpen(false);
      window.setTimeout(() => {
        window.location.href = "/home";
      }, 600);
    } catch {
      showToast("Import failed");
    } finally {
      setBusy(null);
      if (importRef.current) importRef.current.value = "";
    }
  }

  function photoSrc(): string | null {
    if (!user) return null;
    if (user.avatarSource === "gravatar" && user.gravatarUrl) return user.gravatarUrl;
    if (user.hasUploadAvatar || user.avatarSource === "upload") {
      return `/api/account/avatar?t=${avatarBust}`;
    }
    if (user.avatarDisplayUrl?.startsWith("http")) return user.avatarDisplayUrl;
    if (user.avatarDisplayUrl === "/api/account/avatar") {
      return `/api/account/avatar?t=${avatarBust}`;
    }
    return null;
  }

  const label =
    user?.preferredName ||
    user?.displayName ||
    user?.name?.split(/\s+/)[0] ||
    (checked && !user ? "Guest" : "Account");

  const photo = photoSrc();

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        className={cn(
          "inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-semibold transition",
          open
            ? "bg-brand-100 text-brand-900 dark:bg-brand-900 dark:text-brand-50"
            : "text-brand-800 hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-brand-900"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) {
            refreshMe();
            setAvatarBust((n) => n + 1);
          }
        }}
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-900">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="h-4 w-4 text-brand-600" aria-hidden />
          )}
        </span>
        <span className="hidden max-w-[7rem] truncate sm:inline">{label}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 opacity-70 transition", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {toast && (
        <div
          className="absolute right-0 top-full z-[70] mt-2 whitespace-nowrap rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-900 shadow-lg dark:border-brand-700 dark:bg-brand-950 dark:text-brand-50"
          role="status"
        >
          {toast}
        </div>
      )}

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-[65] mt-2 w-[min(100vw-1.5rem,20rem)] overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-2xl dark:border-brand-800 dark:bg-brand-950"
        >
          {/* Profile summary */}
          <div className="border-b border-brand-50 bg-brand-50/50 px-4 py-3 dark:border-brand-800 dark:bg-brand-900/40">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">
              Account
            </p>
            {user ? (
              <div className="mt-1.5 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-200 bg-white dark:border-brand-700 dark:bg-brand-950">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserCircle className="h-7 w-7 text-brand-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-brand-950 dark:text-brand-50">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-brand-600 dark:text-brand-300">
                    {user.email}
                  </p>
                  <p className="mt-0.5 text-[11px] text-brand-500">
                    {user.createdAt
                      ? `Joined ${new Date(user.createdAt).toLocaleDateString()}`
                      : "Registered account"}
                    {user.isAdmin ? " · Admin" : ""}
                    {user.biometricsEnabled ? " · Face ID on" : ""}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-1.5">
                <p className="font-semibold text-brand-950 dark:text-brand-50">Guest session</p>
                <p className="text-xs text-brand-600">
                  Data stays on this device until you create an account.
                </p>
              </div>
            )}
          </div>

          {/* Primary destinations */}
          <div className="p-1.5">
            <MenuLink
              href="/account"
              icon={Settings}
              label="Account settings"
              hint="Profile, password, photo, biometrics"
              onNavigate={() => setOpen(false)}
            />
            <MenuLink
              href="/analytics"
              icon={BarChart3}
              label="User Analytics"
              hint={user?.isAdmin ? "Your metrics + admin directory" : "Sessions, pain, consistency"}
              onNavigate={() => setOpen(false)}
            />
            <MenuLink
              href="/account#preferences"
              icon={Bell}
              label="Preferences"
              hint="Reminders, theme, session length"
              onNavigate={() => setOpen(false)}
            />
            <MenuLink
              href="/account#security"
              icon={Fingerprint}
              label="Security & biometrics"
              hint="Face ID / Touch ID, password"
              onNavigate={() => setOpen(false)}
            />
            <MenuLink
              href="/progress"
              icon={ShieldCheck}
              label="Progress & goals"
              hint="Outcomes over time"
              onNavigate={() => setOpen(false)}
            />
          </div>

          {/* Data actions: Export / Import / Reset */}
          <div className="border-t border-brand-50 p-1.5 dark:border-brand-800">
            <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-500">
              Your data
            </p>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-900"
              disabled={busy === "export"}
              onClick={() => void exportData()}
            >
              <Download className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>
                <span className="font-semibold text-brand-900 dark:text-brand-50">
                  {busy === "export" ? "Exporting…" : "Export data"}
                </span>
                <span className="mt-0.5 block text-[11px] text-brand-500">
                  Download JSON backup (private)
                </span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-900"
              disabled={busy === "import"}
              onClick={() => importRef.current?.click()}
            >
              <Upload className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>
                <span className="font-semibold text-brand-900 dark:text-brand-50">
                  {busy === "import" ? "Importing…" : "Import data"}
                </span>
                <span className="mt-0.5 block text-[11px] text-brand-500">
                  Restore from a MotionRx export
                </span>
              </span>
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => void importFile(e.target.files?.[0] || null)}
            />
            <MenuLink
              href="/account#session-data"
              icon={RotateCcw}
              label="Reset data"
              hint="Reset all or daily — type Reset to confirm"
              onNavigate={() => setOpen(false)}
              danger
            />
          </div>

          {/* Theme */}
          <div className="border-t border-brand-50 px-3 py-2.5 dark:border-brand-800">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-200">
                <Palette className="h-3.5 w-3.5" />
                Theme
              </span>
              <ThemeCycleButton />
            </div>
          </div>

          {/* Auth footer */}
          <div className="border-t border-brand-50 p-1.5 dark:border-brand-800">
            {user ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold text-brand-900 hover:bg-brand-50 dark:text-brand-50 dark:hover:bg-brand-900"
                disabled={busy === "logout"}
                onClick={() => void logout()}
              >
                <LogOut className="h-4 w-4 text-brand-600" />
                {busy === "logout" ? "Signing out…" : "Log out"}
              </button>
            ) : (
              <Link
                href="/login"
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-50 dark:text-brand-50 dark:hover:bg-brand-900"
                onClick={() => setOpen(false)}
              >
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                Sign in or register
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  hint,
  onNavigate,
  danger,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onNavigate?: () => void;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-brand-50 dark:hover:bg-brand-900",
        danger && "hover:bg-rose-50 dark:hover:bg-rose-950/40"
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          danger ? "text-rose-600" : "text-brand-600"
        )}
      />
      <span>
        <span
          className={cn(
            "font-semibold",
            danger
              ? "text-rose-800 dark:text-rose-200"
              : "text-brand-900 dark:text-brand-50"
          )}
        >
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] text-brand-500">{hint}</span>
        ) : null}
      </span>
    </Link>
  );
}
