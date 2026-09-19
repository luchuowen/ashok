import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";

/**
 * Stateless phone-OTP verification: no database yet (Phase 1 has no backend
 * wired up anywhere else either — see the "Phase 1 mock" comments on the
 * booking and auth pages). Instead of persisting the code server-side,
 * /api/auth/send-otp hands the client an HMAC-signed token that commits to
 * a HASH of the code and an expiry; /api/auth/verify-otp recomputes the
 * hash from what the visitor typed and checks it against the token. The
 * plaintext code only ever travels over SMS, never back to the browser.
 */

const OTP_TTL_MS = 5 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.OTP_SIGNING_SECRET;
  if (!secret) throw new Error("OTP_SIGNING_SECRET is not configured on the server.");
  return secret;
}

function hashCode(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}:${getSecret()}`).digest("hex");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** { phone, codeHash, exp } base64url-encoded, plus a detached HMAC signature. */
export function createOtpToken(phone: string, code: string): string {
  const payload = Buffer.from(
    JSON.stringify({ phone, codeHash: hashCode(phone, code), exp: Date.now() + OTP_TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyOtpToken(
  token: string,
  phone: string,
  code: string,
): { ok: true } | { ok: false; reason: "malformed" | "tampered" | "expired" | "phone-mismatch" | "code-mismatch" } {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return { ok: false, reason: "malformed" };

  const expectedSignature = sign(payload);
  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expectedSignature, "hex");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { ok: false, reason: "tampered" };
  }

  let decoded: { phone: string; codeHash: string; exp: number };
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (Date.now() > decoded.exp) return { ok: false, reason: "expired" };
  if (decoded.phone !== phone) return { ok: false, reason: "phone-mismatch" };

  const gotHash = Buffer.from(hashCode(phone, code), "hex");
  const wantHash = Buffer.from(decoded.codeHash, "hex");
  if (gotHash.length !== wantHash.length || !timingSafeEqual(gotHash, wantHash)) {
    return { ok: false, reason: "code-mismatch" };
  }

  return { ok: true };
}

/** Signed session cookie value — just enough to say "this phone verified an OTP". */
export function createSessionToken(phone: string): string {
  const payload = Buffer.from(JSON.stringify({ phone, iat: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): { phone: string } | null {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(sign(payload), "hex");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return { phone: decoded.phone };
  } catch {
    return null;
  }
}
