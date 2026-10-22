import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, cn } from "@/components/ui";
import { todayPH } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { categoryOptions, placeOptions } from "@/server/options";
import { createReportAction } from "../actions";
import { ReportForm } from "../report-form";

export const metadata: Metadata = { title: "New report" };

export default async function NewReportPage({ searchParams }: PageProps<"/reports/new">) {
  await requireUser();
  const sp = await searchParams;
  const type = sp.type === "found" ? "FOUND" : "LOST";
  const [categories, places] = await Promise.all([categoryOptions(), placeOptions()]);
  const tab = (t: "lost" | "found", label: string) => (
    <Link
      href={`/reports/new?type=${t}`}
      className={cn(
        "flex-1 rounded-md px-4 py-2 text-center text-sm font-medium",
        (t === "found") === (type === "FOUND") ? "bg-white text-brand-700 shadow-sm" : "text-slate-600",
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={type === "LOST" ? "Report a lost item" : "Report a found item"}
        description="Fields marked * are required."
      />
      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1">
        {tab("lost", "I lost something")}
        {tab("found", "I found something")}
      </div>
      <ReportForm
        key={type}
        type={type}
        categories={categories}
        places={places}
        today={todayPH()}
        action={createReportAction}
      />
    </div>
  );
}
