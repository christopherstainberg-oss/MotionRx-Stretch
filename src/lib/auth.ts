import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { readDb, updateDb } from "@/lib/storage";
import type { UserPreferences, UserProfile } from "@/lib/types";
import { v4 as uuid } from "uuid";

const COOKIE = "motionrx_session";
const secret = () =>
  new TextEncoder().encode(
    process.env.AUTH_SECRET || "motionrx-dev-secret-change-in-production"
  );

const defaultPrefs = (): UserPreferences => ({
  reminderTimes: ["08:00", "12:30", "18:00"],
  defaultDifficulty: "beginner",
  sessionLengthMinutes: 15,
  notificationsEnabled: true,
  offlineVideosPreferred: false,
  nameChoice: "motionrx",
});

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
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
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSessionUser(): Promise<UserProfile | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  const userId = await verifyToken(token);
  if (!userId) return null;
  const db = await readDb();
  return db.users.find((u) => u.id === userId) ?? null;
}

export async function registerUser(input: {
  email: string;
  name: string;
  password: string;
}): Promise<{ user: UserProfile } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || input.password.length < 8) {
    return { error: "Use a valid email and password of at least 8 characters." };
  }
  const db = await readDb();
  if (db.users.some((u) => u.email === email)) {
    return { error: "An account with that email already exists." };
  }
  const user: UserProfile = {
    id: uuid(),
    email,
    name: input.name.trim() || "Mover",
    passwordHash: await hashPassword(input.password),
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
  const db = await readDb();
  const user = db.users.find((u) => u.email === email);
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  return { user };
}

export function publicUser(user: UserProfile) {
  const { passwordHash, twoFactorSecret, ...safe } = user;
  return safe;
}
