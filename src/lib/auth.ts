import { readFileSync } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { readDb, updateDb, type DbShape } from "@/lib/storage";
import type { UserPreferences, UserProfile } from "@/lib/types";
import { v4 as uuid } from "uuid";
import { isValidEmail } from "@/lib/rate-limit";
import { sanitizeDisplayName } from "@/lib/security";

export const SESSION_COOKIE = "motionrx_session";
export const GUEST_COOKIE = "motionrx_guest";
/** Access session lifetime (seconds) — shorter than prior 14d */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

/**
 * Secure cookies only when HTTPS is actually used.
 * Production over plain HTTP (local Docker on :3000) must set COOKIE_SECURE=false
 * or browsers will drop the session cookie and sign-in/register will appear broken.
 */
export function cookieSecure(): boolean {
  const override = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true" || override === "1") return true;
  if (override === "false" || override === "0") return false;
  return process.env.NODE_ENV === "production";
}

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    maxAge,
  };
}

let cachedSecret: Uint8Array | null = null;

/**
 * Resolve signing secret: AUTH_SECRET env, else DATA_DIR/.auth_secret
 * (written by docker-entrypoint when env is missing).
 */
function resolveAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 16) return fromEnv;

  // Lazy file fallback for containers where entrypoint persisted a secret
  // but the process env was not re-exported (or Node was started without entrypoint).
  try {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
    const fileSecret = readFileSync(path.join(dataDir, ".auth_secret"), "utf8").trim();
    if (fileSecret.length >= 16) {
      process.env.AUTH_SECRET = fileSecret;
      return fileSecret;
    }
  } catch {
    // missing file or unreadable
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET must be set to a strong value (16+ chars) in production"
    );
  }
  return "motionrx-dev-secret-change-in-production";
}

function authSecretBytes(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  cachedSecret = new TextEncoder().encode(resolveAuthSecret());
  return cachedSecret;
}

/** True when a production-ready signing secret is available (no throw). */
export function authSecretReady(): boolean {
  try {
    resolveAuthSecret();
    return true;
  } catch {
    return false;
  }
}

const defaultPrefs = (): UserPreferences => ({
  reminderTimes: ["08:00", "12:30", "18:00"],
  defaultDifficulty: "beginner",
  sessionLengthMinutes: 15,
  notificationsEnabled: true,
  offlineVideosPreferred: false,
  nameChoice: "motionrx",
  theme: "auto",
});

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: string, sessionVersion: number) {
  return new SignJWT({ sub: userId, sv: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(authSecretBytes());
}

export async function verifyToken(
  token: string
): Promise<{ userId: string; sessionVersion: number } | null> {
  try {
    const { payload } = await jwtVerify(token, authSecretBytes());
    if (typeof payload.sub !== "string") return null;
    const sv = typeof payload.sv === "number" ? payload.sv : 0;
    return { userId: payload.sub, sessionVersion: sv };
  } catch {
    return null;
  }
}

/** Attach session cookie to a Route Handler response (preferred over cookies().set). */
export function applySessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE_SEC));
}

export function applyClearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}

export function applyClearGuestCookie(res: NextResponse) {
  res.cookies.set(GUEST_COOKIE, "", sessionCookieOptions(0));
}

export async function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE_SEC));
}

export async function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", sessionCookieOptions(0));
}

export function clearGuestCookie() {
  cookies().set(GUEST_COOKIE, "", sessionCookieOptions(0));
}

/** Stable guest id for anonymous data isolation (not a security principal) */
export function getOrCreateGuestId(): string {
  const jar = cookies();
  const existing = jar.get(GUEST_COOKIE)?.value;
  if (existing && /^guest_[a-f0-9-]{8,}$/i.test(existing)) return existing;
  const id = `guest_${uuid()}`;
  jar.set(GUEST_COOKIE, id, sessionCookieOptions(60 * 60 * 24 * 365));
  return id;
}

export function peekGuestId(): string | null {
  const existing = cookies().get(GUEST_COOKIE)?.value;
  if (existing && /^guest_[a-f0-9-]{8,}$/i.test(existing)) return existing;
  return null;
}

function normalizeUser(u: UserProfile): UserProfile {
  return {
    ...u,
    preferredName:
      typeof u.preferredName === "string" && u.preferredName.trim()
        ? u.preferredName.trim()
        : undefined,
    sessionVersion: typeof u.sessionVersion === "number" ? u.sessionVersion : 0,
    twoFactorEnabled: Boolean(u.twoFactorEnabled && u.twoFactorSecret),
  };
}

