import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/guards";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to EstateHub to save properties, manage listings and track enquiries.",
  robots: { index: false },
};

export default async function LoginPage() {
  // Already signed in — there is nothing to do on this page.
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your listings, saved properties and enquiries."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-brand-700 hover:underline">
            Register free
          </Link>
        </>
      }
    >
      {/* LoginForm reads `?next=` via useSearchParams. */}
      <Suspense fallback={<div className="h-72 animate-pulse rounded-lg bg-slate-100" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
