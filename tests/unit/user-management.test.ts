import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { accountStatusSchema, parseUserCollege, roleChangeSchema, roleDetailsSchema, userProfileSchema } from "@/lib/user-management";

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), select: vi.fn(), update: vi.fn(), insert: vi.fn(), delete: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", async () => ({ db: { transaction: mocks.transaction }, schema: await import("@/db/schema") }));
import { changeUserRole, changeUserStatus, editUserProfile, revokeUserSessions } from "@/server/users";

function form(values: Record<string, string>) { const data = new FormData(); Object.entries(values).forEach(([k, v]) => data.set(k, v)); return data; }
const profile = { firstName: "Test", lastName: "Student", displayName: "Test Student", email: "new@example.test", idNumber: "20260001", contactNo: "", collegeId: "1", course: "BSIT", yearLevel: "3" };
let selections: unknown[][];
beforeEach(() => {
  vi.resetAllMocks();
  selections = [[{ id: "actor", status: "ACTIVE" }], [{ id: "target", role: "student", status: "DEACTIVATED", email: "old@example.test" }], [{ id: 1 }], []];
  mocks.select.mockImplementation(() => {
    const rows = selections.shift() ?? [];
    const chain = { from: () => chain, where: () => chain, orderBy: () => chain, for: () => Promise.resolve(rows), then: (resolve: (r: unknown[]) => unknown) => Promise.resolve(rows).then(resolve) };
    return chain;
  });
  mocks.update.mockImplementation(() => ({ set: (values: unknown) => ({ where: async () => values }) }));
  mocks.insert.mockImplementation(() => ({ values: (values: unknown) => ({ onDuplicateKeyUpdate: async () => values, then: (resolve: (v: unknown) => unknown) => Promise.resolve(values).then(resolve) }) }));
  mocks.delete.mockImplementation(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
  mocks.transaction.mockImplementation((run) => run(mocks));
});

describe("account validation", () => {
  it("normalizes email and requires valid profile and subtype fields", () => {
    expect(userProfileSchema.parse({ ...profile, email: " NEW@EXAMPLE.TEST " }).email).toBe("new@example.test");
    expect(userProfileSchema.safeParse({ ...profile, firstName: " " }).success).toBe(false);
    expect(roleDetailsSchema.student.safeParse({ course: "BSIT", yearLevel: "0" }).success).toBe(false);
    expect(roleDetailsSchema.staff.safeParse({ office: "Office" }).success).toBe(false);
  });
  it("rejects unknown roles and status instead of defaulting to deactivation", () => {
    expect(roleChangeSchema.safeParse({ role: "superadmin" }).success).toBe(false);
    expect(accountStatusSchema.safeParse(null).success).toBe(false);
    expect(accountStatusSchema.safeParse("active").success).toBe(false);
    expect(() => parseUserCollege("", "student")).toThrow();
    expect(parseUserCollege("", "admin")).toBeNull();
  });
});
describe("administrator account changes", () => {
  it.each(["ACTIVE", "DEACTIVATED"])("blocks changing the actor's own status to %s", async (status) => {
    await expect(changeUserStatus("actor", "actor", status)).rejects.toThrow("own access");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("blocks own role changes and forced self sign-out", async () => {
    await expect(changeUserRole("actor", "actor", form({ role: "student" }))).rejects.toThrow("own access");
    await expect(revokeUserSessions("actor", "actor")).rejects.toThrow("own access");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rechecks the acting administrator inside the locked transaction", async () => {
    selections[0] = [{ id: "actor", status: "DEACTIVATED" }];
    await expect(changeUserStatus("actor", "target", "DEACTIVATED")).rejects.toThrow("Administrator access");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });
  it("rejects missing target accounts", async () => {
    selections[1] = [];
    await expect(changeUserStatus("actor", "missing", "ACTIVE")).rejects.toThrow("User not found");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("deactivates with session revocation and audit inside one transaction", async () => {
    await changeUserStatus("actor", "target", "DEACTIVATED");
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(schema.user);
    expect(mocks.delete).toHaveBeenCalledWith(schema.session);
    expect(mocks.insert).toHaveBeenCalledWith(schema.activityLog);
  });
  it("reactivates without deleting the user's records", async () => {
    await changeUserStatus("actor", "target", "ACTIVE");
    expect(mocks.delete).not.toHaveBeenCalled();
  });
  it("saves the new role without reactivating the account and revokes sessions", async () => {
    const sets = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
    mocks.update.mockReturnValue({ set: sets });
    await changeUserRole("actor", "target", form({ role: "admin", office: "Lost and Found", collegeId: "" }));
    expect(sets).toHaveBeenCalledWith({ role: "admin", collegeId: null });
    expect(mocks.insert).toHaveBeenCalledWith(schema.administrator);
    expect(mocks.delete).toHaveBeenCalledWith(schema.session);
    expect(mocks.delete).not.toHaveBeenCalledWith(schema.report);
    expect(mocks.delete).not.toHaveBeenCalledWith(schema.claim);
  });
  it("refuses incomplete new role details before writes", async () => {
    await expect(changeUserRole("actor", "target", form({ role: "faculty", collegeId: "1", department: "IT" }))).rejects.toThrow();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("rejects a duplicate email or ID without changing the account", async () => {
    selections[3] = [{ id: "other" }];
    await expect(editUserProfile("actor", "target", form(profile))).rejects.toThrow("already registered");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("requires new email verification and revokes sessions after an email change", async () => {
    const sets = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
    mocks.update.mockReturnValue({ set: sets });
    expect(await editUserProfile("actor", "target", form(profile))).toEqual({ emailChanged: true, email: "new@example.test" });
    expect(sets).toHaveBeenCalledWith(expect.objectContaining({ emailVerified: false, email: "new@example.test" }));
    expect(mocks.delete).toHaveBeenCalledWith(schema.session);
  });
});
