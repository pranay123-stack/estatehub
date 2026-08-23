"use client";

import { useState } from "react";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";

/**
 * Contact-seller form. Phone number is masked until the visitor reveals it —
 * standard practice on property portals, and it gives a clear moment to
 * capture the lead without hard-gating the contact details.
 */
export function ContactSeller({
  propertyId,
  contactName,
  contactPhone,
  defaults,
}: {
  propertyId: string;
  contactName: string;
  contactPhone: string;
  defaults?: { name?: string; email?: string };
}) {
  const [revealed, setRevealed] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        message: form.get("message"),
      }),
    });

    const body = (await response.json()) as {
      ok: boolean;
      error?: string;
      fields?: Record<string, string[]>;
    };

    setSubmitting(false);

    if (!response.ok) {
      setError(body.error ?? "Could not send your enquiry.");
      setFieldErrors(body.fields ?? {});
      return;
    }

    setSent(true);
    setRevealed(true);
  }

  // Show enough of the number to look genuine, hide the last five digits.
  const maskedPhone = contactPhone.replace(/\d(?=\d{0,4}$)/g, "•");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Listed by</p>
        <p className="mt-1 font-semibold text-ink">{contactName}</p>

        <button
          type="button"
          onClick={() => setRevealed(true)}
          disabled={revealed}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-700 bg-white px-3 py-2 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50 disabled:cursor-default"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          {revealed ? contactPhone : `${maskedPhone} — show number`}
        </button>
      </div>

      {sent ? (
        <Alert tone="success">
          Enquiry sent. {contactName} has your details and will get back to you shortly.
        </Alert>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <h3 className="font-semibold text-ink">Contact seller</h3>

          {error && <Alert>{error}</Alert>}

          <Field label="Your name" htmlFor="enq-name" error={fieldErrors.name?.[0]} required>
            <Input id="enq-name" name="name" defaultValue={defaults?.name} required placeholder="Rahul Sharma" />
          </Field>

          <Field label="Email" htmlFor="enq-email" error={fieldErrors.email?.[0]} required>
            <Input
              id="enq-email"
              name="email"
              type="email"
              defaultValue={defaults?.email}
              required
              placeholder="you@example.com"
            />
          </Field>

          <Field label="Phone" htmlFor="enq-phone" error={fieldErrors.phone?.[0]} required>
            <Input id="enq-phone" name="phone" type="tel" required placeholder="+91 98765 43210" />
          </Field>

          <Field label="Message" htmlFor="enq-message" error={fieldErrors.message?.[0]} required>
            <Textarea
              id="enq-message"
              name="message"
              rows={3}
              required
              defaultValue="I am interested in this property. Please share more details."
            />
          </Field>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Sending…" : "Send enquiry"}
          </Button>

          <p className="text-center text-xs text-muted">
            Your details are shared only with this seller.
          </p>
        </form>
      )}
    </div>
  );
}
