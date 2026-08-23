import { describe, expect, it } from "vitest";
import {
  formatArea,
  formatConfig,
  formatListingPrice,
  formatPrice,
  formatRelative,
  slugify,
} from "./format";

describe("formatPrice", () => {
  it("renders crore for values at or above 1,00,00,000", () => {
    expect(formatPrice(10_000_000)).toBe("₹1 Cr");
    expect(formatPrice(12_500_000)).toBe("₹1.25 Cr");
    expect(formatPrice(78_000_000)).toBe("₹7.8 Cr");
  });

  it("renders lakh between 1,00,000 and 1 crore", () => {
    expect(formatPrice(100_000)).toBe("₹1 L");
    expect(formatPrice(7_800_000)).toBe("₹78 L");
  });

  it("falls back to grouped rupees below a lakh", () => {
    // Indian digit grouping, not the western thousands separator.
    expect(formatPrice(45_000)).toBe("₹45,000");
  });

  it("trims trailing zeros but keeps meaningful decimals", () => {
    expect(formatPrice(20_000_000)).toBe("₹2 Cr");
    expect(formatPrice(21_500_000)).toBe("₹2.15 Cr");
  });

  it("handles the exact crore/lakh boundaries", () => {
    // Rounds to 100.00 lakh — promoted to crore rather than shown as "₹100 L".
    expect(formatPrice(9_999_999)).toBe("₹1 Cr");
    expect(formatPrice(9_949_999)).toBe("₹99.5 L");
    expect(formatPrice(99_999)).toBe("₹99,999");
  });
});

describe("formatListingPrice", () => {
  it("quotes rent per month and sale as an absolute figure", () => {
    expect(formatListingPrice(45_000, "RENT")).toBe("₹45,000/mo");
    expect(formatListingPrice(12_500_000, "SALE")).toBe("₹1.25 Cr");
  });

  it("does not abbreviate rent, however large", () => {
    // A ₹1.85 L rent should read as a rent, not as a sale price.
    expect(formatListingPrice(185_000, "RENT")).toBe("₹1,85,000/mo");
  });
});

describe("formatConfig", () => {
  it("describes bedroom counts as BHK", () => {
    expect(formatConfig(3, "APARTMENT")).toBe("3 BHK");
  });

  it("calls a zero-bedroom home a studio", () => {
    expect(formatConfig(0, "APARTMENT")).toBe("Studio");
  });

  it("ignores bedrooms for area-only property types", () => {
    expect(formatConfig(0, "PLOT")).toBe("Plot");
    expect(formatConfig(3, "PLOT")).toBe("Plot");
    expect(formatConfig(0, "COMMERCIAL")).toBe("Commercial space");
  });
});

describe("formatArea", () => {
  it("groups digits Indian-style and appends the unit", () => {
    expect(formatArea(1650)).toBe("1,650 sq.ft");
    expect(formatArea(100000)).toBe("1,00,000 sq.ft");
  });
});

describe("formatRelative", () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

  it("labels today and yesterday by name", () => {
    expect(formatRelative(new Date())).toBe("Today");
    expect(formatRelative(daysAgo(1))).toBe("Yesterday");
  });

  it("escalates through days, months and years", () => {
    expect(formatRelative(daysAgo(5))).toBe("5 days ago");
    expect(formatRelative(daysAgo(60))).toBe("2 months ago");
    expect(formatRelative(daysAgo(400))).toBe("1 years ago");
  });

  it("treats a future date as today rather than going negative", () => {
    expect(formatRelative(new Date(Date.now() + 86_400_000))).toBe("Today");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates, then appends the suffix", () => {
    expect(slugify("Spacious 3 BHK in Powai", "abc123")).toBe(
      "spacious-3-bhk-in-powai-abc123",
    );
  });

  it("strips punctuation and collapses separator runs", () => {
    expect(slugify("Villa — with  private garden!!", "x1")).toBe(
      "villa-with-private-garden-x1",
    );
  });

  it("never emits leading or trailing hyphens before the suffix", () => {
    expect(slugify("  ...Plot...  ", "x1")).toBe("plot-x1");
  });

  it("falls back to a stable base when nothing survives", () => {
    // Guarantees the unique index still gets a usable slug.
    expect(slugify("!!!", "x1")).toBe("property-x1");
    expect(slugify("आवास", "x1")).toBe("property-x1");
  });

  it("caps the base length so long titles cannot overflow", () => {
    const slug = slugify("a".repeat(200), "x1");
    expect(slug).toBe(`${"a".repeat(70)}-x1`);
  });
});
