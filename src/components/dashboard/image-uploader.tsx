"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui";

export type UploadedImage = { url: string; storageKey?: string | null; alt?: string | null };

/**
 * Uploads as soon as files are picked, then shows a reorderable strip.
 * Uploading eagerly (rather than on submit) means a slow connection never
 * blocks saving, and the same component works for create and edit.
 */
export function ImageUploader({
  images,
  onChange,
  max = 12,
}: {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const remaining = max - images.length;
    if (remaining <= 0) {
      setError(`You can upload up to ${max} images.`);
      return;
    }

    setUploading(true);
    setError(null);

    const body = new FormData();
    for (const file of Array.from(fileList).slice(0, remaining)) {
      body.append("files", file);
    }

    const response = await fetch("/api/uploads", { method: "POST", body });
    const payload = (await response.json()) as {
      error?: string;
      data?: { images: UploadedImage[] };
    };

    setUploading(false);
    if (inputRef.current) inputRef.current.value = ""; // allow re-picking the same file

    if (!response.ok || !payload.data) {
      setError(payload.error ?? "Upload failed.");
      return;
    }

    onChange([...images, ...payload.data.images]);
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  /** Array order *is* gallery order; index 0 is the cover image. */
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;

    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={(event) => handleFiles(event.target.files)}
          className="hidden"
          id="property-images"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || images.length >= max}
        >
          {uploading ? "Uploading…" : "Choose images"}
        </Button>
        <p className="text-xs text-muted">
          {images.length}/{max} · JPEG, PNG, WebP or AVIF · max 5 MB each
        </p>
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.url}
              className="group relative aspect-4/3 overflow-hidden rounded-lg border border-line bg-slate-100"
            >
              <Image src={image.url} alt="" fill sizes="200px" className="object-cover" />

              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded bg-brand-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  COVER
                </span>
              )}

              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <div className="flex gap-1">
                  <IconButton label="Move left" onClick={() => move(index, -1)} disabled={index === 0}>
                    ‹
                  </IconButton>
                  <IconButton
                    label="Move right"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                  >
                    ›
                  </IconButton>
                </div>
                <IconButton label="Remove image" onClick={() => removeAt(index)} tone="danger">
                  ×
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={
        "grid h-6 w-6 place-items-center rounded text-sm font-bold text-white disabled:opacity-30 " +
        (tone === "danger" ? "bg-red-600/90 hover:bg-red-600" : "bg-white/25 hover:bg-white/40")
      }
    >
      {children}
    </button>
  );
}
