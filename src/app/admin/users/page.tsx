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
        description="Registered students, faculty, staff, and administrators."
        actions={
          <LinkButton href="/admin/users/new">
            <UserPlus aria-hidden />
            Add administrator
          </LinkButton>
        }
      />
      <Flash sp={sp} />
      <Tabs
        className="mb-4"
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
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          <table className="min-w-full text-sm max-md:block">
            <thead className="bg-cream/70 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted max-md:hidden">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">ID number</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">College / office</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line max-md:block">
              {users.map(({ user: u, college }) => {
                const look = ROLE_LOOK[u.role];
                const RoleIcon = look.icon;
                return (
                  <tr key={u.id} className="relative transition-colors hover:bg-sand/50 max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3 max-md:gap-y-2 max-md:p-4">
                    <td className="px-4 py-3 max-md:w-full max-md:p-0">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div className="min-w-0">
                          <Link href={`/admin/users/${u.id}`} className="font-semibold text-ink after:absolute after:inset-0 hover:text-crimson">
                            {u.name}
                          </Link>
                          <div className="truncate text-xs text-ink-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[13px] text-ink-soft max-md:p-0">{u.idNumber}</td>
                    <td className="px-4 py-3 max-md:p-0">
                      <span className="inline-flex items-center gap-1.5 font-medium text-ink-soft">
                        <RoleIcon aria-hidden strokeWidth={ICON_STROKE} className={cn("size-4", u.role === "admin" ? "text-amber-deep" : "text-crimson")} />
                        {look.one}
                      </span>
                    </td>
                    <td className="max-w-56 truncate px-4 py-3 text-ink-soft max-md:hidden">{college ?? "—"}</td>
                    <td className="px-4 py-3 max-md:p-0">
                      {u.status === "DEACTIVATED" ? (
                        <Badge tone="red" icon={UserX}>Deactivated</Badge>
                      ) : u.emailVerified ? (
                        <Badge tone="green" icon={BadgeCheck}>Active</Badge>
                      ) : (
                        <Badge tone="amber" icon={MailWarning}>Unverified email</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted max-md:hidden">{formatDate(u.createdAt)}</td>
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
