"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLogo } from "./Icons";
import { ThemeCycleButton } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Bot,
  Dumbbell,
  Home,
  Library,
  ListChecks,
  ListPlus,
  Menu,
  Network,
  Sparkles,
  Stethoscope,
  TrendingUp,
  User,
  X,
} from "lucide-react";

/** Plan path — primary journey */
const planLinks = [
  { href: "/assessment", label: "Assess", icon: Stethoscope, step: "1" },
  { href: "/routines", label: "Plan", icon: ListChecks, step: "2" },
  { href: "/journal", label: "Journal", icon: BookOpen, step: "3" },
  { href: "/jeffery", label: "Jeffery", icon: Bot, step: "4" },
];

/** Secondary tools — menu only / desktop secondary */
const toolLinks = [
  { href: "/library", label: "Stretches", icon: Library },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/modalities", label: "Modalities", icon: Sparkles },
  { href: "/builder", label: "Builder", icon: ListPlus },
  { href: "/insights", label: "Insights", icon: Network },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/account", label: "Account", icon: User },
];

const mobileTabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/routines", label: "Plan", icon: ListChecks },
  { href: "/assessment", label: "Assess", icon: Stethoscope },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/jeffery", label: "Jeffery", icon: Bot },
];

function isActive(pathname: string, href: string) {
  if (href === "/home") return pathname === "/home";
  if (href === "/routines")
    return pathname === "/routines" || pathname.startsWith("/routines/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav({ brandName = "MotionRx Stretch" }: { brandName?: string }) {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.user) {
          setSignedIn(true);
          setDisplayName(d.user.name || d.user.email);
        } else {
          setSignedIn(false);
          setDisplayName(null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      <header
        className="sticky top-0 z-40 border-b border-brand-100/90 bg-white/95 shadow-sm backdrop-blur-xl dark:border-brand-800/90 dark:bg-brand-950/95"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <div className="page page-pad mx-auto flex h-[var(--header-h)] items-center gap-2 sm:gap-3">
          <Link
            href="/home"
            className="flex shrink-0 items-center gap-2 font-semibold text-brand-900"
          >
            <AppLogo className="h-8 w-8 sm:h-9 sm:w-9" />
            <span className="hidden max-w-[9rem] truncate text-sm tracking-tight md:inline lg:max-w-none lg:text-base">
              {brandName}
            </span>
          </Link>

          {/* Global free-text search with autocomplete */}
          <div className="min-w-0 flex-1 px-1">
            <GlobalSearch variant="header" />
          </div>

          {/* Desktop plan path */}
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Plan path">
            {planLinks.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition",
                    active
                      ? "bg-brand-600 text-white"
                      : "text-brand-700 hover:bg-brand-50 hover:text-brand-900 dark:hover:bg-brand-900"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <ThemeCycleButton className="hidden sm:inline-flex" />
            <button
              type="button"
              className="btn-ghost min-h-[44px] min-w-[44px] p-2"
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Drawer: plan + tools, grouped */}
      {menuOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-brand-950/40 backdrop-blur-sm"
            aria-label="Close menu backdrop"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="mobile-drawer"
            className="absolute bottom-0 left-0 right-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl border-t border-brand-100 bg-white shadow-2xl dark:border-brand-800 dark:bg-brand-950 sm:left-auto sm:top-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0"
            style={{ paddingBottom: "max(1.25rem, var(--safe-bottom))" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-50 bg-white px-5 py-4 dark:border-brand-800 dark:bg-brand-950">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Menu</p>
                <p className="font-bold text-brand-950">Navigate by plan</p>
              </div>
              <button
                type="button"
                className="btn-ghost min-h-[44px] min-w-[44px] p-2"
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1 border-b border-brand-50 p-4 dark:border-brand-800">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                Search
              </p>
              <GlobalSearch variant="drawer" autoFocus onNavigate={() => setMenuOpen(false)} />
            </div>

            <div className="p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                Your plan path
              </p>
              <ol className="space-y-1.5">
                <li>
                  <Link
                    href="/home"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold",
                      isActive(pathname, "/home")
                        ? "border-brand-300 bg-brand-50 text-brand-900"
                        : "border-brand-100 text-brand-800 dark:border-brand-800"
                    )}
                  >
                    <Home className="h-5 w-5 text-brand-600" />
                    Home
                  </Link>
                </li>
                {planLinks.map(({ href, label, icon: Icon, step }) => {
                  const active = isActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold",
                          active
                            ? "border-brand-300 bg-brand-50 text-brand-900 dark:border-brand-600 dark:bg-brand-900"
                            : "border-brand-100 text-brand-800 dark:border-brand-800"
                        )}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                          {step}
                        </span>
                        <Icon className="h-4 w-4 text-brand-600" />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="border-t border-brand-50 p-4 dark:border-brand-800">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-500">
                Libraries & tools
              </p>
              <ul className="grid grid-cols-2 gap-2">
                {toolLinks.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex min-h-[64px] flex-col justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold",
                          active
                            ? "border-brand-300 bg-brand-50 text-brand-900"
                            : "border-brand-100 text-brand-800 dark:border-brand-800"
                        )}
                      >
                        <Icon className="h-4 w-4 text-brand-600" />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="border-t border-brand-50 px-4 py-3 dark:border-brand-800">
              <ThemeCycleButton />
              <p className="mt-1 text-[11px] text-brand-500">Theme: Auto · Light · Dark</p>
            </div>

            {!signedIn ? (
              <div className="px-4 pb-4">
                <Link href="/login" className="btn-primary w-full py-3" onClick={() => setMenuOpen(false)}>
                  Sign in
                </Link>
              </div>
            ) : (
              <div className="px-4 pb-4 text-sm text-brand-600">
                Signed in as {displayName || "user"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom tabs — plan path only */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-100/90 bg-white/95 shadow-[0_-8px_30px_-12px_rgba(15,61,58,0.18)] backdrop-blur-xl dark:border-brand-800/90 dark:bg-brand-950/95 lg:hidden"
        aria-label="Plan path"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="mx-auto flex max-w-lg items-stretch px-1 pt-1">
          {mobileTabs.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn("tab-item", active ? "tab-item-active" : "tab-item-idle")}
              >
                <span
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition",
                    active && "bg-brand-100 text-brand-700 dark:bg-brand-900"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
