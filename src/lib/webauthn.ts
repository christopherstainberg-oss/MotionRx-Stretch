/**
 * WebAuthn helpers for Face ID / Touch ID / Windows Hello (platform authenticators).
 */

import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import type { WebAuthnCredential } from "@/lib/types";

export type ChallengeKind = "registration" | "authentication";

interface StoredChallenge {
  challenge: string;
  kind: ChallengeKind;
  userId?: string;
  expires: number;
}

/** In-memory challenge store (single-node). TTL 5 minutes. */
const challenges = new Map<string, StoredChallenge>();

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function pruneChallenges() {
  const now = Date.now();
  Array.from(challenges.entries()).forEach(([k, v]) => {
    if (v.expires < now) challenges.delete(k);
  });
}

export function putChallenge(
  key: string,
  challenge: string,
  kind: ChallengeKind,
  userId?: string
) {
  pruneChallenges();
  challenges.set(key, {
    challenge,
    kind,
    userId,
    expires: Date.now() + CHALLENGE_TTL_MS,
  });
}

export function takeChallenge(
  key: string,
  kind: ChallengeKind
): StoredChallenge | null {
  pruneChallenges();
  const entry = challenges.get(key);
  if (!entry || entry.kind !== kind) return null;
  challenges.delete(key);
  if (entry.expires < Date.now()) return null;
  return entry;
}

export function getRpId(req: Request): string {
  const envRp = process.env.WEBAUTHN_RP_ID?.trim();
  if (envRp) return envRp;
  const host = req.headers.get("host") || "localhost";
  return host.split(":")[0] || "localhost";
}

export function getOrigin(req: Request): string {
  const envOrigin = process.env.WEBAUTHN_ORIGIN?.trim();
  if (envOrigin) return envOrigin;
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const host = req.headers.get("host") || "localhost:3000";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}

export function getRpName(): string {
  return process.env.WEBAUTHN_RP_NAME?.trim() || "MotionRx Stretch";
}

/** Base64url encode */
export function b64url(buf: Uint8Array | Buffer | ArrayBuffer): string {
  const b = Buffer.from(buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf);
  return b.toString("base64url");
}

export function fromB64url(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64url"));
}

export function toAuthenticatorDevice(cred: WebAuthnCredential) {
  const key = fromB64url(cred.publicKey);
  // Copy into a plain ArrayBuffer-backed Uint8Array for simplewebauthn types
  const publicKey = new Uint8Array(key.byteLength);
  publicKey.set(key);
  return {
    id: cred.id,
    publicKey,
    counter: cred.counter,
    transports: (cred.transports || []) as AuthenticatorTransportFuture[],
  };
}

export function credentialPublicSummary(cred: WebAuthnCredential) {
  return {
    id: cred.id,
    name: cred.name || "This device",
    createdAt: cred.createdAt,
    lastUsedAt: cred.lastUsedAt || null,
    deviceType: cred.deviceType || null,
  };
}
