export type StoredFile = {
  /** Publicly reachable URL for <img src>. */
  url: string;
  /** Driver-specific handle used to delete the blob later. */
  key: string;
};

/**
 * Every storage backend implements this. Route handlers depend only on the
 * interface, so swapping local disk for Cloudinary (or S3) touches one file.
 */
export interface StorageAdapter {
  readonly name: string;
  upload(file: File): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
