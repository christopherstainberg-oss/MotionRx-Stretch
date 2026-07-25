import { NextResponse } from "next/server";
import {
  CLINICAL_CATEGORY_LABELS,
  CLINICAL_CONDITION_STATS,
  searchClinicalConditions,
  type ClinicalCategory,
} from "@/data/clinical-conditions";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const category = (searchParams.get("category") as ClinicalCategory | "all") || "all";
  const basesOnly = searchParams.get("basesOnly") !== "0";
  const limit = Number(searchParams.get("limit") || 40);

  const items = searchClinicalConditions({
    query: q,
    category,
    basesOnly,
    limit,
  });

  return NextResponse.json({
    stats: CLINICAL_CONDITION_STATS,
    categories: CLINICAL_CATEGORY_LABELS,
    items,
  });
}
