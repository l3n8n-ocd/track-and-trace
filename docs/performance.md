# Performance changes

The shared college, category, and location lists use the Next.js data cache.
Successful administrator mutations immediately expire the corresponding tag
with `updateTag`, so registration, profile, settings, search, and report forms
see the edit on their next request. The one-hour revalidation interval is a
fallback for out-of-band database changes. Cached reference data contains no
account, session, report, claim, or notification data.

Dashboard and navigation counts share request-scoped React caches. Pending
and approved claim counts use one grouped query; the report status chart also
provides storage and approaching-expiry totals. Counts remain live on each
request. The database connection limit remains five per instance.

Guests without a Better Auth session token skip auth initialization on public
pages. Both development and secure production session cookies still go through
the normal database validation, revocation, and account-status checks.

Suspense boundaries let the existing loading UI appear while authenticated
layouts resolve. A loading state also covers authentication forms. Pages keep
their existing authentication and authorization checks.

Migration `0001_performance_indexes.sql` adds indexes for per-user recent
reports and notifications, pending report/claim queues, and active claims.
The existing deployment build runs the migration before building the app.

## Verification

Use a disposable local database, as described in the README:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx tsx tests/api/setup-users.ts
npm run start
npm run test:e2e
```

The browser regressions cover dashboard totals for mixed report types,
statuses, and verification dates, plus immediate reference-list updates after
adding a college; adding, renaming, and deleting a category; and adding,
hiding, and restoring a place. Existing tests cover reporting, matching,
claims, release, access control, private proofs, and the daily job.

An isolated comparison of the original and changed production builds against
the same MariaDB database recorded 15 SQL statements per authenticated admin
overview before the change and 10 afterward, including session lookup. Warm
registration requests dropped from one SQL statement to zero. These are
server-side SQL counts across three requests per route, not a prediction of
production load times.

## Function region

The live deployment was observed executing in `iad1` (US East). Confirm the
TiDB cluster's actual region before changing Vercel's Function Region or
adding a `regions` entry to `vercel.json`. Place the function close to the
database; choosing Singapore without checking the database could increase
query latency. The repository does not contain the production database
hostname or region, so this change deliberately does not guess a new region.
