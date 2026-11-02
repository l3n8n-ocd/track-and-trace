import { describe, expect, it } from "vitest";
import { descendantCategoryIds, keywordCategoryIds } from "@/lib/category-search";

const categories = [
  { id: 1, name: "Electronics", parentId: null },
  { id: 2, name: "Chargers and Cables", parentId: 1 },
  { id: 3, name: "USB-C cables", parentId: 2 },
  { id: 4, name: "Power Banks", parentId: 1 },
  { id: 5, name: "Clothing", parentId: null },
];
describe("category-aware found-item search", () => {
  it("includes grandchildren without unrelated categories", () => {
    expect(descendantCategoryIds(1, categories)).toEqual([1, 2, 4, 3]);
    expect(keywordCategoryIds("electronics", categories)).toEqual([1, 2, 4, 3]);
  });
  it.each(["charger", "CHARGERS", "charging"])("finds related cables and power banks for %s", (word) => {
    expect(keywordCategoryIds(word, categories).sort()).toEqual([2, 3, 4]);
  });
  it("keeps unrelated and empty queries narrow", () => {
    expect(keywordCategoryIds("clothing", categories)).toEqual([5]);
    expect(keywordCategoryIds("unknown", categories)).toEqual([]);
    expect(keywordCategoryIds(" ", categories)).toEqual([]);
  });
  it("terminates even if imported categories form a cycle", () => {
    expect(descendantCategoryIds(1, [{ id: 1, name: "A", parentId: 2 }, { id: 2, name: "B", parentId: 1 }])).toEqual([1, 2]);
  });
});
