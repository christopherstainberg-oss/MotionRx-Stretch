"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Network,
  Stethoscope,
  TrendingUp,
  User,
} from "lucide-react";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/library", label: "Stretches", icon: Library },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/assess", label: "Assess", icon: Stethoscope },
  { href: "/builder", label: "Builder", icon: ListPlus },
  { href: "/routines", label: "Routines", icon: ListChecks },
  { href: "/jeffery", label: "Jeffery", icon: Bot },
  { href: "/insights", label: "Insights", icon: Network },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/account", label: "Account", icon: User },
];

export function Nav({ brandName = "MotionRx Stretch" }: { brandName?: string }) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-brand-100/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-brand-900">
            <AppLogo className="h-9 w-9" />
            <span className="text-lg tracking-tight">{brandName}</span>
          </Link>
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition",
                    active
                      ? "bg-brand-100 text-brand-900"
                      : "text-brand-700/80 hover:bg-brand-50 hover:text-brand-900"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/jeffery" className="btn-secondary hidden text-xs sm:inline-flex">
              <Bot className="h-3.5 w-3.5" />
              Jeffery
            </Link>
            <Link href="/login" className="btn-secondary text-xs sm:text-sm">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-100 bg-white/95 backdrop-blur-md xl:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-1 py-2">
          {[
            links[0],
            links[1],
            links[2],
            links[3],
            links[6],
          ].map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] font-medium",
                  active ? "text-brand-700" : "text-brand-600/70"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
