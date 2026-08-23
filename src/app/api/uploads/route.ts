import { SELLER_ROLES } from "@/lib/auth/guards";
import { ApiError, authedWithRole, handler, ok } from "@/lib/api";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, getStorage } from "@/lib/storage";

/**
 * POST /api/uploads — multipart image upload, returns { url, key }.
 *
 * Deliberately decoupled from listing creation: the form uploads as the user
 * picks files, so a slow upload never blocks the save, and the same endpoint
 * serves both create and edit.
 */
export const POST = handler(async (request: Request) => {
  await authedWithRole(SELLER_ROLES);

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) throw new ApiError("No files were uploaded.", 400);
  if (files.length > 12) throw new ApiError("You can upload up to 12 images at a time.", 400);

  for (const file of files) {
    // Type and size are checked before any bytes are written or forwarded.
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new ApiError(`"${file.name}" is not a supported image (JPEG, PNG, WebP or AVIF).`, 415);
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new ApiError(`"${file.name}" is larger than 5 MB.`, 413);
    }
  }

  const storage = getStorage();
  const uploaded = await Promise.all(
    files.map(async (file) => {
      const stored = await storage.upload(file);
      return { url: stored.url, storageKey: stored.key };
    }),
  );

  return ok({ images: uploaded }, 201);
});
