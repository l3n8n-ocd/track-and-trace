import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  CornerDownRight,
  Eye,
  EyeOff,
  Layers,
  MapPin,
  Plus,
  School,
  Settings,
  Tags,
  Trash2,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { Flash } from "@/components/flash";
import { EditSettingDialog } from "@/components/edit-setting-dialog";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, CardHeader, Field, ICON_STROKE, Input, PageHeader, Select, cn } from "@/components/ui";
import { schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { categories as categoryRows, locations as locationRows, collegeOptions, locationLabel } from "@/server/options";
import {
  addCategoryAction,
  addCollegeAction,
  addLocationAction,
  deleteCategoryAction,
  updateCategoryAction,
  updateCollegeAction,
  updateLocationAction,
  toggleLocationAction,
} from "../actions";

export const metadata: Metadata = { title: "Settings" };

type TabKey = "categories" | "places" | "storage" | "colleges";
const TABS: { key: TabKey; label: string; hint: string; icon: LucideIcon }[] = [
  { key: "categories", label: "Categories", hint: "Item types in the report forms", icon: Tags },
  { key: "places", label: "Campus places", hint: "Where items are lost or found", icon: MapPin },
  { key: "storage", label: "Storage", hint: "Shelves and bins in the office", icon: Warehouse },
  { key: "colleges", label: "Colleges and offices", hint: "Choices at registration", icon: School },
];

type Location = typeof schema.location.$inferSelect;

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "categories";
  const [categories, locations, colleges] = await Promise.all([
    categoryRows(),
    locationRows(),
    collegeOptions(),
  ]);
  const parents = categories.filter((c) => c.parentId === null);
  const places = locations.filter((l) => !l.isStorage);
  const storage = locations.filter((l) => l.isStorage);
  const counts: Record<TabKey, number> = {
    categories: categories.length,
    places: places.filter((l) => l.isActive).length,
    storage: storage.filter((l) => l.isActive).length,
    colleges: colleges.length,
  };
  const tabInput = <input type="hidden" name="tab" value={tab} />;

  return (
    <div>
      <PageHeader icon={Settings} title="Settings" description="The lists people pick from in Track-and-Trace forms." />
      <Flash sp={sp} />
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-paper p-1.5 lg:sticky lg:top-24 lg:flex-col">
          {TABS.map(({ key, label, hint, icon: Icon }) => {
            const active = key === tab;
            return (
              <Link
                key={key}
                href={`/admin/settings?tab=${key}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                  active ? "bg-oxblood text-cream" : "text-ink-soft hover:bg-sand",
                )}
              >
                <Icon aria-hidden strokeWidth={ICON_STROKE} className={cn("size-5 shrink-0", active ? "text-amber" : "text-crimson")} />
                <span className="min-w-0 flex-1">
                  <span className="block whitespace-nowrap text-sm font-semibold">{label}</span>
                  <span className={cn("hidden text-xs lg:block", active ? "text-cream/70" : "text-ink-muted")}>{hint}</span>
                </span>
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs font-bold tabular-nums leading-5",
                    active ? "bg-cream/15 text-cream" : "bg-sand text-ink-muted",
                  )}
                >
                  {counts[key]}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 animate-fade" key={tab}>
          {tab === "categories" && (
            <Card>
              <CardHeader icon={Tags} title="Categories" description="Group specific types under a broader one, like Phones under Electronics." />
              <form action={addCategoryAction} className="mb-6 flex flex-col gap-2 rounded-xl bg-sand/60 p-3 sm:flex-row">
                {tabInput}
                <Input name="name" icon={Plus} placeholder="New category name" required aria-label="New category name" className="flex-1" />
                <Select name="parentId" defaultValue="" icon={Layers} aria-label="Put it under" className="sm:w-56">
                  <option value="">Top level</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      Under {p.name}
                    </option>
                  ))}
                </Select>
                <SubmitButton>Add</SubmitButton>
              </form>
              <ul className="space-y-2">
                {parents.map((p) => {
                  const children = categories.filter((c) => c.parentId === p.id);
                  return (
                    <li key={p.id} className="rounded-xl border border-line">
                      <details className="group/cat" open={children.length > 0 && children.length <= 3}>
                        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5">
                          <ChevronDown
                            aria-hidden
                            strokeWidth={ICON_STROKE}
                            className="size-4 text-ink-muted transition-transform group-open/cat:rotate-180"
                          />
                          <span className="flex-1 font-semibold text-ink">{p.name}</span>
                          <Badge>{children.length} sub</Badge>
                        </summary>
                        <div className="border-t border-line px-3 py-2">
                          <CategoryRow id={p.id} name={p.name} parentId={p.parentId} parents={parents} hasChildren={children.length > 0} tab={tab} parent />
                          {children.map((c) => (
                            <CategoryRow key={c.id} id={c.id} name={c.name} parentId={c.parentId} parents={parents} tab={tab} />
                          ))}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {tab === "places" && (
            <Card>
              <CardHeader icon={MapPin} title="Campus places" description="Where items are lost or found. Hidden places stay on old reports." />
              <form action={addLocationAction} className="mb-6 flex flex-col gap-2 rounded-xl bg-sand/60 p-3 sm:flex-row">
                {tabInput}
                <Input name="buildingName" icon={Building2} placeholder="Building or place" required aria-label="Building or place" className="flex-1" />
                <Input name="areaDescription" placeholder="Area (optional)" aria-label="Area" className="sm:w-48" />
                <SubmitButton>
                  <Plus aria-hidden />
                  Add place
                </SubmitButton>
              </form>
              <LocationList rows={places} tab={tab} />
            </Card>
          )}

          {tab === "storage" && (
            <Card>
              <CardHeader icon={Warehouse} title="Storage locations" description="Where the office keeps surrendered items. Chosen when verifying a found report." />
              <form action={addLocationAction} className="mb-6 grid gap-2 rounded-xl bg-sand/60 p-3 sm:grid-cols-[minmax(0,1fr)_140px_140px_auto]">
                {tabInput}
                <input type="hidden" name="isStorage" value="1" />
                <Input name="buildingName" icon={Building2} placeholder="Office / building" defaultValue="Lost and Found Office" required aria-label="Office or building" />
                <Input name="roomNumber" placeholder="Room" aria-label="Room" />
                <Input name="storageBin" placeholder="Shelf / bin" aria-label="Shelf or bin" />
                <SubmitButton>
                  <Plus aria-hidden />
                  Add
                </SubmitButton>
              </form>
              <LocationList rows={storage} tab={tab} />
            </Card>
          )}

          {tab === "colleges" && (
            <Card>
              <CardHeader icon={School} title="Colleges and offices" description="Shown when people register and edit their profile." />
              <form action={addCollegeAction} className="mb-6 flex flex-col gap-2 rounded-xl bg-sand/60 p-3 sm:flex-row">
                {tabInput}
                <Input name="name" icon={Plus} placeholder="College or office name" required aria-label="College or office name" className="flex-1" />
                <SubmitButton>Add</SubmitButton>
              </form>
              <ul className="grid gap-x-6 sm:grid-cols-2">
                {colleges.map((c) => (
                  <li key={c.id} className="flex min-w-0 items-center gap-2.5 border-b border-line py-2.5 text-sm text-ink">
                    <School aria-hidden strokeWidth={ICON_STROKE} className="size-4 shrink-0 text-ink-faint" />
                    <span className="min-w-0 flex-1 break-words">{c.name}</span>
                    <EditSettingDialog title="Edit college or office" label={`Edit college or office ${c.name}`} action={updateCollegeAction.bind(null, c.id)}>
                      <input type="hidden" name="tab" value={tab} />
                      <Field label="College or office name" htmlFor={`college-name-${c.id}`} required>
                        <Input id={`college-name-${c.id}`} name="name" defaultValue={c.name} minLength={3} maxLength={150} required />
                      </Field>
                    </EditSettingDialog>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ id, name, parentId, parents, tab, parent = false, hasChildren = false }: {
  id: number; name: string; parentId: number | null;
  parents: { id: number; name: string }[]; tab: string; parent?: boolean; hasChildren?: boolean;
}) {
  return (
    <div className="group/row flex items-center gap-2 rounded-xl py-1.5 pl-1">
      {parent ? (
        <span className="w-4" />
      ) : (
        <CornerDownRight aria-hidden strokeWidth={ICON_STROKE} className="size-4 shrink-0 text-ink-faint" />
      )}
      <span className={cn("min-w-0 flex-1 break-words text-sm", parent ? "text-ink-muted" : "text-ink")}>{parent ? `${name} (general)` : name}</span>
      <EditSettingDialog title="Edit category" label={`Edit category ${name}`} action={updateCategoryAction.bind(null, id)}>
        <input type="hidden" name="tab" value={tab} />
        <Field label="Category name" htmlFor={`category-name-${id}`} required>
          <Input id={`category-name-${id}`} name="name" defaultValue={name} minLength={2} maxLength={100} required />
        </Field>
        <Field label="Parent category" htmlFor={`category-parent-${id}`} hint={hasChildren ? "Categories with subcategories stay at the top level. Move their subcategories first to change this." : undefined}>
          <Select id={`category-parent-${id}`} name="parentId" defaultValue={parentId ?? ""} disabled={hasChildren}>
            <option value="">Top level</option>
            {parents.filter((p) => p.id !== id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      </EditSettingDialog>
      <form action={deleteCategoryAction.bind(null, id)}>
        <input type="hidden" name="tab" value={tab} />
        <SubmitButton variant="ghost" size="sm" pendingText="…" aria-label={`Delete ${name}`} title="Delete" className="size-9 px-0 text-ink-muted hover:text-berry">
          <Trash2 aria-hidden />
        </SubmitButton>
      </form>
    </div>
  );
}

function LocationList({ rows, tab }: { rows: Location[]; tab: string }) {
  const sorted = [...rows.filter((l) => l.isActive), ...rows.filter((l) => !l.isActive)];
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {sorted.map((l) => (
        <li key={l.id} className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2", !l.isActive && "bg-sand/40")}>
          <span className={cn("flex min-w-0 flex-1 items-center gap-2.5 text-sm", l.isActive ? "text-ink" : "text-ink-muted line-through")}>
            {l.isActive ? (
              <Eye aria-hidden strokeWidth={ICON_STROKE} className="size-4 shrink-0 text-crimson" />
            ) : (
              <EyeOff aria-hidden strokeWidth={ICON_STROKE} className="size-4 shrink-0 text-ink-faint" />
            )}
            <span className="break-words">{locationLabel(l)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {!l.isActive && <Badge>Hidden</Badge>}
            <EditSettingDialog title={l.isStorage ? "Edit storage location" : "Edit campus place"} label={`Edit ${l.isStorage ? "storage location" : "campus place"} ${locationLabel(l)}`} action={updateLocationAction.bind(null, l.id)}>
              <input type="hidden" name="tab" value={tab} />
              <Field label={l.isStorage ? "Office or building" : "Building or place"} htmlFor={`location-building-${l.id}`} required>
                <Input id={`location-building-${l.id}`} name="buildingName" defaultValue={l.buildingName} minLength={2} maxLength={150} required />
              </Field>
              <Field label="Area description" htmlFor={`location-area-${l.id}`}>
                <Input id={`location-area-${l.id}`} name="areaDescription" defaultValue={l.areaDescription ?? ""} maxLength={255} />
              </Field>
              <Field label="Room" htmlFor={`location-room-${l.id}`}>
                <Input id={`location-room-${l.id}`} name="roomNumber" defaultValue={l.roomNumber ?? ""} maxLength={50} />
              </Field>
              {l.isStorage && <Field label="Shelf or bin" htmlFor={`location-bin-${l.id}`}>
                <Input id={`location-bin-${l.id}`} name="storageBin" defaultValue={l.storageBin ?? ""} maxLength={50} />
              </Field>}
            </EditSettingDialog>
            <form action={toggleLocationAction.bind(null, l.id)}>
              <input type="hidden" name="tab" value={tab} />
              <SubmitButton variant={l.isActive ? "ghost" : "secondary"} size="sm" pendingText="…">
                {l.isActive ? "Hide" : "Restore"}
              </SubmitButton>
            </form>
          </span>
        </li>
      ))}
    </ul>
  );
}
