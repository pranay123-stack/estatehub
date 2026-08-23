"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui";

/** Root error boundary — catches render failures in any page below it. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where a Sentry/Axiom call would go.
    console.error("[app] render error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Something went wrong</h1>
      <p className="mt-2 text-muted">
        We hit an unexpected error loading this page. Trying again usually fixes it.
      </p>
      {error.digest && <p className="mt-1 text-xs text-slate-400">Reference: {error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Go home
        </ButtonLink>
      </div>
    </div>
  );
}
