import { NextResponse } from "next/server";
import { VITAL_DEFS } from "@/lib/vitals";

/** Catalog of light vitals definitions (client stores readings locally). */
export async function GET() {
  return NextResponse.json({
    items: VITAL_DEFS,
    description:
      "Light vital-sign definitions for home logging. Educational ranges only.",
  });
}
