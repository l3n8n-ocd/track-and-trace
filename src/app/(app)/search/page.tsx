import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, gte, inArray, lte, or, type SQL } from "drizzle-orm";
import { Button, EmptyState, Field, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { db, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { categoryOptions, categoryWithChildren, placeOptions } from "@/server/options";
import { containsCI } from "@/server/sql";
import { photoUrl } from "@/server/storage";

export const metadata: Metadata = { title: "Search found items" };

const PAGE_SIZE = 12;

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim() : "";
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  await requireUser();
  const sp = await searchParams;
  const q = str(sp.q).slice(0, 100);
  const category = Number(str(sp.category)) || 0;
  const place = Number(str(sp.place)) || 0;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(str(sp.from)) ? str(sp.from) : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(str(sp.to)) ? str(sp.to) : "";
  const page = Math.max(1, Number(str(sp.page)) || 1);

  const filters: (SQL | undefined)[] = [
    eq(schema.report.reportType, "FOUND"),
    eq(schema.report.status, "VERIFIED"),
  ];
  if (q) {
    // Search the public fields only; hidden details are never searchable.
    const words = q.split(/\s+/).filter(Boolean).slice(0, 5);
    for (const w of words) {
      filters.push(
        or(
          containsCI(schema.report.itemName, w),
          containsCI(schema.report.description, w),
          containsCI(schema.report.brand, w),
          containsCI(schema.category.name, w),
        ),
      );
    }
  }
  if (category) filters.push(inArray(schema.report.categoryId, await categoryWithChildren(category)));
  if (place) filters.push(eq(schema.report.locationId, place));
  if (from) filters.push(gte(schema.report.dateLostOrFound, from));
  if (to) filters.push(lte(schema.report.dateLostOrFound, to));
  const where = and(...filters);

  const [categories, places, [{ total }], rows] = await Promise.all([
    categoryOptions(),
    placeOptions(),
    db
      .select({ total: count() })
      .from(schema.report)
      .innerJoin(schema.category, eq(schema.category.id, schema.report.categoryId))
      .where(where),
    db
      .select({
        id: schema.report.id,
        itemName: schema.report.itemName,
        category: schema.category.name,
        building: schema.location.buildingName,
        date: schema.report.dateLostOrFound,
      })
      .from(schema.report)
      .innerJoin(schema.category, eq(schema.category.id, schema.report.categoryId))
      .innerJoin(schema.location, eq(schema.location.id, schema.report.locationId))
      .where(where)
      .orderBy(desc(schema.report.dateLostOrFound), desc(schema.report.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);

  const images = rows.length
    ? await db
        .select({ reportId: schema.reportImage.reportId, imagePath: schema.reportImage.imagePath })
        .from(schema.reportImage)
        .where(inArray(schema.reportImage.reportId, rows.map((r) => r.id)))
    : [];
  const firstImage = new Map<number, string>();
  for (const img of images) if (!firstImage.has(img.reportId)) firstImage.set(img.reportId, img.imagePath);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", String(category));
    if (place) params.set("place", String(place));
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(p));
    return `/search?${params}`;
  };

  return (
    <div>
      <PageHeader
        title="Search found items"
        description="Items the Lost and Found Office has received. Details and photos are limited so only the real owner can describe them."
      />
      <form className="mb-6 grid gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <Field label="Keywords" htmlFor="q" className="sm:col-span-2">
          <Input id="q" name="q" defaultValue={q} placeholder="e.g. umbrella, calculator" />
        </Field>
        <Field label="Category" htmlFor="category">
          <Select id="category" name="category" defaultValue={category || ""}>
            <option value="">All</option>
            {categories.map((c) => (
              <optgroup key={c.id} label={c.name}>
                <option value={c.id}>All {c.name.toLowerCase()}</option>
                {c.children.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="Place found" htmlFor="place">
          <Select id="place" name="place" defaultValue={place || ""}>
            <option value="">Anywhere</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="From" htmlFor="from">
          <Input id="from" name="from" type="date" defaultValue={from} />
        </Field>
        <Field label="To" htmlFor="to">
          <Input id="to" name="to" type="date" defaultValue={to} />
        </Field>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit">Search</Button>
          <LinkButton href="/search" variant="ghost">
            Clear
          </LinkButton>
        </div>
      </form>

      <p className="mb-3 text-sm text-slate-600">
        {total} item{total === 1 ? "" : "s"} found
      </p>
      {rows.length === 0 ? (
        <EmptyState title="No matching items">
          Try fewer keywords or a wider date range. If you lost something,{" "}
          <Link href="/reports/new?type=lost" className="text-brand-700 underline">
            file a lost report
          </Link>{" "}
          and we&apos;ll alert you when it turns up.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => {
            const img = firstImage.get(r.id);
            return (
              <li key={r.id}>
                <Link href={`/items/${r.id}`} className="block overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200 hover:ring-brand-200">
                  <div className="aspect-[4/3] bg-slate-100">
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl(img, { blurred: true, width: 400 })} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate font-medium">{r.itemName}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-600">
                      {r.category} · {r.building}
                    </p>
                    <p className="text-xs text-slate-500">Found {formatDate(r.date)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
          {page > 1 && (
            <Link href={qs(page - 1)} className="text-brand-700 hover:underline">
              ← Previous
            </Link>
          )}
          <span className="text-slate-600">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={qs(page + 1)} className="text-brand-700 hover:underline">
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
