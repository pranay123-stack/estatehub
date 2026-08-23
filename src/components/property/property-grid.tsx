import clsx from "clsx";
import { PropertyCard } from "./property-card";
import type { PropertyCardData } from "@/lib/queries/properties";

export function PropertyGrid({
  properties,
  favoriteIds = new Set<string>(),
  layout = "grid",
  columns = 3,
}: {
  properties: PropertyCardData[];
  /** Ids the signed-in user has already saved, so hearts render pre-filled. */
  favoriteIds?: Set<string>;
  layout?: "grid" | "list";
  columns?: 2 | 3;
}) {
  return (
    <div
      className={clsx(
        "grid gap-5",
        layout === "list"
          ? "grid-cols-1"
          : columns === 2
            ? "sm:grid-cols-2"
            : "sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          layout={layout}
          isFavorite={favoriteIds.has(property.id)}
        />
      ))}
    </div>
  );
}
