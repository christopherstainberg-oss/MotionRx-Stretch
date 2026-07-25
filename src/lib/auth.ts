import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { readDb, updateDb, type DbShape } from "@/lib/storage";
import type { UserPreferences, UserProfile } from "@/lib/types";
import { v4 as uuid } from "uuid";
import { isValidEmail } from "@/lib/rate-limit";
import { sanitizeDisplayName } from "@/lib/security";

const COOKIE = "motionrx_session";
const GUEST_COOKIE = "motionrx_guest";
/** Access session lifetime (seconds) — shorter than prior 14d */
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function authSecretBytes(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET must be set to a strong value (16+ chars) in production"
      );
    }
    return new TextEncoder().encode("motionrx-dev-secret-change-in-production");
  }
  return new TextEncoder().encode(raw);
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

export async function setSessionCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSessionCookie() {
  cookies().set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function clearGuestCookie() {
  cookies().set(GUEST_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/** Stable guest id for anonymous data isolation (not a security principal) */
export function getOrCreateGuestId(): string {
  const jar = cookies();
  const existing = jar.get(GUEST_COOKIE)?.value;
  if (existing && /^guest_[a-f0-9-]{8,}$/i.test(existing)) return existing;
  const id = `guest_${uuid()}`;
  jar.set(GUEST_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
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
    sessionVersion: typeof u.sessionVersion === "number" ? u.sessionVersion : 0,
    twoFactorEnabled: Boolean(u.twoFactorEnabled && u.twoFactorSecret),
  };
}

export async function getSessionUser(): Promise<UserProfile | null> {
  const token = cookies().get(COOKIE)?.value;
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

  const db = await readDb();
  if (db.users.some((u) => u.email === email)) {
    return { error: "An account with that email already exists." };
  }
  const user: UserProfile = {
    id: uuid(),
    email,
    name,
    passwordHash: await hashPassword(password),
    twoFactorEnabled: false,
    sessionVersion: 0,
    createdAt: new Date().toISOString(),
    preferences: defaultPrefs(),
    goals: [],
    favorites: [],
    painBaseline: {},
  };
  await updateDb((d) => {
    d.users.push(user);
  });
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
  return {
    id: user.id,
    email: user.email,
    name: user.name,
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
