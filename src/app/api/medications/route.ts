import { NextResponse } from "next/server";
import {
  MEDICATION_CLASS_LABELS,
  MEDICATION_ROUTE_LABELS,
  MEDICATION_STATS,
  getMedicationById,
  getMedicationByIndex,
  searchMedications,
  type MedicationClass,
  type MedicationRoute,
} from "@/data/medications";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const id = searchParams.get("id") || undefined;
  const indexParam = searchParams.get("index");
  const classId = (searchParams.get("class") as MedicationClass | "all") || "all";
  const route = (searchParams.get("route") as MedicationRoute | "all") || "all";
  const basesOnly = searchParams.get("basesOnly") !== "0";
  const limit = Number(searchParams.get("limit") || 40);

  if (id) {
    const item = getMedicationById(id);
    return NextResponse.json({ stats: MEDICATION_STATS, item: item ?? null });
  }

  if (indexParam != null && indexParam !== "") {
    const item = getMedicationByIndex(Number(indexParam));
    return NextResponse.json({ stats: MEDICATION_STATS, item: item ?? null });
  }

  const items = searchMedications({
    query: q,
    classId,
    route,
    basesOnly,
    limit,
  });

  return NextResponse.json({
    stats: MEDICATION_STATS,
    classes: MEDICATION_CLASS_LABELS,
    routes: MEDICATION_ROUTE_LABELS,
    items,
  });
}
