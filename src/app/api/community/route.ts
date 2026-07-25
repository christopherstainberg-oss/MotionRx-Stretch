import { NextResponse } from "next/server";
import { getActorId } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/storage";
import { v4 as uuid } from "uuid";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";

export async function GET() {
  const db = await readDb();
  const posts = [...db.communityPosts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const limited = rateLimit(`community:${clientIp(req)}`, {
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Posting too quickly. Please wait before sharing again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const text = sanitizeText(String(body.body || ""), 2000);
  if (text.length < 3) {
    return NextResponse.json({ error: "Post is too short." }, { status: 400 });
  }

  const { userId } = await getActorId();
  const displayName = sanitizeText(
    String(body.displayName || "Anonymous mover"),
    60
  );

  const post = {
    id: uuid(),
    userId,
    displayName: displayName || "Anonymous mover",
    body: text,
    createdAt: new Date().toISOString(),
    tips: Boolean(body.tips),
    likes: 0,
  };
  await updateDb((db) => {
    db.communityPosts.unshift(post);
    // Cap community feed size
    if (db.communityPosts.length > 500) {
      db.communityPosts = db.communityPosts.slice(0, 500);
    }
  });
  return NextResponse.json({ post });
}
