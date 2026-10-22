// Match scoring (system design §9). Pure functions so they can be unit
// tested and tuned with the matching accuracy test.

export const MATCH_THRESHOLD = 60;
export const MAX_MATCHES_PER_REPORT = 5;
export const DATE_WINDOW_BEFORE_DAYS = 3;
export const DATE_WINDOW_AFTER_DAYS = 60;

export const WEIGHTS = {
  text: 45,
  category: 15,
  location: 15,
  date: 10,
  color: 8,
  brand: 7,
} as const;

export type MatchableReport = {
  itemName: string;
  description: string | null;
  categoryId: number;
  categoryParentId: number | null;
  locationId: number;
  buildingName: string;
  color: string | null;
  brand: string | null;
  dateLostOrFound: string; // YYYY-MM-DD
};

export type ScoreBreakdown = {
  text: number;
  category: number;
  location: number;
  date: number;
  color: number;
  brand: number;
  total: number;
};

// Common English and Filipino words that carry no meaning for matching.
const STOP_WORDS = new Set(
  (
    "a an the and or of in on at to for with my your his her its is was it this that " +
    "lost found item color colour near inside left please ang ng sa na at mga si ni ko " +
    "ito iyan yung yong kulay may wala nawala nakita"
  ).split(" "),
);

const COLOR_SYNONYMS: Record<string, string> = {
  itim: "black",
  puti: "white",
  pula: "red",
  asul: "blue",
  bughaw: "blue",
  "navy blue": "blue",
  navy: "blue",
  berde: "green",
  luntian: "green",
  dilaw: "yellow",
  kayumanggi: "brown",
  tsokolate: "brown",
  abo: "gray",
  grey: "gray",
  silver: "gray",
  pilak: "gray",
  rosas: "pink",
  lila: "purple",
  violet: "purple",
  ube: "purple",
  kahel: "orange",
  ginto: "gold",
  "rose gold": "pink",
  beige: "brown",
  cream: "white",
};

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(value: string | null | undefined): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function trigrams(value: string): Set<string> {
  const s = ` ${value} `;
  const out = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
  return out;
}

// Dice coefficient over character trigrams: tolerant of typos and plurals.
export function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return (2 * shared) / (ta.size + tb.size);
}

// Share of the smaller token set found in the larger one.
export function tokenOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let shared = 0;
  for (const t of sa) if (sb.has(t)) shared++;
  return shared / Math.min(sa.size, sb.size);
}

export function textSimilarity(lost: MatchableReport, found: MatchableReport): number {
  const lostName = tokens(lost.itemName).join(" ");
  const foundName = tokens(found.itemName).join(" ");
  const nameScore = Math.max(
    trigramSimilarity(lostName, foundName),
    tokenOverlap(tokens(lost.itemName), tokens(found.itemName)),
  );
  const lostAll = tokens(`${lost.itemName} ${lost.description ?? ""}`);
  const foundAll = tokens(`${found.itemName} ${found.description ?? ""}`);
  const allScore = Math.max(
    trigramSimilarity(lostAll.join(" "), foundAll.join(" ")),
    tokenOverlap(lostAll, foundAll) * 0.9,
  );
  // The item name matters most; the description refines it.
  return Math.min(1, 0.65 * nameScore + 0.35 * allScore);
}

const BASE_COLORS = new Set(Object.values(COLOR_SYNONYMS));

export function canonicalColor(value: string | null | undefined): string | null {
  const v = normalizeText(value);
  if (!v) return null;
  if (COLOR_SYNONYMS[v]) return COLOR_SYNONYMS[v];
  for (const word of v.split(" ")) {
    if (COLOR_SYNONYMS[word]) return COLOR_SYNONYMS[word];
    if (BASE_COLORS.has(word)) return word;
  }
  return v;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

// True when a found date is plausible for a lost date.
export function withinDateWindow(lostDate: string, foundDate: string): boolean {
  const diff = daysBetween(lostDate, foundDate);
  return diff >= -DATE_WINDOW_BEFORE_DAYS && diff <= DATE_WINDOW_AFTER_DAYS;
}

export function categoriesRelated(a: MatchableReport, b: MatchableReport): "same" | "family" | "none" {
  if (a.categoryId === b.categoryId) return "same";
  if (a.categoryParentId === b.categoryId || b.categoryParentId === a.categoryId) return "family";
  return "none";
}

export function scoreMatch(lost: MatchableReport, found: MatchableReport): ScoreBreakdown {
  const text = WEIGHTS.text * textSimilarity(lost, found);

  const rel = categoriesRelated(lost, found);
  const category = rel === "same" ? WEIGHTS.category : rel === "family" ? 8 : 0;

  const location =
    lost.locationId === found.locationId
      ? WEIGHTS.location
      : normalizeText(lost.buildingName) === normalizeText(found.buildingName)
        ? 10
        : 0;

  const gap = Math.abs(daysBetween(lost.dateLostOrFound, found.dateLostOrFound));
  const date = withinDateWindow(lost.dateLostOrFound, found.dateLostOrFound)
    ? WEIGHTS.date * Math.max(0, 1 - gap / DATE_WINDOW_AFTER_DAYS)
    : 0;

  const lc = canonicalColor(lost.color);
  const fc = canonicalColor(found.color);
  const color = lc && fc && lc === fc ? WEIGHTS.color : 0;

  const lb = normalizeText(lost.brand);
  const fb = normalizeText(found.brand);
  const brand = lb && fb && lb === fb ? WEIGHTS.brand : 0;

  const total = Math.round((text + category + location + date + color + brand) * 100) / 100;
  return {
    text: Math.round(text * 100) / 100,
    category,
    location,
    date: Math.round(date * 100) / 100,
    color,
    brand,
    total,
  };
}
