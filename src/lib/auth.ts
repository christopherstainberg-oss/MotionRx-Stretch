import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { readDb, updateDb } from "@/lib/storage";
import type { UserPreferences, UserProfile } from "@/lib/types";
import { v4 as uuid } from "uuid";
import { isValidEmail } from "@/lib/rate-limit";

const COOKIE = "motionrx_session";
const GUEST_COOKIE = "motionrx_guest";

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
});

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(authSecretBytes());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, authSecretBytes());
    return typeof payload.sub === "string" ? payload.sub : null;
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
    maxAge: 60 * 60 * 24 * 14,
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

export async function getSessionUser(): Promise<UserProfile | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const userId = await verifyToken(token);
  if (!userId) return null;
  const db = await readDb();
  return db.users.find((u) => u.id === userId) ?? null;
}

/** Authenticated user id or isolated guest id */
export async function getActorId(): Promise<{ userId: string; isGuest: boolean }> {
  const user = await getSessionUser();
  if (user) return { userId: user.id, isGuest: false };
  return { userId: getOrCreateGuestId(), isGuest: true };
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
  const name = input.name.trim().slice(0, 80) || "Mover";

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
  if (!isValidEmail(email) || !password) {
    return { error: "Invalid email or password." };
  }
  // Constant-ish path: always hash compare when user missing
  const db = await readDb();
  const user = db.users.find((u) => u.email === email);
  if (!user) {
    // Mitigate timing leaks for unknown emails
    await hashPassword(password);
    return { error: "Invalid email or password." };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  return { user };
}

export function publicUser(user: UserProfile) {
  const { passwordHash, twoFactorSecret, ...safe } = user;
  return safe;
}

export function ownsRecord(
  recordUserId: string | undefined,
  actorId: string
): boolean {
  if (!recordUserId) return false;
  return recordUserId === actorId;
}
