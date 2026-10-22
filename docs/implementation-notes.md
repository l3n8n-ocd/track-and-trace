# Implementation notes

Where the built system differs from [the system design](system-design.md), and why. Update the paper's diagrams and text where these matter.

## Data model

| Design | Built | Why |
|---|---|---|
| `USER.user_id` is an integer | A text ID (UUID) | The login library (Better Auth) manages user IDs this way |
| `USER.password_hash` | Stored in a separate `account` table | Better Auth keeps credentials apart from profile data; the user table has no password |
| `USER.status` includes `UNVERIFIED` | `status` is `ACTIVE` or `DEACTIVATED`; email verification is a separate `email_verified` flag | Better Auth tracks verification itself |
| — | Added `report.hidden_details`, `report.storage_location_id`, `report.location_note`, `report.verified_by`, `report.date_verified` | Proposed in design §7.2; needed for claim checks, storage, and records |
| — | Added `claim.match_id`, `claim.date_released`, `claim.released_by`, `claim.reminder_sent` | Links a claim to its match and records the handover |
| — | Added `announcement`, `session`, `verification`, and `rate_limit` tables | Announcements (design §7.2) and the login library's sessions, tokens, and rate limits |
| `LOCATION` | Also has `is_storage` and `is_active` | One table holds both campus places and storage spots; admins can hide old ones |

The Lucid EERD (Chapter III, Figure 5) includes `hidden_details`, `storage_location_id` (second link from REPORT to LOCATION), `is_storage` on LOCATION, `match_id` on CLAIM, and `ANNOUNCEMENT` (linked to ADMINISTRATOR). The chapter's figures are in [figures/](figures/).

## Status values

Report statuses follow design §8.1. Claim statuses add nothing beyond §8.2. In flowchart page 6, approving a claim sets the **claim** to Approved and sends pickup details; releasing sets the item to Claimed. The Lucid flowchart already reflects this ("Send pickup details to claimant", "Release item; set status to Claimed, then close report").

## API

Design §11 lists REST endpoints. Most of these are built as Next.js **server actions** (form submissions handled on the server) instead of separate JSON endpoints; the behavior and permission checks are the same. Real HTTP endpoints exist for:

- `/api/auth/*` (login library)
- `/api/files/proof/[id]` (private proof files)
- `/api/me/export` (download my data)
- `/api/admin/export` (CSV exports)
- `/api/cron/daily` (daily job)

## Storage and privacy

- Proof files are uploaded to Cloudinary as *authenticated* assets. The app shows them only after checking that the viewer is the claimant or an administrator, then redirects to a signed Cloudinary link. Cloudinary's free plan signs links without an expiry time, so "short-lived" links (design §13) would need a paid plan; the links are unguessable and never shown to other users.
- Public photos are blurred by Cloudinary in search results. In local development (no Cloudinary), photos aren't blurred.
- Photos are resized and re-encoded in the browser before upload, which also removes location metadata, and keeps uploads under Vercel's 4.5 MB request limit.

## Background work

Vercel's free plan runs scheduled jobs once a day. Matching runs right after each report is saved or edited (after the page responds), and again in the daily job. Notifications and emails are also sent after the response.

## Database queries

The pages use plain SQL joins instead of Drizzle's "relational queries", because those generate `LATERAL` joins that MariaDB and TiDB don't support.

## Testing

Implemented: unit tests (match scoring, status transitions) and end-to-end tests (full claim flow, access control, daily job). Still to do for Chapter IV: the labeled sample set for the matching accuracy test, compatibility checks on real phones and browsers, performance measurements, and the ISO/IEC 25010 survey.
