// Creates the two student accounts the Postman API tests sign in with: one
// verified and one that has not verified its email. Public sign-up is
// disabled, so the tests can't register them over HTTP.
//   npx tsx tests/api/setup-users.ts
// Uses DATABASE_URL (or .env.local) and refuses to touch a non-local database.
import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";
import { eq, inArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { poolOptions } from "../../src/db/connection";
import * as schema from "../../src/db/schema";

config({ path: ".env.local" });

const API_USERS = {
  student: { email: "api.student@trackandtrace.test", verified: true },
  unverified: { email: "api.unverified@trackandtrace.test", verified: false },
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1"].includes(host)) {
    throw new Error(`Refusing to create test accounts on ${host}; use a local or CI database`);
  }
  const password = process.env.API_TEST_PASSWORD ?? "ApiTest12345";

  const pool = mysql.createPool(poolOptions(url));
  const db = drizzle(pool, { schema, mode: "default" });
  const emails = Object.values(API_USERS).map((u) => u.email);
  const idNumbers = Object.keys(API_USERS).map((key) => `API-${key.toUpperCase()}`);
  // Match on ID number too, so accounts left from an older email domain are replaced.
  const old = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(or(inArray(schema.user.email, emails), inArray(schema.user.idNumber, idNumbers)));
  for (const { id } of old) {
    await db.delete(schema.session).where(eq(schema.session.userId, id));
    await db.delete(schema.account).where(eq(schema.account.userId, id));
    await db.delete(schema.report).where(eq(schema.report.userId, id));
    await db.delete(schema.student).where(eq(schema.student.userId, id));
    await db.delete(schema.user).where(eq(schema.user.id, id));
  }

  // A report for the admin CSV export test to find.
  const [category] = await db.select({ id: schema.category.id }).from(schema.category).limit(1);
  const [place] = await db.select({ id: schema.location.id }).from(schema.location).limit(1);

  for (const [key, u] of Object.entries(API_USERS)) {
    const id = randomUUID();
    await db.insert(schema.user).values({
      id,
      name: `API ${key}`,
      email: u.email,
      emailVerified: u.verified,
      idNumber: `API-${key.toUpperCase()}`,
      firstName: "API",
      lastName: key,
      role: "student",
    });
    await db.insert(schema.account).values({
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: await hashPassword(password),
    });
    await db.insert(schema.student).values({ userId: id, course: "BSIT", yearLevel: 3 });
    if (u.verified) {
      await db.insert(schema.report).values({
        userId: id,
        reportType: "LOST",
        itemName: "API test umbrella",
        categoryId: category.id,
        locationId: place.id,
        dateLostOrFound: new Date().toISOString().slice(0, 10),
      });
    }
  }
  await pool.end();
  console.log(`API test accounts ready: ${emails.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
