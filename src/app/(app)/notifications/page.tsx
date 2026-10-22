import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, PageHeader, cn } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { markAllReadAction, openNotificationAction } from "./actions";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await db.query.notification.findMany({
    where: eq(schema.notification.userId, user.id),
    orderBy: desc(schema.notification.dateSent),
    limit: 100,
  });
  const unread = items.some((n) => !n.isRead);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        actions={
          unread && (
            <form action={markAllReadAction}>
              <SubmitButton variant="secondary" size="sm" pendingText="…">
                Mark all as read
              </SubmitButton>
            </form>
          )
        }
      />
      {items.length === 0 ? (
        <EmptyState title="No notifications yet" />
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
          {items.map((n) => (
            <li key={n.id}>
              <form action={openNotificationAction.bind(null, n.id)}>
                <button className={cn("flex w-full items-start gap-3 p-4 text-left hover:bg-slate-50", !n.isRead && "bg-brand-50/40")}>
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-brand-600")} aria-hidden />
                  <span className="flex-1">
                    <span className={cn("block text-sm", n.isRead ? "text-slate-700" : "font-medium text-slate-900")}>{n.message}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{formatDateTime(n.dateSent)}</span>
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
