import { describe, expect, it } from "vitest";
import {
  MATCH_THRESHOLD,
  canonicalColor,
  scoreMatch,
  textSimilarity,
  withinDateWindow,
  type MatchableReport,
} from "@/lib/matching";

const base: MatchableReport = {
  itemName: "Black Samsung phone",
  description: "Samsung Galaxy A15 with a clear case and a sticker on the back",
  categoryId: 2,
  categoryParentId: 1,
  locationId: 3,
  buildingName: "Library",
  color: "black",
  brand: "Samsung",
  dateLostOrFound: "2026-10-10",
};

describe("scoreMatch", () => {
  it("scores the same item described differently above the threshold", () => {
    const found: MatchableReport = {
      ...base,
      itemName: "Samsung cellphone",
      description: "Galaxy phone, clear case",
      color: "Itim",
      dateLostOrFound: "2026-10-11",
    };
    const s = scoreMatch(base, found);
    expect(s.total).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    expect(s.color).toBe(8);
    expect(s.brand).toBe(7);
  });

  it("scores an unrelated item below the threshold", () => {
    const found: MatchableReport = {
      ...base,
      itemName: "Blue umbrella",
      description: "Folding umbrella",
      categoryId: 20,
      categoryParentId: 19,
      locationId: 9,
      buildingName: "Gymnasium",
      color: "blue",
      brand: null,
    };
    expect(scoreMatch(base, found).total).toBeLessThan(MATCH_THRESHOLD);
  });

  it("gives partial category credit for a parent category", () => {
    const found = { ...base, categoryId: 1, categoryParentId: null };
    expect(scoreMatch(base, found).category).toBe(8);
  });

  it("gives no date credit outside the window", () => {
    const found = { ...base, dateLostOrFound: "2026-09-01" };
    expect(scoreMatch(base, found).date).toBe(0);
  });
});

describe("helpers", () => {
  it("treats typos and plurals as similar", () => {
    const a = { ...base, itemName: "earphones", description: null };
    const b = { ...base, itemName: "earphone", description: null };
    expect(textSimilarity(a, b)).toBeGreaterThan(0.6);
  });

  it("maps Filipino color names", () => {
    expect(canonicalColor("pula")).toBe("red");
    expect(canonicalColor("Navy Blue")).toBe("blue");
    expect(canonicalColor("matte black")).toBe("black");
  });

  it("checks the date window", () => {
    expect(withinDateWindow("2026-10-10", "2026-10-08")).toBe(true);
    expect(withinDateWindow("2026-10-10", "2026-10-01")).toBe(false);
    expect(withinDateWindow("2026-10-10", "2026-12-20")).toBe(false);
  });
});
