import { promises as fs } from "fs";
import path from "path";
import type {
  JefferyThread,
  JournalEntry,
  ModalityLog,
  ModalityPlan,
  PainProfile,
  Routine,
  SessionLog,
  UserProfile,
} from "@/lib/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

export interface DbShape {
  users: UserProfile[];
  sessions: SessionLog[];
  journal: JournalEntry[];
  routines: Routine[];
  communityPosts: CommunityPost[];
  jefferyThreads: JefferyThread[];
  painProfiles: PainProfile[];
  modalityPlans: ModalityPlan[];
  modalityLogs: ModalityLog[];
}

export interface CommunityPost {
  id: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
  tips: boolean;
  likes: number;
}

const emptyDb = (): DbShape => ({
  users: [],
  sessions: [],
  journal: [],
  routines: [],
  jefferyThreads: [],
  painProfiles: [],
  modalityPlans: [],
  modalityLogs: [],
  communityPosts: [
    {
      id: "welcome-1",
      userId: "system",
      displayName: "MotionRx Coach",
      body: "Welcome! Share what helped your mobility this week—keep medical advice general and encourage peers to check with their PT for personal issues.",
      createdAt: new Date().toISOString(),
      tips: true,
      likes: 3,
    },
  ],
});

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function dbPath() {
  return path.join(DATA_DIR, "store.json");
}

function lockPath() {
  return path.join(DATA_DIR, "store.lock");
}

/** Best-effort exclusive lock for single-node deployments */
async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  await ensureDir();
  const lock = lockPath();
  const start = Date.now();
  const maxWait = 5000;
  while (true) {
    try {
      const handle = await fs.open(lock, "wx");
      try {
        await handle.writeFile(String(process.pid), "utf8");
        await handle.close();
        try {
          return await fn();
        } finally {
          await fs.unlink(lock).catch(() => {});
        }
      } catch (e) {
        await handle.close().catch(() => {});
        await fs.unlink(lock).catch(() => {});
        throw e;
      }
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "EEXIST") throw err;
      if (Date.now() - start > maxWait) {
        // Stale lock recovery
        await fs.unlink(lock).catch(() => {});
        continue;
      }
      await new Promise((r) => setTimeout(r, 25 + Math.random() * 40));
    }
  }
}

function normalizeDb(raw: Partial<DbShape>): DbShape {
  const base = emptyDb();
  return {
    users: Array.isArray(raw.users) ? raw.users : base.users,
    sessions: Array.isArray(raw.sessions) ? raw.sessions : base.sessions,
    journal: Array.isArray(raw.journal) ? raw.journal : base.journal,
    routines: Array.isArray(raw.routines) ? raw.routines : base.routines,
    communityPosts: Array.isArray(raw.communityPosts)
      ? raw.communityPosts
      : base.communityPosts,
    jefferyThreads: Array.isArray(raw.jefferyThreads)
      ? raw.jefferyThreads
      : base.jefferyThreads,
    painProfiles: Array.isArray(raw.painProfiles) ? raw.painProfiles : base.painProfiles,
    modalityPlans: Array.isArray(raw.modalityPlans) ? raw.modalityPlans : base.modalityPlans,
    modalityLogs: Array.isArray(raw.modalityLogs) ? raw.modalityLogs : base.modalityLogs,
  };
}

export async function readDb(): Promise<DbShape> {
  await ensureDir();
  try {
    const raw = await fs.readFile(dbPath(), "utf8");
    return normalizeDb(JSON.parse(raw) as Partial<DbShape>);
  } catch {
    const db = emptyDb();
    await writeDb(db);
    return db;
  }
}

export async function writeDb(db: DbShape): Promise<void> {
  await ensureDir();
  const target = dbPath();
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(db, null, 2);
  await fs.writeFile(tmp, payload, "utf8");
  await fs.rename(tmp, target);
}

export async function updateDb(
  mutator: (db: DbShape) => void | Promise<void>
): Promise<DbShape> {
  return withLock(async () => {
    const db = await readDb();
    await mutator(db);
    await writeDb(db);
    return db;
  });
}
