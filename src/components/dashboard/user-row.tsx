"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Select } from "@/components/ui";
import { ROLES, ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Role } from "@/generated/prisma/enums";

export type UserRowData = {
  id: string;
  name: string;
  email: string;
  role: Role;
  blocked: boolean;
  createdAt: Date;
  _count: { properties: number };
};

/** Row in the admin user table: change role, suspend, or restore. */
export function UserRow({ user, isSelf }: { user: UserRowData; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: { role?: Role; blocked?: boolean }) {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setBusy(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not update the user.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <span className="truncate">{user.name}</span>
          {isSelf && <Badge tone="brand">You</Badge>}
          {user.blocked && <Badge tone="danger">Suspended</Badge>}
        </p>
        <p className="truncate text-sm text-muted">{user.email}</p>
        <p className="mt-0.5 text-xs text-muted">
          {user._count.properties} {user._count.properties === 1 ? "listing" : "listings"} · joined{" "}
          {formatDate(user.createdAt)}
        </p>
        {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
      </div>

      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`role-${user.id}`}>
          Role for {user.name}
        </label>
        <Select
          id={`role-${user.id}`}
          value={user.role}
          // An admin editing their own row would be one click from locking
          // themselves out, so the controls are disabled for self.
          disabled={busy || isSelf}
          onChange={(event) => patch({ role: event.target.value as Role })}
          className="w-40"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>

        <Button
          variant={user.blocked ? "secondary" : "danger"}
          size="sm"
          disabled={busy || isSelf}
          onClick={() => patch({ blocked: !user.blocked })}
        >
          {user.blocked ? "Restore" : "Suspend"}
        </Button>
      </div>
    </div>
  );
}
