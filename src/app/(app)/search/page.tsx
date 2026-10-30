import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, gte, inArray, lte, or, type SQL } from "drizzle-orm";
import { ArrowRight, CalendarDays, ChevronDown, ImageOff, MapPin, PackageSearch, Search, Tag, X } from "lucide-react";
import { TypeBadge } from "@/components/status-badge";
import { Button, EmptyState, Field, ICON_STROKE, Input, LinkButton, PageHeader, Pagination, Select, Toolbar } from "@/components/ui";
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

  const hasFilters = Boolean(q || category || place || from || to);

  return (
    <div>
      <PageHeader
        icon={Search}
        title="Search found items"
        description="Items the Lost and Found Office has received. Details and photos are limited so only the real owner can describe them."
      />
      <Toolbar className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12" role="search">
        <Field label="Keywords" htmlFor="q" className="sm:col-span-2 lg:col-span-4">
          <Input id="q" name="q" icon={Search} defaultValue={q} placeholder="e.g. umbrella, calculator, ID" />
        </Field>
        <Field label="Category" htmlFor="category" className="lg:col-span-3">
          <Select id="category" name="category" icon={Tag} defaultValue={category || ""}>
            <option value="">All categories</option>
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
        <Field label="Place found" htmlFor="place" className="lg:col-span-3">
          <Select id="place" name="place" icon={MapPin} defaultValue={place || ""}>
            <option value="">Anywhere on campus</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
          <Button type="submit" className="flex-1">
            <Search aria-hidden />
            Search
          </Button>
        </div>
        <details className="group sm:col-span-2 lg:col-span-12" open={Boolean(from || to)}>
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
            <CalendarDays aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
            Date range
            <ChevronDown aria-hidden strokeWidth={ICON_STROKE} className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
            <Field label="Found from" htmlFor="from">
              <Input id="from" name="from" type="date" icon={CalendarDays} defaultValue={from} />
            </Field>
            <Field label="Found until" htmlFor="to">
              <Input id="to" name="to" type="date" icon={CalendarDays} defaultValue={to} />
            </Field>
          </div>
        </details>
      </Toolbar>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-soft">
          {total} item{total === 1 ? "" : "s"} found
        </p>
        {hasFilters && (
          <Link href="/search" className="inline-flex items-center gap-1 text-sm font-semibold text-crimson hover:underline">
            <X aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
            Clear filters
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No matching items"
          action={<LinkButton href="/reports/new?type=lost">File a lost report</LinkButton>}
        >
          Try fewer keywords or a wider date range. If you lost something, file a lost report and we&apos;ll
          alert you when it turns up.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => {
            const img = firstImage.get(r.id);
            return (
              <li key={r.id}>
                <Link
                  href={`/items/${r.id}`}
                  className="group block overflow-hidden rounded-2xl border border-line bg-paper transition-colors hover:border-line-strong"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-sand">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl(img, { blurred: true, width: 480 })}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-ink-faint">
                        <ImageOff aria-hidden strokeWidth={ICON_STROKE} className="size-6" />
                      </span>
                    )}
                    <span className="absolute left-3 top-3">
                      <TypeBadge type="FOUND" />
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="truncate text-[15px] font-semibold text-ink">{r.itemName}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 truncate text-[13px] text-ink-muted">
                      <Tag aria-hidden strokeWidth={ICON_STROKE} className="size-3.5 shrink-0" />
                      {r.category}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-[13px] text-ink-muted">
                      <MapPin aria-hidden strokeWidth={ICON_STROKE} className="size-3.5 shrink-0" />
                      {r.building} · {formatDate(r.date)}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-crimson">
                      Is this yours?
                      <ArrowRight aria-hidden strokeWidth={ICON_STROKE} className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={page} pages={pages} href={qs} />
    </div>
  );
}
