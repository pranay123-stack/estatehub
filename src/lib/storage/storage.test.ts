import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readdir, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getStorage } from "./index";

/**
 * Each test gets its own upload directory via LOCAL_UPLOAD_DIR, so nothing
 * touches the project's real storage/ folder.
 */
let uploadDir: string;
let workdir: string;

beforeEach(async () => {
  workdir = await mkdtemp(path.join(tmpdir(), "estatehub-storage-"));
  uploadDir = path.join(workdir, "uploads");
  process.env.LOCAL_UPLOAD_DIR = uploadDir;
  delete process.env.STORAGE_DRIVER;
});

afterEach(async () => {
  delete process.env.LOCAL_UPLOAD_DIR;
  await rm(workdir, { recursive: true, force: true });
});

const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "photo.jpg", { type: "image/jpeg" });

describe("getStorage", () => {
  it("defaults to the local driver", () => {
    expect(getStorage().name).toBe("local");
    process.env.STORAGE_DRIVER = "";
    expect(getStorage().name).toBe("local");
  });

  it("selects cloudinary when configured", () => {
    process.env.STORAGE_DRIVER = "cloudinary";
    expect(getStorage().name).toBe("cloudinary");
  });

  it("fails loudly on an unknown driver rather than silently writing to disk", () => {
    process.env.STORAGE_DRIVER = "s3";
    expect(() => getStorage()).toThrow(/Unknown STORAGE_DRIVER/);
  });
});

describe("local driver", () => {
  it("writes to the configured directory and returns an /api/files URL", async () => {
    const stored = await getStorage().upload(jpeg());

    // public/ is a build-time snapshot in Next, so uploads must not land there.
    expect(stored.url).toBe(`/api/files/${stored.key}`);
    await expect(access(path.join(uploadDir, stored.key))).resolves.toBeUndefined();
  });

  it("ignores the client-supplied filename", async () => {
    const hostile = new File([new Uint8Array([1])], "../../etc/passwd.jpg", { type: "image/jpeg" });
    const stored = await getStorage().upload(hostile);

    expect(stored.key).not.toContain("/");
    expect(stored.key).not.toContain("..");
    expect(stored.key).toMatch(/^\d+-[0-9a-f]{12}\.jpg$/);
  });

  it("gives concurrent uploads distinct names", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => getStorage().upload(jpeg())));
    expect(new Set(results.map((r) => r.key)).size).toBe(8);
  });

  it("maps content type to the right extension", async () => {
    const png = new File([new Uint8Array([1])], "x.png", { type: "image/png" });
    expect((await getStorage().upload(png)).key.endsWith(".png")).toBe(true);
  });

  it("removes a file it owns", async () => {
    const storage = getStorage();
    const stored = await storage.upload(jpeg());
    await storage.remove(stored.key);
    await expect(access(path.join(uploadDir, stored.key))).rejects.toThrow();
  });

  it("refuses to delete outside the upload directory", async () => {
    const storage = getStorage();
    await storage.upload(jpeg()); // ensures the directory exists

    const bystander = path.join(workdir, "secret.txt");
    await writeFile(bystander, "do not delete");

    for (const key of ["../secret.txt", "../../secret.txt", "uploads/../secret.txt", "", ".."]) {
      await storage.remove(key);
    }

    // The traversal targets are rejected before touching the filesystem.
    await expect(access(bystander)).resolves.toBeUndefined();
  });

  it("treats deleting an already-missing file as success", async () => {
    // A stale image must never block deleting its listing.
    await expect(getStorage().remove("does-not-exist.jpg")).resolves.toBeUndefined();
  });

  it("does not create stray files while rejecting traversal", async () => {
    const storage = getStorage();
    await storage.upload(jpeg());
    await storage.remove("../escape.jpg");

    const entries = await readdir(uploadDir);
    expect(entries).toHaveLength(1);
  });
});

describe("cloudinary driver", () => {
  it("refuses to run without credentials instead of failing at request time", async () => {
    process.env.STORAGE_DRIVER = "cloudinary";
    for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
      delete process.env[key];
    }
    await expect(getStorage().upload(jpeg())).rejects.toThrow(/CLOUDINARY_/);
  });
});
