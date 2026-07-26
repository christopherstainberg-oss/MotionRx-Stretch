/**
 * Build / apply portable user data packages (export & import).
 */

import type { DbShape } from "@/lib/storage";
import type {
  Goal,
  JefferyThread,
  JournalEntry,
  ModalityLog,
  ModalityPlan,
  PainProfile,
  Routine,
  SessionLog,
  UserProfile,
  UserPreferences,
} from "@/lib/types";

export const EXPORT_FORMAT = "motionrx-stretch-export" as const;
export const EXPORT_VERSION = 1 as const;

export interface MotionRxExportPackage {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  actor: {
    id: string;
    isGuest: boolean;
    email?: string | null;
    name?: string | null;
  };
  profile?: {
    preferredName?: string | null;
    preferences?: Partial<UserPreferences>;
    goals?: Goal[];
    favorites?: string[];
    painBaseline?: UserProfile["painBaseline"];
  };
  sessions: SessionLog[];
  journal: JournalEntry[];
  routines: Routine[];
  painProfiles: PainProfile[];
  jefferyThreads: JefferyThread[];
  modalityPlans: ModalityPlan[];
  modalityLogs: ModalityLog[];
  /** Client-only extras captured at export time */
  local?: Record<string, unknown>;
}

export function buildExportPackage(opts: {
  db: DbShape;
  actorId: string;
  isGuest: boolean;
  user?: UserProfile | null;
  local?: Record<string, unknown>;
}): MotionRxExportPackage {
  const { db, actorId, isGuest, user, local } = opts;
  const owned = <T extends { userId?: string }>(rows: T[]) =>
    rows.filter((r) => r.userId === actorId);

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    actor: {
      id: actorId,
      isGuest,
      email: user?.email ?? null,
      name: user?.name ?? null,
    },
    profile: user
      ? {
          preferredName: user.preferredName ?? null,
          preferences: user.preferences,
          goals: user.goals || [],
          favorites: user.favorites || [],
          painBaseline: user.painBaseline || {},
        }
      : undefined,
    sessions: owned(db.sessions),
    journal: owned(db.journal),
    routines: owned(db.routines),
    painProfiles: owned(db.painProfiles),
    jefferyThreads: owned(db.jefferyThreads),
    modalityPlans: owned(db.modalityPlans),
    modalityLogs: owned(db.modalityLogs),
    local: local && Object.keys(local).length ? local : undefined,
  };
}

export function isExportPackage(raw: unknown): raw is MotionRxExportPackage {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    o.format === EXPORT_FORMAT &&
    typeof o.version === "number" &&
    Array.isArray(o.sessions) &&
    Array.isArray(o.journal) &&
    Array.isArray(o.routines)
  );
}

function reassignUserId<T extends { userId?: string; id?: string }>(
  rows: T[] | undefined,
  actorId: string,
  max: number
): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, max).map((r) => ({
    ...r,
    userId: actorId,
  }));
}

/**
 * Merge imported package into DB for actorId.
 * Strategy: upsert by id; reassign ownership to current actor.
 * Does not import password hashes or webauthn credentials.
 */
export function applyImportPackage(
  db: DbShape,
  actorId: string,
  pkg: MotionRxExportPackage,
  options: { mergeProfile?: boolean; user?: UserProfile | null } = {}
): { imported: Record<string, number> } {
  const imported: Record<string, number> = {
    sessions: 0,
    journal: 0,
    routines: 0,
    painProfiles: 0,
    jefferyThreads: 0,
    modalityPlans: 0,
    modalityLogs: 0,
  };

  const upsert = <T extends { id: string; userId?: string }>(
    target: T[],
    rows: T[],
    key: keyof typeof imported
  ) => {
    for (const row of rows) {
      if (!row?.id || typeof row.id !== "string") continue;
      const idx = target.findIndex((x) => x.id === row.id);
      const next = { ...row, userId: actorId };
      if (idx >= 0) {
        // Only overwrite if current actor owns it or no owner clash
        if (target[idx].userId && target[idx].userId !== actorId) continue;
        target[idx] = next;
      } else {
        target.push(next);
      }
      imported[key] += 1;
    }
  };

  upsert(db.sessions, reassignUserId(pkg.sessions, actorId, 2000), "sessions");
  upsert(db.journal, reassignUserId(pkg.journal, actorId, 2000), "journal");
  upsert(db.routines, reassignUserId(pkg.routines, actorId, 200), "routines");
  upsert(
    db.painProfiles,
    reassignUserId(pkg.painProfiles, actorId, 100),
    "painProfiles"
  );
  upsert(
    db.jefferyThreads,
    reassignUserId(pkg.jefferyThreads, actorId, 50),
    "jefferyThreads"
  );
  upsert(
    db.modalityPlans,
    reassignUserId(pkg.modalityPlans, actorId, 100),
    "modalityPlans"
  );
  upsert(
    db.modalityLogs,
    reassignUserId(pkg.modalityLogs, actorId, 2000),
    "modalityLogs"
  );

  if (options.mergeProfile && options.user && pkg.profile) {
    const u = db.users.find((x) => x.id === actorId);
    if (u) {
      if (pkg.profile.preferredName) {
        u.preferredName = String(pkg.profile.preferredName).slice(0, 40);
      }
      if (pkg.profile.preferences && typeof pkg.profile.preferences === "object") {
        u.preferences = { ...u.preferences, ...pkg.profile.preferences };
      }
      if (Array.isArray(pkg.profile.goals)) {
        u.goals = pkg.profile.goals.slice(0, 50);
      }
      if (Array.isArray(pkg.profile.favorites)) {
        u.favorites = pkg.profile.favorites.map(String).slice(0, 200);
      }
      if (pkg.profile.painBaseline && typeof pkg.profile.painBaseline === "object") {
        u.painBaseline = pkg.profile.painBaseline;
      }
    }
  }

  return { imported };
}
