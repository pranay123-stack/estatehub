import Link from "next/link";
import { CITIES } from "@/lib/constants";
import { SectionHeading } from "@/components/ui";

/**
 * City tiles. Counts come from a groupBy on live listings, so a city with no
 * inventory still renders (with "Coming soon") rather than disappearing and
 * making the grid look broken.
 */
export function PopularCities({ counts }: { counts: { city: string; count: number }[] }) {
  const lookup = new Map(counts.map((row) => [row.city, row.count]));

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Explore"
        title="Popular cities"
        description="Browse live inventory in India's most active property markets."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CITIES.map((city) => {
          const count = lookup.get(city) ?? 0;
          return (
            <Link
              key={city}
              href={`/properties?city=${encodeURIComponent(city)}`}
              className="group relative overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <span
                aria-hidden="true"
                className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand-50 transition-transform group-hover:scale-125"
              />
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" className="mb-3 h-6 w-6 text-brand-700" aria-hidden="true">
                  <path d="M3 21h18M5 21V8l5-3v16M14 21V11l5-2.5V21" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M8 11h.01M8 14h.01M17 14h.01M17 17h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <p className="font-semibold text-ink">{city}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {count > 0 ? `${count} ${count === 1 ? "property" : "properties"}` : "Coming soon"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
