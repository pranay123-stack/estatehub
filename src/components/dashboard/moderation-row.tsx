"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Input } from "@/components/ui";
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { formatArea, formatListingPrice, formatRelative } from "@/lib/format";
import type { ListingStatus, ListingType, PropertyType } from "@/generated/prisma/enums";

export type ModerationItem = {
  id: string;
  slug: string;
  title: string;
  type: PropertyType;
  listingType: ListingType;
  price: number;
  city: string;
  locality: string;
  areaSqft: number;
  status: ListingStatus;
  featured: boolean;
  createdAt: Date;
  images: { url: string }[];
  owner: { name: string; email: string; role: string };
};

/** Approve / reject / feature controls for one listing in the admin queue. */
export function ModerationRow({ item }: { item: ModerationItem }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: ListingStatus, rejectionReason?: string) {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/properties/${item.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectionReason }),
    });

    setBusy(false);
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Could not update the listing.");
      return;
    }

    setRejecting(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Permanently delete “${item.title}”? Use this for spam listings.`)) return;

    setBusy(true);
    const response = await fetch(`/api/properties/${item.id}`, { method: "DELETE" });
    setBusy(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Could not delete the listing.");
      return;
    }
    router.refresh();
  }

  const cover = item.images[0];

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex gap-4">
        <div className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:block">
          {cover && <Image src={cover.url} alt="" fill sizes="112px" className="object-cover" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/properties/${item.slug}`}
                target="_blank"
                className="line-clamp-1 font-semibold text-ink hover:text-brand-700"
              >
                {item.title}
              </Link>
              <p className="mt-0.5 text-sm text-muted">
                {item.locality}, {item.city} · {PROPERTY_TYPE_LABELS[item.type]} ·{" "}
                {LISTING_TYPE_LABELS[item.listingType]}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {item.featured && <Badge tone="accent">Featured</Badge>}
              <Badge tone={item.status === "PENDING" ? "warning" : "neutral"}>
                {STATUS_LABELS[item.status]}
              </Badge>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-bold text-ink">
              {formatListingPrice(item.price, item.listingType)}
            </span>
            <span className="text-muted">{formatArea(item.areaSqft)}</span>
            <span className="text-muted">
              by {item.owner.name} ({item.owner.email})
            </span>
            <span className="text-muted">{formatRelative(item.createdAt)}</span>
          </div>

          {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

          {rejecting ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason shown to the owner…"
                className="max-w-sm"
                autoFocus
              />
              <Button
                variant="danger"
                size="sm"
                disabled={busy || reason.trim().length === 0}
                onClick={() => setStatus("REJECTED", reason.trim())}
              >
                Confirm rejection
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRejecting(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.status !== "APPROVED" && (
                <Button size="sm" onClick={() => setStatus("APPROVED")} disabled={busy}>
                  Approve
                </Button>
              )}
              {item.status !== "REJECTED" && (
                <Button variant="secondary" size="sm" onClick={() => setRejecting(true)} disabled={busy}>
                  Reject
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/dashboard/listings/${item.id}/edit`)}
                disabled={busy}
              >
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
                Delete spam
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
