"use client";

import { useEffect } from "react";

const SESSION_KEY = "motionrx:video-catalog-refresh";
const MIN_CLIENT_INTERVAL_MS = 30 * 60 * 1000; // don't spam refresh from one browser tab

/**
 * App-shell bootstrap: quietly TTL-refreshes the institutional YouTube health cache
 * so embeds stay on live IDs without user action.
 */
export function VideoCatalogRefresh() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const last = Number(sessionStorage.getItem(SESSION_KEY) || "0");
      if (Date.now() - last < MIN_CLIENT_INTERVAL_MS) return;
      sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    } catch {
      // sessionStorage may be blocked; still attempt once
    }

    const controller = new AbortController();
    // apiFetch adds X-MotionRx-Client for same-origin CSRF checks
    void import("@/lib/api-client").then(({ apiFetch }) =>
      apiFetch("/api/videos/refresh", {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      }).catch(() => {
        /* offline / ignore */
      })
    );

    return () => controller.abort();
  }, []);

  return null;
}
