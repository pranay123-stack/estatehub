import Link from "next/link";
import { CITIES, PROPERTY_TYPE_LABELS, PROPERTY_TYPES } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-white">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="font-bold tracking-tight">
                Estate<span className="text-brand-700">Hub</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted">
              Find your next home, plot or office. Verified listings from owners and agents across
              India — no brokerage on owner listings.
            </p>
          </div>

          <FooterColumn title="Property types">
            {PROPERTY_TYPES.map((type) => (
              <FooterLink key={type} href={`/properties?type=${type}`}>
                {PROPERTY_TYPE_LABELS[type]}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Popular cities">
            {CITIES.slice(0, 6).map((city) => (
              <FooterLink key={city} href={`/properties?city=${encodeURIComponent(city)}`}>
                Property in {city}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Company">
            <FooterLink href="/properties">Browse properties</FooterLink>
            <FooterLink href="/dashboard/listings/new">Post a property</FooterLink>
            <FooterLink href="/register">Create an account</FooterLink>
            <FooterLink href="/login">Sign in</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} EstateHub. A demo real-estate marketplace.</p>
          <p>Built with Next.js, Prisma and PostgreSQL.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        // Dashboard routes redirect to /login for signed-out visitors, so
        // prefetching them wastes a request and pollutes the router cache.
        prefetch={href.startsWith("/dashboard") ? false : undefined}
        className="text-sm text-muted transition-colors hover:text-brand-700"
      >
        {children}
      </Link>
    </li>
  );
}
