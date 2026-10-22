import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUser } from "@/lib/session";
import { loadProfile } from "@/server/profile";
import { imagesFor, proofsFor, selectReports } from "@/server/queries";

// "Download my data" (Data Privacy Act right of access).
export async function GET() {
  const session = await getSessionUser();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const [user, profile, reportRows, claims, notifications] = await Promise.all([
    db.query.user.findFirst({
      where: eq(schema.user.id, session.id),
      columns: {
        id: true, name: true, email: true, idNumber: true, firstName: true, lastName: true,
        contactNo: true, role: true, status: true, collegeId: true, createdAt: true,
      },
    }),
    loadProfile(session.id),
    selectReports().where(eq(schema.report.userId, session.id)).orderBy(desc(schema.report.dateReported)),
    db.select().from(schema.claim).where(eq(schema.claim.claimantId, session.id)).orderBy(desc(schema.claim.claimDate)),
    db.select().from(schema.notification).where(eq(schema.notification.userId, session.id)).orderBy(desc(schema.notification.dateSent)),
  ]);
  const images = await imagesFor(reportRows.map((r) => r.report.id));
  const proofs = await proofsFor(claims.map((c) => c.id));
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      user: { ...user, ...profile },
      reports: reportRows.map((r) => ({
        ...r.report,
        category: r.category.name,
        location: r.location.buildingName,
        images: images.get(r.report.id) ?? [],
      })),
      claims: claims.map((c) => ({ ...c, proofs: proofs.get(c.id) ?? [] })),
      notifications,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="returndesk-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
