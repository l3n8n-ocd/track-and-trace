# Setting up the free accounts

ReturnDesk runs on four free services. Create them in this order. Each takes about 5 minutes.

| # | Service | Used for | Values you'll copy |
|---|---|---|---|
| 1 | Gmail | Sending system emails | `SMTP_USER`, `SMTP_PASSWORD` |
| 2 | TiDB Cloud Starter | MySQL-compatible database | `DATABASE_URL` |
| 3 | Cloudinary | Item photos and proof files | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| 4 | Vercel | Hosting the live website | Where all the values above go |

**Keep the values private.** Save them in a password manager or a private note while you work. Don't paste them in chats, group messages, or the repository. They go only into Vercel's Environment Variables (step 4).

---

## 1. Gmail account for sending emails

Use a **new personal Gmail account**, not your BulSU school account. School accounts usually block App Passwords.

1. Go to <https://accounts.google.com/signup> and create an account, for example `returndesk.bulsu@gmail.com`. If that name is taken, pick something close.
2. Turn on 2-Step Verification: go to <https://myaccount.google.com/security>, click **2-Step Verification**, and follow the steps with your phone number.
3. Create an App Password: go to <https://myaccount.google.com/apppasswords>.
   - App name: `ReturnDesk`
   - Click **Create**.
   - Copy the 16-character password it shows. **It is shown only once.** Remove the spaces, so `abcd efgh ijkl mnop` becomes `abcdefghijklmnop`.
4. Write down:
   - `SMTP_USER` = the full Gmail address
   - `SMTP_PASSWORD` = the 16-character App Password, without spaces

If the App Passwords page says the setting isn't available, 2-Step Verification isn't on yet. Turn it on and try again.

---

## 2. TiDB Cloud Starter (database)

TiDB Cloud Starter (formerly "Serverless") is a free database that works with MySQL. It sleeps when unused and wakes up by itself on the next request, so the site never needs a manual restart.

1. Go to <https://tidbcloud.com> and click **Sign Up**. Signing up with your GitHub or Google account is the quickest.
2. Create a cluster:
   - Choose the **Starter** (free) plan.
   - Cloud provider: AWS. Region: **Singapore (ap-southeast-1)**, the closest to the Philippines.
   - Cluster name: `returndesk`
   - Click **Create**. It's ready in about a minute.
3. Create the database:
   - Open the cluster, then open the **SQL Editor**.
   - Run: `CREATE DATABASE returndesk;`
4. Get the connection details:
   - On the cluster page, click **Connect** (upper right).
   - Connection type: **Public**.
   - Click **Generate Password**. **Copy it now; it is shown only once.**
   - Note the **Host**, **Port** (`4000`), and **Username** (it looks like `xxxxxxxx.root`).
5. Build your `DATABASE_URL` from those values:

   ```
   mysql://USERNAME:PASSWORD@HOST:4000/returndesk
   ```

   Example shape: `mysql://3xAbCdEf.root:Gs7kP2qLmN@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/returndesk`

   If the password contains symbols like `@`, `#`, `/`, or `:`, click **Generate Password** again until you get one with only letters and numbers.

If the Connect dialog asks you to configure an IP access list, allow access from anywhere (`0.0.0.0/0`). Vercel's servers don't have fixed IP addresses, and the connection is still protected by the password and TLS encryption.

---

## 3. Cloudinary (photos and proof files)

1. Go to <https://cloudinary.com/users/register_free> and sign up. Choose the **Free** plan.
2. Answer the short onboarding questions, choosing any option. They don't affect the account.
3. On the **Dashboard**, copy the **Cloud name** → `CLOUDINARY_CLOUD_NAME`.
4. Click the gear icon (**Settings**), then **API Keys**:
   - Copy the **API Key** → `CLOUDINARY_API_KEY`
   - Click to reveal the **API Secret**, and copy it → `CLOUDINARY_API_SECRET`. Treat it like a password.

---

## 4. Vercel (hosting)

Do steps 4.1 and 4.2 now. Do step 4.3 once the starter code is pushed to GitHub; the developer will tell you when.

### 4.1 Create the account

1. Go to <https://vercel.com/signup>.
2. Choose the **Hobby** (free) plan and click **Continue with GitHub**, using the GitHub account that owns the ReturnDesk repo.
3. Allow Vercel to access your GitHub account. When asked which repositories, choose **Only select repositories** and pick **ReturnDesk**.

### 4.2 Generate two random secrets

You need two long random strings: `BETTER_AUTH_SECRET` (signs login sessions) and `CRON_SECRET` (protects the daily scheduled job).

Generate each one separately, with either option:
- Open <https://generate-secret.vercel.app/32> and copy the result. Refresh the page for the second one.
- Or in Windows PowerShell, run this twice:

  ```powershell
  [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
  ```

### 4.3 Import the project (after the code is pushed)

1. In Vercel, click **Add New… → Project**.
2. Find **ReturnDesk** in the list and click **Import**.
3. Framework Preset: **Next.js** (detected automatically). Leave the build settings as they are.
4. Open **Environment Variables** and add each of these:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | from step 2 |
   | `BETTER_AUTH_SECRET` | from step 4.2 |
   | `CRON_SECRET` | from step 4.2 |
   | `CLOUDINARY_CLOUD_NAME` | from step 3 |
   | `CLOUDINARY_API_KEY` | from step 3 |
   | `CLOUDINARY_API_SECRET` | from step 3 |
   | `SMTP_USER` | from step 1 |
   | `SMTP_PASSWORD` | from step 1 |
   | `ADMIN_EMAIL` | the email for the first administrator account |
   | `ADMIN_PASSWORD` | a strong password for that administrator (change it after the first login) |

5. Click **Deploy**. The first build takes 2–3 minutes and creates the database tables automatically.
6. When it's done, Vercel shows the live address, for example `https://returndesk.vercel.app`. Then:
   - Go to **Settings → Environment Variables** and add `APP_URL` = that address, with no slash at the end.
   - Go to **Deployments**, open the menu (⋯) on the latest one, and click **Redeploy**.

From then on, every push to the `main` branch updates the live site automatically.

---

## Checklist

- [ ] Gmail account with 2-Step Verification and an App Password
- [ ] TiDB Cloud Starter cluster in Singapore, `returndesk` database created, `DATABASE_URL` built
- [ ] Cloudinary cloud name, API key, and API secret
- [ ] Vercel account linked to the ReturnDesk repo
- [ ] `BETTER_AUTH_SECRET` and `CRON_SECRET` generated
- [ ] Project imported, environment variables added, deployed, `APP_URL` set, redeployed
