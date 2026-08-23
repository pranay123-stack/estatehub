import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import type { Role } from "@/generated/prisma/enums";

/** Roles allowed to create and manage listings. */
export const SELLER_ROLES: Role[] = ["OWNER", "AGENT", "ADMIN"];

export type CurrentUser = SessionPayload & { id: string };

/** Session-only read — cheap, no DB hit. Use in layouts and headers. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  return session ? { ...session, id: session.sub } : null;
}

/**
 * Loads the live user row. Use before any privileged write: the JWT is a
 * snapshot, so a user banned or demoted after issuing the token would still
 * carry a valid session otherwise.
 */
export async function getVerifiedUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, blocked: true },
  });

  if (!user || user.blocked) return null;
  return user;
}

/** Server Component guard: bounce to login, preserving the intended target. */
export async function requireUser(returnTo = "/dashboard"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Server Component guard for role-gated pages. */
export async function requireRole(roles: Role[], returnTo = "/dashboard"): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (!roles.includes(user.role)) redirect("/dashboard?error=forbidden");
  return user;
}
