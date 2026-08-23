import { ButtonLink } from "@/components/ui";

export function Cta() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl bg-brand-800 px-6 py-12 sm:px-12">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-700/60 blur-2xl"
        />
        <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Have a property to sell or rent out?
            </h2>
            <p className="mt-2 text-brand-100">
              List it free in under five minutes. Add photos, set your price, and start receiving
              enquiries as soon as our team approves it.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <ButtonLink href="/dashboard/listings/new" variant="accent" size="lg">
              Post your property
            </ButtonLink>
            <ButtonLink
              href="/register"
              size="lg"
              className="border border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              Create an account
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
