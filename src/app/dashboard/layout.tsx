import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { ROLE_LABELS } from "@/lib/constants";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Every /dashboard page inherits this guard — individual pages only need to
  // check the extra role requirements specific to them.
  const user = await requireUser();
  const isSeller = user.role !== "BUYER";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Hi, {user.name.split(" ")[0]}</h1>
          <p className="mt-0.5 text-sm text-muted">
            Signed in as {user.email} · {ROLE_LABELS[user.role]}
          </p>
        </div>
        {isSeller && <ButtonLink href="/dashboard/listings/new">Post a property</ButtonLink>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <DashboardNav role={user.role} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
