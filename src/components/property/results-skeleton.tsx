/** Placeholder shown while the search query resolves. */
export function ResultsSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-card border border-line bg-white">
          <div className="aspect-4/3 animate-pulse bg-slate-200" />
          <div className="space-y-2 p-4">
            <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
