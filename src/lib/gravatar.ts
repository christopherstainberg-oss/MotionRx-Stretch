/**
 * Gravatar helpers — MD5 of trimmed lowercase email (Gravatar standard).
 */

import { createHash } from "crypto";

export function gravatarHash(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHash("md5").update(normalized).digest("hex");
}

/**
 * Build a Gravatar image URL.
 * @param email account email
 * @param size pixels (1–2048)
 * @param fallback Gravatar default (identicon | mp | retro | robohash | blank)
 */
export function gravatarUrl(
  email: string,
  size = 200,
  fallback: "identicon" | "mp" | "retro" | "robohash" | "blank" = "identicon"
): string {
  const hash = gravatarHash(email);
  const s = Math.max(1, Math.min(2048, Math.round(size)));
  return `https://www.gravatar.com/avatar/${hash}?s=${s}&d=${fallback}&r=pg`;
}
