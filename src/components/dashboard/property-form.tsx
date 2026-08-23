"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AMENITIES,
  AREA_ONLY_TYPES,
  CITIES,
  FURNISHING_OPTIONS,
  LISTING_TYPES,
  LISTING_TYPE_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { ImageUploader } from "./image-uploader";
import type { PropertyFormValues } from "./property-form-values";
import type { PropertyType } from "@/generated/prisma/enums";

/**
 * Create/edit form. One component for both, switched by `mode` — the field set
 * and validation are identical, so duplicating it would guarantee they drift.
 */
export function PropertyForm({
  mode,
  initialValues,
}: {
  mode: "create" | "edit";
  initialValues: PropertyFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof PropertyFormValues>(key: K, value: PropertyFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  // Plots and commercial units have no bedrooms; rent listings have a deposit.
  const isAreaOnly = AREA_ONLY_TYPES.includes(values.type);
  const isRent = values.listingType === "RENT";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    // Empty numeric strings become undefined so Zod's optional fields accept them.
    const payload = {
      ...values,
      price: values.price,
      deposit: isRent && values.deposit ? values.deposit : undefined,
      bedrooms: isAreaOnly ? 0 : values.bedrooms,
      bathrooms: values.type === "PLOT" ? 0 : values.bathrooms,
      ageYears: values.ageYears === "" ? undefined : values.ageYears,
    };

    const response = await fetch(
      mode === "create" ? "/api/properties" : `/api/properties/${initialValues.id}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const body = (await response.json()) as {
      error?: string;
      fields?: Record<string, string[]>;
    };

    if (!response.ok) {
      setSubmitting(false);
      setError(body.error ?? "Could not save the listing.");
      setFieldErrors(body.fields ?? {});
      // Errors are usually above the fold — scroll so the user sees them.
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    router.push("/dashboard/listings?saved=1");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <Alert>{error}</Alert>}

      <Card className="p-5">
        <h2 className="mb-4 font-semibold text-ink">Basics</h2>
        <div className="space-y-4">
          <Field
            label="Listing title"
            htmlFor="title"
            error={fieldErrors.title?.[0]}
            hint="What a buyer would search for, e.g. “Spacious 3 BHK in Powai with lake view”."
            required
          >
            <Input
              id="title"
              value={values.title}
              onChange={(event) => set("title", event.target.value)}
              maxLength={120}
              required
            />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            error={fieldErrors.description?.[0]}
            hint="Layout, condition, what's nearby, and why someone would want it."
            required
          >
            <Textarea
              id="description"
              rows={6}
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="I want to" htmlFor="listingType" required>
              <Select
                id="listingType"
                value={values.listingType}
                onChange={(event) => set("listingType", event.target.value as "RENT" | "SALE")}
              >
                {LISTING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {LISTING_TYPE_LABELS[type].replace("For ", "")}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Property type" htmlFor="type" required>
              <Select
                id="type"
                value={values.type}
                onChange={(event) => set("type", event.target.value as PropertyType)}
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PROPERTY_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold text-ink">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={isRent ? "Monthly rent (₹)" : "Asking price (₹)"}
            htmlFor="price"
            error={fieldErrors.price?.[0]}
            hint={isRent ? "e.g. 45000" : "Whole rupees, e.g. 12500000 for ₹1.25 Cr"}
            required
          >
            <Input
              id="price"
              type="number"
              min={1}
              value={values.price}
              onChange={(event) => set("price", event.target.value)}
              required
            />
          </Field>

          {isRent && (
            <Field
              label="Security deposit (₹)"
              htmlFor="deposit"
              error={fieldErrors.deposit?.[0]}
              hint="Optional. Usually 2–6 months' rent."
            >
              <Input
                id="deposit"
                type="number"
                min={0}
                value={values.deposit}
                onChange={(event) => set("deposit", event.target.value)}
              />
            </Field>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold text-ink">Location</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="city" error={fieldErrors.city?.[0]} required>
            <Input
              id="city"
              list="city-options"
              value={values.city}
              onChange={(event) => set("city", event.target.value)}
              required
            />
            {/* Datalist rather than a select: suggests our cities without
                blocking a seller in one we haven't listed yet. */}
            <datalist id="city-options">
              {CITIES.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </Field>

          <Field
            label="Locality"
            htmlFor="locality"
            error={fieldErrors.locality?.[0]}
            hint="e.g. Powai, Indiranagar, Baner"
            required
          >
            <Input
              id="locality"
              value={values.locality}
              onChange={(event) => set("locality", event.target.value)}
              required
            />
          </Field>

          <Field label="Street address" htmlFor="address" error={fieldErrors.address?.[0]}>
            <Input
              id="address"
              value={values.address}
              onChange={(event) => set("address", event.target.value)}
            />
          </Field>

          <Field label="Pincode" htmlFor="pincode" error={fieldErrors.pincode?.[0]}>
            <Input
              id="pincode"
              inputMode="numeric"
              maxLength={6}
              value={values.pincode}
              onChange={(event) => set("pincode", event.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold text-ink">Configuration</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {!isAreaOnly && (
            <Field label="Bedrooms" htmlFor="bedrooms" error={fieldErrors.bedrooms?.[0]} required>
              <Select
                id="bedrooms"
                value={values.bedrooms}
                onChange={(event) => set("bedrooms", event.target.value)}
              >
                <option value="0">Studio</option>
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <option key={count} value={count}>
                    {count} BHK
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {values.type !== "PLOT" && (
            <Field label="Bathrooms" htmlFor="bathrooms" error={fieldErrors.bathrooms?.[0]}>
              <Select
                id="bathrooms"
                value={values.bathrooms}
                onChange={(event) => set("bathrooms", event.target.value)}
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field
            label={values.type === "PLOT" ? "Plot area (sq.ft)" : "Built-up area (sq.ft)"}
            htmlFor="areaSqft"
            error={fieldErrors.areaSqft?.[0]}
            required
          >
            <Input
              id="areaSqft"
              type="number"
              min={1}
              value={values.areaSqft}
              onChange={(event) => set("areaSqft", event.target.value)}
              required
            />
          </Field>

          {values.type !== "PLOT" && (
            <>
              <Field label="Furnishing" htmlFor="furnishing">
                <Select
                  id="furnishing"
                  value={values.furnishing}
                  onChange={(event) => set("furnishing", event.target.value)}
                >
                  <option value="">Not specified</option>
                  {FURNISHING_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Floor" htmlFor="floor" hint="e.g. 7 of 14">
                <Input
                  id="floor"
                  value={values.floor}
                  onChange={(event) => set("floor", event.target.value)}
                />
              </Field>

              <Field label="Age of property (years)" htmlFor="ageYears" error={fieldErrors.ageYears?.[0]}>
                <Input
                  id="ageYears"
                  type="number"
                  min={0}
                  max={100}
                  value={values.ageYears}
                  onChange={(event) => set("ageYears", event.target.value)}
                />
              </Field>
            </>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold text-ink">Amenities</h2>
        <p className="mb-4 text-sm text-muted">Pick everything the property or society offers.</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {AMENITIES.map((amenity) => (
            <label key={amenity} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={values.amenities.includes(amenity)}
                onChange={(event) =>
                  set(
                    "amenities",
                    event.target.checked
                      ? [...values.amenities, amenity]
                      : values.amenities.filter((item) => item !== amenity),
                  )
                }
                className="h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-600"
              />
              {amenity}
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold text-ink">Photos</h2>
        <p className="mb-4 text-sm text-muted">
          Listings with photos get far more enquiries. The first image is used as the cover.
        </p>
        <ImageUploader images={values.images} onChange={(images) => set("images", images)} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold text-ink">Contact details</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contact name" htmlFor="contactName" error={fieldErrors.contactName?.[0]} required>
            <Input
              id="contactName"
              value={values.contactName}
              onChange={(event) => set("contactName", event.target.value)}
              required
            />
          </Field>

          <Field label="Phone" htmlFor="contactPhone" error={fieldErrors.contactPhone?.[0]} required>
            <Input
              id="contactPhone"
              type="tel"
              value={values.contactPhone}
              onChange={(event) => set("contactPhone", event.target.value)}
              required
            />
          </Field>

          <Field label="Email" htmlFor="contactEmail" error={fieldErrors.contactEmail?.[0]}>
            <Input
              id="contactEmail"
              type="email"
              value={values.contactEmail}
              onChange={(event) => set("contactEmail", event.target.value)}
            />
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Submit for approval"
              : "Save changes"}
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={() => router.back()} disabled={submitting}>
          Cancel
        </Button>
        <p className="text-xs text-muted">
          {mode === "create"
            ? "Your listing goes live once an admin approves it — usually within a few hours."
            : "Edits are re-reviewed before going live again."}
        </p>
      </div>
    </form>
  );
}
