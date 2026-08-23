import { SearchBar } from "@/components/property/search-bar";

export function Hero({ stats }: { stats: { listings: number; cities: number } }) {
  return (
    <section className="relative overflow-hidden bg-brand-900">
      {/* Decorative gradient wash — cheaper than a hero photo and never blocks
          LCP with a multi-hundred-KB image download. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--color-brand-700),transparent_60%),radial-gradient(ellipse_at_bottom_left,var(--color-brand-800),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.15] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:56px_56px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 ring-1 ring-inset ring-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            {stats.listings.toLocaleString("en-IN")} verified listings across {stats.cities} cities
          </p>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Find a place you&apos;ll
            <span className="text-accent-400"> actually want</span> to live in
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-100 sm:text-lg">
            Apartments, villas, plots and commercial spaces — listed directly by owners and trusted
            agents. No hidden brokerage on owner listings.
          </p>

          <div className="mt-8 max-w-2xl">
            <SearchBar />
          </div>
        </div>
      </div>
    </section>
  );
}
