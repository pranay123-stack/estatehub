import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-bold text-brand-700">404</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-2 text-muted">
        The listing may have been removed, sold, or the link could be out of date.
      </p>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/properties">Browse properties</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Go home
        </ButtonLink>
      </div>
    </div>
  );
}
