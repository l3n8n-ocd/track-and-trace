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

`vercel.json` pins the backend to `sin1` (Singapore), following the request
to move execution out of `iad1` (US East). This selects one region, which is
supported on Vercel Hobby. A new deployment is required for it to take effect.

Verify live API responses after deployment: an `x-vercel-id` beginning with
`sin1::sin1::` identifies Singapore ingress and function execution. Measure
API response times as well as static frontend delivery.

The TiDB cluster's location remains unverified; the repository does not
contain its production hostname. Function-to-database distance can still
affect data-dependent requests, so Singapore is not a guarantee of optimal
database latency.

## Firebase page navigation

The static frontend starts page-data requests in parallel with lazy page and
layout imports. Links prepare destination code on pointer hover, keyboard
focus, or touch; this never fetches personal data or executes an action.
Data Saver disables this preparation. Public visitors do not download the
authenticated navigation shell until it is needed.

Selected list pages and registration keep up to 12 snapshots for ten seconds
in the current tab's memory. Each visit always requests fresh authorized data;
a valid snapshot can appear while that request runs. Different parameters and
search filters have separate keys. Private HTTP responses remain `no-store`.
Detail pages, proof files, profile, settings, and edit/new forms are excluded.

Writes invalidate snapshots both before and after the request, including
pending older reads. Account changes and sign-out discard them. Other tabs
receive an invalidation signal; returning to a signed-in tab also refreshes its
data. Session revocation is checked on every visit, even when a snapshot is
shown first. An external change may briefly show the previous list until the
fresh response arrives; this is not offline storage or an authorization cache.

Page queries and navigation queries also run concurrently on the API. Shared
count promises are memoized only inside that validated API request, preserving
React's existing render memoization for the original Next.js pages. Counts and
session checks are never cached across backend requests. `Server-Timing`
reports authentication, page, navigation, and total durations for measurement.
Allowed origins can reuse CORS preflight permission for 600 seconds; this does
not cache page responses or bypass authentication.

The frontend preloads smaller variable fonts retaining the originals' full
character coverage, Archivo width axis, optical sizing, and UI weights
400–900. Together the two files shrink from 152,652 to 124,244 bytes (18.6%).
The body font is always preloaded. The larger display font is preloaded only
on a home-page entry, where it draws the hero; other pages discover it through
CSS so that it does not compete with route code on slow connections.
Original fonts and licenses remain available. Regenerate optimized assets with
`scripts/optimize-frontend-fonts.py` when font usage changes. A below-fold
illustration is lazy loaded, and an API preconnection hint starts TLS earlier.

Validation uses disposable local accounts and a MariaDB database: 36 unit tests,
24 static frontend browser tests, lint, both type checks, and production builds.
Navigation tests hold an API response to check immediate cached rendering,
subsequent fresh content, mutation invalidation, session revocation, and
cross-tab sign-out. They also verify that hovering triggers no API requests
and that a page visit does not fetch its loader twice. Existing browser tests
exercise the complete report, match, claim, and release workflow.

These changes retain Firebase Spark, Vercel Hobby, and the existing database;
they introduce no paid service, schema migration, or database migration.
