import { NextResponse } from "next/server";
import { getActorId, getSessionUser } from "@/lib/auth";
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

  const { userId, isGuest } = await getActorId();
  const sessionUser = await getSessionUser();
  // Prefer authenticated profile name; block free-form spoofing when signed in
  const displayName = sessionUser
    ? sanitizeText(sessionUser.name || sessionUser.email.split("@")[0] || "Member", 60)
    : sanitizeText(String(body.displayName || "Anonymous mover"), 60);

  // Guests may post but are labeled clearly
  const post = {
    id: uuid(),
    userId,
    displayName: isGuest
      ? `Guest · ${displayName || "Anonymous mover"}`.slice(0, 60)
      : displayName || "Member",
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
