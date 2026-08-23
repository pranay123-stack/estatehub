import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Badge } from "@/components/ui";
import { FavoriteButton } from "./favorite-button";
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { formatArea, formatConfig, formatListingPrice, formatRelative } from "@/lib/format";
import type { PropertyCardData } from "@/lib/queries/properties";

export function PropertyCard({
  property,
  isFavorite = false,
  showFavorite = true,
  layout = "grid",
}: {
  property: PropertyCardData;
  isFavorite?: boolean;
  showFavorite?: boolean;
  /** "list" renders the image beside the details for the list view toggle. */
  layout?: "grid" | "list";
}) {
  const cover = property.images[0];
  const isList = layout === "list";

  return (
    <article
      className={clsx(
        "group relative overflow-hidden rounded-card border border-line bg-surface shadow-card transition-shadow hover:shadow-card-hover",
        isList && "sm:flex",
      )}
    >
      <div className={clsx("relative shrink-0 bg-slate-100", isList ? "sm:w-72" : "")}>
        <Link href={`/properties/${property.slug}`} className="block" tabIndex={-1} aria-hidden="true">
          <div className={clsx("relative", isList ? "aspect-4/3 sm:h-full sm:aspect-auto" : "aspect-4/3")}>
            {cover ? (
              <Image
                src={cover.url}
                alt={cover.alt ?? property.title}
                fill
                // Grid is 3-up on desktop, so never request a full-width image.
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full place-items-center text-slate-300">
                <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m3 15 5-4 4 3 3-2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        </Link>

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone="brand">{LISTING_TYPE_LABELS[property.listingType]}</Badge>
          {property.featured && <Badge tone="accent">Featured</Badge>}
        </div>

        {showFavorite && (
          <div className="absolute right-3 top-3">
            <FavoriteButton propertyId={property.id} initialSaved={isFavorite} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-bold tracking-tight text-ink">
            {formatListingPrice(property.price, property.listingType)}
          </p>
          <span className="mt-1 shrink-0 text-xs text-muted">{formatRelative(property.createdAt)}</span>
        </div>

        {/* The whole card is clickable via this stretched link, so the markup
            stays a single accessible link instead of nested interactive areas. */}
        <h3 className="mt-1.5 text-sm font-semibold leading-snug text-ink">
          <Link href={`/properties/${property.slug}`} className="line-clamp-2 before:absolute before:inset-0">
            {property.title}
          </Link>
        </h3>

        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
            <path
              d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <span className="line-clamp-1">
            {property.locality}, {property.city}
          </span>
        </p>

        <dl className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-slate-600 [&>div]:flex [&>div]:items-center [&>div]:gap-1">
          <div>
            <dt className="sr-only">Configuration</dt>
            <dd className="font-semibold text-ink">{formatConfig(property.bedrooms, property.type)}</dd>
          </div>
          {property.bathrooms > 0 && (
            <div>
              <dt className="sr-only">Bathrooms</dt>
              <dd>{property.bathrooms} bath</dd>
            </div>
          )}
          <div>
            <dt className="sr-only">Area</dt>
            <dd>{formatArea(property.areaSqft)}</dd>
          </div>
          <div className="ml-auto">
            <dt className="sr-only">Property type</dt>
            <dd className="text-muted">{PROPERTY_TYPE_LABELS[property.type]}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
