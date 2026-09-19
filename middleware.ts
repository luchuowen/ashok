import { NextRequest, NextResponse } from "next/server";

/**
 * Soft, presence-only gate: redirects a visitor with no `ashok_session`
 * cookie away from /portal before the page ever renders. This can't verify
 * the cookie's HMAC signature (that needs Node's crypto module, and
 * middleware runs on the Edge runtime) — the real verification happens
 * server-side in GET /api/portal/me, which app/portal/portal-context.tsx
 * calls on mount and redirects to /auth again if that check fails. Two
 * layers: this one avoids ever flashing portal chrome at a signed-out
 * visitor; the API route is the one that actually decides access.
 */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has("ashok_session");
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*"],
};
