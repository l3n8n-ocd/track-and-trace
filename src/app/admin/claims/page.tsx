import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, desc, eq, inArray } from "drizzle-orm";
import {
  Archive,
  CalendarClock,
  ChevronRight,
  CircleCheckBig,
  CirclePause,
  FileQuestion,
  Hourglass,
  Inbox,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";
import { Flash } from "@/components/flash";
import { ClaimStatusBadge } from "@/components/status-badge";
import { Avatar, EmptyState, ICON_STROKE, PageHeader, Tabs, cn } from "@/components/ui";
import { db, schema } from "@/db";
import type { ClaimStatus } from "@/db/schema";
import { daysSince, formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Claims" };

const TABS: { key: string; label: string; statuses: ClaimStatus[]; icon: LucideIcon }[] = [
  { key: "review", label: "To review", statuses: ["PENDING"], icon: Hourglass },
  { key: "MORE_INFO_NEEDED", label: "Waiting on claimant", statuses: ["MORE_INFO_NEEDED"], icon: FileQuestion },
  { key: "APPROVED", label: "Awaiting pickup", statuses: ["APPROVED"], icon: PackageOpen },
  { key: "ON_HOLD", label: "On hold", statuses: ["ON_HOLD"], icon: CirclePause },
  { key: "done", label: "Closed", statuses: ["RELEASED", "REJECTED", "LAPSED"], icon: Archive },
];

const HELP: Record<string, string> = {
  review: "Oldest first. Compare each claimant's proof with the found report.",
  MORE_INFO_NEEDED: "You asked these claimants for more proof. They return to review when they reply.",
  APPROVED: "Approved owners who still need to pick up their item. Check a valid ID on release.",
  ON_HOLD: "Paused while another claim on the same item is processed.",
  done: "Released, rejected, and lapsed claims.",
};

export default async function AdminClaimsPage({ searchParams }: PageProps<"/admin/claims">) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.status) ?? TABS[0];
  const open = tab.key !== "done";
  const rows = await db
    .select({
      claim: schema.claim,
      itemName: schema.report.itemName,
      claimant: schema.user.name,
    })
    .from(schema.claim)
    .innerJoin(schema.report, eq(schema.report.id, schema.claim.reportId))
    .innerJoin(schema.user, eq(schema.user.id, schema.claim.claimantId))
    .where(inArray(schema.claim.claimStatus, tab.statuses))
    .orderBy(open ? asc(schema.claim.claimDate) : desc(schema.claim.claimDate))
    .limit(100);
  const counts = await db
    .select({ status: schema.claim.claimStatus, value: count() })
    .from(schema.claim)
    .groupBy(schema.claim.claimStatus);
  const tabCount = (t: (typeof TABS)[number]) =>
    counts.filter((c) => t.statuses.includes(c.status)).reduce((n, c) => n + c.value, 0);

  return (
    <div>
      <PageHeader icon={Inbox} title="Claims" description="Review proof of ownership and release items to verified owners." />
      <Flash sp={sp} />
      <Tabs
        className="mb-2"
        items={TABS.map((t) => ({
          href: `/admin/claims?status=${t.key}`,
          label: t.label,
          active: t.key === tab.key,
          count: tabCount(t),
          icon: t.icon,
        }))}
      />
      <p className="mb-4 text-sm text-ink-muted">{HELP[tab.key]}</p>
      {rows.length === 0 ? (
        <EmptyState icon={CircleCheckBig} title="Nothing here">
          No claims in this queue right now.
        </EmptyState>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-paper">
          {rows.map(({ claim, itemName, claimant }) => {
            const days = daysSince(claim.claimDate);
            return (
              <li key={claim.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/admin/claims/${claim.id}`}
                  className="group flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-colors hover:bg-sand/50"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sand font-display text-sm font-bold text-crimson">
                    #{claim.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{itemName}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-[13px] text-ink-muted">
                      <Avatar name={claimant} className="size-5 text-[8px]" />
                      {claimant} · filed {formatDate(claim.claimDate)}
                    </p>
                  </div>
                  {open && claim.claimStatus !== "APPROVED" && (
                    <span className={cn("text-xs font-semibold", days >= 3 ? "text-rust" : "text-ink-muted")}>
                      {days <= 0 ? "Today" : `Waiting ${days} day${days === 1 ? "" : "s"}`}
                    </span>
                  )}
                  {claim.claimStatus === "APPROVED" && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-deep">
                      <CalendarClock aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
                      Pickup by {formatDate(claim.pickupDeadline)}
                    </span>
                  )}
                  <ClaimStatusBadge status={claim.claimStatus} size="sm" />
                  <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-ink-faint group-hover:text-ink" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
