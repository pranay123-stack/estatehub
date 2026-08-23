import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { UserRow } from "@/components/dashboard/user-row";
import { SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireRole(["ADMIN"], "/dashboard/admin/users");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      blocked: true,
      createdAt: true,
      _count: { select: { properties: true } },
    },
  });

  return (
    <div>
      <SectionHeading
        title="Manage users"
        description="Change roles or suspend accounts. Suspended users cannot sign in, but their data is kept."
      />

      <div className="space-y-3">
        {users.map((user) => (
          <UserRow key={user.id} user={user} isSelf={user.id === admin.id} />
        ))}
      </div>
    </div>
  );
}
