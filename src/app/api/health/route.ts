import { NextResponse } from "next/server";

/** Liveness only — no internal library or config details */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "motionrx-stretch",
    time: new Date().toISOString(),
  });
}
