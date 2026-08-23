import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getVerifiedUser } from "@/lib/auth/guards";
import type { Role } from "@/generated/prisma/enums";

/** Uniform success/error envelopes so the client only ever parses one shape. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400, fields?: Record<string, string[]>) {
  return NextResponse.json({ ok: false, error: message, fields }, { status });
}

/** Thrown by route handlers to short-circuit with a specific status. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/**
 * Wraps a route handler so every failure mode produces a JSON envelope instead
 * of an HTML error page: Zod issues become 422 with per-field messages,
 * ApiError keeps its status, anything else is a logged 500.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ZodError) {
        const fields: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const key = issue.path.join(".") || "_";
          (fields[key] ??= []).push(issue.message);
        }
        return fail("Please correct the highlighted fields.", 422, fields);
      }
      if (error instanceof ApiError) {
        return fail(error.message, error.status);
      }
      console.error("[api] unhandled error:", error);
      return fail("Something went wrong. Please try again.", 500);
    }
  };
}

/** Route-handler auth guard. Re-reads the user row so bans apply immediately. */
export async function authed() {
  const user = await getVerifiedUser();
  if (!user) throw new ApiError("You must be signed in.", 401);
  return user;
}

/** Route-handler role guard. */
export async function authedWithRole(roles: Role[]) {
  const user = await authed();
  if (!roles.includes(user.role)) {
    throw new ApiError("You do not have permission to do that.", 403);
  }
  return user;
}
