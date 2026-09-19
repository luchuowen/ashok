import { createHmac, timingSafeEqual } from "crypto";

/**
 * Staff/admin session tokens — same signed-cookie pattern as lib/otp.ts's
 * customer session token, reusing OTP_SIGNING_SECRET (already a securely
 * provisioned Firebase App Hosting secret) rather than requiring a second
 * signing secret. The payload is namespaced with role:"staff" so a staff
 * token can never be confused with — or forged from — a customer session
 * token, and vice versa.
 */

const STAFF_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // one shift

function getSigningSecret(): string {
  const secret = process.env.OTP_SIGNING_SECRET;
  if (!secret) throw new Error("OTP_SIGNING_SECRET is not configured on the server.");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createStaffSessionToken(): string {
  const payload = Buffer.from(JSON.stringify({ role: "staff", iat: Date.now() })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

export function verifyStaffSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(sign(payload), "hex");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role: string;
      iat: number;
    };
    if (decoded.role !== "staff") return false;
    if (Date.now() - decoded.iat > STAFF_SESSION_TTL_MS) return false;
    return true;
  } catch {
    return false;
  }
}

export const STAFF_SESSION_COOKIE = "ashok_staff_session";
