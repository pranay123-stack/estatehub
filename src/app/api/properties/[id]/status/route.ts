import { prisma } from "@/lib/prisma";
import { ApiError, authed, handler, ok } from "@/lib/api";
import { statusUpdateSchema } from "@/lib/validation/property";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/properties/:id/status
 *
 * Two callers with different rights:
 *  - admins moderate (PENDING → APPROVED / REJECTED)
 *  - owners flip their own listing between live, sold and inactive, but can
 *    never approve it themselves.
 */
const OWNER_ALLOWED = ["SOLD", "INACTIVE", "APPROVED"] as const;

export const PATCH = handler(async (request: Request, context: RouteContext) => {
  const user = await authed();
  const { id } = await context.params;
  const input = statusUpdateSchema.parse(await request.json());

  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, ownerId: true, status: true },
  });
  if (!property) throw new ApiError("Listing not found.", 404);

  const isAdmin = user.role === "ADMIN";
  const isOwner = property.ownerId === user.id;

  if (!isAdmin && !isOwner) {
    throw new ApiError("You can only manage your own listings.", 403);
  }

  if (!isAdmin) {
    if (!OWNER_ALLOWED.includes(input.status as (typeof OWNER_ALLOWED)[number])) {
      throw new ApiError("Only an admin can set that status.", 403);
    }
    // An owner may re-activate a listing an admin already approved, but must
    // not resurrect one that was rejected or never reviewed.
    if (input.status === "APPROVED" && property.status !== "INACTIVE" && property.status !== "SOLD") {
      throw new ApiError("This listing is still awaiting admin review.", 403);
    }
  }

  const updated = await prisma.property.update({
    where: { id },
    data: {
      status: input.status,
      rejectionReason: input.status === "REJECTED" ? input.rejectionReason || null : null,
    },
    select: { id: true, status: true },
  });

  return ok({ property: updated });
});
