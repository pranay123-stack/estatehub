"use client";

import { useState } from "react";
import clsx from "clsx";
import { Alert, Button, Field, Input } from "@/components/ui";

/** Role chosen at signup. ADMIN is intentionally absent — it is granted, not requested. */
const ROLE_CHOICES = [
  { value: "BUYER", label: "I'm looking", body: "Search, save and enquire about properties." },
  { value: "OWNER", label: "I'm an owner", body: "List my own property, free of brokerage." },
  { value: "AGENT", label: "I'm an agent", body: "List properties on behalf of clients." },
] as const;

export function RegisterForm() {
  const [role, setRole] = useState<(typeof ROLE_CHOICES)[number]["value"]>("BUYER");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        phone: form.get("phone"),
        role,
      }),
    });

    const body = (await response.json()) as {
      error?: string;
      fields?: Record<string, string[]>;
    };

    if (!response.ok) {
      setSubmitting(false);
      setError(body.error ?? "Could not create your account.");
      setFieldErrors(body.fields ?? {});
      return;
    }

    // Registration signs the user straight in — sellers land on the
    // post-property form, buyers on their dashboard. See login-form.tsx for why
    // this is a full document navigation.
    // A full document navigation is deliberate. router.push()/replace() reuse
    // the client router cache, which holds pages rendered under the *previous*
    // identity; calling router.refresh() first is racy — measured failing 6/6
    // times on sign-out. Signing in or out changes who the entire app shell is
    // rendered for, so a reload is the correct tool, not a heavy-handed one.
    window.location.assign(role === "BUYER" ? "/dashboard" : "/dashboard/listings/new");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert>{error}</Alert>}

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-slate-700">I am…</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLE_CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              onClick={() => setRole(choice.value)}
              aria-pressed={role === choice.value}
              className={clsx(
                "rounded-lg border p-3 text-left transition-colors",
                role === choice.value
                  ? "border-brand-700 bg-brand-50 ring-1 ring-brand-600"
                  : "border-line bg-white hover:border-slate-300",
              )}
            >
              <span className="block text-sm font-semibold text-ink">{choice.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">{choice.body}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Full name" htmlFor="name" error={fieldErrors.name?.[0]} required>
        <Input id="name" name="name" autoComplete="name" required placeholder="Rahul Sharma" />
      </Field>

      <Field label="Email" htmlFor="email" error={fieldErrors.email?.[0]} required>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>

      <Field
        label="Phone"
        htmlFor="phone"
        error={fieldErrors.phone?.[0]}
        hint={role === "BUYER" ? "Optional — helps sellers reach you." : "Shown on your listings."}
      >
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={fieldErrors.password?.[0]}
        hint="At least 8 characters."
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="••••••••"
        />
      </Field>

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
