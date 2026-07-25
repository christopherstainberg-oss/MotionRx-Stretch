import { NextResponse } from "next/server";
import { getActorId } from "@/lib/auth";
import { readDb, updateDb } from "@/lib/storage";
import type { BodyPart, PainProfile } from "@/lib/types";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";
import { v4 as uuid } from "uuid";

export async function GET() {
  const { userId } = await getActorId();
  const db = await readDb();
  const profiles = db.painProfiles
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return NextResponse.json({
    profile: profiles[0] ?? null,
    history: profiles.slice(0, 20),
  });
}

export async function POST(req: Request) {
  const limited = rateLimit(`pain-profile:${clientIp(req)}`, {
    limit: 40,
    windowMs: 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { userId } = await getActorId();
  const descriptorIds = Array.isArray(body.descriptorIds)
    ? body.descriptorIds.map(String).slice(0, 24)
    : [];

  const profile: PainProfile = {
    id: String(body.id || uuid()),
    userId,
    updatedAt: new Date().toISOString(),
    descriptorIds,
    freeText: body.freeText ? sanitizeText(String(body.freeText), 2000) : undefined,
    overallPain: Math.max(0, Math.min(10, Number(body.overallPain) || 0)),
    areas: (Array.isArray(body.areas) ? body.areas.slice(0, 15) : []) as BodyPart[],
    source: (body.source as PainProfile["source"]) || "manual",
  };

  await updateDb((db) => {
    const others = db.painProfiles.filter((p) => p.userId !== userId);
    const mine = db.painProfiles.filter((p) => p.userId === userId && p.id !== profile.id);
    mine.unshift(profile);
    db.painProfiles = [...others, ...mine.slice(0, 50)];
  });

  return NextResponse.json({ profile });
}
