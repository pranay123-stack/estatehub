"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { STATUS_LABELS } from "@/lib/constants";
import { formatArea, formatDate, formatListingPrice } from "@/lib/format";
import type { ListingStatus, ListingType, PropertyType } from "@/generated/prisma/enums";

export type ListingRowData = {
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
  views: number;
  rejectionReason: string | null;
  createdAt: Date;
  images: { url: string }[];
  _count: { enquiries: number };
};

const STATUS_TONES = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
  SOLD: "neutral",
  INACTIVE: "neutral",
} as const;

/** A row in the seller's "My listings" table, with inline status actions. */
export function ListingRow({ listing }: { listing: ListingRowData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: ListingStatus) {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/properties/${listing.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setBusy(false);
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Could not update the listing.");
      return;
    }
    router.refresh();
  }

  async function remove() {
    // Deleting cascades to images, favourites and enquiries — worth a confirm.
    if (!window.confirm(`Delete “${listing.title}”? This cannot be undone.`)) return;

    setBusy(true);
    setError(null);

    const response = await fetch(`/api/properties/${listing.id}`, { method: "DELETE" });

    setBusy(false);
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Could not delete the listing.");
      return;
    }
    router.refresh();
  }

  const cover = listing.images[0];

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
                href={`/properties/${listing.slug}`}
                className="line-clamp-1 font-semibold text-ink hover:text-brand-700"
              >
                {listing.title}
              </Link>
              <p className="mt-0.5 text-sm text-muted">
                {listing.locality}, {listing.city} · {formatArea(listing.areaSqft)}
              </p>
            </div>
            <Badge tone={STATUS_TONES[listing.status]}>{STATUS_LABELS[listing.status]}</Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-bold text-ink">
              {formatListingPrice(listing.price, listing.listingType)}
            </span>
            <span className="text-muted">{listing.views} views</span>
            <span className="text-muted">
              {listing._count.enquiries} {listing._count.enquiries === 1 ? "enquiry" : "enquiries"}
            </span>
            <span className="text-muted">Posted {formatDate(listing.createdAt)}</span>
          </div>

          {listing.status === "REJECTED" && listing.rejectionReason && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              Rejected: {listing.rejectionReason}
            </p>
          )}

          {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/dashboard/listings/${listing.id}/edit`)}
              disabled={busy}
            >
              Edit
            </Button>

            {listing.status === "APPROVED" && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setStatus("SOLD")} disabled={busy}>
                  Mark as sold
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setStatus("INACTIVE")} disabled={busy}>
                  Deactivate
                </Button>
              </>
            )}

            {(listing.status === "INACTIVE" || listing.status === "SOLD") && (
              <Button variant="secondary" size="sm" onClick={() => setStatus("APPROVED")} disabled={busy}>
                Re-activate
              </Button>
            )}

            <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
