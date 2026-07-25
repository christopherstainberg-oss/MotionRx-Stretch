import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/storage";
import { v4 as uuid } from "uuid";

export async function GET() {
  const db = await readDb();
  const posts = [...db.communityPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.body || "").trim();
  if (!text) {
    return NextResponse.json({ error: "Empty post" }, { status: 400 });
  }
  const post = {
    id: uuid(),
    userId: "community",
    displayName: String(body.displayName || "Anonymous mover").slice(0, 60),
    body: text.slice(0, 2000),
    createdAt: new Date().toISOString(),
    tips: Boolean(body.tips),
    likes: 0,
  };
  await updateDb((db) => {
    db.communityPosts.unshift(post);
  });
  return NextResponse.json({ post });
}
