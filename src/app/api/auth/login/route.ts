import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { ApiError, handler, ok } from "@/lib/api";

/** POST /api/auth/login */
export const POST = handler(async (request: Request) => {
  const input = loginSchema.parse(await request.json());

  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // One message for "no such user" and "wrong password" — telling them apart
  // would let an attacker enumerate registered email addresses.
  const invalid = new ApiError("Incorrect email or password.", 401);
  if (!user) throw invalid;
  if (!(await verifyPassword(input.password, user.passwordHash))) throw invalid;

  if (user.blocked) {
    throw new ApiError("This account has been suspended. Contact support.", 403);
  }

  await setSessionCookie(
    await createSessionToken({ sub: user.id, email: user.email, name: user.name, role: user.role }),
  );

  return ok({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
