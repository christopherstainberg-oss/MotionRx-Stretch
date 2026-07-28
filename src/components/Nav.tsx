"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLogo } from "./Icons";
import { ThemeCycleButton } from "./ThemeToggle";
import { GlobalSearch } from "./GlobalSearch";
import { AccountMenu } from "./AccountMenu";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Bot,
  Dumbbell,
  HeartPulse,
  Home,
  Library,
  ListChecks,
  ListPlus,
  LogOut,
  Menu,
  Moon,
  Network,
  Sparkles,
  Stethoscope,
  TrendingUp,
  User,
  X,
  BarChart3,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";

/** Primary journey */
const planLinks = [
  { href: "/assessment", label: "Assess", icon: Stethoscope },
  { href: "/routines", label: "Plan", icon: ListChecks },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/jeffery", label: "Jeffery", icon: Bot },
];

/** Secondary — menu only */
const toolLinks = [
  { href: "/library", label: "Stretches", icon: Library },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/modalities", label: "Modalities", icon: Sparkles },
  { href: "/sleep", label: "Sleep", icon: Moon },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/builder", label: "Builder", icon: ListPlus },
  { href: "/insights", label: "Insights", icon: Network },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
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
    apiFetch("/api/auth/me")
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

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* still leave session UI */
    }
    setSignedIn(false);
    setDisplayName(null);
    setMenuOpen(false);
    window.location.href = "/login";
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-brand-700 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>

      {/* Slim header: logo · search · account · menu */}
      <header
        className="sticky top-0 z-40 border-b border-brand-100/70 bg-white/90 backdrop-blur-lg dark:border-brand-800/70 dark:bg-brand-950/90"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <div className="page page-pad mx-auto flex h-[var(--header-h)] items-center gap-2 sm:gap-3">
          <Link
            href="/home"
            className="flex shrink-0 items-center gap-2 text-brand-900 dark:text-brand-50"
            aria-label={brandName}
          >
            <AppLogo className="h-7 w-7 sm:h-8 sm:w-8" />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">
              MotionRx
            </span>
          </Link>

          <div className="min-w-0 flex-1">
            <GlobalSearch variant="header" />
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <AccountMenu />
            <ThemeCycleButton className="hidden md:inline-flex" />
            <button
              type="button"
              className="btn-ghost min-h-[40px] min-w-[40px] p-2"
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

      {menuOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-brand-950/30 backdrop-blur-[2px]"
            aria-label="Close menu backdrop"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="mobile-drawer"
            className="absolute bottom-0 left-0 right-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t border-brand-100 bg-white dark:border-brand-800 dark:bg-brand-950 sm:left-auto sm:top-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-sm sm:rounded-none sm:border-l sm:border-t-0"
            style={{ paddingBottom: "max(1rem, var(--safe-bottom))" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-50 bg-white/95 px-5 py-3.5 dark:border-brand-800 dark:bg-brand-950/95">
              <p className="text-sm font-semibold text-brand-950 dark:text-brand-50">Menu</p>
              <button
                type="button"
                className="btn-ghost min-h-[40px] min-w-[40px] p-2"
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div>
                <p className="section-label mb-2">Plan</p>
                <ul className="space-y-0.5">
                  <li>
                    <Link
                      href="/home"
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                        isActive(pathname, "/home")
                          ? "bg-brand-50 text-brand-900 dark:bg-brand-900 dark:text-brand-50"
                          : "text-brand-700 hover:bg-brand-50/80 dark:text-brand-200 dark:hover:bg-brand-900/50"
                      )}
                    >
                      <Home className="h-4 w-4 opacity-70" />
                      Home
                    </Link>
                  </li>
                  {planLinks.map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                          isActive(pathname, href)
                            ? "bg-brand-50 text-brand-900 dark:bg-brand-900 dark:text-brand-50"
                            : "text-brand-700 hover:bg-brand-50/80 dark:text-brand-200 dark:hover:bg-brand-900/50"
                        )}
                      >
                        <Icon className="h-4 w-4 opacity-70" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="section-label mb-2">Tools</p>
                <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  {toolLinks.map(({ href, label, icon: Icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm",
                          isActive(pathname, href)
                            ? "bg-brand-50 font-medium text-brand-900 dark:bg-brand-900 dark:text-brand-50"
                            : "text-brand-700 hover:bg-brand-50/80 dark:text-brand-200"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-brand-100 pt-4 dark:border-brand-800">
                <ThemeCycleButton />
                {!signedIn ? (
                  <Link
                    href="/login"
                    className="btn-primary mt-4 w-full"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                ) : (
                  <div className="mt-4 space-y-2">
                    <p className="truncate text-xs text-brand-500">
                      {displayName || "Signed in"}
                    </p>
                    <button
                      type="button"
                      className="btn-ghost w-full justify-start gap-2 px-0 text-sm text-brand-700"
                      onClick={logout}
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tabs — quieter, icon-first */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-100/70 bg-white/90 backdrop-blur-lg dark:border-brand-800/70 dark:bg-brand-950/90 lg:hidden"
        aria-label="Primary"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="mx-auto flex max-w-md items-stretch px-2 pt-0.5">
          {mobileTabs.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn("tab-item", active ? "tab-item-active" : "tab-item-idle")}
              >
                <Icon
                  className={cn("h-5 w-5", active ? "text-brand-700 dark:text-brand-200" : "")}
                  aria-hidden
                />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
