"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import clsx from "clsx";
import {
  CITIES,
  LISTING_TYPES,
  LISTING_TYPE_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants";
import { Button } from "@/components/ui";

const BEDROOM_OPTIONS = [1, 2, 3, 4, 5];

/** Rent and sale need completely different price brackets. */
const PRICE_BRACKETS = {
  SALE: [
    { label: "Under ₹50 L", min: 0, max: 5_000_000 },
    { label: "₹50 L – ₹1 Cr", min: 5_000_000, max: 10_000_000 },
    { label: "₹1 Cr – ₹2 Cr", min: 10_000_000, max: 20_000_000 },
    { label: "₹2 Cr – ₹5 Cr", min: 20_000_000, max: 50_000_000 },
    { label: "Above ₹5 Cr", min: 50_000_000, max: undefined },
  ],
  RENT: [
    { label: "Under ₹25,000", min: 0, max: 25_000 },
    { label: "₹25,000 – ₹50,000", min: 25_000, max: 50_000 },
    { label: "₹50,000 – ₹1 L", min: 50_000, max: 100_000 },
    { label: "Above ₹1 L", min: 100_000, max: undefined },
  ],
} as const;

export function PropertyFilters({ resultCount }: { resultCount: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  /**
   * Every filter change rewrites the URL. Page resets to 1 because staying on
   * page 4 of a narrower result set would show an empty list.
   */
  const apply = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") params.delete(key);
        else params.set(key, value);
      }
      params.delete("page");

      router.push(`/properties?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const listingType = searchParams.get("listingType");
  const brackets = PRICE_BRACKETS[listingType === "RENT" ? "RENT" : "SALE"];
  const activeCount = ["city", "type", "listingType", "minPrice", "maxPrice", "bedrooms", "q"].filter(
    (key) => searchParams.get(key),
  ).length;

  return (
    <>
      {/* Mobile: filters collapse behind a toggle to keep results above the fold. */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <p className="text-sm text-muted">
          <strong className="text-ink">{resultCount}</strong> properties
        </p>
        <Button variant="secondary" size="sm" onClick={() => setMobileOpen((open) => !open)}>
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-700 px-1.5 text-xs text-white">{activeCount}</span>
          )}
        </Button>
      </div>

      <aside
        className={clsx(
          "rounded-card border border-line bg-surface p-5 lg:sticky lg:top-20 lg:block",
          mobileOpen ? "block" : "hidden",
        )}
        aria-label="Filters"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Filters</h2>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => router.push("/properties")}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="space-y-5">
          <FilterGroup label="Looking to">
            <div className="grid grid-cols-2 gap-2">
              {LISTING_TYPES.map((type) => (
                <Chip
                  key={type}
                  active={listingType === type}
                  // Clicking the active chip clears it, and the price bracket
                  // goes with it since brackets are listing-type specific.
                  onClick={() =>
                    apply({
                      listingType: listingType === type ? undefined : type,
                      minPrice: undefined,
                      maxPrice: undefined,
                    })
                  }
                >
                  {LISTING_TYPE_LABELS[type].replace("For ", "")}
                </Chip>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="City">
            <select
              value={searchParams.get("city") ?? ""}
              onChange={(event) => apply({ city: event.target.value })}
              className="w-full cursor-pointer rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
            >
              <option value="">All cities</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label="Property type">
            <div className="space-y-1.5">
              {PROPERTY_TYPES.map((type) => {
                const active = searchParams.get("type") === type;
                return (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => apply({ type: active ? undefined : type })}
                      className="h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-600"
                    />
                    {PROPERTY_TYPE_LABELS[type]}
                  </label>
                );
              })}
            </div>
          </FilterGroup>

          <FilterGroup label="Budget">
            <div className="space-y-1.5">
              {brackets.map((bracket) => {
                const active =
                  searchParams.get("minPrice") === String(bracket.min) &&
                  (searchParams.get("maxPrice") ?? "") === (bracket.max ? String(bracket.max) : "");
                return (
                  <label
                    key={bracket.label}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
                  >
                    <input
                      type="radio"
                      name="budget"
                      checked={active}
                      onChange={() =>
                        apply({
                          minPrice: String(bracket.min),
                          maxPrice: bracket.max ? String(bracket.max) : undefined,
                        })
                      }
                      className="h-4 w-4 border-line text-brand-700 focus:ring-brand-600"
                    />
                    {bracket.label}
                  </label>
                );
              })}
            </div>
          </FilterGroup>

          <FilterGroup label="Bedrooms">
            <div className="flex flex-wrap gap-2">
              {BEDROOM_OPTIONS.map((count) => {
                const active = searchParams.get("bedrooms") === String(count);
                return (
                  <Chip
                    key={count}
                    active={active}
                    onClick={() => apply({ bedrooms: active ? undefined : String(count) })}
                  >
                    {count}+ BHK
                  </Chip>
                );
              })}
            </div>
          </FilterGroup>
        </div>
      </aside>
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-4 first:border-0 first:pt-0">
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</h3>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-brand-700 bg-brand-50 text-brand-800"
          : "border-line bg-white text-slate-600 hover:border-slate-300",
      )}
    >
      {children}
    </button>
  );
}
