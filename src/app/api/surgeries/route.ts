import { NextResponse } from "next/server";
import {
  SURGERY_STATS,
  getSurgeryById,
  searchSurgeries,
  weeksSinceSurgery,
  surgeryPhaseLabel,
} from "@/data/surgeries";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const id = searchParams.get("id") || undefined;
  const date = searchParams.get("date") || undefined;
  const limit = Number(searchParams.get("limit") || 24);

  if (id) {
    const item = getSurgeryById(id);
    const weeks = weeksSinceSurgery(date);
    return NextResponse.json({
      stats: SURGERY_STATS,
      item: item ?? null,
      weeksPostOp: weeks,
      phaseLabel: item ? surgeryPhaseLabel(weeks, item) : null,
    });
  }

  return NextResponse.json({
    stats: SURGERY_STATS,
    items: searchSurgeries(q, limit),
  });
}
