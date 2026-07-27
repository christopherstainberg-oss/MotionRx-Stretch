/**
 * Local / demo preview without sign-in.
 * Enable with NEXT_PUBLIC_BYPASS_LOGIN=true (or BYPASS_LOGIN=true on the server).
 * Never enable in production public deploys.
 */

export function isLoginBypassEnabled(): boolean {
  const v =
    process.env.NEXT_PUBLIC_BYPASS_LOGIN ||
    process.env.BYPASS_LOGIN ||
    "";
  return /^(1|true|yes|on)$/i.test(v.trim());
}
