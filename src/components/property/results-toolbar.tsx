"use client";

import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { SORT_OPTIONS } from "@/lib/constants";

/** Result count + sort select + grid/list toggle. All state lives in the URL. */
export function ResultsToolbar({
  total,
  layout,
}: {
  total: number;
  layout: "grid" | "list";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "view") params.delete("page");
    router.push(`/properties?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="hidden text-sm text-muted lg:block">
        <strong className="text-ink">{total.toLocaleString("en-IN")}</strong>{" "}
        {total === 1 ? "property" : "properties"} found
      </p>

      <div className="ml-auto flex items-center gap-2">
        <label htmlFor="sort" className="text-sm text-muted">
          Sort
        </label>
        <select
          id="sort"
          value={searchParams.get("sort") ?? "newest"}
          onChange={(event) => update("sort", event.target.value)}
          className="cursor-pointer rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium focus:border-brand-600 focus:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="hidden rounded-lg border border-line bg-white p-0.5 sm:flex">
          <ViewButton active={layout === "grid"} onClick={() => update("view", "grid")} label="Grid view">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </ViewButton>
          <ViewButton active={layout === "list"} onClick={() => update("view", "list")} label="List view">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </ViewButton>
        </div>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={clsx(
        "grid h-8 w-8 place-items-center rounded-md transition-colors",
        active ? "bg-brand-700 text-white" : "text-slate-500 hover:bg-slate-100",
      )}
    >
      {children}
    </button>
  );
}
