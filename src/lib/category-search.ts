type Category = { id: number; name: string; parentId: number | null };
const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function descendantCategoryIds(id: number, categories: Category[]): number[] {
  const result = new Set([id]);
  for (const parent of result) for (const row of categories) if (row.parentId === parent) result.add(row.id);
  return [...result];
}

// Search-only expansion, not a change to ownership or automatic match scores.
export function keywordCategoryIds(word: string, categories: Category[]): number[] {
  const term = normalize(word);
  if (!term) return [];
  const charging = ["charger", "chargers", "charging"].includes(term);
  const matched = categories.filter(row => {
    const name = normalize(row.name);
    return name.includes(term) || charging && (name.includes("chargers and cables") || name.includes("power banks"));
  });
  return [...new Set(matched.flatMap(row => descendantCategoryIds(row.id, categories)))];
}
