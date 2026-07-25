import { promises as fs } from "fs";
import path from "path";
import type {
  JefferyThread,
  JournalEntry,
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

export async function readDb(): Promise<DbShape> {
  await ensureDir();
  try {
    const raw = await fs.readFile(dbPath(), "utf8");
    return { ...emptyDb(), ...JSON.parse(raw) } as DbShape;
  } catch {
    const db = emptyDb();
    await writeDb(db);
    return db;
  }
}

export async function writeDb(db: DbShape): Promise<void> {
  await ensureDir();
  await fs.writeFile(dbPath(), JSON.stringify(db, null, 2), "utf8");
}

export async function updateDb(
  mutator: (db: DbShape) => void | Promise<void>
): Promise<DbShape> {
  const db = await readDb();
  await mutator(db);
  await writeDb(db);
  return db;
}
