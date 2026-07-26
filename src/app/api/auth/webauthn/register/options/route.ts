import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getSessionUser } from "@/lib/auth";
import {
  getOrigin,
  getRpId,
  getRpName,
  putChallenge,
  toAuthenticatorDevice,
} from "@/lib/webauthn";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`webauthn-reg-opt:${clientIp(req)}`, {
      limit: 15,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }
    if (!assertSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in with email and password first, then enable Face ID / Touch ID." },
        { status: 401 }
      );
    }

    const rpID = getRpId(req);
    const existing = (user.webauthnCredentials || []).map(toAuthenticatorDevice);

    const options = await generateRegistrationOptions({
      rpName: getRpName(),
      rpID,
      userName: user.email,
      userDisplayName: user.preferredName || user.name || user.email,
      userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({
        id: c.id,
        transports: c.transports,
      })),
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      // Prefer ES256 / RS256
      supportedAlgorithmIDs: [-7, -257],
    });

    putChallenge(`reg:${user.id}`, options.challenge, "registration", user.id);

    return NextResponse.json({
      options,
      rpID,
      origin: getOrigin(req),
    });
  } catch (e) {
    console.error("[webauthn/register/options]", e);
    return NextResponse.json(
      { error: "Could not start biometric enrollment." },
      { status: 500 }
    );
  }
}
