"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLogo } from "./Icons";
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
  Stethoscope,
  TrendingUp,
  User,
  X,
} from "lucide-react";

const links = [
  { href: "/home", label: "Home", icon: Home, short: "Home" },
  { href: "/library", label: "Stretches", icon: Library, short: "Stretch" },
  { href: "/exercises", label: "Exercises", icon: Dumbbell, short: "Exercise" },
  { href: "/assess", label: "Assess", icon: Stethoscope, short: "Assess" },
  { href: "/builder", label: "Builder", icon: ListPlus, short: "Build" },
  { href: "/routines", label: "Routines", icon: ListChecks, short: "Routines" },
  { href: "/jeffery", label: "Jeffery", icon: Bot, short: "Jeffery" },
  { href: "/insights", label: "Insights", icon: Network, short: "Insights" },
  { href: "/progress", label: "Progress", icon: TrendingUp, short: "Progress" },
  { href: "/journal", label: "Journal", icon: BookOpen, short: "Journal" },
  { href: "/account", label: "Account", icon: User, short: "Account" },
];

/** Primary bottom tabs — highest-use paths on phones */
const mobileTabs = [
  links[0], // Home
  links[5], // Routines
  links[3], // Assess
  links[6], // Jeffery
  links[10], // Account
];

function isActive(pathname: string, href: string) {
  if (href === "/home") return pathname === "/home";
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

  // Lock body scroll when mobile drawer is open
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

      {/* Top app bar */}
      <header
        className="sticky top-0 z-40 glass border-b shadow-sm"
        style={{ paddingTop: "var(--safe-top)" }}
      >
        <div
          className="page page-pad mx-auto flex h-[var(--header-h)] items-center justify-between gap-3"
        >
          <Link
            href="/home"
            className="flex min-w-0 items-center gap-2.5 font-semibold text-brand-900"
          >
            <AppLogo className="h-9 w-9 shrink-0 drop-shadow-sm" />
            <span className="truncate text-[15px] tracking-tight sm:text-lg">
              <span className="sm:hidden">MotionRx</span>
              <span className="hidden sm:inline">{brandName}</span>
            </span>
          </Link>

          {/* Desktop / large tablet: condensed primary links */}
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
            {links.slice(0, 8).map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition",
                    active
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-brand-700/85 hover:bg-brand-50 hover:text-brand-900"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              className="btn-ghost min-h-[44px] min-w-[44px] p-2 lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {signedIn ? (
              <Link
                href="/account"
                className="btn-secondary hidden max-w-[10rem] truncate px-3 text-xs sm:inline-flex sm:text-sm"
              >
                {displayName || "Account"}
              </Link>
            ) : (
              <Link href="/login" className="btn-primary hidden px-3 text-xs sm:inline-flex sm:text-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile full-screen drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-brand-950/40 backdrop-blur-sm"
            aria-label="Close menu backdrop"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="mobile-drawer"
            className="absolute bottom-0 left-0 right-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-brand-100 bg-white shadow-2xl"
            style={{ paddingBottom: "max(1.25rem, var(--safe-bottom))" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-brand-50 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Menu</p>
                <p className="font-bold text-brand-950">Where to next?</p>
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
            <ul className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
              {links.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex min-h-[72px] flex-col items-start justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                        active
                          ? "border-brand-300 bg-brand-50 text-brand-900"
                          : "border-brand-100 bg-white text-brand-800 active:bg-brand-50"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-brand-500")} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {!signedIn && (
              <div className="px-4 pb-2">
                <Link href="/login" className="btn-primary w-full py-3">
                  Sign in or create account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom tab bar (phones & small tablets) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-100/90 bg-white/95 shadow-[0_-8px_30px_-12px_rgba(15,61,58,0.18)] backdrop-blur-xl lg:hidden"
        aria-label="Primary"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="mx-auto flex max-w-lg items-stretch px-1 pt-1">
          {mobileTabs.map(({ href, short, icon: Icon }) => {
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
                    active && "bg-brand-100 text-brand-700"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="leading-none">{short}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
