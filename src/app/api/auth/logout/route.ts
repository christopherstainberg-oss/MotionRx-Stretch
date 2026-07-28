import { NextResponse } from "next/server";
import { applyClearSessionCookie } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/security";

export async function POST(req: Request) {
  // CSRF: only first-party can clear the session cookie
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  applyClearSessionCookie(res);
  return res;
}
