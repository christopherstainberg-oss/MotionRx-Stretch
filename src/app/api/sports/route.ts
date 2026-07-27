import { NextResponse } from "next/server";
import { SPORT_STATS, getSportById, searchSports } from "@/data/sports";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const id = searchParams.get("id") || undefined;
  const limit = Number(searchParams.get("limit") || 24);

  if (id) {
    return NextResponse.json({ stats: SPORT_STATS, item: getSportById(id) ?? null });
  }

  return NextResponse.json({
    stats: SPORT_STATS,
    items: searchSports(q, limit),
  });
}
