import Link from "next/link";

/** Split layout shared by login and register. */
export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <p className="mt-6 text-center text-sm text-muted">{footer}</p>
        </div>
      </div>

      {/* Brand panel — hidden on mobile where it would just push the form down. */}
      <div className="relative hidden overflow-hidden bg-brand-900 lg:block">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-brand-700),transparent_60%)]"
        />
        <div className="relative flex h-full flex-col justify-center px-12">
          <blockquote className="max-w-md">
            <p className="text-2xl font-semibold leading-snug text-white">
              &ldquo;Listed my flat in Powai on a Sunday evening. Three genuine enquiries by Tuesday,
              and not a rupee in brokerage.&rdquo;
            </p>
            <footer className="mt-4 text-sm text-brand-200">Meera K. — property owner, Mumbai</footer>
          </blockquote>

          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-white/15 pt-8">
            {[
              ["20+", "Live listings"],
              ["8", "Cities covered"],
              ["0%", "Owner brokerage"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="text-2xl font-bold text-accent-400">{value}</dt>
                <dd className="mt-0.5 text-xs text-brand-200">{label}</dd>
              </div>
            ))}
          </dl>

          <Link href="/properties" className="mt-10 text-sm font-semibold text-white hover:underline">
            Browse properties without an account →
          </Link>
        </div>
      </div>
    </div>
  );
}
