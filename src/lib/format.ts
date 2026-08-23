/**
 * Indian-market money formatting: prices are quoted in crore/lakh, not millions.
 * ₹1,25,00,000 reads as "₹1.25 Cr".
 */
export function formatPrice(rupees: number): string {
  if (rupees >= 10_000_000) {
    return `₹${trim(rupees / 10_000_000)} Cr`;
  }
  if (rupees >= 100_000) {
    const lakh = rupees / 100_000;
    // Guard the boundary: ₹99,99,999 rounds to 100.00 lakh, and "₹100 L" reads
    // worse than "₹1 Cr" to anyone shopping in this price band.
    if (Number(lakh.toFixed(2)) >= 100) return "₹1 Cr";
    return `₹${trim(lakh)} L`;
  }
  return `₹${rupees.toLocaleString("en-IN")}`;
}

/** Rent is quoted per month; sale prices are absolute. */
export function formatListingPrice(rupees: number, listingType: "RENT" | "SALE"): string {
  return listingType === "RENT"
    ? `₹${rupees.toLocaleString("en-IN")}/mo`
    : formatPrice(rupees);
}

/** Drops a trailing ".00" but keeps meaningful decimals: 1.25 → "1.25", 2.00 → "2". */
function trim(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatArea(sqft: number): string {
  return `${sqft.toLocaleString("en-IN")} sq.ft`;
}

/** "3 BHK", or "Plot" style summary for area-only listings. */
export function formatConfig(bedrooms: number, type: string): string {
  if (type === "PLOT") return "Plot";
  if (type === "COMMERCIAL") return "Commercial space";
  return bedrooms > 0 ? `${bedrooms} BHK` : "Studio";
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatRelative(date: Date | string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const days = Math.floor(diffMs / 86_400_000);

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/**
 * URL-safe slug with a short random suffix, so two "2 BHK in Powai" listings
 * never collide on the unique index.
 */
export function slugify(input: string, suffix: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return `${base || "property"}-${suffix}`;
}
