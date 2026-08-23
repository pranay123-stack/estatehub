"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/constants";

/** Avatar + dropdown. Client component because it owns open/close state. */
export function UserMenu({ name, role }: { name: string; role: Role }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);

    // A full document navigation is deliberate. router.push()/replace() reuse
    // the client router cache, which holds pages rendered under the *previous*
    // identity; calling router.refresh() first is racy — measured failing 6/6
    // times on sign-out. Signing in or out changes who the entire app shell is
    // rendered for, so a reload is the correct tool, not a heavy-handed one.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isSeller = role === "OWNER" || role === "AGENT" || role === "ADMIN";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg border border-line bg-white py-1.5 pl-1.5 pr-2.5 text-sm font-medium transition-colors hover:bg-slate-50"
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-700 text-xs font-bold text-white">
          {initials || "U"}
        </span>
        <span className="hidden max-w-24 truncate sm:block">{name.split(" ")[0]}</span>
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-400" aria-hidden="true">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white shadow-pop"
        >
          <div className="border-b border-line bg-slate-50 px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="text-xs text-muted">{ROLE_LABELS[role]}</p>
          </div>

          <div className="p-1.5">
            <MenuLink href="/dashboard" onClick={() => setOpen(false)}>
              Dashboard
            </MenuLink>
            <MenuLink href="/dashboard/saved" onClick={() => setOpen(false)}>
              Saved properties
            </MenuLink>
            {isSeller && (
              <MenuLink href="/dashboard/listings" onClick={() => setOpen(false)}>
                My listings
              </MenuLink>
            )}
            {role === "ADMIN" && (
              <MenuLink href="/dashboard/admin" onClick={() => setOpen(false)}>
                Admin panel
              </MenuLink>
            )}
          </div>

          <div className="border-t border-line p-1.5">
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-ink"
    >
      {children}
    </Link>
  );
}
