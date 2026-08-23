import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guards";
import { UserMenu } from "./user-menu";
import { ButtonLink } from "@/components/ui";

export async function SiteHeader() {
  // Session read is a cookie + JWT verify — no database round-trip.
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="EstateHub home">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-white">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M9.5 20v-5.5h5V20" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">
            Estate<span className="text-brand-700">Hub</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <HeaderLink href="/properties?listingType=SALE">Buy</HeaderLink>
          <HeaderLink href="/properties?listingType=RENT">Rent</HeaderLink>
          <HeaderLink href="/properties">All properties</HeaderLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Wrapped rather than given `hidden sm:inline-flex` directly: the
              button's base class already sets `inline-flex`, and Tailwind
              orders both display utilities in the same layer, so the override
              would lose and the button would never hide on small screens. */}
          <div className="hidden sm:block">
          <ButtonLink href="/dashboard/listings/new" variant="secondary" size="sm" prefetch={false}>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Post property
            <span className="rounded bg-accent-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-900">
              FREE
            </span>
          </ButtonLink>
          </div>

          {user ? (
            <UserMenu name={user.name} role={user.role} />
          ) : (
            <div className="flex items-center gap-2">
              <ButtonLink href="/login" variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Register
              </ButtonLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink"
    >
      {children}
    </Link>
  );
}
