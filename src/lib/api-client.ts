/** First-party API helpers — CSRF defense-in-depth header */

export function apiHeaders(init?: HeadersInit): Headers {
  const h = new Headers(init);
  if (!h.has("X-MotionRx-Client")) {
    h.set("X-MotionRx-Client", "web");
  }
  return h;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = apiHeaders(init?.headers);
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}
