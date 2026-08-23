import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth";
import { propertyInputSchema, searchParamsSchema, statusUpdateSchema } from "./property";
import { enquirySchema } from "./enquiry";

/** Minimal payload that satisfies propertyInputSchema. */
const validProperty = {
  title: "Spacious 3 BHK with lake view in Powai",
  description: "A bright, cross-ventilated home with a wide balcony and morning sun.",
  type: "APARTMENT",
  listingType: "SALE",
  price: 12_500_000,
  city: "Mumbai",
  locality: "Powai",
  areaSqft: 1650,
  contactName: "Rohan Mehta",
  contactPhone: "+91 98200 10002",
};

describe("registerSchema", () => {
  it("accepts a valid buyer signup", () => {
    const parsed = registerSchema.parse({
      name: "Karan Malhotra",
      email: "Karan@Example.com",
      password: "Password123",
    });
    expect(parsed.role).toBe("BUYER");
    // Emails are lowercased so the unique index cannot be bypassed by casing.
    expect(parsed.email).toBe("karan@example.com");
  });

  it("refuses ADMIN as a self-assigned role", () => {
    // This is the privilege-escalation guard — it must never be relaxed.
    const result = registerSchema.safeParse({ ...validProperty, name: "X Y", email: "a@b.com", password: "Password123", role: "ADMIN" });
    expect(result.success).toBe(false);
  });

  it("allows OWNER and AGENT", () => {
    for (const role of ["OWNER", "AGENT"] as const) {
      const result = registerSchema.safeParse({ name: "X Y", email: "a@b.com", password: "Password123", role });
      expect(result.success).toBe(true);
    }
  });

  it("rejects short passwords and malformed emails", () => {
    expect(registerSchema.safeParse({ name: "X Y", email: "a@b.com", password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "X Y", email: "not-an-email", password: "Password123" }).success).toBe(false);
  });

  it("rejects a one-character name", () => {
    expect(registerSchema.safeParse({ name: "X", email: "a@b.com", password: "Password123" }).success).toBe(false);
  });

  it("accepts an empty phone but rejects a malformed one", () => {
    expect(registerSchema.safeParse({ name: "X Y", email: "a@b.com", password: "Password123", phone: "" }).success).toBe(true);
    expect(registerSchema.safeParse({ name: "X Y", email: "a@b.com", password: "Password123", phone: "abc" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("normalises the email and requires a password", () => {
    expect(loginSchema.parse({ email: "A@B.com", password: "x" }).email).toBe("a@b.com");
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("propertyInputSchema", () => {
  it("accepts a well-formed listing and applies defaults", () => {
    const parsed = propertyInputSchema.parse(validProperty);
    expect(parsed.amenities).toEqual([]);
    expect(parsed.images).toEqual([]);
    expect(parsed.bedrooms).toBe(0);
  });

  it("coerces numeric strings, because every form field arrives as a string", () => {
    const parsed = propertyInputSchema.parse({
      ...validProperty,
      price: "12500000",
      areaSqft: "1650",
      bedrooms: "3",
    });
    expect(parsed.price).toBe(12_500_000);
    expect(parsed.areaSqft).toBe(1650);
    expect(parsed.bedrooms).toBe(3);
  });

  it("rejects a zero or negative price", () => {
    expect(propertyInputSchema.safeParse({ ...validProperty, price: 0 }).success).toBe(false);
    expect(propertyInputSchema.safeParse({ ...validProperty, price: -1 }).success).toBe(false);
  });

  it("rejects a too-short title or description", () => {
    expect(propertyInputSchema.safeParse({ ...validProperty, title: "2 BHK" }).success).toBe(false);
    expect(propertyInputSchema.safeParse({ ...validProperty, description: "Nice flat" }).success).toBe(false);
  });

  it("rejects an unknown property or listing type", () => {
    expect(propertyInputSchema.safeParse({ ...validProperty, type: "CASTLE" }).success).toBe(false);
    expect(propertyInputSchema.safeParse({ ...validProperty, listingType: "LEASE" }).success).toBe(false);
  });

  it("rejects an amenity outside the known list", () => {
    expect(propertyInputSchema.safeParse({ ...validProperty, amenities: ["Helipad"] }).success).toBe(false);
    expect(propertyInputSchema.safeParse({ ...validProperty, amenities: ["Lift"] }).success).toBe(true);
  });

  it("enforces the 6-digit pincode format but allows it to be blank", () => {
    expect(propertyInputSchema.safeParse({ ...validProperty, pincode: "400076" }).success).toBe(true);
    expect(propertyInputSchema.safeParse({ ...validProperty, pincode: "" }).success).toBe(true);
    expect(propertyInputSchema.safeParse({ ...validProperty, pincode: "4007" }).success).toBe(false);
  });

  it("caps the gallery at 12 images", () => {
    const image = { url: "/api/files/a.jpg" };
    expect(propertyInputSchema.safeParse({ ...validProperty, images: Array(12).fill(image) }).success).toBe(true);
    expect(propertyInputSchema.safeParse({ ...validProperty, images: Array(13).fill(image) }).success).toBe(false);
  });

  it("rejects a negative deposit", () => {
    expect(
      propertyInputSchema.safeParse({ ...validProperty, listingType: "RENT", price: 45000, deposit: -1 }).success,
    ).toBe(false);
  });
});

describe("searchParamsSchema", () => {
  it("applies defaults when nothing is supplied", () => {
    const parsed = searchParamsSchema.parse({});
    expect(parsed.sort).toBe("newest");
    expect(parsed.page).toBe(1);
  });

  it("coerces query-string numbers", () => {
    const parsed = searchParamsSchema.parse({ minPrice: "500000", bedrooms: "3", page: "4" });
    expect(parsed).toMatchObject({ minPrice: 500_000, bedrooms: 3, page: 4 });
  });

  it("silently drops junk rather than throwing", () => {
    // A hand-edited URL must degrade to a valid search, never a 500.
    const parsed = searchParamsSchema.parse({
      type: "NONSENSE",
      listingType: "???",
      sort: "sideways",
      page: "abc",
      minPrice: "-99",
    });
    expect(parsed.type).toBeUndefined();
    expect(parsed.listingType).toBeUndefined();
    expect(parsed.sort).toBe("newest");
    expect(parsed.page).toBe(1);
    expect(parsed.minPrice).toBeUndefined();
  });

  it("keeps valid enum values intact", () => {
    const parsed = searchParamsSchema.parse({ type: "VILLA", listingType: "RENT", sort: "price_desc" });
    expect(parsed).toMatchObject({ type: "VILLA", listingType: "RENT", sort: "price_desc" });
  });
});

describe("statusUpdateSchema", () => {
  it("accepts every listing status", () => {
    for (const status of ["PENDING", "APPROVED", "REJECTED", "SOLD", "INACTIVE"]) {
      expect(statusUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejects an unknown status", () => {
    expect(statusUpdateSchema.safeParse({ status: "DELETED" }).success).toBe(false);
  });
});

describe("enquirySchema", () => {
  const valid = {
    propertyId: "abc123",
    name: "Anon Buyer",
    email: "anon@example.com",
    phone: "+919812345678",
    message: "Is this still available for viewing this weekend?",
  };

  it("accepts a complete enquiry", () => {
    expect(enquirySchema.safeParse(valid).success).toBe(true);
  });

  it("requires a message of real substance", () => {
    expect(enquirySchema.safeParse({ ...valid, message: "hi" }).success).toBe(false);
  });

  it("rejects a malformed phone or email", () => {
    expect(enquirySchema.safeParse({ ...valid, phone: "call me" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });
});
