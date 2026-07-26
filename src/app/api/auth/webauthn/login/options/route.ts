import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { readDb } from "@/lib/storage";
import {
  getRpId,
  putChallenge,
  toAuthenticatorDevice,
} from "@/lib/webauthn";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk } from "@/lib/security";
import { isValidEmail } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`webauthn-login-opt:${clientIp(req)}`, {
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

    const body = await req.json().catch(() => ({}));
    const email = sanitizeText(String(body.email || ""), 254).toLowerCase();

    const rpID = getRpId(req);
    let allowCredentials:
      | ReturnType<typeof toAuthenticatorDevice>[]
      | undefined;

    let challengeKey = `auth:anon:${clientIp(req)}`;
    let userId: string | undefined;

    if (email && isValidEmail(email)) {
      const db = await readDb();
      const user = db.users.find((u) => u.email === email);
      if (!user || !(user.webauthnCredentials && user.webauthnCredentials.length)) {
        return NextResponse.json(
          {
            error:
              "No Face ID / Touch ID is enrolled for this email. Sign in with password, then enable biometrics in Account.",
          },
          { status: 404 }
        );
      }
      allowCredentials = user.webauthnCredentials.map(toAuthenticatorDevice);
      challengeKey = `auth:${user.id}`;
      userId = user.id;
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "required",
      allowCredentials: allowCredentials?.map((c) => ({
        id: c.id,
        transports: c.transports,
      })),
    });

    putChallenge(challengeKey, options.challenge, "authentication", userId);
    // Also store by challenge for discoverable credential flow
    putChallenge(`auth-chal:${options.challenge}`, options.challenge, "authentication", userId);

    return NextResponse.json({ options, challengeKey });
  } catch (e) {
    console.error("[webauthn/login/options]", e);
    return NextResponse.json(
      { error: "Could not start biometric sign-in." },
      { status: 500 }
    );
  }
}
