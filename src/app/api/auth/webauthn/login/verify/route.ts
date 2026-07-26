import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import {
  applyClearGuestCookie,
  applySessionCookie,
  createToken,
  publicUser,
  peekGuestId,
  migrateGuestData,
} from "@/lib/auth";
import { readDb, updateDb } from "@/lib/storage";
import {
  getOrigin,
  getRpId,
  takeChallenge,
  toAuthenticatorDevice,
} from "@/lib/webauthn";
import { clientIp, rateLimit, sanitizeText } from "@/lib/rate-limit";
import { assertSameOrigin, contentLengthOk } from "@/lib/security";
import { isValidEmail } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const limited = rateLimit(`webauthn-login-ver:${clientIp(req)}`, {
      limit: 20,
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

    const body = await req.json().catch(() => null);
    const response = body?.response as AuthenticationResponseJSON | undefined;
    const email = sanitizeText(String(body?.email || ""), 254).toLowerCase();
    const challengeKey = String(body?.challengeKey || "");

    if (!response?.id || !response?.response) {
      return NextResponse.json({ error: "Invalid authentication response" }, { status: 400 });
    }

    const db = await readDb();

    // Resolve user by email or by credential id
    let user =
      email && isValidEmail(email)
        ? db.users.find((u) => u.email === email) || null
        : null;

    if (!user) {
      user =
        db.users.find((u) =>
          (u.webauthnCredentials || []).some((c) => c.id === response.id)
        ) || null;
    }

    if (!user) {
      return NextResponse.json(
        { error: "No account matched this biometric credential." },
        { status: 401 }
      );
    }

    const cred = (user.webauthnCredentials || []).find((c) => c.id === response.id);
    if (!cred) {
      return NextResponse.json(
        { error: "This device is not enrolled for biometric sign-in." },
        { status: 401 }
      );
    }

    let expected =
      (challengeKey && takeChallenge(challengeKey, "authentication")) ||
      takeChallenge(`auth:${user.id}`, "authentication") ||
      takeChallenge(`auth:anon:${clientIp(req)}`, "authentication");

    // Fallback: challenge stored by value in clientDataJSON is handled by simplewebauthn
    if (!expected) {
      // Try challenge-keyed store from options (if still present)
      expected = null;
    }

    if (!expected) {
      return NextResponse.json(
        { error: "Sign-in challenge expired. Try Face ID / Touch ID again." },
        { status: 400 }
      );
    }

    const rpID = getRpId(req);
    const origin = getOrigin(req);
    const authenticator = toAuthenticatorDevice(cred);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: expected.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: authenticator.id,
        publicKey: authenticator.publicKey,
        counter: authenticator.counter,
        transports: authenticator.transports,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return NextResponse.json({ error: "Biometric verification failed." }, { status: 401 });
    }

    const newCounter = verification.authenticationInfo.newCounter;

    await updateDb((d) => {
      const u = d.users.find((x) => x.id === user!.id);
      if (!u?.webauthnCredentials) return;
      const c = u.webauthnCredentials.find((x) => x.id === cred.id);
      if (c) {
        c.counter = newCounter;
        c.lastUsedAt = new Date().toISOString();
      }
      const guestId = peekGuestId();
      if (guestId) migrateGuestData(d, guestId, user!.id);
    });

    const sv =
      typeof user.sessionVersion === "number" ? user.sessionVersion : 0;
    const token = await createToken(user.id, sv);
    const res = NextResponse.json({
      ok: true,
      user: publicUser(user),
      message: "Signed in with Face ID / Touch ID.",
    });
    applySessionCookie(res, token);
    applyClearGuestCookie(res);
    return res;
  } catch (e) {
    console.error("[webauthn/login/verify]", e);
    return NextResponse.json(
      { error: "Biometric sign-in failed." },
      { status: 500 }
    );
  }
}
