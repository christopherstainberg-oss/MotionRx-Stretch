"use client";

import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { OfflineBanner } from "@/components/OfflineBanner";
import { DEFAULT_APP_NAME } from "@/data/names";
import { isLoginBypassEnabled } from "@/lib/preview-auth";
import { clearMeCache, getMeCached, peekMeCache } from "@/lib/auth-session";

// Defer non-critical chrome so first paint / route swaps stay snappy
const PwaRegister = lazy(() =>
  import("@/components/PwaRegister").then((m) => ({ default: m.PwaRegister }))
);
const VideoCatalogRefresh = lazy(() =>
  import("@/components/VideoCatalogRefresh").then((m) => ({
    default: m.VideoCatalogRefresh,
  }))
);

function DeferredChrome() {
  return (
    <Suspense fallback={null}>
      <VideoCatalogRefresh />
      <PwaRegister />
    </Suspense>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const bypassLogin = isLoginBypassEnabled();
  const isAuthScreen = pathname === "/login" || pathname === "/";

  // Never block already-authed navigations with a full-screen Loading flash
  const [authReady, setAuthReady] = useState(() => isAuthScreen || bypassLogin);
  const knownAuthedRef = useRef(false);

  useEffect(() => {
    if (bypassLogin) {
      setAuthReady(true);
      knownAuthedRef.current = true;
      return;
    }
    if (isAuthScreen) {
      setAuthReady(true);
      return;
    }

    let cancelled = false;

    // Hydrate from warm session cache immediately (no network wait)
    const peek = peekMeCache();
    if (peek) {
      knownAuthedRef.current = true;
      setAuthReady(true);
    } else if (!knownAuthedRef.current) {
      // Only the first cold load shows Loading…
      setAuthReady(false);
    }

    getMeCached(false)
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          knownAuthedRef.current = false;
          clearMeCache();
          setAuthReady(false);
          router.replace("/login");
          return;
        }
        knownAuthedRef.current = true;
        setAuthReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        if (!knownAuthedRef.current) {
          setAuthReady(false);
          router.replace("/login");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bypassLogin, isAuthScreen, pathname, router]);

  // Prefetch primary destinations when the browser is idle
  useEffect(() => {
    if (!authReady || isAuthScreen) return;
    const routes = ["/home", "/routines", "/assessment", "/journal", "/jeffery", "/library"];
    const run = () => {
      for (const r of routes) {
        try {
          router.prefetch(r);
        } catch {
          /* ignore */
        }
      }
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(run, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(run, 800);
    return () => window.clearTimeout(t);
  }, [authReady, isAuthScreen, router]);

  if (isAuthScreen) {
    return (
      <div className="flex min-h-dvh flex-col">
        <OfflineBanner />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <DeferredChrome />
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-brand-50/40 dark:bg-brand-950">
        <OfflineBanner />
        <p className="text-sm text-brand-600 dark:text-brand-300">Loading…</p>
        <DeferredChrome />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <OfflineBanner />
      <Nav brandName={DEFAULT_APP_NAME.name} />
      <main
        id="main-content"
        tabIndex={-1}
        className="page page-pad mx-auto w-full flex-1 outline-none"
        style={{
          paddingTop: "1.25rem",
          paddingBottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 1.25rem)",
        }}
      >
        {children}
      </main>
      <footer
        className="mt-auto hidden border-t border-brand-100/60 py-6 text-center text-xs text-brand-500 xl:block dark:border-brand-800/60"
        style={{
          paddingLeft: "max(1rem, var(--safe-left))",
          paddingRight: "max(1rem, var(--safe-right))",
          paddingBottom: "max(1.5rem, var(--safe-bottom))",
        }}
      >
        <p>
          {DEFAULT_APP_NAME.name} · Educational mobility support · Not a substitute for clinical
          care
        </p>
      </footer>
      <DeferredChrome />
    </div>
  );
}
