// Applies database migrations and seeds reference data and the first
// administrator. Safe to run on every deploy: each seed step only inserts
// what is missing. Runs before `next build` (see package.json).
import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { poolOptions } from "../src/db/connection";
import * as schema from "../src/db/schema";

config({ path: ".env.local" });
config();

const COLLEGES = [
  "College of Architecture and Fine Arts",
  "College of Arts and Letters",
  "College of Business Education and Accountancy",
  "College of Criminal Justice Education",
  "College of Education",
  "College of Engineering",
  "College of Hospitality and Tourism Management",
  "College of Industrial Technology",
  "College of Information and Communications Technology",
  "College of Law",
  "College of Nursing",
  "College of Science",
  "College of Social Sciences and Philosophy",
  "College of Sports, Exercise and Recreation",
  "Graduate School",
  "Administration / Non-academic office",
];

const CATEGORIES: Record<string, string[]> = {
  Electronics: [
    "Phones",
    "Laptops and Tablets",
    "Chargers and Cables",
    "Earphones and Headphones",
    "Calculators",
    "Power Banks",
  ],
  "Bags and Wallets": ["Bags", "Wallets and Purses", "Pouches"],
  "IDs and Cards": ["School IDs", "Government IDs", "ATM and Bank Cards"],
  "Personal Items": [
    "Eyewear",
    "Umbrellas",
    "Water Bottles and Tumblers",
    "Jewelry and Accessories",
    "Watches",
  ],
  Clothing: ["Jackets", "Uniforms", "Shoes", "Caps and Hats"],
  "School Supplies": ["Books and Notebooks", "Writing Materials"],
  Keys: [],
  Documents: [],
  Others: [],
};

const PLACES = [
  "Main Gate",
  "Administration Building",
  "Library",
  "Gymnasium",
  "Covered Court",
  "Cafeteria / Canteen",
  "Student Center",
  "Parking Area",
  "Chapel",
  "Field / Grounds",
  "Classroom Building",
  "Laboratory Building",
  "Other (describe in the area field)",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = mysql.createPool({ ...poolOptions(url), connectionLimit: 1 });
  const db = drizzle(pool, { schema, mode: "default" });

  console.log("Applying migrations…");
  await migrate(db, { migrationsFolder: "./drizzle" });

  const [{ value: colleges }] = await db.select({ value: count() }).from(schema.college);
  if (colleges === 0) {
    await db.insert(schema.college).values(COLLEGES.map((name) => ({ name })));
    console.log(`Seeded ${COLLEGES.length} colleges`);
  }

  const [{ value: categories }] = await db.select({ value: count() }).from(schema.category);
  if (categories === 0) {
    for (const [parent, children] of Object.entries(CATEGORIES)) {
      const [res] = await db.insert(schema.category).values({ name: parent });
      if (children.length) {
        await db
          .insert(schema.category)
          .values(children.map((name) => ({ name, parentId: res.insertId })));
      }
    }
    console.log("Seeded categories");
  }

  const [{ value: locations }] = await db.select({ value: count() }).from(schema.location);
  if (locations === 0) {
    await db.insert(schema.location).values([
      ...PLACES.map((buildingName) => ({ buildingName })),
      ...["A", "B", "C"].map((bin) => ({
        buildingName: "Lost and Found Office",
        roomNumber: "Storage Room",
        storageBin: `Bin ${bin}`,
        isStorage: true,
      })),
    ]);
    console.log("Seeded locations");
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const existing = await db.query.user.findFirst({
      where: eq(schema.user.email, adminEmail),
    });
    if (!existing) {
      const id = randomUUID();
      await db.insert(schema.user).values({
        id,
        name: "ReturnDesk Administrator",
        email: adminEmail,
        emailVerified: true,
        idNumber: "ADMIN-0001",
        firstName: "ReturnDesk",
        lastName: "Administrator",
        role: "admin",
      });
      await db.insert(schema.account).values({
        id: randomUUID(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: await hashPassword(adminPassword),
      });
      await db.insert(schema.administrator).values({
        userId: id,
        office: "Lost and Found Office",
        adminLevel: "SUPER_ADMIN",
      });
      console.log(`Created administrator ${adminEmail}`);
    }
  } else {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set; skipping administrator seed");
  }

  await pool.end();
  console.log("Database ready");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
