"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline cache optional */
      });
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!show || !deferred) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md card p-4 shadow-soft lg:bottom-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-brand-100 p-2 text-brand-700">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-brand-900">Install MotionRx Stretch</p>
          <p className="mt-1 text-sm text-brand-700/80">
            Add to your home screen for offline library access and a full-screen PWA experience.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn-primary text-xs"
              onClick={async () => {
                await deferred.prompt();
                setShow(false);
                setDeferred(null);
              }}
            >
              Install
            </button>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setShow(false)}
            >
              Not now
            </button>
          </div>
        </div>
        <button type="button" className="text-brand-500" onClick={() => setShow(false)} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