export async function getSessionUser(): Promise<UserProfile | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const parsed = await verifyToken(token);
  if (!parsed) return null;
  const db = await readDb();
  const user = db.users.find((u) => u.id === parsed.userId);
  if (!user) return null;
  const normalized = normalizeUser(user);
  if (normalized.sessionVersion !== parsed.sessionVersion) return null;
  return normalized;
}

/** Authenticated user id or isolated guest id */
export async function getActorId(): Promise<{ userId: string; isGuest: boolean }> {
  const user = await getSessionUser();
  if (user) return { userId: user.id, isGuest: false };
  return { userId: getOrCreateGuestId(), isGuest: true };
}

export function assertCanEditProfile(actorId: string, targetId: string): boolean {
  return Boolean(actorId) && actorId === targetId;
}

/** Reassign guest-owned records to authenticated user after login/register */
export function migrateGuestData(db: DbShape, guestId: string, userId: string) {
  if (!guestId || !userId || guestId === userId) return;
  const reassign = <T extends { userId?: string }>(rows: T[]) => {
    for (const r of rows) {
      if (r.userId === guestId) r.userId = userId;
    }
  };
  reassign(db.sessions);
  reassign(db.journal);
  reassign(db.routines);
  reassign(db.painProfiles);
  reassign(db.jefferyThreads);
  reassign(db.modalityPlans);
  reassign(db.modalityLogs);
  reassign(db.communityPosts);
}

export async function bumpSessionVersion(userId: string): Promise<number> {
  let next = 0;
  await updateDb((db) => {
    const u = db.users.find((x) => x.id === userId);
    if (!u) return;
    u.sessionVersion = (typeof u.sessionVersion === "number" ? u.sessionVersion : 0) + 1;
    next = u.sessionVersion;
  });
  return next;
}

export async function registerUser(input: {
  email: string;
  name: string;
  password: string;
  /** Optional nickname used in coaching/plan copy */
  preferredName?: string;
}): Promise<{ user: UserProfile } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password.length > 128) {
    return { error: "Password must be at most 128 characters." };
  }
  const name = sanitizeDisplayName(input.name, 80) || "Mover";
  const preferredName =
    sanitizeDisplayName(input.preferredName || "", 40) || undefined;
  const passwordHash = await hashPassword(password);
  const user: UserProfile = {
    id: uuid(),
    email,
    name,
    preferredName,
    passwordHash,
    twoFactorEnabled: false,
    sessionVersion: 0,
    createdAt: new Date().toISOString(),
    preferences: defaultPrefs(),
    goals: [],
    favorites: [],
    painBaseline: {},
  };

  // Check uniqueness inside the lock so concurrent registers cannot race.
  let duplicate = false;
  await updateDb((d) => {
    if (d.users.some((u) => u.email === email)) {
      duplicate = true;
      return;
    }
    d.users.push(user);
  });
  if (duplicate) {
    return { error: "An account with that email already exists." };
  }
  return { user };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ user: UserProfile } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!isValidEmail(email) || !password || password.length > 128) {
    return { error: "Invalid email or password." };
  }
  const db = await readDb();
  const user = db.users.find((u) => u.email === email);
  if (!user) {
    await hashPassword(password);
    return { error: "Invalid email or password." };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  return { user: normalizeUser(user) };
}

/** Minimal public user — no secrets, no full internal graph dump */
export function publicUser(user: UserProfile) {
  const enrolled = Boolean(user.twoFactorSecret);
  const preferred =
    (typeof user.preferredName === "string" && user.preferredName.trim()) ||
    undefined;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    preferredName: preferred || null,
    /** Best display name for coaching copy */
    displayName: preferred || user.name,
    twoFactorEnabled: Boolean(user.twoFactorEnabled && enrolled),
    twoFactorEnrolled: enrolled,
    avatarKey: user.avatarKey || null,
    hasAvatar: Boolean(user.avatarKey),
    preferences: {
      reminderTimes: user.preferences.reminderTimes ?? [],
      notificationsEnabled: Boolean(user.preferences.notificationsEnabled),
      nameChoice: user.preferences.nameChoice,
      sessionLengthMinutes: user.preferences.sessionLengthMinutes ?? 15,
      theme: user.preferences.theme ?? "auto",
    },
  };
}

export function ownsRecord(
  recordUserId: string | undefined,
  actorId: string
): boolean {
  if (!recordUserId) return false;
  return recordUserId === actorId;
}
