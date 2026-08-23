import { clearSessionCookie } from "@/lib/auth/session";
import { handler, ok } from "@/lib/api";

/** POST /api/auth/logout — clears the session cookie. */
export const POST = handler(async () => {
  await clearSessionCookie();
  return ok({ signedOut: true });
});
