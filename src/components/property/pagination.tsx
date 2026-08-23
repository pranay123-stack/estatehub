import Link from "next/link";
import clsx from "clsx";

/**
 * Server-rendered pagination — plain links, so crawlers can walk the full
 * catalogue and the back button behaves.
 */
export function Pagination({
  page,
  pageCount,
  searchParams,
}: {
  page: number;
  pageCount: number;
  searchParams: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  function hrefFor(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `/properties?${query}` : "/properties";
  }

  // Window of pages around the current one, so 200 pages don't render 200 links.
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => start + index);

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
          Previous
        </Link>
      )}

      {pages.map((target) => (
        <Link
          key={target}
          href={hrefFor(target)}
          aria-current={target === page ? "page" : undefined}
          className={clsx(
            "grid h-10 min-w-10 place-items-center rounded-lg border px-3 text-sm font-medium transition-colors",
            target === page
              ? "border-brand-700 bg-brand-700 text-white"
              : "border-line bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          {target}
        </Link>
      ))}

      {page < pageCount && (
        <Link href={hrefFor(page + 1)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
          Next
        </Link>
      )}
    </nav>
  );
}
