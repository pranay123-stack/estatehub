"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });

    const body = (await response.json()) as {
      error?: string;
      fields?: Record<string, string[]>;
    };

    if (!response.ok) {
      setSubmitting(false);
      setError(body.error ?? "Could not sign you in.");
      setFieldErrors(body.fields ?? {});
      return;
    }

    // `next` is validated to be a same-origin path so it can't be used as an
    // open redirect to an attacker's site.
    const next = searchParams.get("next");
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

    // A full document navigation is deliberate. router.push()/replace() reuse
    // the client router cache, which holds pages rendered under the *previous*
    // identity; calling router.refresh() first is racy — measured failing 6/6
    // times on sign-out. Signing in or out changes who the entire app shell is
    // rendered for, so a reload is the correct tool, not a heavy-handed one.
    window.location.assign(target);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}

      <Field label="Email" htmlFor="email" error={fieldErrors.email?.[0]} required>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>

      <Field label="Password" htmlFor="password" error={fieldErrors.password?.[0]} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting ? "Signing in…" : "Sign in"}
      </Button>

      <div className="rounded-lg border border-dashed border-line bg-slate-50 p-3 text-xs text-muted">
        <p className="mb-1 font-semibold text-slate-600">Demo accounts (from the seed script)</p>
        <p>
          Admin — <code className="text-ink">admin@estatehub.in</code> · Owner —{" "}
          <code className="text-ink">owner@estatehub.in</code> · Buyer —{" "}
          <code className="text-ink">buyer@estatehub.in</code>
        </p>
        <p className="mt-1">
          Password for all three: <code className="text-ink">Password123</code>
        </p>
      </div>

    </form>
  );
}
