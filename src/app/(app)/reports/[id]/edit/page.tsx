import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { db, schema } from "@/db";
import { todayPH } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { categoryOptions, placeOptions } from "@/server/options";
import { imagesFor } from "@/server/queries";
import { photoUrl } from "@/server/storage";
import { updateReportAction } from "../../actions";
import { ReportForm } from "../../report-form";

export const metadata: Metadata = { title: "Edit report" };

export default async function EditReportPage({ params }: PageProps<"/reports/[id]/edit">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const found = await db.query.report.findFirst({
    where: and(eq(schema.report.id, id), eq(schema.report.userId, user.id)),
  });
  if (!found) notFound();
  const report = { ...found, images: (await imagesFor([found.id])).get(found.id) ?? [] };
  if (!["PENDING", "VERIFIED"].includes(report.status)) redirect(`/reports/${id}`);
  const [categories, places] = await Promise.all([categoryOptions(), placeOptions()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`Edit report #${report.id}`} />
      <ReportForm
        type={report.reportType}
        categories={categories}
        places={places}
        today={todayPH()}
        action={updateReportAction.bind(null, report.id)}
        existing={{
          ...report,
          images: report.images.map((img) => ({ id: img.id, url: photoUrl(img.imagePath, { width: 200 }) })),
        }}
      />
    </div>
  );
}
