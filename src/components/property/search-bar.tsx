"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CITIES, LISTING_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui";

/**
 * Hero search. Submits by building a URL — /properties is a Server Component
 * that reads everything from searchParams, so the result page is shareable,
 * bookmarkable and server-rendered for SEO.
 */
export function SearchBar() {
  const router = useRouter();
  const [listingType, setListingType] = useState<"RENT" | "SALE">("SALE");
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const params = new URLSearchParams({ listingType });
    if (city) params.set("city", city);
    if (query.trim()) params.set("q", query.trim());

    router.push(`/properties?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div
        role="tablist"
        aria-label="Listing type"
        className="mb-0 flex w-fit gap-1 rounded-t-xl bg-white/15 p-1 backdrop-blur"
      >
        {LISTING_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={listingType === type}
            onClick={() => setListingType(type)}
            className={
              listingType === type
                ? "rounded-lg bg-white px-5 py-2 text-sm font-bold text-brand-800"
                : "rounded-lg px-5 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
            }
          >
            {type === "SALE" ? "Buy" : "Rent"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-b-xl rounded-tr-xl bg-white p-2 shadow-pop sm:flex-row">
        <label className="sr-only" htmlFor="hero-city">
          City
        </label>
        <select
          id="hero-city"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          className="cursor-pointer rounded-lg border-0 bg-slate-50 px-3 py-3 text-sm font-medium text-ink focus:ring-2 focus:ring-brand-600/20 sm:w-44"
        >
          <option value="">All cities</option>
          {CITIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="hero-query">
          Search by locality, project or landmark
        </label>
        <input
          id="hero-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search locality, project or landmark…"
          className="min-w-0 flex-1 rounded-lg border-0 px-3 py-3 text-sm text-ink placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600/20"
        />

        <Button type="submit" size="lg" className="shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Search
        </Button>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/70">
        <span>Popular:</span>
        {CITIES.slice(0, 4).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setCity(option)}
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
          >
            {option}
          </button>
        ))}
      </p>
    </form>
  );
}
