import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/guards";
import { getPropertyBySlug, getSimilarProperties } from "@/lib/queries/properties";
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { formatArea, formatConfig, formatDate, formatListingPrice, formatPrice } from "@/lib/format";
import { PropertyGallery } from "@/components/property/property-gallery";
import { ContactSeller } from "@/components/property/contact-seller";
import { FavoriteButton } from "@/components/property/favorite-button";
import { PropertyGrid } from "@/components/property/property-grid";
import { Badge, Card, SectionHeading } from "@/components/ui";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  if (!property || property.status !== "APPROVED") {
    return { title: "Property not found", robots: { index: false } };
  }

  const price = formatListingPrice(property.price, property.listingType);
  const description = `${formatConfig(property.bedrooms, property.type)} ${PROPERTY_TYPE_LABELS[property.type].toLowerCase()} ${LISTING_TYPE_LABELS[property.listingType].toLowerCase()} in ${property.locality}, ${property.city}. ${formatArea(property.areaSqft)} at ${price}.`;

  return {
    title: property.title,
    description,
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: {
      title: property.title,
      description,
      images: property.images[0] ? [{ url: property.images[0].url }] : undefined,
      type: "article",
    },
  };
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  if (!property) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === property.ownerId;
  const isAdmin = user?.role === "ADMIN";

  // Unapproved listings stay visible to their owner (to preview) and to admins
  // (to moderate), but 404 for everyone else.
  if (property.status !== "APPROVED" && !isOwner && !isAdmin) notFound();

  const [similar, favorite] = await Promise.all([
    getSimilarProperties(
      { id: property.id, city: property.city, listingType: property.listingType },
      3,
    ),
    user
      ? prisma.favorite.findUnique({
          where: { userId_propertyId: { userId: user.id, propertyId: property.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  // Fire-and-forget analytics: a view counter must never delay the render or
  // fail the request.
  recordView(property.id, user?.id);

  /** JSON-LD so search engines can render a rich listing result. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description.slice(0, 300),
    url: `/properties/${property.slug}`,
    datePosted: property.createdAt.toISOString(),
    image: property.images.map((image) => image.url),
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address ?? property.locality,
      addressLocality: property.city,
      postalCode: property.pincode ?? undefined,
      addressCountry: "IN",
    },
  };

  const details = [
    { label: "Configuration", value: formatConfig(property.bedrooms, property.type) },
    { label: "Bathrooms", value: property.bathrooms > 0 ? String(property.bathrooms) : "—" },
    { label: "Built-up area", value: formatArea(property.areaSqft) },
    { label: "Property type", value: PROPERTY_TYPE_LABELS[property.type] },
    { label: "Furnishing", value: property.furnishing ?? "—" },
    { label: "Floor", value: property.floor ?? "—" },
    {
      label: "Age of property",
      value: property.ageYears === null ? "—" : property.ageYears === 0 ? "New construction" : `${property.ageYears} years`,
    },
    { label: "Posted on", value: formatDate(property.createdAt) },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <Link href="/" className="hover:text-brand-700">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/properties" className="hover:text-brand-700">Properties</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/properties?city=${encodeURIComponent(property.city)}`} className="hover:text-brand-700">
            {property.city}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="line-clamp-1 text-ink">{property.locality}</span>
        </nav>

        {property.status !== "APPROVED" && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            This listing is <strong>{property.status.toLowerCase()}</strong> and is not visible to the
            public.
            {property.rejectionReason && <> Reason: {property.rejectionReason}</>}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            <PropertyGallery images={property.images} title={property.title} />

            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <Badge tone="brand">{LISTING_TYPE_LABELS[property.listingType]}</Badge>
                  <Badge>{PROPERTY_TYPE_LABELS[property.type]}</Badge>
                  {property.featured && <Badge tone="accent">Featured</Badge>}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{property.title}</h1>
                <p className="mt-1.5 flex items-center gap-1.5 text-muted">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" stroke="currentColor" strokeWidth="1.6" />
                    <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                  {property.address ? `${property.address}, ` : ""}
                  {property.locality}, {property.city}
                  {property.pincode ? ` – ${property.pincode}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <FavoriteButton propertyId={property.id} initialSaved={Boolean(favorite)} size="lg" />
              </div>
            </div>

            <Card className="mt-6 p-5">
              <h2 className="mb-4 font-semibold text-ink">Property details</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {details.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">{item.label}</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="mt-5 p-5">
              <h2 className="mb-3 font-semibold text-ink">About this property</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {property.description}
              </p>
            </Card>

            {property.amenities.length > 0 && (
              <Card className="mt-5 p-5">
                <h2 className="mb-3 font-semibold text-ink">Amenities</h2>
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {property.amenities.map((amenity) => (
                    <li key={amenity} className="flex items-center gap-2 text-sm text-slate-700">
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                        <path d="m8.5 12 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {amenity}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* Sticky sidebar keeps price and the contact form in view while the
              buyer scrolls through details on desktop. */}
          <aside className="lg:sticky lg:top-20 lg:h-fit">
            <Card className="p-5">
              <p className="text-3xl font-bold tracking-tight text-ink">
                {formatListingPrice(property.price, property.listingType)}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {formatPrice(Math.round(property.price / property.areaSqft))} per sq.ft
                {property.deposit ? ` · ${formatPrice(property.deposit)} deposit` : ""}
              </p>

              <hr className="my-4 border-line" />

              {isOwner ? (
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-muted">
                  This is your listing.{" "}
                  <Link href={`/dashboard/listings/${property.id}/edit`} className="font-semibold text-brand-700 hover:underline">
                    Edit it
                  </Link>{" "}
                  or view enquiries from your{" "}
                  <Link href="/dashboard/listings" className="font-semibold text-brand-700 hover:underline">
                    dashboard
                  </Link>
                  .
                </div>
              ) : (
                <ContactSeller
                  propertyId={property.id}
                  contactName={property.contactName}
                  contactPhone={property.contactPhone}
                  defaults={{ name: user?.name, email: user?.email }}
                />
              )}
            </Card>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-14">
            <SectionHeading
              title={`Similar properties in ${property.city}`}
              description="Other listings buyers viewed alongside this one."
            />
            <PropertyGrid properties={similar} />
          </section>
        )}
      </div>
    </>
  );
}

/**
 * Bumps the view counter and records the buyer's "recently viewed" entry.
 * Intentionally not awaited by the page — errors are swallowed so a logging
 * failure can never break the listing render.
 */
function recordView(propertyId: string, userId?: string) {
  void prisma.property
    .update({ where: { id: propertyId }, data: { views: { increment: 1 } } })
    .catch(() => undefined);

  if (!userId) return;

  void prisma.recentView
    .upsert({
      where: { userId_propertyId: { userId, propertyId } },
      create: { userId, propertyId },
      update: { viewedAt: new Date() },
    })
    .catch(() => undefined);
}
