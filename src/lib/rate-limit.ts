/**
 * Simple in-memory rate limiter (per process).
 * Suitable for single-node Docker; use Redis for multi-replica production.
 */

import {
  normalizeEmailInput,
  normalizeUserText,
} from "@/lib/input-normalize";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (existing.count >= opts.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

/**
 * Sanitize free-text from keyboard: NFC, fold smart quotes/dashes,
 * strip invisible/bidi controls, cap length. Preserves diacritics (José).
 */
export function sanitizeText(input: string, maxLen = 2000): string {
  return normalizeUserText(input, maxLen);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  const e = normalizeEmailInput(email);
  if (e.length > 254 || e.length < 3) return false;
  return EMAIL_RE.test(e);
}
