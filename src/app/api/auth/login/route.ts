import { NextResponse } from "next/server";
import { createToken, loginUser, publicUser, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await loginUser({
    email: String(body.email || ""),
    password: String(body.password || ""),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  const token = await createToken(result.user.id);
  await setSessionCookie(token);
  return NextResponse.json({ user: publicUser(result.user) });
}
