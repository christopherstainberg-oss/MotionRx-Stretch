/**
 * Administrator access helpers.
 * Admins are emails listed in ADMIN_EMAILS (comma-separated) and/or users with role "admin".
 */

import type { UserProfile } from "@/lib/types";

export function adminEmailsFromEnv(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim() || "";
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export function isAdminUser(user: UserProfile | null | undefined): boolean {
  if (!user?.email) return false;
  if (user.role === "admin") return true;
  const email = user.email.trim().toLowerCase();
  return adminEmailsFromEnv().includes(email);
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  preferredName: string | null;
  createdAt: string;
  avatarSource: string;
  hasUploadAvatar: boolean;
  biometricsEnabled: boolean;
  role: string;
}

export function toAdminUserRow(u: UserProfile): AdminUserRow {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    preferredName: u.preferredName?.trim() || null,
    createdAt: u.createdAt,
    avatarSource: u.avatarSource || (u.avatarKey ? "upload" : "none"),
    hasUploadAvatar: Boolean(u.avatarKey),
    biometricsEnabled: Array.isArray(u.webauthnCredentials) && u.webauthnCredentials.length > 0,
    role: u.role === "admin" || adminEmailsFromEnv().includes(u.email.trim().toLowerCase())
      ? "admin"
      : "user",
  };
}
