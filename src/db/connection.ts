import mysql from "mysql2/promise";

// Builds mysql2 pool options from DATABASE_URL. Remote hosts (TiDB Cloud)
// require TLS; local development databases don't.
export function poolOptions(url: string): mysql.PoolOptions {
  const parsed = new URL(url);
  const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    ssl: local ? undefined : { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionLimit: 5,
    maxIdle: 2,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    timezone: "Z",
    dateStrings: ["DATE"],
  };
}
