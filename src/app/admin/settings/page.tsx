import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { locationLabel } from "@/server/options";
import {
  addCategoryAction,
  addCollegeAction,
  addLocationAction,
  deleteCategoryAction,
  renameCategoryAction,
  toggleLocationAction,
} from "../actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requireAdmin();
  const sp = await searchParams;
  const [categories, locations, colleges] = await Promise.all([
    db.select().from(schema.category).orderBy(asc(schema.category.name)),
    db.select().from(schema.location).orderBy(asc(schema.location.buildingName)),
    db.select().from(schema.college).orderBy(asc(schema.college.name)),
  ]);
  const parents = categories.filter((c) => c.parentId === null);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Categories, campus places, storage locations, and colleges used in the forms." />
      <Flash sp={sp} />

      <Card>
        <h2 className="font-semibold">Categories</h2>
        <form action={addCategoryAction} className="mt-3 grid gap-3 sm:grid-cols-4">
          <Field label="New category" htmlFor="catName" className="sm:col-span-2">
            <Input id="catName" name="name" required />
          </Field>
          <Field label="Under" htmlFor="parentId">
            <Select id="parentId" name="parentId" defaultValue="">
              <option value="">(top level)</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <SubmitButton size="sm">Add category</SubmitButton>
          </div>
        </form>
        <ul className="mt-5 space-y-3">
          {parents.map((p) => (
            <li key={p.id}>
              <CategoryRow id={p.id} name={p.name} />
              <ul className="ml-6 mt-2 space-y-2 border-l border-slate-200 pl-4">
                {categories
                  .filter((c) => c.parentId === p.id)
                  .map((c) => (
                    <li key={c.id}>
                      <CategoryRow id={c.id} name={c.name} />
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Campus places</h2>
          <p className="mt-1 text-sm text-slate-600">Where items are lost or found.</p>
          <form action={addLocationAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input name="buildingName" placeholder="Building or place" required aria-label="Building or place" />
            <Input name="areaDescription" placeholder="Area (optional)" aria-label="Area" />
            <div className="sm:col-span-2">
              <SubmitButton size="sm">Add place</SubmitButton>
            </div>
          </form>
          <LocationList rows={locations.filter((l) => !l.isStorage)} />
        </Card>
        <Card>
          <h2 className="font-semibold">Storage locations</h2>
          <p className="mt-1 text-sm text-slate-600">Where the office keeps surrendered items.</p>
          <form action={addLocationAction} className="mt-3 grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="isStorage" value="1" />
            <Input name="buildingName" placeholder="Office / building" defaultValue="Lost and Found Office" required aria-label="Office or building" />
            <Input name="roomNumber" placeholder="Room" aria-label="Room" />
            <Input name="storageBin" placeholder="Shelf / bin" aria-label="Shelf or bin" />
            <div className="sm:col-span-3">
              <SubmitButton size="sm">Add storage location</SubmitButton>
            </div>
          </form>
          <LocationList rows={locations.filter((l) => l.isStorage)} />
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold">Colleges and offices</h2>
        <form action={addCollegeAction} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Input name="name" placeholder="College or office name" required aria-label="College or office name" />
          <SubmitButton size="sm">Add</SubmitButton>
        </form>
        <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
          {colleges.map((c) => (
            <li key={c.id} className="text-slate-700">
              {c.name}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function CategoryRow({ id, name }: { id: number; name: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={renameCategoryAction.bind(null, id)} className="flex items-center gap-2">
        <Input name="name" defaultValue={name} className="w-56" aria-label={`Rename ${name}`} />
        <SubmitButton variant="ghost" size="sm" pendingText="…">
          Rename
        </SubmitButton>
      </form>
      <form action={deleteCategoryAction.bind(null, id)}>
        <SubmitButton variant="ghost" size="sm" pendingText="…" className="text-brand-700">
          Delete
        </SubmitButton>
      </form>
    </div>
  );
}

function LocationList({ rows }: { rows: (typeof schema.location.$inferSelect)[] }) {
  return (
    <ul className="mt-4 divide-y divide-slate-100 text-sm">
      {rows.map((l) => (
        <li key={l.id} className="flex items-center justify-between gap-2 py-2">
          <span className={l.isActive ? "" : "text-slate-400 line-through"}>{locationLabel(l)}</span>
          <span className="flex items-center gap-2">
            {!l.isActive && <Badge>Hidden</Badge>}
            <form action={toggleLocationAction.bind(null, l.id)}>
              <SubmitButton variant="ghost" size="sm" pendingText="…">
                {l.isActive ? "Hide" : "Restore"}
              </SubmitButton>
            </form>
          </span>
        </li>
      ))}
    </ul>
  );
}
