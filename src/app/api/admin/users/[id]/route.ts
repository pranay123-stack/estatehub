import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, authedWithRole, handler, ok } from "@/lib/api";
import { ROLES } from "@/lib/constants";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  role: z.enum(ROLES).optional(),
  blocked: z.boolean().optional(),
});

/** PATCH /api/admin/users/:id — change a user's role or suspend them. */
export const PATCH = handler(async (request: Request, context: RouteContext) => {
  const admin = await authedWithRole(["ADMIN"]);
  const { id } = await context.params;
  const input = bodySchema.parse(await request.json());

  // Guard against an admin locking themselves out of the panel.
  if (id === admin.id) {
    throw new ApiError("You cannot change your own role or status.", 400);
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(input.role ? { role: input.role } : {}),
      ...(input.blocked !== undefined ? { blocked: input.blocked } : {}),
    },
    select: { id: true, role: true, blocked: true },
  });

  return ok({ user });
});
