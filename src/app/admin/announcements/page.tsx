import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, EmptyState, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { createAnnouncementAction, deleteAnnouncementAction, toggleAnnouncementAction } from "../actions";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage({ searchParams }: PageProps<"/admin/announcements">) {
  await requireAdmin();
  const sp = await searchParams;
  const items = await db
    .select({ a: schema.announcement, author: schema.user.name })
    .from(schema.announcement)
    .leftJoin(schema.user, eq(schema.user.id, schema.announcement.adminId))
    .orderBy(desc(schema.announcement.datePosted));
  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Messages shown on every user's dashboard, such as office hours or unclaimed item drives." />
      <Flash sp={sp} />
      <Card>
        <form action={createAnnouncementAction} className="space-y-4">
          <Field label="Title" htmlFor="title" required>
            <Input id="title" name="title" maxLength={150} required />
          </Field>
          <Field label="Message" htmlFor="body" required>
            <Textarea id="body" name="body" rows={4} required />
          </Field>
          <div className="flex justify-end">
            <SubmitButton pendingText="Posting…">Post announcement</SubmitButton>
          </div>
        </form>
      </Card>
      {items.length === 0 ? (
        <EmptyState title="No announcements yet" />
      ) : (
        <ul className="space-y-3">
          {items.map(({ a, author }) => (
            <li key={a.id} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {a.title} {a.isActive ? <Badge tone="green">Shown</Badge> : <Badge>Hidden</Badge>}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{a.body}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {author ?? "Admin"} · {formatDateTime(a.datePosted)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={toggleAnnouncementAction.bind(null, a.id)}>
                    <SubmitButton variant="secondary" size="sm" pendingText="…">
                      {a.isActive ? "Hide" : "Show"}
                    </SubmitButton>
                  </form>
                  <form action={deleteAnnouncementAction.bind(null, a.id)}>
                    <SubmitButton variant="danger" size="sm" pendingText="…">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
