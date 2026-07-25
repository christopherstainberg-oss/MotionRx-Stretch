"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISS_KEY = "motionrx-pwa-dismissed";

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setStandalone(isStandalone);
    if (isStandalone) return;

    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

    if (isIos && isSafari) {
      // Show soft iOS install tip after a short delay
      const t = window.setTimeout(() => setIosHint(true), 2500);
      return () => window.clearTimeout(t);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  function dismiss() {
    setShow(false);
    setIosHint(false);
    setDeferred(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (standalone) return null;
  if (!show && !iosHint) return null;

  return (
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
                Add to your home screen for offline access, faster launch, and an app-like layout.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {deferred && (
                <button
                  type="button"
                  className="btn-primary min-h-[40px] px-4 text-xs"
                  onClick={async () => {
                    await deferred.prompt();
                    dismiss();
                  }}
                >
                  Install app
                </button>
              )}
              <button type="button" className="btn-ghost min-h-[40px] px-3 text-xs" onClick={dismiss}>
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-brand-500 hover:bg-brand-50"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
