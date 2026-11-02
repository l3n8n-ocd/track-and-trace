import { z } from "zod";

export const categoryEditSchema = z.object({
  name: z.string().trim().min(2, "Enter a category name of at least 2 characters.").max(100, "Category names must be 100 characters or fewer."),
  parentId: z.union([z.literal("").transform(() => null), z.coerce.number().int().positive().max(2147483647)]),
});

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
export const locationEditSchema = z.object({
  buildingName: z.string().trim().min(2, "Enter a building or place name.").max(150),
  areaDescription: optionalText(255),
  roomNumber: optionalText(50),
  storageBin: optionalText(50),
});
export const collegeEditSchema = z.object({
  name: z.string().trim().min(3, "Enter a college or office name of at least 3 characters.").max(150, "College and office names must be 150 characters or fewer."),
});

// Forms and grouped selectors support a top-level category and its children.
export function categoryParentError(id: number, parentId: number | null, rows: { id: number; parentId: number | null }[]) {
  if (parentId === null) return null;
  if (parentId === id) return "A category cannot be its own parent.";
  const parent = rows.find((row) => row.id === parentId);
  if (!parent || parent.parentId !== null) return "Choose an existing top-level category.";
  if (rows.some((row) => row.parentId === id)) return "A category with subcategories must stay at the top level. Move its subcategories first.";
  return null;
}
