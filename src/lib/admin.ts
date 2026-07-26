/**
 * Administrator access helpers + directory analytics.
 *
 * Admins are granted by:
 * 1. Built-in owner match (Christopher Stainberg / known owner emails)
 * 2. `role === "admin"` on the user profile
 * 3. Emails listed in `ADMIN_EMAILS` (comma-separated env)
 */

import type { UserProfile } from "@/lib/types";
import type { DbShape } from "@/lib/storage";

/** Built-in primary administrator (app owner). */
export const PRIMARY_ADMIN_NAME = "Christopher Stainberg";

/** Known owner emails (normalized lowercase). Expand via ADMIN_EMAILS env. */
export const PRIMARY_ADMIN_EMAILS = [
  "christopher.stainberg@gmail.com",
  "christopherstainberg@gmail.com",
  "chris.stainberg@gmail.com",
] as const;

/** Name variants that grant built-in admin (case-insensitive, trimmed). */
const PRIMARY_ADMIN_NAME_VARIANTS = [
  "christopher stainberg",
  "chris stainberg",
  "christopher.stainberg",
] as const;

export function adminEmailsFromEnv(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim() || "";
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

function normalizeName(name: string | null | undefined): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");
}

/** True if this profile is the built-in primary admin (Christopher Stainberg). */
export function isPrimaryAdminUser(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  const email = user.email?.trim().toLowerCase() || "";
  if (email && (PRIMARY_ADMIN_EMAILS as readonly string[]).includes(email)) {
    return true;
  }
  const name = normalizeName(user.name);
  const preferred = normalizeName(user.preferredName);
  return PRIMARY_ADMIN_NAME_VARIANTS.some(
    (v) => name === v || preferred === v || name.includes(v) || preferred.includes(v)
  );
}

export function isAdminUser(user: UserProfile | null | undefined): boolean {
  if (!user?.email) return false;
  if (user.role === "admin") return true;
  if (isPrimaryAdminUser(user)) return true;
  const email = user.email.trim().toLowerCase();
  return adminEmailsFromEnv().includes(email);
}

/**
 * Ensure Christopher Stainberg (and env admins) have `role: "admin"` persisted.
 * Call from session/auth paths so the directory shows Administrator correctly.
 */
export function ensureAdminRole(user: UserProfile): boolean {
  if (user.role === "admin") return false;
  if (
    isPrimaryAdminUser(user) ||
    adminEmailsFromEnv().includes(user.email.trim().toLowerCase())
  ) {
    user.role = "admin";
    return true;
  }
  return false;
}

export interface AdminUserRow {
  id: string;
  /** Display username: preferred name or full name */
  username: string;
  email: string;
  name: string;
  preferredName: string | null;
  createdAt: string;
  avatarSource: string;
  hasUploadAvatar: boolean;
  biometricsEnabled: boolean;
  twoFactorEnabled: boolean;
  role: string;
  sessionCount: number;
  journalCount: number;
  routineCount: number;
  modalityLogCount: number;
  lastActivityAt: string | null;
  daysSinceCreated: number;
}

export interface AdminSignupBucket {
  key: string;
  label: string;
  count: number;
}

export interface AdminSummary {
  totalUsers: number;
  withAvatar: number;
  withBiometrics: number;
  withTwoFactor: number;
  adminCount: number;
  newestAccountCreatedAt: string | null;
  oldestAccountCreatedAt: string | null;
  /** Sign-ups in rolling windows */
  createdLast7Days: number;
  createdLast30Days: number;
  createdLast90Days: number;
  /** Platform activity totals */
  totalSessions: number;
  totalJournalEntries: number;
  totalRoutines: number;
  totalModalityLogs: number;
  totalCommunityPosts: number;
  /** Users with any session/journal in last 7 / 30 days */
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;
  avgSessionsPerUser: number;
  avgJournalPerUser: number;
  /** Calendar buckets for charts */
  signupsByMonth: AdminSignupBucket[];
  signupsByDay: AdminSignupBucket[];
  /** Quick lists for admin overview */
  emails: string[];
  usernames: string[];
}

function daysBetween(iso: string, now: number): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((now - t) / (24 * 60 * 60 * 1000)));
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function toAdminUserRow(
  u: UserProfile,
  stats?: {
    sessionCount: number;
    journalCount: number;
    routineCount: number;
    modalityLogCount: number;
    lastActivityAt: string | null;
  }
): AdminUserRow {
  const now = Date.now();
  const preferred = u.preferredName?.trim() || null;
  return {
    id: u.id,
    username: preferred || u.name || u.email.split("@")[0] || "user",
    email: u.email,
    name: u.name,
    preferredName: preferred,
    createdAt: u.createdAt,
    avatarSource: u.avatarSource || (u.avatarKey ? "upload" : "none"),
    hasUploadAvatar: Boolean(u.avatarKey),
    biometricsEnabled: Array.isArray(u.webauthnCredentials) && u.webauthnCredentials.length > 0,
    twoFactorEnabled: Boolean(u.twoFactorEnabled && u.twoFactorSecret),
    role: isAdminUser(u) ? "admin" : "user",
    sessionCount: stats?.sessionCount ?? 0,
    journalCount: stats?.journalCount ?? 0,
    routineCount: stats?.routineCount ?? 0,
    modalityLogCount: stats?.modalityLogCount ?? 0,
    lastActivityAt: stats?.lastActivityAt ?? null,
    daysSinceCreated: daysBetween(u.createdAt, now),
  };
}

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

