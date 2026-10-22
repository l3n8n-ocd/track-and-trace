import { sql, type AnyColumn, type SQL } from "drizzle-orm";

// Case-insensitive contains. TiDB's default collation is case-sensitive,
// so both sides are lowercased.
export function containsCI(column: AnyColumn | SQL, term: string): SQL {
  const pattern = `%${term.toLowerCase().replace(/[%_\\]/g, "\\$&")}%`;
  return sql`lower(${column}) like ${pattern}`;
}
