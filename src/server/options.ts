import "server-only";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { unstable_cache } from "next/cache";
import { cache } from "react";

// Only shared reference data is persisted. Each matching admin mutation
// expires its tag immediately; user-specific data never enters this cache.
export const CATEGORY_OPTIONS_TAG = "reference-categories";
export const LOCATION_OPTIONS_TAG = "reference-locations";
export const COLLEGE_OPTIONS_TAG = "reference-colleges";

export const categories = cache(unstable_cache(
  async () => db.select().from(schema.category).orderBy(asc(schema.category.name)),
  ["reference-categories-v1"],
  { tags: [CATEGORY_OPTIONS_TAG], revalidate: 3600 },
));

export const locations = cache(unstable_cache(
  async () => db.select().from(schema.location).orderBy(asc(schema.location.buildingName)),
  ["reference-locations-v1"],
  { tags: [LOCATION_OPTIONS_TAG], revalidate: 3600 },
));

export const collegeOptions = cache(unstable_cache(
  async () => db.select().from(schema.college).orderBy(asc(schema.college.name)),
  ["reference-colleges-v1"],
  { tags: [COLLEGE_OPTIONS_TAG], revalidate: 3600 },
));

export type CategoryOption = { id: number; name: string; parentId: number | null };
export type LocationOption = { id: number; label: string };

// Categories ordered as "Parent" then its children, for grouped selects.
export async function categoryOptions(): Promise<{ id: number; name: string; children: CategoryOption[] }[]> {
  const rows = await categories();
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
  const rows = await locations();
  return rows.filter((r) => !r.isStorage && r.isActive).map((r) => ({ id: r.id, label: locationLabel(r) }));
}

export async function storageOptions(): Promise<LocationOption[]> {
  const rows = await locations();
  return rows.filter((r) => r.isStorage && r.isActive).map((r) => ({ id: r.id, label: locationLabel(r) }));
}

// The category and all its children, for filtering searches.
export async function categoryWithChildren(categoryId: number): Promise<number[]> {
  const children = (await categories()).filter((c) => c.parentId === categoryId);
  return [categoryId, ...children.map((c) => c.id)];
}
