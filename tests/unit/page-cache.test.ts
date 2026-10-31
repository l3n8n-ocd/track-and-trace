import { afterEach, describe, expect, it, vi } from "vitest";
import { PageCache } from "../../frontend/src/page-cache";

afterEach(() => vi.useRealTimers());
describe("navigation snapshot isolation", () => {
  it("discards snapshots and late responses on account change and sign-out", () => {
    const cache = new PageCache<string>();
    const first = cache.scope("first-account");
    cache.set("/reports", first, "private first-account data");
    expect(cache.get("/reports", first)).toBe("private first-account data");
    const second = cache.scope("second-account");
    cache.set("/reports", first, "late first-account response");
    expect(cache.get("/reports", second)).toBeUndefined();
    cache.set("/reports", second, "private second-account data");
    cache.scope(null);
    expect(cache.current(second)).toBe(false);
    expect(cache.get("/reports", cache.scope("second-account"))).toBeUndefined();
  });
  it("prevents reads started before an edit from repopulating the cache", () => {
    const cache = new PageCache<string>();
    const beforeEdit = cache.scope("account");
    cache.invalidate();
    cache.set("/reports", beforeEdit, "outdated data");
    expect(cache.get("/reports", cache.scope("account"))).toBeUndefined();
  });
  it("expires snapshots after ten seconds and bounds memory usage", () => {
    vi.useFakeTimers();
    const cache = new PageCache<string>(10_000, 2);
    const scope = cache.scope("account");
    cache.set("one", scope, "one");
    cache.set("two", scope, "two");
    cache.set("three", scope, "three");
    expect(cache.get("one", scope)).toBeUndefined();
    expect(cache.get("two", scope)).toBe("two");
    vi.advanceTimersByTime(10_000);
    expect(cache.get("three", scope)).toBeUndefined();
  });
});
