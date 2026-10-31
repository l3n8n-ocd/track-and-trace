import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ headers: vi.fn(), getSession: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));

import { getSessionUser, memoizeClientRequest, withClientSession } from "@/lib/session";

const user = {
  id: "student-1", name: "Test Student", email: "student@example.test",
  role: "student" as const, firstName: "Test", lastName: "Student", status: "ACTIVE",
};

describe("API request memoization", () => {
  it("shares concurrent queries only within the current validated request", async () => {
    const load = vi.fn(async () => "count");
    const request = () => withClientSession(user, async () =>
      Promise.all([memoizeClientRequest("count", load), memoizeClientRequest("count", load)]));
    expect(await request()).toEqual(["count", "count"]);
    expect(load).toHaveBeenCalledTimes(1);
    await request();
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("keeps concurrent users isolated and does not globally cache other calls", async () => {
    const values = await Promise.all(["first", "second"].map(id =>
      withClientSession({ ...user, id }, async () =>
        memoizeClientRequest("same-key", async () => (await getSessionUser())?.id))));
    expect(values).toEqual(["first", "second"]);
    const load = vi.fn(async () => "uncached");
    await memoizeClientRequest("same-key", load);
    await memoizeClientRequest("same-key", load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user });
});

describe("session lookup", () => {
  it("passes a bearer token to authentication for full validation", async () => {
    const requestHeaders = new Headers({ authorization: "Bearer signed-token.signature" });
    mocks.headers.mockResolvedValue(requestHeaders);
    expect(await getSessionUser()).toMatchObject({ id: user.id });
    expect(mocks.getSession).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  it("rejects a bearer session after deactivation", async () => {
    mocks.headers.mockResolvedValue(new Headers({ authorization: "Bearer token.signature" }));
    mocks.getSession.mockResolvedValue({ user: { ...user, status: "DEACTIVATED" } });
    expect(await getSessionUser()).toBeNull();
  });
  it.each(["", "theme=light"])("does not initialize authentication for a guest (%s)", async (cookie) => {
    mocks.headers.mockResolvedValue(new Headers({ cookie }));
    expect(await getSessionUser()).toBeNull();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it.each(["better-auth.session_token", "__Secure-better-auth.session_token"])(
    "validates a %s cookie with authentication",
    async (cookieName) => {
      const headers = new Headers({ cookie: `${cookieName}=signed-token` });
      mocks.headers.mockResolvedValue(headers);
      expect(await getSessionUser()).toMatchObject({ id: user.id, role: "student" });
      expect(mocks.getSession).toHaveBeenCalledWith({ headers });
    },
  );

  it("rejects a revoked or invalid session token", async () => {
    mocks.headers.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=revoked" }));
    mocks.getSession.mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
  });

  it("still rejects deactivated accounts with a session cookie", async () => {
    mocks.headers.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=signed-token" }));
    mocks.getSession.mockResolvedValue({ user: { ...user, status: "DEACTIVATED" } });
    expect(await getSessionUser()).toBeNull();
  });
});
