import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, or, type SQL } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { Badge, Button, EmptyState, Field, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { db, schema } from "@/db";
import { ROLES } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { containsCI } from "@/server/sql";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const role = typeof sp.role === "string" && (ROLES as readonly string[]).includes(sp.role) ? (sp.role as (typeof ROLES)[number]) : null;
  const filters: (SQL | undefined)[] = [
    role ? eq(schema.user.role, role) : undefined,
    q ? or(containsCI(schema.user.name, q), containsCI(schema.user.email, q), containsCI(schema.user.idNumber, q)) : undefined,
  ];
  const users = await db
    .select({ user: schema.user, college: schema.college.name })
    .from(schema.user)
    .leftJoin(schema.college, eq(schema.college.id, schema.user.collegeId))
    .where(and(...filters))
    .orderBy(desc(schema.user.createdAt))
    .limit(200);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Registered students, faculty, staff, and administrators."
        actions={<LinkButton href="/admin/users/new">Add administrator</LinkButton>}
      />
      <Flash sp={sp} />
      <form className="mb-4 grid gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-4">
        <Field label="Search" htmlFor="q" className="sm:col-span-2">
          <Input id="q" name="q" defaultValue={q} placeholder="Name, email, or ID number" />
        </Field>
        <Field label="Role" htmlFor="role">
          <Select id="role" name="role" defaultValue={role ?? ""}>
            <option value="">All</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r[0].toUpperCase() + r.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" size="sm">
            Filter
          </Button>
        </div>
      </form>
      {users.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">ID number</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">College / office</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(({ user: u, college }) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-brand-700 hover:underline">
                      {u.name}
                    </Link>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-2">{u.idNumber}</td>
                  <td className="px-4 py-2 capitalize">{u.role}</td>
                  <td className="px-4 py-2">{college ?? "—"}</td>
                  <td className="px-4 py-2">
                    {u.status === "DEACTIVATED" ? (
                      <Badge tone="red">Deactivated</Badge>
                    ) : u.emailVerified ? (
                      <Badge tone="green">Active</Badge>
                    ) : (
                      <Badge tone="amber">Unverified email</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
