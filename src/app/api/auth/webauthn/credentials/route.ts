import { NextResponse } from "next/server";
import { getSessionUser, publicUser } from "@/lib/auth";
import { updateDb } from "@/lib/storage";
import { credentialPublicSummary } from "@/lib/webauthn";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk } from "@/lib/security";

/** List enrolled platform authenticators */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const credentials = (user.webauthnCredentials || []).map(credentialPublicSummary);
  return NextResponse.json({
    credentials,
    biometricsEnabled: credentials.length > 0,
  });
}

/** Remove a credential by id */
export async function DELETE(req: Request) {
  try {
    const limited = rateLimit(`webauthn-del:${clientIp(req)}`, {
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }
    if (!contentLengthOk(req, 2_048)) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    if (!assertSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "");
    if (!id) {
      return NextResponse.json({ error: "Credential id required" }, { status: 400 });
    }

    let updated = user;
    await updateDb((db) => {
      const u = db.users.find((x) => x.id === user.id);
      if (!u) return;
      u.webauthnCredentials = (u.webauthnCredentials || []).filter((c) => c.id !== id);
      updated = u;
    });

    return NextResponse.json({
      ok: true,
      credentials: (updated.webauthnCredentials || []).map(credentialPublicSummary),
      biometricsEnabled: (updated.webauthnCredentials || []).length > 0,
      user: publicUser(updated),
    });
  } catch (e) {
    console.error("[webauthn/credentials DELETE]", e);
    return NextResponse.json({ error: "Could not remove credential" }, { status: 500 });
  }
}
