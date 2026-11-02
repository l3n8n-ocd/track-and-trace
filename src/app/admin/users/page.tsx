import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, or, type SQL } from "drizzle-orm";
import { BadgeCheck, Briefcase, GraduationCap, MailWarning, School, Search, ShieldUser, UserPlus, Users, UserX, type LucideIcon } from "lucide-react";
import { Flash } from "@/components/flash";
import { Avatar, Badge, Button, EmptyState, Field, ICON_STROKE, Input, LinkButton, PageHeader, Tabs, Toolbar, cn } from "@/components/ui";
import { db, schema } from "@/db";
import { ROLES } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { containsCI } from "@/server/sql";

export const metadata: Metadata = { title: "Users" };

const ROLE_LOOK: Record<(typeof ROLES)[number], { label: string; one: string; icon: LucideIcon }> = {
  student: { label: "Students", one: "Student", icon: GraduationCap },
  faculty: { label: "Faculty", one: "Faculty", icon: School },
  staff: { label: "Staff", one: "Staff", icon: Briefcase },
  admin: { label: "Admins", one: "Administrator", icon: ShieldUser },
};

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
  const roleCounts = await db.select({ role: schema.user.role, value: count() }).from(schema.user).groupBy(schema.user.role);
  const link = (r: string | null) => {
    const params = new URLSearchParams();
    if (r) params.set("role", r);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Users"
        description="Find a user to edit their information, manage access, or deactivate their account."
        actions={
          <LinkButton href="/admin/users/new">
            <UserPlus aria-hidden />
            Add administrator
          </LinkButton>
        }
      />
      <Flash sp={sp} />
      <Tabs
        className="mb-4 flex-wrap overflow-x-visible"
        items={[
          { href: link(null), label: "Everyone", active: !role, count: roleCounts.reduce((n, c) => n + c.value, 0) },
          ...ROLES.map((r) => ({
            href: link(r),
            label: ROLE_LOOK[r].label,
            active: role === r,
            count: roleCounts.find((c) => c.role === r)?.value ?? 0,
            icon: ROLE_LOOK[r].icon,
          })),
        ]}
      />
      <Toolbar className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {role && <input type="hidden" name="role" value={role} />}
        <Field label="Search" htmlFor="q" className="flex-1">
          <Input id="q" name="q" icon={Search} defaultValue={q} placeholder="Name, email, or ID number" />
        </Field>
        <Button type="submit">
          <Search aria-hidden />
          Search
        </Button>
      </Toolbar>
      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users found">
          Try a different name, email, or ID number.
        </EmptyState>
      ) : (
        <div className="min-w-0 rounded-2xl border border-line bg-paper">
          <table className="block w-full table-fixed text-sm xl:table">
            <caption className="sr-only">User accounts and management options</caption>
            <colgroup className="hidden xl:table-column-group">
              <col className="w-[34%]" />
              <col className="w-[26%]" />
              <col className="w-[21%]" />
              <col className="w-[19%]" />
            </colgroup>
            <thead className="hidden bg-cream/70 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted xl:table-header-group">
              <tr>
                <th scope="col" className="rounded-tl-2xl px-4 py-3">User</th>
                <th scope="col" className="px-4 py-3">College / office</th>
                <th scope="col" className="px-4 py-3">Role &amp; account</th>
                <th scope="col" className="rounded-tr-2xl px-4 py-3">Manage</th>
              </tr>
            </thead>
            <tbody className="block divide-y divide-line xl:table-row-group">
              {users.map(({ user: u, college }) => {
                const look = ROLE_LOOK[u.role];
                const RoleIcon = look.icon;
                return (
                  <tr key={u.id} className="grid min-w-0 gap-4 p-4 transition-colors hover:bg-sand/50 sm:grid-cols-[minmax(0,1fr)_auto] xl:table-row xl:p-0">
                    <td className="block min-w-0 align-top sm:col-span-2 xl:table-cell xl:px-4 xl:py-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar name={u.name} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/admin/users/${u.id}`} className="break-words font-semibold text-ink hover:text-crimson hover:underline">
                            {u.name}
                          </Link>
                          <p className="mt-0.5 break-all text-xs text-ink-muted">{u.email}</p>
                          <p className="mt-2 break-all font-mono text-xs text-ink-soft"><span className="font-sans text-ink-muted">ID: </span>{u.idNumber}</p>
                          <p className="mt-1 text-xs text-ink-muted">Joined {formatDate(u.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="block min-w-0 align-top text-ink-soft xl:table-cell xl:px-4 xl:py-4">
                      <p className="mb-1 text-xs font-medium text-ink-muted xl:hidden">College / office</p>
                      <p className="break-words">{college ?? "—"}</p>
                    </td>
                    <td className="block min-w-0 align-top xl:table-cell xl:px-4 xl:py-4">
                      <span className="mb-2 flex items-start gap-1.5 font-medium text-ink-soft">
                        <RoleIcon aria-hidden strokeWidth={ICON_STROKE} className={cn("mt-0.5 size-4 shrink-0", u.role === "admin" ? "text-amber-deep" : "text-crimson")} />
                        <span className="min-w-0 break-words">{look.one}</span>
                      </span>
                      {u.status === "DEACTIVATED" ? (
                        <Badge tone="red" icon={UserX}>Deactivated</Badge>
                      ) : u.emailVerified ? (
                        <Badge tone="green" icon={BadgeCheck}>Active</Badge>
                      ) : (
                        <Badge tone="amber" icon={MailWarning}>Unverified email</Badge>
                      )}
                    </td>
                    <td className="block min-w-0 border-t border-line pt-3 align-top sm:col-span-2 xl:table-cell xl:border-t-0 xl:px-4 xl:py-4">
                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-crimson xl:flex-col xl:items-start">
                        <Link href={`/admin/users/${u.id}#profile`} className="inline-flex min-h-9 items-center rounded-lg border border-line-strong px-3 py-2 hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson">Edit profile</Link>
                        <Link href={`/admin/users/${u.id}#access`} className="inline-flex min-h-9 items-center rounded-lg border border-line-strong px-3 py-2 hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson">Manage access</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
