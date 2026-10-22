# 0001 – Tech stack

- Status: Accepted
- Date: 2026-10-22

## Context

- One developer builds the whole system, with every feature in the system design, functional by **October 27, 2026**.
- Hosting must be **free** and the site must be **online at all times**, since respondents and the panel may open it without notice.
- The adviser accepts any technologies **taught in class**. Taught: HTML/CSS/JavaScript, React, Tailwind CSS, PHP/Laravel, Node.js/Express, Java/Spring Boot, MySQL/MariaDB, Firebase.
- The ERD is relational (15 tables with foreign keys), so the database should be relational.

## Decision

| Layer | Choice |
|---|---|
| Website and API | Next.js (React + Node.js), TypeScript |
| UI | Tailwind CSS |
| Database | MySQL-compatible TiDB Cloud Starter (free) |
| Database access | Drizzle ORM with migrations |
| Authentication | Better Auth (email and password, email verification, password reset, rate limiting, roles) |
| Photos and proof files | Cloudinary (free plan): public photos, private proof files through signed links |
| Email | Gmail SMTP through Nodemailer |
| Matching | Scored in application code (system design §9) |
| Scheduled jobs | Vercel Cron, daily (pickup reminders, expiry checks) |
| Hosting | Vercel (Hobby, free) |
| Mobile | Installable PWA |
| Tests | Vitest and Playwright |

## Alternatives considered

- **Laravel + MySQL**: fastest to build, but free PHP hosts either can't run background jobs or sleep after inactivity, which breaks the "always online" requirement. Always-free virtual servers need a credit card and server administration time.
- **Spring Boot + MySQL**: the same hosting problem, and more code per feature.
- **Firebase**: a document database. It doesn't fit the relational ERD or the matching queries.
- **Supabase or Neon (PostgreSQL)**: good fits, but PostgreSQL wasn't taught. Supabase's free projects also pause after a week of inactivity.

## Consequences

- One language (TypeScript) and one repository for the whole system.
- Because Vercel's free plan runs scheduled jobs only once a day, matching runs right after each report is saved, not as a separate worker. Daily jobs handle reminders and expiry.
- Authorization is enforced in application code, so the security tests must cover ownership and role checks.
- Gmail sending is limited to roughly 500 emails a day, which is enough for the evaluation.
- Table 3 in Chapter III changes: Firebase becomes MySQL (TiDB Cloud), Flutter becomes a PWA, and Spring Boot/Node.js becomes Next.js (Node.js).
