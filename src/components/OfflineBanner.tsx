"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="sticky top-0 z-[60] bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white"
      style={{ paddingTop: "max(0.5rem, var(--safe-top))" }}
      role="status"
    >
      <span className="inline-flex items-center gap-2">
        <WifiOff className="h-4 w-4" aria-hidden />
        You&apos;re offline — saved plans and library still work when cached.
      </span>
    </div>
  );
}
