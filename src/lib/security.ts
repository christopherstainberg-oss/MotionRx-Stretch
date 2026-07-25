/**
 * Shared request security helpers — origin checks, clamps, safe errors.
 */

export function assertSameOrigin(req: Request): boolean {
  const host = req.headers.get("host");
  if (!host) return false;

  // Explicit app marker (all first-party fetchers should send this)
  const app = req.headers.get("x-motionrx-client");
  const hasAppHeader = app === "web";

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return false;
      return true;
    } catch {
      return false;
    }
  }

  // Same-site navigations / some clients omit Origin
  const sfs = req.headers.get("sec-fetch-site");
  if (sfs === "cross-site") return false;
  if (sfs === "same-origin" || sfs === "same-site" || sfs === "none") {
    return true;
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // Non-browser / curl: require app header
  return hasAppHeader;
}

export function contentLengthOk(req: Request, maxBytes: number): boolean {
  const cl = req.headers.get("content-length");
  if (cl === null) return true; // stream; enforce after read where possible
  const n = Number(cl);
  if (!Number.isFinite(n) || n < 0) return false;
  return n <= maxBytes;
}

export function clampInt(
  n: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function safeClientError(message: string, status: number) {
  return { error: message, status };
}

/** Strip characters that commonly break out of HTML attributes if ever echoed */
export function sanitizeDisplayName(input: string, maxLen = 80): string {
  return input
    .replace(/[\u0000-\u001F\u007F<>"'`\\]/g, "")
    .trim()
    .slice(0, maxLen);
}
