import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export type CategoryOption = { id: number; name: string; parentId: number | null };
export type LocationOption = { id: number; label: string };

// Categories ordered as "Parent" then its children, for grouped selects.
export async function categoryOptions(): Promise<{ id: number; name: string; children: CategoryOption[] }[]> {
  const rows = await db.select().from(schema.category).orderBy(asc(schema.category.name));
  const parents = rows.filter((r) => r.parentId === null);
  return parents.map((p) => ({
    id: p.id,
    name: p.name,
    children: rows.filter((r) => r.parentId === p.id),
  }));
}

export function locationLabel(l: {
  buildingName: string;
  areaDescription?: string | null;
  roomNumber?: string | null;
  storageBin?: string | null;
}) {
  return [l.buildingName, l.areaDescription, l.roomNumber, l.storageBin].filter(Boolean).join(" – ");
}

export async function placeOptions(): Promise<LocationOption[]> {
  const rows = await db
    .select()
    .from(schema.location)
    .where(eq(schema.location.isStorage, false))
    .orderBy(asc(schema.location.buildingName));
  return rows.filter((r) => r.isActive).map((r) => ({ id: r.id, label: locationLabel(r) }));
}

export async function storageOptions(): Promise<LocationOption[]> {
  const rows = await db
    .select()
    .from(schema.location)
    .where(eq(schema.location.isStorage, true))
    .orderBy(asc(schema.location.buildingName));
  return rows.filter((r) => r.isActive).map((r) => ({ id: r.id, label: locationLabel(r) }));
}

// The category and all its children, for filtering searches.
export async function categoryWithChildren(categoryId: number): Promise<number[]> {
  const children = await db
    .select({ id: schema.category.id })
    .from(schema.category)
    .where(eq(schema.category.parentId, categoryId));
  return [categoryId, ...children.map((c) => c.id)];
}
