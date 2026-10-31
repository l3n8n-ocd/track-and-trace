# Deploy this local folder to Firebase

Firebase project: `track-and-trace-bulsu-2026` (Track-and-Trace).
Backend ID: `track-and-trace`.

This is a complete Git clone, starting from main commit
`fb0b6948847ebc8c61bc65a92d83adbbb651cf45`, including the merged performance
fixes and the registration error-message fix. Firebase configuration lives
on the local `firebase/local-app-hosting` branch. The GitHub remote is retained
for normal source control, but deployments upload this local folder directly.

This step moves website hosting. The existing TiDB/MySQL database, Better Auth
accounts, Cloudinary files, and SMTP email service remain in use. Git does not
contain the production database contents, uploaded files, or deployment secrets.

## Before the first deployment

1. Enable the Blaze plan for this project:
   https://console.firebase.google.com/project/track-and-trace-bulsu-2026/usage/details
   App Hosting requires linked billing. No billing account was linked by this setup.
2. Confirm the existing TiDB cluster region, then choose an App Hosting region
   close to it. Singapore is `asia-southeast1`; do not assume the database is
   there. The backend has not been created with a guessed region.
3. Create the backend from this folder, supplying the chosen region:

   ```powershell
   npm run firebase:backend -- --primary-region YOUR_CONFIRMED_REGION
   ```

   The globally installed Firebase CLI is already signed in on this computer.
   On another computer, install `firebase-tools` and run `firebase login` first.
4. Store the values below in Secret Manager. Use the values from the current
   deployment for the database, authentication, Cloudinary, and email so the
   new host continues to use the same accounts and files. Do not paste them in
   chat, commit them, or copy the old temporary local-test credentials.

   | Application variable | Firebase secret name |
   | --- | --- |
   | DATABASE_URL | track-and-trace-database-url |
   | BETTER_AUTH_SECRET | track-and-trace-auth-secret |
   | APP_URL | track-and-trace-app-url |
   | CRON_SECRET | track-and-trace-cron-secret |
   | CLOUDINARY_CLOUD_NAME | track-and-trace-cloudinary-name |
   | CLOUDINARY_API_KEY | track-and-trace-cloudinary-key |
   | CLOUDINARY_API_SECRET | track-and-trace-cloudinary-secret |
   | SMTP_USER | track-and-trace-smtp-user |
   | SMTP_PASSWORD | track-and-trace-smtp-password |

   Set each secret using the Firebase console or the following interactive
   command, replacing the secret name for each row:

   ```powershell
   firebase apphosting:secrets:set track-and-trace-database-url
   ```

   Grant the new backend access when prompted. `APP_URL` must be the backend's
   actual public HTTPS address shown by Firebase, so email links and trusted
   origins point to the new website. To inspect that address after creating
   the backend, run:

   ```powershell
   firebase apphosting:backends:get track-and-trace
   ```

## Deploy from this folder

```powershell
npm ci
npm run firebase:deploy
```

Firebase uploads the source, builds it in Cloud Build, and deploys the server
to Cloud Run through App Hosting. `.git`, local environment files, installed
dependencies, build output, and local test uploads are excluded from uploads.

The initial configuration permits one server instance so reference-list cache
invalidation stays coherent with the current Next.js configuration. Configure
a shared cache before increasing `maxInstances`. `minInstances: 0` allows
scale-to-zero; keeping an instance warm is a separate billing/performance choice.

The existing `build` command applies versioned database migrations and seeds
missing reference data before building Next.js. Use the existing database
connection to retain current records; take the usual database backup before
the first deployment that applies new migrations. Existing administrator
accounts remain in the database, so administrator seed credentials are not
required when reusing it.

After deployment, verify login, reporting, photos, matching, claiming,
private proof downloads, admin actions, notifications, and verification/reset
email links before directing users to the Firebase URL.

## Preserve the daily job

Firebase does not execute the Vercel-specific `vercel.json` cron schedule.
Before retiring the Vercel deployment, configure Cloud Scheduler to send a
GET request to `APP_URL/api/cron/daily` once daily at `0 16 * * *` in UTC
(midnight in Asia/Manila), with the header:

```text
Authorization: Bearer <the configured CRON_SECRET>
```

Keep the actual header value in the scheduler's protected configuration.
Do not put the secret in this document or source control. Verify unauthorized
requests return 401 and an authorized test run returns `ok: true`. Once the
Firebase job is verified, retire the old Vercel schedule so it runs only once.

## Local development

Copy `.env.example` to `.env.local` and enter your development-service values,
then run `npm run dev`. Local environment files are ignored by Git and by the
Firebase source deployment. Production secrets are configured separately.

References:
- https://firebase.google.com/docs/app-hosting/alt-deploy
- https://firebase.google.com/docs/app-hosting/configure
