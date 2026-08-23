"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

/**
 * Heart toggle with an optimistic flip: the icon fills immediately and only
 * rolls back if the request fails. Unauthenticated clicks route to login and
 * come back to the same page.
 */
export function FavoriteButton({
  propertyId,
  initialSaved,
  size = "sm",
}: {
  propertyId: string;
  initialSaved: boolean;
  size?: "sm" | "lg";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function toggle(event: React.MouseEvent) {
    // The card wraps this in a stretched link — don't navigate on heart clicks.
    event.preventDefault();
    event.stopPropagation();

    const next = !saved;
    setSaved(next);

    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId }),
    });

    if (response.status === 401) {
      setSaved(!next);
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!response.ok) {
      setSaved(!next); // roll back the optimistic flip
      return;
    }

    const body = (await response.json()) as { data?: { saved: boolean } };
    if (body.data) setSaved(body.data.saved);

    // Keeps the saved-properties list in sync if it's on screen.
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save property"}
      title={saved ? "Remove from saved" : "Save property"}
      className={clsx(
        "relative z-10 grid place-items-center rounded-full border border-line bg-white/95 text-slate-500 shadow-sm backdrop-blur transition-colors hover:text-red-500",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        saved && "text-red-500",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        className={size === "sm" ? "h-4 w-4" : "h-5 w-5"}
        aria-hidden="true"
      >
        <path
          d="M12 20s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5c0 5.15-7 9.5-7 9.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
