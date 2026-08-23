import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, authed, handler, ok } from "@/lib/api";

const bodySchema = z.object({ propertyId: z.string().min(1) });

/**
 * POST /api/favorites — toggle. One endpoint instead of POST+DELETE keeps the
 * heart button's logic to a single call, and the composite unique index makes
 * double-clicks harmless.
 */
export const POST = handler(async (request: Request) => {
  const user = await authed();
  const { propertyId } = bodySchema.parse(await request.json());

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true },
  });
  if (!property) throw new ApiError("Listing not found.", 404);

  const existing = await prisma.favorite.findUnique({
    where: { userId_propertyId: { userId: user.id, propertyId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return ok({ saved: false });
  }

  await prisma.favorite.create({ data: { userId: user.id, propertyId } });
  return ok({ saved: true });
});
