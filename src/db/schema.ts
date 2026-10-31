// Database schema. Mirrors the EERD in docs/system-design.md §7.
// The user, session, account, verification, and rateLimit tables follow the
// layout Better Auth expects; everything else is Track-and-Trace's own data.
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

// CURRENT_TIMESTAMP(3) matches the millisecond precision of the columns,
// which MySQL and TiDB require. updatedAt is refreshed by the app on update.
const now = sql`CURRENT_TIMESTAMP(3)`;
const createdAt = () =>
  timestamp("created_at", { fsp: 3, mode: "date" }).default(now).notNull();
const updatedAt = () =>
  timestamp("updated_at", { fsp: 3, mode: "date" })
    .default(now)
    .$onUpdate(() => new Date())
    .notNull();

export const ROLES = ["student", "faculty", "staff", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const REPORT_TYPES = ["LOST", "FOUND"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = [
  "PENDING",
  "VERIFIED",
  "CLAIMED",
  "CLOSED",
  "EXPIRED",
  "ARCHIVED",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const CLAIM_STATUSES = [
  "PENDING",
  "MORE_INFO_NEEDED",
  "APPROVED",
  "REJECTED",
  "RELEASED",
  "LAPSED",
  "ON_HOLD",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const MATCH_STATUSES = [
  "PENDING_VERIFICATION",
  "CONFIRMED",
  "REJECTED",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const PROOF_TYPES = [
  "DESCRIPTION",
  "PHOTO",
  "RECEIPT",
  "DOCUMENT",
  "OTHER",
] as const;
export type ProofType = (typeof PROOF_TYPES)[number];

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const college = mysqlTable("college", {
  id: int("college_id").autoincrement().primaryKey(),
  name: varchar("college_name", { length: 150 }).notNull().unique(),
});

export const user = mysqlTable(
  "user",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    idNumber: varchar("id_number", { length: 50 }).notNull().unique(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    contactNo: varchar("contact_no", { length: 30 }),
    role: mysqlEnum("role", ROLES).default("student").notNull(),
    collegeId: int("college_id").references(() => college.id),
    status: mysqlEnum("status", ["ACTIVE", "DEACTIVATED"])
      .default("ACTIVE")
      .notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("user_role_idx").on(t.role)],
);

export const session = mysqlTable(
  "session",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    expiresAt: timestamp("expires_at", { fsp: 3, mode: "date" }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = mysqlTable(
  "account",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 100 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { fsp: 3 }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { fsp: 3 }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = mysqlTable(
  "verification",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { fsp: 3, mode: "date" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const rateLimit = mysqlTable("rate_limit", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  count: int("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const student = mysqlTable("student", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  course: varchar("course", { length: 150 }).notNull(),
  yearLevel: int("year_level").notNull(),
});

export const faculty = mysqlTable("faculty", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  department: varchar("department", { length: 150 }).notNull(),
  academicRank: varchar("academic_rank", { length: 80 }).notNull(),
});

export const staff = mysqlTable("staff", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  office: varchar("office", { length: 150 }).notNull(),
  position: varchar("position", { length: 100 }).notNull(),
});

export const administrator = mysqlTable("administrator", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  office: varchar("office", { length: 150 }).notNull(),
  adminLevel: mysqlEnum("admin_level", ["ADMIN", "SUPER_ADMIN"])
    .default("ADMIN")
    .notNull(),
});

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const category = mysqlTable("category", {
  id: int("category_id").autoincrement().primaryKey(),
  name: varchar("category_name", { length: 100 }).notNull(),
  parentId: int("parent_category_id"),
});

// A campus place. Rows with isStorage = true are storage spots in the
// lost and found office (room and bin); the rest are where items were lost
// or found.
export const location = mysqlTable("location", {
  id: int("location_id").autoincrement().primaryKey(),
  buildingName: varchar("building_name", { length: 150 }).notNull(),
  areaDescription: varchar("area_description", { length: 255 }),
  roomNumber: varchar("room_number", { length: 50 }),
  storageBin: varchar("storage_bin", { length: 50 }),
  isStorage: boolean("is_storage").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const report = mysqlTable(
  "report",
  {
    id: int("report_id").autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id),
    categoryId: int("category_id")
      .notNull()
      .references(() => category.id),
    locationId: int("location_id")
      .notNull()
      .references(() => location.id),
    locationNote: varchar("location_note", { length: 255 }),
    storageLocationId: int("storage_location_id").references(
      () => location.id,
    ),
    reportType: mysqlEnum("report_type", REPORT_TYPES).notNull(),
    itemName: varchar("item_name", { length: 150 }).notNull(),
    description: text("description"),
    hiddenDetails: text("hidden_details"),
    color: varchar("color", { length: 50 }),
    brand: varchar("brand", { length: 100 }),
    dateLostOrFound: date("date_lost_or_found", { mode: "string" }).notNull(),
    status: mysqlEnum("status", REPORT_STATUSES).default("PENDING").notNull(),
    verifiedBy: varchar("verified_by", { length: 36 }).references(
      () => user.id,
    ),
    dateVerified: timestamp("date_verified", { fsp: 3, mode: "date" }),
    dateReported: timestamp("date_reported", { fsp: 3, mode: "date" })
      .default(now)
      .notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("report_user_idx").on(t.userId),
    index("report_type_status_idx").on(t.reportType, t.status),
    index("report_category_idx").on(t.categoryId),
    index("report_user_date_idx").on(t.userId, t.dateReported),
    index("report_status_date_idx").on(t.status, t.dateReported),
  ],
);

export const reportImage = mysqlTable(
  "report_image",
  {
    id: int("image_id").autoincrement().primaryKey(),
    reportId: int("report_id")
      .notNull()
      .references(() => report.id, { onDelete: "cascade" }),
    imagePath: varchar("image_path", { length: 500 }).notNull(),
    dateUploaded: timestamp("date_uploaded", { fsp: 3, mode: "date" })
      .default(now)
      .notNull(),
  },
  (t) => [index("report_image_report_idx").on(t.reportId)],
);

export const matchRecord = mysqlTable(
  "match_record",
  {
    id: int("match_id").autoincrement().primaryKey(),
    lostReportId: int("lost_report_id")
      .notNull()
      .references(() => report.id, { onDelete: "cascade" }),
    foundReportId: int("found_report_id")
      .notNull()
      .references(() => report.id, { onDelete: "cascade" }),
    matchScore: decimal("match_score", {
      precision: 5,
      scale: 2,
      mode: "number",
    }).notNull(),
    matchStatus: mysqlEnum("match_status", MATCH_STATUSES)
      .default("PENDING_VERIFICATION")
      .notNull(),
    dateMatched: timestamp("date_matched", { fsp: 3, mode: "date" })
      .default(now)
      .notNull(),
  },
  (t) => [
    uniqueIndex("match_pair_idx").on(t.lostReportId, t.foundReportId),
    index("match_found_idx").on(t.foundReportId),
  ],
);

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export const claim = mysqlTable(
  "claim",
  {
    id: int("claim_id").autoincrement().primaryKey(),
    // The found report being claimed.
    reportId: int("report_id")
      .notNull()
      .references(() => report.id),
    claimantId: varchar("claimant_id", { length: 36 })
      .notNull()
      .references(() => user.id),
    matchId: int("match_id").references(() => matchRecord.id),
    reviewedBy: varchar("reviewed_by", { length: 36 }).references(
      () => user.id,
    ),
    claimDate: timestamp("claim_date", { fsp: 3, mode: "date" })
      .default(now)
      .notNull(),
    claimStatus: mysqlEnum("claim_status", CLAIM_STATUSES)
      .default("PENDING")
      .notNull(),
    rejectionReason: text("rejection_reason"),
    remarks: text("remarks"),
    dateReviewed: timestamp("date_reviewed", { fsp: 3, mode: "date" }),
    pickupDeadline: timestamp("pickup_deadline", { fsp: 3, mode: "date" }),
    dateReleased: timestamp("date_released", { fsp: 3, mode: "date" }),
    releasedBy: varchar("released_by", { length: 36 }).references(
      () => user.id,
    ),
    reminderSent: boolean("reminder_sent").default(false).notNull(),
  },
  (t) => [
    index("claim_report_idx").on(t.reportId),
    index("claim_claimant_idx").on(t.claimantId),
    index("claim_status_idx").on(t.claimStatus),
    index("claim_status_date_idx").on(t.claimStatus, t.claimDate),
    index("claim_claimant_status_date_idx").on(t.claimantId, t.claimStatus, t.claimDate),
  ],
);

export const claimProof = mysqlTable(
  "claim_proof",
  {
    id: int("proof_id").autoincrement().primaryKey(),
    claimId: int("claim_id")
      .notNull()
      .references(() => claim.id, { onDelete: "cascade" }),
    proofType: mysqlEnum("proof_type", PROOF_TYPES).notNull(),
    filePath: varchar("file_path", { length: 500 }),
    description: text("description"),
    dateUploaded: timestamp("date_uploaded", { fsp: 3, mode: "date" })
      .default(now)
      .notNull(),
  },
  (t) => [index("claim_proof_claim_idx").on(t.claimId)],
);

// ---------------------------------------------------------------------------
// Notifications, announcements, activity log
// ---------------------------------------------------------------------------

export const notification = mysqlTable(
  "notification",
  {
    id: int("notification_id").autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reportId: int("report_id").references(() => report.id, {
      onDelete: "set null",
    }),
    claimId: int("claim_id").references(() => claim.id, {
      onDelete: "set null",
    }),
    notificationType: varchar("notification_type", { length: 50 }).notNull(),
    message: text("message").notNull(),
    link: varchar("link", { length: 255 }),
    isRead: boolean("is_read").default(false).notNull(),
    dateSent: timestamp("date_sent", { fsp: 3, mode: "date" })
      .default(now)
      .notNull(),
  },
  (t) => [
    index("notification_user_idx").on(t.userId, t.isRead),
    index("notification_user_date_idx").on(t.userId, t.dateSent),
  ],
);

export const announcement = mysqlTable("announcement", {
  id: int("announcement_id").autoincrement().primaryKey(),
  adminId: varchar("admin_id", { length: 36 })
    .notNull()
    .references(() => user.id),
  title: varchar("title", { length: 150 }).notNull(),
  body: text("body").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  datePosted: timestamp("date_posted", { fsp: 3, mode: "date" })
    .default(now)
    .notNull(),
});

export const activityLog = mysqlTable(
  "activity_log",
  {
    id: int("log_id").autoincrement().primaryKey(),
    userId: varchar("user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 150 }).notNull(),
    targetEntity: varchar("target_entity", { length: 80 }).notNull(),
    targetId: varchar("target_id", { length: 36 }).notNull(),
    details: text("details"),
    dateLogged: timestamp("date_logged", { fsp: 3, mode: "date" })
      .default(now)
      .notNull(),
  },
  (t) => [index("activity_date_idx").on(t.dateLogged)],
);

// ---------------------------------------------------------------------------
// Relations (for db.query)
// ---------------------------------------------------------------------------

export const userRelations = relations(user, ({ one, many }) => ({
  college: one(college, { fields: [user.collegeId], references: [college.id] }),
  student: one(student),
  faculty: one(faculty),
  staff: one(staff),
  administrator: one(administrator),
  reports: many(report),
}));

export const studentRelations = relations(student, ({ one }) => ({
  user: one(user, { fields: [student.userId], references: [user.id] }),
}));
export const facultyRelations = relations(faculty, ({ one }) => ({
  user: one(user, { fields: [faculty.userId], references: [user.id] }),
}));
export const staffRelations = relations(staff, ({ one }) => ({
  user: one(user, { fields: [staff.userId], references: [user.id] }),
}));
export const administratorRelations = relations(administrator, ({ one }) => ({
  user: one(user, { fields: [administrator.userId], references: [user.id] }),
}));

export const reportRelations = relations(report, ({ one, many }) => ({
  user: one(user, { fields: [report.userId], references: [user.id] }),
  category: one(category, {
    fields: [report.categoryId],
    references: [category.id],
  }),
  location: one(location, {
    fields: [report.locationId],
    references: [location.id],
    relationName: "reportLocation",
  }),
  storageLocation: one(location, {
    fields: [report.storageLocationId],
    references: [location.id],
    relationName: "reportStorage",
  }),
  images: many(reportImage),
  claims: many(claim),
}));

export const reportImageRelations = relations(reportImage, ({ one }) => ({
  report: one(report, {
    fields: [reportImage.reportId],
    references: [report.id],
  }),
}));

export const categoryRelations = relations(category, ({ one, many }) => ({
  parent: one(category, {
    fields: [category.parentId],
    references: [category.id],
    relationName: "categoryParent",
  }),
  children: many(category, { relationName: "categoryParent" }),
}));

export const matchRecordRelations = relations(matchRecord, ({ one }) => ({
  lostReport: one(report, {
    fields: [matchRecord.lostReportId],
    references: [report.id],
    relationName: "matchLost",
  }),
  foundReport: one(report, {
    fields: [matchRecord.foundReportId],
    references: [report.id],
    relationName: "matchFound",
  }),
}));

export const claimRelations = relations(claim, ({ one, many }) => ({
  report: one(report, { fields: [claim.reportId], references: [report.id] }),
  claimant: one(user, {
    fields: [claim.claimantId],
    references: [user.id],
    relationName: "claimClaimant",
  }),
  reviewer: one(user, {
    fields: [claim.reviewedBy],
    references: [user.id],
    relationName: "claimReviewer",
  }),
  proofs: many(claimProof),
}));

export const claimProofRelations = relations(claimProof, ({ one }) => ({
  claim: one(claim, { fields: [claimProof.claimId], references: [claim.id] }),
}));
