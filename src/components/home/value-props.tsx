const ITEMS = [
  {
    title: "Verified listings only",
    body: "Every listing is reviewed by our team before it goes live, so you never chase a property that was let out weeks ago.",
    icon: (
      <path d="m9 12 2 2 4-4M12 3l7.5 3v6c0 4.5-3 7.9-7.5 9-4.5-1.1-7.5-4.5-7.5-9V6L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    title: "Talk to owners directly",
    body: "Owner listings carry no brokerage. Contact details are shown up front — no gated phone numbers, no callback queues.",
    icon: (
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    ),
  },
  {
    title: "Filters that mean something",
    body: "Budget brackets tuned separately for rent and sale, real BHK counts, and area in sq.ft. Sort and share any search as a link.",
    icon: (
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    ),
  },
];

export function ValueProps() {
  return (
    <section className="border-y border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        {ITEMS.map((item) => (
          <div key={item.title} className="flex gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                {item.icon}
              </svg>
            </span>
            <div>
              <h3 className="font-semibold text-ink">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
