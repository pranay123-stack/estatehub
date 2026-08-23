"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import clsx from "clsx";

type GalleryImage = { url: string; alt: string | null };

/**
 * Main image + thumbnail strip, with a lightbox on click.
 * The first image is marked `priority` because it is reliably the LCP element
 * on this page.
 */
export function PropertyGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  // Arrow-key navigation, and Escape to close the lightbox.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightbox(false);
      if (event.key === "ArrowRight") setActive((index) => (index + 1) % images.length);
      if (event.key === "ArrowLeft") setActive((index) => (index - 1 + images.length) % images.length);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="grid aspect-16/10 w-full place-items-center rounded-card border border-line bg-slate-100 text-slate-300">
        <svg viewBox="0 0 24 24" fill="none" className="h-16 w-16" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="m3 15 5-4 4 3 3-2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  const current = images[active];

  return (
    <>
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="group relative block aspect-16/10 w-full overflow-hidden rounded-card bg-slate-100"
          aria-label="Open image gallery"
        >
          <Image
            src={current.url}
            alt={current.alt ?? title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover"
          />
          <span className="absolute bottom-3 right-3 rounded-lg bg-black/65 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            {active + 1} / {images.length}
          </span>
        </button>

        {images.length > 1 && (
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={image.url}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View image ${index + 1}`}
                aria-current={index === active}
                className={clsx(
                  "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                  index === active ? "border-brand-700" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image src={image.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — image ${active + 1} of ${images.length}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <div className="relative h-full max-h-[85vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={current.url}
              alt={current.alt ?? title}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Close gallery"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {images.length > 1 && (
            <>
              <GalleryArrow
                side="left"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive((index) => (index - 1 + images.length) % images.length);
                }}
              />
              <GalleryArrow
                side="right"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive((index) => (index + 1) % images.length);
                }}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

function GalleryArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: (event: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous image" : "Next image"}
      className={clsx(
        "absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path
          d={side === "left" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
