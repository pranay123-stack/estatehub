import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validation/auth";
import { ApiError, handler, ok } from "@/lib/api";

/** POST /api/auth/register — create an account and start a session. */
export const POST = handler(async (request: Request) => {
  const input = registerSchema.parse(await request.json());

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError("An account with that email already exists.", 409);
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      phone: input.phone || null,
      // registerSchema's enum excludes ADMIN, so this can never self-elevate.
      role: input.role,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  await setSessionCookie(
    await createSessionToken({ sub: user.id, email: user.email, name: user.name, role: user.role }),
  );

  return ok({ user }, 201);
});
