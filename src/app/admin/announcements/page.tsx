import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Eye, EyeOff, Megaphone, PenLine, Trash2 } from "lucide-react";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, CardHeader, EmptyState, PageHeader, cn } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { createAnnouncementAction, deleteAnnouncementAction, toggleAnnouncementAction } from "../actions";
import { AnnouncementComposer } from "./composer";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage({ searchParams }: PageProps<"/admin/announcements">) {
  await requireAdmin();
  const sp = await searchParams;
  const items = await db
    .select({ a: schema.announcement, author: schema.user.name })
    .from(schema.announcement)
    .leftJoin(schema.user, eq(schema.user.id, schema.announcement.adminId))
    .orderBy(desc(schema.announcement.datePosted));
  const shown = items.filter(({ a }) => a.isActive).length;
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Megaphone}
        title="Announcements"
        description="Messages shown on every user's dashboard, such as office hours or unclaimed item drives."
      />
      <Flash sp={sp} />
      <Card>
        <CardHeader icon={PenLine} title="New announcement" />
        <AnnouncementComposer key={items.length} action={createAnnouncementAction} />
      </Card>
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Posted · {shown} shown, {items.length - shown} hidden
        </h2>
        {items.length === 0 ? (
          <EmptyState icon={Megaphone} title="No announcements yet">
            Post one above. It shows on every user&apos;s dashboard until you hide it.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {items.map(({ a, author }) => (
              <li
                key={a.id}
                className={cn(
                  "rounded-2xl border bg-paper p-5 transition-opacity",
                  a.isActive ? "border-line" : "border-line opacity-70",
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.isActive ? (
                        <Badge tone="green" icon={Eye}>Shown</Badge>
                      ) : (
                        <Badge icon={EyeOff}>Hidden</Badge>
                      )}
                      <p className="font-semibold text-ink">{a.title}</p>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{a.body}</p>
                    <p className="mt-2 text-xs text-ink-muted">
                      {author ?? "Admin"} · {formatDateTime(a.datePosted)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={toggleAnnouncementAction.bind(null, a.id)}>
                      <SubmitButton variant="secondary" size="sm" pendingText="…">
                        {a.isActive ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                        {a.isActive ? "Hide" : "Show"}
                      </SubmitButton>
                    </form>
                    <form action={deleteAnnouncementAction.bind(null, a.id)}>
                      <SubmitButton variant="danger" size="sm" pendingText="…">
                        <Trash2 aria-hidden />
                        Delete
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
