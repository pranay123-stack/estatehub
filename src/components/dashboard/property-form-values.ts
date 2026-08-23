import { CITIES } from "@/lib/constants";
import type { UploadedImage } from "./image-uploader";
import type { PropertyType } from "@/generated/prisma/enums";

/**
 * Shape of the create/edit form's state.
 *
 * This lives in its own module — NOT in property-form.tsx — because that file
 * is a `"use client"` module. A Server Component importing a plain value from a
 * client module receives a client-reference proxy rather than the value itself,
 * so `{...emptyPropertyForm}` there would silently spread to an empty object.
 *
 * Every field is a string because every input is a string; the API coerces back
 * to numbers with Zod.
 */
export type PropertyFormValues = {
  id?: string;
  title: string;
  description: string;
  type: PropertyType;
  listingType: "RENT" | "SALE";
  price: string;
  deposit: string;
  city: string;
  locality: string;
  address: string;
  pincode: string;
  bedrooms: string;
  bathrooms: string;
  areaSqft: string;
  furnishing: string;
  floor: string;
  ageYears: string;
  amenities: string[];
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  images: UploadedImage[];
};

export const emptyPropertyForm: PropertyFormValues = {
  title: "",
  description: "",
  type: "APARTMENT",
  listingType: "SALE",
  price: "",
  deposit: "",
  city: CITIES[0],
  locality: "",
  address: "",
  pincode: "",
  bedrooms: "2",
  bathrooms: "2",
  areaSqft: "",
  furnishing: "",
  floor: "",
  ageYears: "",
  amenities: [],
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  images: [],
};
