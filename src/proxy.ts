import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Cheap edge gate for /dashboard, using Next 16's `proxy` convention (the
 * renamed `middleware`): bounce anyone without a session cookie straight to
 * login, so protected pages never even start rendering.
 *
 * This checks only for the cookie's *presence* — verifying the JWT signature
 * happens in the page/route guards, which also re-read the user row. Treat
 * this as a redirect optimisation, never as the authorisation boundary.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
