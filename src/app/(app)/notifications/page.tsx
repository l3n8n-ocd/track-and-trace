import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { SubmitButton } from "@/components/submit-button";
import {
  BadgeCheck,
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  CircleX,
  FileQuestion,
  FileText,
  PackageOpen,
  ScanSearch,
  ShieldCheck,
  TimerOff,
  type LucideIcon,
} from "lucide-react";
import { EmptyState, ICON_STROKE, PageHeader, cn } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { markAllReadAction, openNotificationAction } from "./actions";

export const metadata: Metadata = { title: "Notifications" };

// Icon for each notification type (see the notify() calls in src/server).
function iconFor(type: string): LucideIcon {
  if (type.startsWith("MATCH")) return ScanSearch;
  if (type === "CLAIM_APPROVED" || type === "PICKUP_REMINDER") return PackageOpen;
  if (type === "CLAIM_MORE_INFO") return FileQuestion;
  if (type === "CLAIM_REJECTED") return CircleX;
  if (type === "CLAIM_RELEASED" || type === "ITEM_RETURNED") return BadgeCheck;
  if (type.endsWith("LAPSED") || type.endsWith("EXPIRED")) return TimerOff;
  if (type.startsWith("CLAIM")) return ShieldCheck;
  return FileText;
}

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await db.query.notification.findMany({
    where: eq(schema.notification.userId, user.id),
    orderBy: desc(schema.notification.dateSent),
    limit: 100,
  });
  const unread = items.filter((n) => !n.isRead).length;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={Bell}
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up."}
        actions={
          unread > 0 && (
            <form action={markAllReadAction}>
              <SubmitButton variant="secondary" size="sm" pendingText="…">
                <CheckCheck aria-hidden />
                Mark all as read
              </SubmitButton>
            </form>
          )
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={BellOff} title="No notifications yet">
          Updates on your reports, matches, and claims will show up here.
        </EmptyState>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-paper">
          {items.map((n) => {
            const Icon = iconFor(n.notificationType);
            return (
              <li key={n.id} className="border-b border-line last:border-b-0">
                <form action={openNotificationAction.bind(null, n.id)}>
                  <button className={cn("flex w-full items-start gap-3.5 p-4 text-left transition-colors hover:bg-sand/60", !n.isRead && "bg-amber-tint/40")}>
                    <span
                      className={cn(
                        "relative flex size-10 shrink-0 items-center justify-center rounded-xl",
                        n.isRead ? "bg-sand text-ink-muted" : "bg-oxblood text-cream",
                      )}
                    >
                      <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-[18px]" />
                      {!n.isRead && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-amber ring-2 ring-paper" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[15px] leading-snug", n.isRead ? "text-ink-soft" : "font-semibold text-ink")}>{n.message}</span>
                      <span className="mt-1 block text-xs text-ink-muted">{formatDateTime(n.dateSent)}</span>
                    </span>
                    <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="mt-2.5 size-4 shrink-0 text-ink-faint" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
