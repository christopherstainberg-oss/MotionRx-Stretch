import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { getSessionUser, publicUser } from "@/lib/auth";
import { updateDb } from "@/lib/storage";
import type { WebAuthnCredential } from "@/lib/types";
import {
  b64url,
  getOrigin,
  getRpId,
  takeChallenge,
} from "@/lib/webauthn";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk, sanitizeDisplayName } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`webauthn-reg-ver:${clientIp(req)}`, {
      limit: 15,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }
    if (!contentLengthOk(req, 32_768)) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    if (!assertSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const response = body?.response as RegistrationResponseJSON | undefined;
    const deviceName =
      sanitizeDisplayName(String(body?.deviceName || "This device"), 60) || "This device";

    if (!response?.id || !response?.response) {
      return NextResponse.json({ error: "Invalid registration response" }, { status: 400 });
    }

    const expected = takeChallenge(`reg:${user.id}`, "registration");
    if (!expected) {
      return NextResponse.json(
        { error: "Registration challenge expired. Try again." },
        { status: 400 }
      );
    }

    const rpID = getRpId(req);
    const origin = getOrigin(req);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: expected.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Biometric registration failed verification." }, { status: 400 });
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    const stored: WebAuthnCredential = {
      id: credential.id,
      publicKey: b64url(credential.publicKey),
      counter: credential.counter,
      name: deviceName,
      transports: (response.response.transports || credential.transports || []) as string[],
      createdAt: new Date().toISOString(),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    };

    let updatedUser = user;
    await updateDb((db) => {
      const u = db.users.find((x) => x.id === user.id);
      if (!u) return;
      const list = Array.isArray(u.webauthnCredentials) ? [...u.webauthnCredentials] : [];
      // Replace if same credential id
      const idx = list.findIndex((c) => c.id === stored.id);
      if (idx >= 0) list[idx] = stored;
      else list.push(stored);
      // Cap devices
      u.webauthnCredentials = list.slice(-8);
      updatedUser = u;
    });

    return NextResponse.json({
      ok: true,
      message: "Face ID / Touch ID enabled for this device.",
      credential: {
        id: stored.id,
        name: stored.name,
        createdAt: stored.createdAt,
      },
      user: publicUser(updatedUser),
      biometricsEnabled: true,
      credentialCount: (updatedUser.webauthnCredentials || []).length,
    });
  } catch (e) {
    console.error("[webauthn/register/verify]", e);
    return NextResponse.json(
      { error: "Could not verify biometric registration." },
      { status: 500 }
    );
  }
}
