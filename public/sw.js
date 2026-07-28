/* MotionRx Stretch service worker — offline shell + auto-update on deploy
 *
 * Design goals:
 * - New deploys activate without deleting/reinstalling the PWA
 * - skipWaiting + clients.claim so updates take over immediately
 * - Network-first for HTML and Next.js assets when online
 * - Cache only as offline fallback
 *
 * Bump CACHE when changing SW strategies so activate clears old shells.
 */
const CACHE = "motionrx-v5";
const PRECACHE = [
  "/login",
  "/home",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Don't fail install if one asset is missing — still activate SW
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (res && res.ok) await cache.put(url, res);
          } catch {
            /* ignore individual precache failures */
          }
        })
      );
      // Activate immediately so clients get the new SW without waiting
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
      // Notify open tabs that a new SW controls them (client may reload)
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: "SW_ACTIVATED", cache: CACHE });
      }
    })()
  );
});

// Client asks this SW to take control immediately
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (data.type === "CLEAR_CACHES") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

function isNextAsset(pathname) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|ico|map)$/i.test(pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the service worker script itself
  if (url.pathname === "/sw.js") {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  // API: network only (no stale auth/session from cache)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(JSON.stringify({ offline: true, error: "You appear to be offline." }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
      )
    );
    return;
  }

  // Navigations + Next bundles: network-first so deploys show up immediately online
  if (request.mode === "navigate" || isNextAsset(url.pathname)) {
    event.respondWith(
      fetch(request, { cache: request.mode === "navigate" ? "no-cache" : "default" })
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          if (request.mode === "navigate") {
            return (
              (await caches.match("/home")) ||
              (await caches.match("/login")) ||
              new Response("Offline — reopen when you have a connection.", {
                status: 503,
                headers: { "Content-Type": "text/plain" },
              })
            );
          }
          return new Response("", { status: 504, statusText: "Offline" });
        })
    );
    return;
  }

  // Other GETs: stale-while-revalidate (fast + refresh in background)
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
