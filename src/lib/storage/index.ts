import { cloudinaryStorage } from "./cloudinary";
import { localStorage } from "./local";
import type { StorageAdapter } from "./types";

/**
 * Resolves the active driver from STORAGE_DRIVER.
 * Add S3 by writing src/lib/storage/s3.ts and one case here — nothing else in
 * the app knows which backend is in use.
 */
export function getStorage(): StorageAdapter {
  switch (process.env.STORAGE_DRIVER) {
    case "cloudinary":
      return cloudinaryStorage;
    case "local":
    case undefined:
    case "":
      return localStorage;
    default:
      throw new Error(`Unknown STORAGE_DRIVER "${process.env.STORAGE_DRIVER}".`);
  }
}

export * from "./types";