/**
 * Full administrator directory + platform signup / engagement analytics.
 */
export function buildAdminDirectory(db: DbShape): {
  summary: AdminSummary;
  users: AdminUserRow[];
} {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const t7 = now - 7 * dayMs;
  const t30 = now - 30 * dayMs;
  const t90 = now - 90 * dayMs;

  // Per-user activity tallies
  const sessionCount = new Map<string, number>();
  const journalCount = new Map<string, number>();
  const routineCount = new Map<string, number>();
  const modalityCount = new Map<string, number>();
  const lastActivity = new Map<string, string | null>();

  const bump = (map: Map<string, number>, id: string) => {
    map.set(id, (map.get(id) || 0) + 1);
  };
  const touch = (id: string, iso: string | undefined) => {
    if (!iso) return;
    lastActivity.set(id, maxIso(lastActivity.get(id) || null, iso));
  };

  for (const s of db.sessions) {
    if (!s.userId) continue;
    bump(sessionCount, s.userId);
    touch(s.userId, s.completedAt || s.startedAt);
  }
  for (const j of db.journal) {
    if (!j.userId) continue;
    bump(journalCount, j.userId);
    touch(j.userId, j.updatedAt || j.createdAt);
  }
  for (const r of db.routines) {
    if (!r.userId) continue;
    bump(routineCount, r.userId);
    touch(r.userId, r.updatedAt || r.createdAt);
  }
  for (const m of db.modalityLogs) {
    if (!m.userId) continue;
    bump(modalityCount, m.userId);
    touch(m.userId, m.usedAt);
  }

  const users = [...db.users]
    .map((u) =>
      toAdminUserRow(u, {
        sessionCount: sessionCount.get(u.id) || 0,
        journalCount: journalCount.get(u.id) || 0,
        routineCount: routineCount.get(u.id) || 0,
        modalityLogCount: modalityCount.get(u.id) || 0,
        lastActivityAt: lastActivity.get(u.id) || null,
      })
    )
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const withAvatar = users.filter(
    (u) => u.hasUploadAvatar || u.avatarSource === "gravatar"
  ).length;
  const withBiometrics = users.filter((u) => u.biometricsEnabled).length;
  const withTwoFactor = users.filter((u) => u.twoFactorEnabled).length;
  const admins = users.filter((u) => u.role === "admin").length;

  const newest = users[0] || null;
  const oldest =
    users.length > 0
      ? [...users].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0]
      : null;

  const createdLast7Days = users.filter(
    (u) => new Date(u.createdAt).getTime() >= t7
  ).length;
  const createdLast30Days = users.filter(
    (u) => new Date(u.createdAt).getTime() >= t30
  ).length;
  const createdLast90Days = users.filter(
    (u) => new Date(u.createdAt).getTime() >= t90
  ).length;

  const activeUsersLast7Days = users.filter((u) => {
    const t = u.lastActivityAt ? new Date(u.lastActivityAt).getTime() : 0;
    return t >= t7;
  }).length;
  const activeUsersLast30Days = users.filter((u) => {
    const t = u.lastActivityAt ? new Date(u.lastActivityAt).getTime() : 0;
    return t >= t30;
  }).length;

  // Signups by month (last 12 months)
  const monthMap = new Map<string, number>();
  const nowD = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth() - i, 1));
    monthMap.set(monthKey(d), 0);
  }
  for (const u of users) {
    const d = new Date(u.createdAt);
    if (!Number.isFinite(d.getTime())) continue;
    const k = monthKey(d);
    if (monthMap.has(k)) monthMap.set(k, (monthMap.get(k) || 0) + 1);
  }
  const signupsByMonth: AdminSignupBucket[] = Array.from(monthMap.entries()).map(
    ([key, count]) => ({ key, label: monthLabel(key), count })
  );

  // Signups by day (last 14 days)
  const dayMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    dayMap.set(dayKey(d), 0);
  }
  for (const u of users) {
    const k = dayKey(new Date(u.createdAt));
    if (dayMap.has(k)) dayMap.set(k, (dayMap.get(k) || 0) + 1);
  }
  const signupsByDay: AdminSignupBucket[] = Array.from(dayMap.entries()).map(
    ([key, count]) => ({
      key,
      label: new Date(key + "T12:00:00Z").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      count,
    })
  );

  const n = users.length || 1;
  const totalSessions = db.sessions.length;
  const totalJournalEntries = db.journal.length;
  const totalRoutines = db.routines.length;
  const totalModalityLogs = db.modalityLogs.length;
  const totalCommunityPosts = (db.communityPosts || []).filter(
    (p) => p.userId !== "system"
  ).length;

  const summary: AdminSummary = {
    totalUsers: users.length,
    withAvatar,
    withBiometrics,
    withTwoFactor,
    adminCount: admins,
    newestAccountCreatedAt: newest?.createdAt || null,
    oldestAccountCreatedAt: oldest?.createdAt || null,
    createdLast7Days,
    createdLast30Days,
    createdLast90Days,
    totalSessions,
    totalJournalEntries,
    totalRoutines,
    totalModalityLogs,
    totalCommunityPosts,
    activeUsersLast7Days,
    activeUsersLast30Days,
    avgSessionsPerUser: Math.round((totalSessions / n) * 10) / 10,
    avgJournalPerUser: Math.round((totalJournalEntries / n) * 10) / 10,
    signupsByMonth,
    signupsByDay,
    emails: users.map((u) => u.email),
    usernames: users.map((u) => u.username),
  };

  return { summary, users };
}
