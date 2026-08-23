import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/guards";
import { ApiError, handler, ok } from "@/lib/api";
import { enquirySchema } from "@/lib/validation/enquiry";

/**
 * POST /api/enquiries — "Contact seller" form.
 * Open to anonymous visitors: forcing registration before a buyer can ask a
 * question is the fastest way to lose the lead. If they happen to be signed
 * in, the enquiry is attributed to them.
 */
export const POST = handler(async (request: Request) => {
  const input = enquirySchema.parse(await request.json());
  const user = await getCurrentUser();

  const property = await prisma.property.findUnique({
    where: { id: input.propertyId },
    select: { id: true, status: true, ownerId: true },
  });

  // Only live listings accept enquiries — otherwise the endpoint leaks the
  // existence of listings that were rejected or pulled.
  if (!property || property.status !== "APPROVED") {
    throw new ApiError("Listing not found.", 404);
  }
  if (user && user.id === property.ownerId) {
    throw new ApiError("You cannot enquire about your own listing.", 400);
  }

  await prisma.enquiry.create({
    data: {
      propertyId: property.id,
      userId: user?.id ?? null,
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
    },
  });

  return ok({ sent: true }, 201);
});
