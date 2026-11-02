import { describe, expect, it } from "vitest";
import { categoryEditSchema, categoryParentError, collegeEditSchema, locationEditSchema } from "@/lib/settings";

const categories = [{ id: 1, parentId: null }, { id: 2, parentId: 1 }, { id: 3, parentId: null }];

describe("settings edits", () => {
  it("trims names and parses a top-level or existing parent selection", () => {
    expect(categoryEditSchema.parse({ name: "  Phones  ", parentId: "" })).toEqual({ name: "Phones", parentId: null });
    expect(categoryEditSchema.parse({ name: "Phones", parentId: "1" }).parentId).toBe(1);
  });

  it.each(["0", "-1", "1.5", "not-an-id", "2147483648"])("rejects invalid parent IDs (%s)", (parentId) => {
    expect(categoryEditSchema.safeParse({ name: "Phones", parentId }).success).toBe(false);
  });

  it("rejects empty and oversized names before writing to bounded database columns", () => {
    expect(categoryEditSchema.safeParse({ name: " ", parentId: "" }).success).toBe(false);
    expect(categoryEditSchema.safeParse({ name: "a".repeat(101), parentId: "" }).success).toBe(false);
    expect(collegeEditSchema.safeParse({ name: "a".repeat(151) }).success).toBe(false);
    expect(collegeEditSchema.parse({ name: "  College of Science  " }).name).toBe("College of Science");
  });

  it("prevents cycles and unsupported nested category trees", () => {
    expect(categoryParentError(1, 1, categories)).toMatch(/own parent/);
    expect(categoryParentError(1, 2, categories)).toMatch(/top-level/);
    expect(categoryParentError(1, 3, categories)).toMatch(/subcategories/);
    expect(categoryParentError(2, 999, categories)).toMatch(/existing/);
    expect(categoryParentError(2, 3, categories)).toBeNull();
    expect(categoryParentError(2, null, categories)).toBeNull();
  });

  it("supports clearing optional location fields without changing location type or visibility", () => {
    const result = locationEditSchema.parse({ buildingName: "  Library  ", areaDescription: "", roomNumber: "  ", storageBin: " A2 ", isActive: true, isStorage: false });
    expect(result).toEqual({ buildingName: "Library", areaDescription: null, roomNumber: null, storageBin: "A2" });
  });

  it("rejects oversized location fields", () => {
    const location = { buildingName: "Office", areaDescription: "", roomNumber: "", storageBin: "" };
    for (const [field, max] of [["buildingName", 150], ["areaDescription", 255], ["roomNumber", 50], ["storageBin", 50]] as const) {
      expect(locationEditSchema.safeParse({ ...location, [field]: "x".repeat(max + 1) }).success).toBe(false);
    }
  });
});
