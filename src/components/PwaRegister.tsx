"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, Share, X } from "lucide-react";

const DISMISS_KEY = "motionrx-pwa-dismissed";
const UPDATE_CHECK_MS = 5 * 60 * 1000; // 5 minutes while app is open

/**
 * Registers the service worker in all modes (including installed PWA),
 * checks for updates on focus/online/interval, activates new SW immediately,
 * and reloads once so deploys apply without delete/reinstall.
 *
 * Also shows optional install tips when not yet installed.
 */
export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [updating, setUpdating] = useState(false);
  const refreshingRef = useRef(false);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);

  // —— Always register SW + auto-update (including standalone PWA) ——
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    let intervalId: number | undefined;

    const checkNow = () => {
      regRef.current?.update().catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") checkNow();
    };

    // When the new SW takes control, reload once so HTML/JS match the deploy
    const onControllerChange = () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      setUpdating(true);
      window.setTimeout(() => {
        window.location.reload();
      }, 120);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    async function setup() {
      try {
        // updateViaCache: 'none' — always revalidate sw.js (pairs with Cache-Control headers)
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (cancelled) return;
        regRef.current = reg;

        try {
          await reg.update();
        } catch {
          /* offline */
        }

        if (reg.waiting) {
          setUpdating(true);
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setUpdating(true);
              installing.postMessage({ type: "SKIP_WAITING" });
              reg.waiting?.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        intervalId = window.setInterval(checkNow, UPDATE_CHECK_MS);
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", checkNow);
        window.addEventListener("online", checkNow);
      } catch {
        /* registration failed (private mode, etc.) */
      }
    }

    void setup();

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkNow);
      window.removeEventListener("online", checkNow);
    };
  }, []);

  // —— Install prompt UI (only when not already installed) ——
  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setStandalone(isStandalone);
    if (isStandalone) return;

    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const ua = navigator.userAgent;
    const isIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

    if (isIos && isSafari) {
      const t = window.setTimeout(() => setIosHint(true), 2500);
      return () => window.clearTimeout(t);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  function dismissInstall() {
    setShowInstall(false);
    setIosHint(false);
    setDeferred(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {updating && (
        <div
          className="pointer-events-none fixed left-1/2 z-[60] -translate-x-1/2 rounded-full border border-brand-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-brand-800 shadow-lg dark:border-brand-700 dark:bg-brand-950/95 dark:text-brand-100"
          style={{ top: "calc(var(--safe-top, 0px) + 0.75rem)" }}
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Updating App…
          </span>
        </div>
      )}

      {!standalone && (showInstall || iosHint) ? (
        <div
          className="fixed left-3 right-3 z-[55] mx-auto max-w-md animate-in"
          style={{
            bottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 0.75rem)",
          }}
        >
          <div className="card border-brand-200 p-4 shadow-soft ring-1 ring-brand-100/80">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-brand-100 p-2.5 text-brand-700">
                <Download className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-950">Install MotionRx Stretch</p>
                {iosHint ? (
                  <p className="mt-1 text-sm leading-relaxed text-brand-700/90">
                    On iPhone: tap{" "}
                    <Share className="mx-0.5 inline h-3.5 w-3.5 text-brand-600" aria-label="Share" />{" "}
                    <strong>Share</strong>, then <strong>Add to Home Screen</strong> for a full-screen
                    app experience.
                  </p>
                ) : (
                  <p className="mt-1 text-sm leading-relaxed text-brand-700/90">
                    Add to your home screen for offline access, faster launch, and automatic updates
                    when we deploy.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {deferred && (
                    <button
                      type="button"
                      className="btn-primary min-h-[40px] px-4 text-xs"
                      onClick={async () => {
                        await deferred.prompt();
                        dismissInstall();
                      }}
                    >
                      Install App
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost min-h-[40px] px-3 text-xs"
                    onClick={dismissInstall}
                  >
                    Not Now
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-brand-500 hover:bg-brand-50"
                onClick={dismissInstall}
                aria-label="Dismiss Install Prompt"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
