import { z } from "zod";
import { AMENITIES, LISTING_STATUSES, LISTING_TYPES, PROPERTY_TYPES } from "@/lib/constants";

const positiveInt = (label: string) =>
  z.coerce.number<number>().int(`${label} must be a whole number`).nonnegative();

export const propertyInputSchema = z
  .object({
    title: z.string().trim().min(10, "Title must be at least 10 characters").max(120),
    description: z.string().trim().min(30, "Describe the property in at least 30 characters").max(4000),

    type: z.enum(PROPERTY_TYPES),
    listingType: z.enum(LISTING_TYPES),

    price: z.coerce.number<number>().int().positive("Enter a price greater than zero").max(2_000_000_000),
    deposit: z.coerce.number<number>().int().nonnegative().max(2_000_000_000).optional().nullable(),

    city: z.string().trim().min(2, "City is required").max(60),
    locality: z.string().trim().min(2, "Locality is required").max(80),
    address: z.string().trim().max(200).optional().or(z.literal("")),
    pincode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Pincode must be 6 digits")
      .optional()
      .or(z.literal("")),

    bedrooms: positiveInt("Bedrooms").max(20).default(0),
    bathrooms: positiveInt("Bathrooms").max(20).default(0),
    areaSqft: z.coerce.number<number>().int().positive("Enter the built-up area").max(1_000_000),
    furnishing: z.string().trim().max(40).optional().or(z.literal("")),
    floor: z.string().trim().max(40).optional().or(z.literal("")),
    ageYears: z.coerce.number<number>().int().nonnegative().max(100).optional().nullable(),

    amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length).default([]),

    contactName: z.string().trim().min(2, "Contact name is required").max(80),
    contactPhone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{8,16}$/, "Enter a valid contact number"),
    contactEmail: z.email("Enter a valid email").optional().or(z.literal("")),

    /** Ordered gallery. Index 0 becomes the cover image. */
    images: z
      .array(
        z.object({
          url: z.string().min(1),
          storageKey: z.string().optional().nullable(),
          alt: z.string().max(120).optional().nullable(),
        }),
      )
      .max(12, "You can upload up to 12 images")
      .default([]),
  })
  .refine((data) => data.listingType === "SALE" || data.deposit == null || data.deposit >= 0, {
    message: "Deposit cannot be negative",
    path: ["deposit"],
  });

export type PropertyInput = z.infer<typeof propertyInputSchema>;

/** Admin moderation payload. */
export const statusUpdateSchema = z.object({
  status: z.enum(LISTING_STATUSES),
  rejectionReason: z.string().trim().max(300).optional().or(z.literal("")),
});

/**
 * Search/filter parameters. Everything arrives as a string from the URL, so
 * each field coerces and silently drops invalid values rather than erroring —
 * a hand-edited query string should degrade, not 500.
 */
export const searchParamsSchema = z.object({
  q: z.string().trim().max(80).optional(),
  city: z.string().trim().max(60).optional(),
  type: z.enum(PROPERTY_TYPES).optional().catch(undefined),
  listingType: z.enum(LISTING_TYPES).optional().catch(undefined),
  minPrice: z.coerce.number<number>().int().nonnegative().optional().catch(undefined),
  maxPrice: z.coerce.number<number>().int().nonnegative().optional().catch(undefined),
  bedrooms: z.coerce.number<number>().int().min(0).max(20).optional().catch(undefined),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest").catch("newest"),
  page: z.coerce.number<number>().int().min(1).default(1).catch(1),
});

export type PropertySearchParams = z.infer<typeof searchParamsSchema>;
