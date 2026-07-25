import { NextResponse } from "next/server";
import { applyClearSessionCookie } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  applyClearSessionCookie(res);
  return res;
}
