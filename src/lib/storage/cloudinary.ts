import { createHash } from "node:crypto";
import type { StorageAdapter, StoredFile } from "./types";

/**
 * Production driver. Uses Cloudinary's REST API directly — the official SDK
 * pulls in a large dependency tree for what amounts to two signed requests.
 *
 * Signed (not unsigned) uploads: the API secret never leaves the server, so a
 * visitor cannot upload to the account by copying a preset name out of the
 * client bundle.
 */
function requireConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "STORAGE_DRIVER=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
  }
  return { cloudName, apiKey, apiSecret };
}

/** Cloudinary signature: sha1 of sorted `key=value` pairs + the API secret. */
function sign(params: Record<string, string>, apiSecret: string): string {
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(canonical + apiSecret).digest("hex");
}

export const cloudinaryStorage: StorageAdapter = {
  name: "cloudinary",

  async upload(file: File): Promise<StoredFile> {
    const { cloudName, apiKey, apiSecret } = requireConfig();

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = "estatehub";
    const signature = sign({ folder, timestamp }, apiSecret);

    const body = new FormData();
    body.append("file", file);
    body.append("api_key", apiKey);
    body.append("timestamp", timestamp);
    body.append("folder", folder);
    body.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body },
    );

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed (${response.status}): ${await response.text()}`);
    }

    const result = (await response.json()) as { secure_url: string; public_id: string };
    return { url: result.secure_url, key: result.public_id };
  },

  async remove(key: string): Promise<void> {
    const { cloudName, apiKey, apiSecret } = requireConfig();

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = sign({ public_id: key, timestamp }, apiSecret);

    const body = new FormData();
    body.append("public_id", key);
    body.append("api_key", apiKey);
    body.append("timestamp", timestamp);
    body.append("signature", signature);

    // Best-effort: an orphaned CDN asset must not block deleting the listing.
    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      body,
    }).catch(() => undefined);
  },
};
