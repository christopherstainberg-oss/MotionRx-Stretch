import { NextResponse } from "next/server";
import {
  OCCUPATION_CATEGORY_LABELS,
  OCCUPATION_PHYSICAL_LOAD_LABELS,
  OCCUPATION_SETTING_LABELS,
  OCCUPATION_STATS,
  getOccupationById,
  getOccupationByIndex,
  searchOccupations,
  type OccupationCategory,
  type OccupationPhysicalLoad,
} from "@/data/occupations";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const id = searchParams.get("id") || undefined;
  const indexParam = searchParams.get("index");
  const category =
    (searchParams.get("category") as OccupationCategory | "all") || "all";
  const physicalLoad =
    (searchParams.get("physicalLoad") as OccupationPhysicalLoad | "all") ||
    "all";
  const sector = searchParams.get("sector") || "all";
  const basesOnly = searchParams.get("basesOnly") !== "0";
  const limit = Number(searchParams.get("limit") || 40);

  if (id) {
    const item = getOccupationById(id);
    return NextResponse.json({ stats: OCCUPATION_STATS, item: item ?? null });
  }

  if (indexParam != null && indexParam !== "") {
    const item = getOccupationByIndex(Number(indexParam));
    return NextResponse.json({ stats: OCCUPATION_STATS, item: item ?? null });
  }

  const items = searchOccupations({
    query: q,
    category,
    sector: sector === "all" ? "all" : sector,
    physicalLoad,
    basesOnly,
    limit,
  });

  return NextResponse.json({
    stats: OCCUPATION_STATS,
    categories: OCCUPATION_CATEGORY_LABELS,
    physicalLoads: OCCUPATION_PHYSICAL_LOAD_LABELS,
    settings: OCCUPATION_SETTING_LABELS,
    items,
  });
}
