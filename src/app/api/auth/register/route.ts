import { NextResponse } from "next/server";
import {
  createToken,
  publicUser,
  registerUser,
  setSessionCookie,
} from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await registerUser({
    email: String(body.email || ""),
    password: String(body.password || ""),
    name: String(body.name || ""),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const token = await createToken(result.user.id);
  await setSessionCookie(token);
  return NextResponse.json({ user: publicUser(result.user) });
}
