import "server-only";
import type { SessionUser } from "@/lib/session";

// A report fetched for matching must not expose the finder's ownership clues.
// The original UI hid these fields; a JSON boundary must redact them as well.
export function clientData(value: unknown, viewer: SessionUser | null): unknown {
  if (value instanceof Map) return { $type: "Map", entries: [...value].map(([k,v])=>[k,clientData(v,viewer)]) };
  if (value instanceof Set) return { $type: "Set", values: [...value] };
  if (value instanceof Date) return { $type: "Date", value: value.toISOString() };
  if (Array.isArray(value)) return value.map(v => clientData(v, viewer));
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const otherReport = record.reportType && record.userId !== viewer?.id && viewer?.role !== "admin";
  return Object.fromEntries(Object.entries(record)
    .filter(([key]) => !(otherReport && (key === "hiddenDetails" || key === "description")))
    .map(([key,child])=>[key,key === "filePath" ? (child ? "protected" : null) : clientData(child,viewer)]));
}
export function redirectFromError(error: unknown): string | null {
  const digest = error && typeof error === "object" && "digest" in error ? String(error.digest) : "";
  return /^NEXT_REDIRECT;(?:push|replace);([\s\S]*);(?:303|307|308);$/.exec(digest)?.[1] ?? null;
}
export function isMissing(error: unknown) {
  return Boolean(error && typeof error === "object" && "digest" in error && String(error.digest).endsWith(";404"));
}
export function decodeAction(form: FormData): { action: string; args: unknown[] } {
  const action = String(form.get("$action") ?? "");
  const encoded = String(form.get("$args") ?? "[]");
  if (encoded.length > 100_000) throw new Error("Invalid action arguments");
  const raw: unknown = JSON.parse(encoded);
  if (!Array.isArray(raw) || raw.length > 6) throw new Error("Invalid action arguments");
  const args = raw.map((value, index) => {
    if (!value || typeof value !== "object" || !("$form" in value)) return value;
    const decoded = new FormData();
    const prefix = "$form" + index + ":";
    for (const [key, entry] of form) if (key.startsWith(prefix)) decoded.append(key.slice(prefix.length), entry);
    return decoded;
  });
  return { action, args };
}
