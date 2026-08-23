"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { Role } from "@/generated/prisma/enums";

type NavItem = { href: string; label: string; roles: Role[] };

/**
 * One nav definition filtered by role, rather than three separate dashboards.
 * Adding a page means adding a line here — the routes enforce their own access.
 */
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", roles: ["BUYER", "OWNER", "AGENT", "ADMIN"] },
  { href: "/dashboard/saved", label: "Saved properties", roles: ["BUYER", "OWNER", "AGENT", "ADMIN"] },
  { href: "/dashboard/recent", label: "Recently viewed", roles: ["BUYER", "OWNER", "AGENT", "ADMIN"] },
  { href: "/dashboard/listings", label: "My listings", roles: ["OWNER", "AGENT", "ADMIN"] },
  { href: "/dashboard/enquiries", label: "Enquiries received", roles: ["OWNER", "AGENT", "ADMIN"] },
  { href: "/dashboard/admin", label: "Moderation queue", roles: ["ADMIN"] },
  { href: "/dashboard/admin/users", label: "Manage users", roles: ["ADMIN"] },
];

export function DashboardNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV.filter((item) => item.roles.includes(role));

  return (
    <nav aria-label="Dashboard" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {items.map((item) => {
        // Exact match for the index route; prefix match for nested sections, so
        // /dashboard/listings/new keeps "My listings" highlighted.
        const active =
          item.href === "/dashboard" || item.href === "/dashboard/admin"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-50 text-brand-800"
                : "text-slate-600 hover:bg-slate-100 hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
