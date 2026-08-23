import type { ListingStatus, ListingType, PropertyType, Role } from "@/generated/prisma/enums";

export const PROPERTY_TYPES = ["APARTMENT", "VILLA", "PLOT", "COMMERCIAL"] as const;
/** SALE first: "Buy" is the default intent on every property portal. */
export const LISTING_TYPES = ["SALE", "RENT"] as const;
export const LISTING_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SOLD",
  "INACTIVE",
] as const;
export const ROLES = ["BUYER", "OWNER", "AGENT", "ADMIN"] as const;

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: "Apartment",
  VILLA: "Villa / Independent House",
  PLOT: "Plot / Land",
  COMMERCIAL: "Commercial",
};

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  RENT: "For Rent",
  SALE: "For Sale",
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
  PENDING: "Pending review",
  APPROVED: "Live",
  REJECTED: "Rejected",
  SOLD: "Sold / Rented out",
  INACTIVE: "Inactive",
};

export const ROLE_LABELS: Record<Role, string> = {
  BUYER: "Buyer",
  OWNER: "Property owner",
  AGENT: "Agent",
  ADMIN: "Admin",
};

/** Cities offered in the search dropdown and the landing-page tiles. */
export const CITIES = [
  "Mumbai",
  "Bengaluru",
  "Delhi",
  "Gurgaon",
  "Noida",
  "Pune",
  "Hyderabad",
  "Chennai",
] as const;

export const AMENITIES = [
  "Lift",
  "Power Backup",
  "Covered Parking",
  "Swimming Pool",
  "Gymnasium",
  "Clubhouse",
  "Security",
  "Children's Play Area",
  "Park",
  "Gas Pipeline",
  "Rain Water Harvesting",
  "Vaastu Compliant",
] as const;

export const FURNISHING_OPTIONS = ["Unfurnished", "Semi-Furnished", "Fully Furnished"] as const;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const PAGE_SIZE = 9;

/** Property types where bedroom/bathroom counts are meaningless. */
export const AREA_ONLY_TYPES: PropertyType[] = ["PLOT", "COMMERCIAL"];
