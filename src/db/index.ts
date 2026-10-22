import "server-only";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "@/lib/env";
import { poolOptions } from "./connection";
import * as schema from "./schema";

// Reuse one pool across hot reloads in development and across invocations
// of the same serverless instance in production.
const globalForDb = globalThis as unknown as { pool?: mysql.Pool };

const pool = globalForDb.pool ?? mysql.createPool(poolOptions(env.DATABASE_URL));
globalForDb.pool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export type Db = typeof db;
export { schema };
