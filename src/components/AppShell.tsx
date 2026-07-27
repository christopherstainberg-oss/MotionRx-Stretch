"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { PwaRegister } from "@/components/PwaRegister";
import { OfflineBanner } from "@/components/OfflineBanner";
import { VideoCatalogRefresh } from "@/components/VideoCatalogRefresh";
import { DEFAULT_APP_NAME } from "@/data/names";
import { apiFetch } from "@/lib/api-client";
import { isLoginBypassEnabled } from "@/lib/preview-auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const bypassLogin = isLoginBypassEnabled();
  const isAuthScreen = pathname === "/login" || pathname === "/";
  const [authReady, setAuthReady] = useState(isAuthScreen || bypassLogin);

  useEffect(() => {
    if (bypassLogin) {
      setAuthReady(true);
      return;
    }
    if (isAuthScreen) {
      setAuthReady(true);
      return;
    }
    let cancelled = false;
    setAuthReady(false);
    apiFetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.user) {
          router.replace("/login");
          return;
        }
        setAuthReady(true);
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [bypassLogin, isAuthScreen, pathname, router]);

  if (isAuthScreen) {
    return (
      <div className="flex min-h-dvh flex-col">
        <OfflineBanner />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <VideoCatalogRefresh />
        <PwaRegister />
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-brand-50/50 dark:bg-brand-950">
        <OfflineBanner />
        <p className="text-sm font-medium text-brand-700 dark:text-brand-200">
          Checking your account…
        </p>
        <PwaRegister />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <OfflineBanner />
      <VideoCatalogRefresh />
      <Nav brandName={DEFAULT_APP_NAME.name} />
      <main
        id="main-content"
        tabIndex={-1}
        className="page page-pad mx-auto w-full flex-1 outline-none"
        style={{
          paddingTop: "1.25rem",
          /* room for bottom tab bar + home indicator on phones */
          paddingBottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 1.25rem)",
        }}
      >
        <div className="pb-6 lg:pb-10 xl:pb-8">{children}</div>
      </main>
      <footer
        className="mt-auto hidden border-t border-brand-100/80 bg-white/70 py-8 text-center text-sm text-brand-700/80 xl:block"
        style={{
          paddingLeft: "max(1rem, var(--safe-left))",
          paddingRight: "max(1rem, var(--safe-right))",
          paddingBottom: "max(2rem, var(--safe-bottom))",
        }}
      >
        <p className="font-semibold text-brand-900">{DEFAULT_APP_NAME.name}</p>
        <p className="mx-auto mt-1 max-w-xl px-4 leading-relaxed">
          Educational mobility support inspired by outpatient physical therapy principles. Not a
          substitute for personalized medical or PT care.
        </p>
        <p className="mt-3 text-xs text-brand-500">
          Installable PWA · Offline-ready · Pain-aware self-adjust · Jeffery AI coach
        </p>
      </footer>
      <PwaRegister />
    </div>
  );
}
