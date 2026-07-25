import { NextResponse } from "next/server";
import { createToken, loginUser, publicUser, setSessionCookie } from "@/lib/auth";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = rateLimit(`login:${clientIp(req)}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const result = await loginUser({
    email: sanitizeText(String(body.email || ""), 254),
    password: String(body.password || ""),
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  const token = await createToken(result.user.id);
  await setSessionCookie(token);
  return NextResponse.json({ user: publicUser(result.user) });
}
