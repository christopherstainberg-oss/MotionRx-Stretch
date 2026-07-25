import { NextResponse } from "next/server";
import { LIBRARY_STATS } from "@/data/stretch-library";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "motionrx-stretch",
    version: process.env.npm_package_version || "1.0.0",
    library: LIBRARY_STATS,
    time: new Date().toISOString(),
  });
}
