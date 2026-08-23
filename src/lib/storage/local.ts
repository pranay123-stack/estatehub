import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageAdapter, StoredFile } from "./types";

/**
 * Where locally-stored uploads live. Deliberately NOT `public/` — Next serves
 * that directory from a build-time snapshot, so anything written there at
 * runtime 404s under `next start`. Files here are streamed by the
 * /api/files/[name] route instead, which works identically in dev and prod.
 *
 * Resolved per call rather than at module load, so the value tracks the current
 * working directory and can be pointed at a mounted volume when self-hosting.
 */
export function localUploadDir(): string {
  return process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads");
}

/** URL prefix served by src/app/api/files/[name]/route.ts. */
export const LOCAL_URL_PREFIX = "/api/files";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * Filesystem driver. Works for local development and for self-hosting where
 * `storage/` sits on persistent disk.
 *
 * Not usable on Vercel — its filesystem is read-only and ephemeral. Set
 * STORAGE_DRIVER=cloudinary there.
 */
export const localStorage: StorageAdapter = {
  name: "local",

  async upload(file: File): Promise<StoredFile> {
    const dir = localUploadDir();
    await mkdir(dir, { recursive: true });

    const ext = EXTENSIONS[file.type] ?? "bin";
    // Random name, never the client-supplied one — blocks path traversal and
    // collisions in a single step.
    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), bytes);

    return { url: `${LOCAL_URL_PREFIX}/${filename}`, key: filename };
  },

  async remove(key: string): Promise<void> {
    // Reject anything that could escape the upload directory.
    if (!key || key.includes("/") || key.includes("..")) return;

    // turbopackIgnore: the upload directory holds runtime data, not source.
    // Without this, the bundler cannot statically scope the path and traces the
    // entire project (including public/) into the server output.
    const target = path.join(/*turbopackIgnore: true*/ localUploadDir(), key);

    await unlink(target).catch(() => {
      // Already gone — deleting a listing must not fail because of a stale file.
    });
  },
};
