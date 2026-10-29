# Track-and-Trace

A web and mobile-based lost and found management system for Bulacan State University – Main Campus.

Track-and-Trace gives the campus one place to report lost and found items, search found items, see automatically suggested matches, and claim an item with proof of ownership that an administrator verifies before release.

This repository holds the live prototype for the BSIT 3I – G1 System Analysis and Design research project, *Web and Mobile-Based Lost and Found Management System for Bulacan State University: Digital Reporting and Item Recovery*.

## Status

All features in the system design are built and tested locally. Deployment: see [Account setup](docs/setup-accounts.md).

| Document | Contents |
|---|---|
| [System design](docs/system-design.md) | Scope, roles, requirements, architecture, data model, status lifecycles, matching engine, API, screens, security, and testing plan |
| [ADR 0001 – Tech stack](docs/decisions/0001-tech-stack.md) | Next.js, Tailwind CSS, MySQL (TiDB Cloud), Better Auth, Cloudinary, Gmail SMTP, Vercel, and why |
| [Account setup](docs/setup-accounts.md) | Step-by-step guide to the free accounts, environment variables, and deployment |
| [Implementation notes](docs/implementation-notes.md) | Where the build differs from the design, and why |

## Features

**Students, faculty, and staff**
- Register with role-specific details, verify email, log in, reset a forgotten password
- Report lost or found items with photos, category, place, and date
- Search verified found items (limited public details and blurred photos)
- Automatic match alerts between lost and found reports; dismiss "not my item"
- Claim an item with a statement and proof files; add proof when asked; track the claim
- In-app and email notifications, announcements, profile, data download, account deactivation

**Administrators**
- Overview of pending work
- Verify reports, assign storage locations, change report status
- Review claims side by side with the found item's hidden details: approve with a pickup deadline, reject with a reason, or request more proof; record the release
- Manage users (deactivate, reactivate, add administrators), categories, places, storage, colleges, and announcements
- Activity log, expired and unclaimed items, CSV exports

**Automatic, once a day**: pickup reminders, lapsing claims past their deadline, expiring unclaimed items, and a matching pass.

## Running it locally

Requirements: Node.js 20.9 or later, and MySQL 8 or MariaDB 10.6+ (or a TiDB Cloud connection string).

```bash
npm install
cp .env.example .env.local      # then fill in DATABASE_URL, BETTER_AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:setup                # creates tables, seeds categories/places/colleges and the first admin
npm run dev                     # http://localhost:3000
```

Without Cloudinary keys, uploads are saved under `public/uploads` and `.data/private`. Without Gmail keys, emails (including verification links) are printed in the terminal running `npm run dev`.

## Tests

```bash
npm test             # unit tests: match scoring and status transitions
npm run test:e2e     # end-to-end tests; needs `npm run dev` running against a local database
```

The end-to-end tests cover the full report → match → claim → release flow, access control, and the daily job. They use the database in `.env.local`, so don't point them at production.

## Project layout

| Path | What's there |
|---|---|
| `src/app/(auth)` | Login, registration, email verification, password reset |
| `src/app/(app)` | Pages for signed-in users: dashboard, reports, search, items, matches, claims, notifications, profile |
| `src/app/admin` | Administrator pages and actions |
| `src/app/api` | Auth endpoints, proof file access, data export, CSV export, daily cron |
| `src/server` | Matching, claims workflow, notifications, storage, daily jobs, queries |
| `src/lib` | Auth, email, session helpers, match scoring, status rules, formatting |
| `src/db/schema.ts` | Database schema (mirrors the EERD) |
| `drizzle/` | SQL migrations |
| `scripts/db-setup.ts` | Applies migrations and seeds data; runs before every build |
| `tests/` | Unit and end-to-end tests |

## Team

- Adriano, Lenon D.
- Baluyot, Dan Leinard D.
- Clemente, Clarence Mari V.
- Francisco, Hannah Mae C.
- Marcelo, Ezekiel A.

Adviser: Mr. Mark Rafael Carlos
