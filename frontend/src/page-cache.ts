export type CacheScope = { identity: string | null; version: number };

// Snapshots are bounded, short-lived, and kept only in this tab's memory.
// Every visit still validates with the API. Writes invalidate pending reads too.
export class PageCache<T> {
  private identity: string | null | undefined;
  private version = 0;
  private entries = new Map<string, { value: T; expires: number }>();

  constructor(private lifetime = 10_000, private capacity = 12) {}

  scope(identity: string | null): CacheScope {
    if (identity !== this.identity) {
      this.identity = identity;
      this.invalidate();
    }
    return { identity, version: this.version };
  }

  current(scope: CacheScope) {
    return scope.identity === this.identity && scope.version === this.version;
  }

  invalidate() {
    this.version++;
    this.entries.clear();
  }

  get(key: string, scope: CacheScope): T | undefined {
    if (!this.current(scope)) return;
    const entry = this.entries.get(key);
    if (!entry) return;
    if (entry.expires <= Date.now()) {
      this.entries.delete(key);
      return;
    }
    return entry.value;
  }

  set(key: string, scope: CacheScope, value: T) {
    if (!this.current(scope)) return;
    this.entries.delete(key);
    this.entries.set(key, { value, expires: Date.now() + this.lifetime });
    while (this.entries.size > this.capacity) this.entries.delete(this.entries.keys().next().value!);
  }
}
