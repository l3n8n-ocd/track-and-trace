// Display helpers. Dates are shown in Philippine time.
const TZ = "Asia/Manila";

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00+08:00` : value) : value;
  return d.toLocaleDateString("en-PH", { timeZone: TZ, year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-PH", {
    timeZone: TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Today's date in Philippine time, as YYYY-MM-DD.
export function todayPH() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function fullName(u: { firstName: string; lastName: string }) {
  return `${u.firstName} ${u.lastName}`;
}

// Relative dates for server-side queries and defaults.
export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

// A date `days` from today in Philippine time, as YYYY-MM-DD.
export function datePHFromToday(days: number) {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString("en-CA", { timeZone: TZ });
}

// Whole days between `d` and now.
export function daysSince(d: Date) {
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}
