import { NextResponse } from "next/server";
import {
  DESCRIPTOR_CATEGORY_LABELS,
  PAIN_DESCRIPTOR_STATS,
  searchPainDescriptors,
  type DescriptorCategory,
} from "@/data/pain-descriptors";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const category = (searchParams.get("category") as DescriptorCategory | "all") || "all";
  const basesOnly = searchParams.get("basesOnly") === "1";
  const limit = Number(searchParams.get("limit") || 60);

  const items = searchPainDescriptors({
    query: q,
    category,
    basesOnly,
    limit,
  });

  return NextResponse.json({
    stats: PAIN_DESCRIPTOR_STATS,
    categories: DESCRIPTOR_CATEGORY_LABELS,
    items,
  });
}
