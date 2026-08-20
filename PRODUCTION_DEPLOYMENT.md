# Production deployment — HostKing (DirectAdmin)

Process for taking this app from local development to production on
HostKing, for `kingdom-thread-co.co.za`. HostKing's control panel is
**DirectAdmin**, not cPanel — the steps below use DirectAdmin's own
terminology (its Node.js hosting feature is CloudLinux's "Node.js
Selector," the same underlying technology cPanel's "Setup Node.js App"
uses, just under DirectAdmin's UI). Menu wording can vary slightly between
DirectAdmin themes/versions, so treat the exact labels below as "look for
something like this" rather than pixel-exact — confirm against the live
panel on first use. No secrets in this file — it's committed to git, same
as `MANUAL_TESTING.md`. Real credentials go in `DEV_CREDENTIALS.md`
(gitignored, local reference only) or directly into DirectAdmin's env var
UI / a server-side `.env` file (also never committed).

## Architecture recap (why the steps below look the way they do)

- **Frontend**: a Vite/React static build (`npm run build` → `dist/`). No
  server-side rendering — deploy the built files to static hosting.
- **Backend**: an Express API (`server/`), deployed separately as a HostKing
  Node.js app via DirectAdmin's Node.js Selector ("Setup Node.js App,"
  under Extra Features — Passenger-backed, same as cPanel's equivalent).
- **Database**: MySQL, provisioned through DirectAdmin's MySQL Management.
  **A brand-new, empty database** — production does not reuse or import the
  dev database. See step 1.
- **Product/category/thread-colour catalogue**: NocoDB, self-hosted at
  `nocodb.khjimaging.com`. Production uses **the same NocoDB instance and
  base as dev** — there is no separate production catalogue to provision or
  seed. This means editing a product/category from either environment's
  admin UI changes the same live data everywhere; there's no
  staging/production split for catalogue content.
- **HostKing Node hosting is on-demand — there is no long-lived process.**
  This is why the app uses cron scripts instead of in-process timers for
  anything recurring:
  - `server/scripts/cron/ingest-emails.js` — polls IMAP for replies, must
    run every 5–15 minutes via a HostKing cron job.
  - `server/scripts/cron/cleanup-sessions.js` — deletes expired session
    rows (the session store's own internal sweeper is disabled for the same
    reason — see `server/src/middleware/session.js`), run this daily.
- **Product/category images** go straight to NocoDB's attachment API — no
  local image storage to provision.
- **Customer quote file uploads** (design files, wording docs) *are* stored
  on local disk, outside the web root (`UPLOADS_DIR`, defaults to
  `server/uploads/`) — this directory needs to exist and be writable.
- `app.set("trust proxy", 1)` and the session cookie's `secure: true` in
  production (`server/src/middleware/session.js`) assume HostKing
  terminates TLS in front of the app — **HTTPS on both domains is not
  optional**, login won't work over plain HTTP in production.

## Prerequisites

- HostKing DirectAdmin access with: MySQL Management (database creation),
  Node.js Selector / "Setup Node.js App" (Node ≥ 18, matching
  `server/package.json` `engines`), Cron Jobs, and SSL Certificates
  (Let's Encrypt) for both `kingdom-thread-co.co.za` and the
  `api.kingdom-thread-co.co.za` subdomain (create this subdomain first if
  it doesn't already exist — the backend Node.js app is hosted there,
  separate from the frontend on the main domain).
- **SSH access to the account.** DirectAdmin's Node.js Selector has no
  browser terminal and no "run an arbitrary command" box — beyond its own
  "Run NPM Install" button, it only starts/stops/restarts the app. Steps 4
  and 6 (`npx knex migrate:latest`, `npm run create-admin`) need a real
  shell. Confirm SSH is included on the HostKing plan before relying on
  this doc — if it isn't, those two steps need a different plan (e.g. a
  support ticket asking HostKing to run them, or temporarily enabling
  `INITIAL_ADMIN_*` env vars for step 6 instead of the CLI script).
- The `quotes@kingdom-thread-co.co.za` mailbox — this is already the live
  production mailbox in use (confirmed working for both SMTP send and IMAP
  read via `cyclops.hkdns.host`); see the Known Gotchas section for the
  hostname caveat.
- The dev `NOCODB_BASE_URL` / `NOCODB_API_TOKEN` / `NOCODB_BASE_ID` values
  from `server/.env` — copied as-is into production's env (same instance,
  same base, see Architecture recap above).
- A generated `SESSION_SECRET` (`openssl rand -hex 32`) — do **not** reuse
  the dev value.
- Your local branch committed and pushed. On your local machine, from the
  repo root, run:
  ```
  git status
  git log -1
  ```
  `git status` must show a clean working tree (no "Changes not staged" /
  "Untracked files" you need) — uncommitted local work never reaches the
  server no matter which deploy method you use below. `git log -1` shows
  the exact commit hash you're about to deploy; note it down so you can
  confirm the server ends up on the same commit.

## 1. Provision MySQL — start empty, no dev data

Create a **new, empty** database and a scoped user via DirectAdmin's MySQL
Management (not the account's root MySQL user — same pattern as the local
dev setup in `DEV_CREDENTIALS.md`). Note host/port/db/user/password for
step 2.

**Do not dump/import the dev database.** The dev database has real test
quotes, orders, messages, and accounts accumulated from testing — none of
that belongs in production. Step 4 (`knex migrate:latest`) creates every
table from scratch, empty, on this new database — that's the entire "data
migration" this deploy needs. Four exceptions are seeded automatically by
that same migration run (the current VAT rate, shipping rates, and all
three policy pages — Privacy, Cookie, Returns & Cancellation — see step
6b) since those are real business content, not test data. Everything else
production and dev share comes
from the NocoDB-hosted catalogue (see Architecture recap); anything still
empty after migrations (just site turnaround text) needs to be re-entered
deliberately, also step 6b.

## 2. Write the production env files (write fresh values, don't copy dev's file as-is)

Both `.env` (root) and `server/.env` are gitignored — they never deploy via
git, so they have to reach HostKing some other way. **Use a `server/.env`
file**, not DirectAdmin's Node.js Selector environment-variable UI — this
app needs ~20 vars, which is tedious and typo-prone to enter one field at a
time in that UI, and some Node.js Selector implementations only apply
changed env vars on the app's next explicit Restart, an easy step to
forget. A file is also exactly the same `dotenv`-loading path already
proven working in dev. It's easiest to draft this file locally (a text
editor, using `server/.env.example` as the template) and then upload it via
SFTP/File Manager directly into the Application root you'll set up in step
3 — or create/edit it directly on the server through File Manager's editor
if you prefer, either is fine. Once it's in place, lock down its
permissions: over SSH, `chmod 600 server/.env` (run from inside the
Application root) so it's readable only by the app's own user.

**Do not reuse your local dev `.env` files wholesale.** They currently point
at a LAN IP (`192.168.2.251`) from device testing, and dev's `NODE_ENV` is
`development`. Production needs its own values:

`server/.env` — use `server/.env.example` as the template, with:
- `NODE_ENV=production`
- `FRONTEND_ORIGINS=https://kingdom-thread-co.co.za` (real prod domain,
  `https://`, comma-separate if the frontend is also reachable at a `www.`
  variant)
- **Leave `FRONTEND_LAN_SUBNET` unset** — that's a local-device-testing
  convenience only (see `server/src/config/env.js`), meaningless and
  unnecessary in production.
- `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` from step 1
- `SESSION_SECRET` — the freshly generated value, not the dev placeholder
- `NOCODB_BASE_URL` / `NOCODB_API_TOKEN` / `NOCODB_BASE_ID` — copied
  directly from dev's `server/.env`, same values (see Prerequisites)
- `UPLOADS_DIR` — an absolute path outside any web-servable document root
  (create this directory in step 5 if you set it explicitly)
- `SMTP_HOST` / `IMAP_HOST` — **`cyclops.hkdns.host`, not
  `smtp.kingdom-thread-co.co.za`** (see Known Gotchas)
- `SMTP_USER` / `SMTP_PASSWORD` / `IMAP_USER` / `IMAP_PASSWORD` — the
  `quotes@kingdom-thread-co.co.za` credentials
- `COMPANY_NOTIFICATION_EMAIL=quotes@kingdom-thread-co.co.za`,
  `MAIL_DOMAIN=kingdom-thread-co.co.za`, `IMAP_PROCESSED_FOLDER` as needed
  (all but the mailbox itself have sane defaults — see `.env.example`
  comments)
- `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` / `INITIAL_ADMIN_NAME` —
  set for the *first* boot only (see step 6), then remove

Root `.env` (used only at frontend build time, not deployed):
- `VITE_API_URL=https://api.kingdom-thread-co.co.za/api` — this gets baked
  into the static JS bundle at build time in step 7, so it must be correct
  *before* running `npm run build`.

## 3. Deploy the backend (DirectAdmin → Node.js Selector / Setup Node.js App)

**First, get the whole repo onto the server** (not just `server/` — the
Node app's root will point at the `server/` subfolder within it, so the
rest of the repo can sit alongside it unused by the backend). Two ways:

- **SFTP/File Manager**: upload the entire repo into a folder in your
  home directory, e.g. `~/repo/` (so the backend ends up at
  `~/repo/server/`).
- **Git, over SSH** (needs SSH access — see Prerequisites):
  ```
  git clone https://github.com/hjkotze/kingdom-thread-co-website.git ~/repo
  ```
  For a later redeploy of a newer commit, instead of cloning again:
  ```
  cd ~/repo && git pull
  ```

**Then create the Node.js app** in DirectAdmin's Selector with:

- Application URL: `api.kingdom-thread-co.co.za`.
- Application root: **use whatever path the Selector proposes or requires
  for this Application URL — don't override it with a custom path unless
  you have a specific reason to.** DirectAdmin's Node.js Selector is known
  to tie an app's root to the target domain/subdomain's own document root
  (in this case, whatever you set as `api.kingdom-thread-co.co.za`'s
  document root when creating the subdomain — e.g.
  `~/domains/api.kingdom-thread-co.co.za/public_html` if you went with the
  Default option). This doc can't tell you the exact value with certainty
  without seeing your live panel — treat the value the Selector shows/fills
  in for you as authoritative. Whatever that path turns out to be, `git
  clone`/upload the **contents of this repo's `server/` folder** directly
  into it (so `package.json` and `src/` sit directly inside the Application
  root, not nested one level down inside a `server/` subfolder) — this is
  different from the `~/repo` clone location suggested above, which is a
  convenient staging spot you can `git pull` into and then copy/symlink
  from, not necessarily the Application root itself.
- Application startup file: `src/server.js`, relative to whatever the
  Application root ends up being.
- Node version: ≥ 18.
- Use the Node.js Selector's "Run NPM Install" button to install
  `server/package.json` dependencies — this is the one arbitrary-ish
  command it does provide; everything else needs SSH (see Prerequisites).
- Confirm the `server/.env` file from step 2 is present directly inside
  the application root — `server/src/config/env.js` reads it via `dotenv`
  on boot, no further action needed here beyond making sure it's actually
  there.

This means the Application root and the subdomain's document root may
turn out to be **the same directory** — that's expected here, not a
mistake, since this subdomain exists solely to host the API and serves no
separate static content of its own. (Contrast with the frontend in step 7:
`kingdom-thread-co.co.za`'s own `public_html` genuinely is shared/static,
which is why the backend must never be placed there instead.)

## 4. Run database migrations

Over SSH (see Prerequisites — DirectAdmin has no browser terminal). First
`cd` into the Application root from step 3, then activate the Node.js
Selector's virtual environment — the Selector's app management page shows
an exact command for this specific app, something like:

```
source /home/<youraccount>/nodevenv/domains/api.kingdom-thread-co.co.za/<path>/18/bin/activate && cd /home/<youraccount>/domains/api.kingdom-thread-co.co.za/<path>
```

Copy and run that exact line as shown on the Selector's page (the
`<youraccount>`/`<path>` placeholders above are illustrative — the real
command it gives you already has your actual paths filled in and already
`cd`s you to the right place). Then run:

```
npx knex migrate:latest
```

This creates every table currently defined in
`server/src/db/migrations/` from scratch, empty. Back up the production
database before running migrations on any *existing* production data in
future deploys (this first run is the exception — there's nothing to lose
yet).

## 5. Create the uploads directory

If `UPLOADS_DIR` was left at its default, HostKing will create
`server/uploads/` automatically on first write — but confirm the app's
process has write permission and that this path is **not** inside any
document root that's directly web-servable (it's meant to only be reachable
through the authenticated download endpoint, not as static files).

## 6. Create the first admin account

Two options — pick one:

- **Automatic**: set `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` /
  `INITIAL_ADMIN_NAME` in `server/.env` before the app's first boot. It
  bootstraps once (only when zero admins exist yet — see
  `server/src/lib/bootstrapAdmin.js`) and is permanently inert afterward,
  even if left set. Recommended to remove these three vars after confirming
  you can log in, as a precaution.
- **Manual**: over SSH, same virtual-environment activation step as step 4
  first, then from the Application root:
  ```
  npm run create-admin -- --email=you@kingdom-thread-co.co.za --password=YourRealPasswordHere --name="Your Name"
  ```
  (replace the email/password/name with the real admin's — the values here
  are placeholders, not literal values to paste in as-is)

There is no self-service admin registration endpoint by design — this is
the only way to create one.

## 6b. Confirm business settings (VAT, shipping, and policies are seeded automatically)

A handful of settings live in MySQL, not NocoDB, and would otherwise leave
their tables **empty** (breaking checkout or leaving legal pages blank) on
a fresh deploy. Five migrations — all already committed to `main`, nothing
left to author before a deploy — seed or correct real current values for
these as part of step 4 (`knex migrate:latest`); no manual entry needed for
any of them:

- **VAT rate** (`20260819100001_seed_vat_rate_and_policy_content.js`) —
  seeded at 15% (South Africa's current rate as of this writing). Without
  this, `vat_rates` starts with zero rows and any order/invoice pricing
  calculation fails with a 500 ("No VAT rate configured for this date"). If
  the real rate ever changes, add a new rate from
  `/admin/configuration/settings` rather than editing this migration — same
  effective-dating the app already uses for rate changes.
- **Shipping rates** (`20260819100002_seed_shipping_rates.js`) — seeded
  with the two rates currently configured in dev ("Extra freight" R300,
  "FREIGHT" R150 default). Edit or add more from
  `/admin/configuration/settings` as needed.
- **Privacy Policy** (seeded in `20260819100001_seed_vat_rate_and_policy_content.js`,
  then corrected in `20260820100001_fix_privacy_policy_payment_and_deletion_wording.js`,
  then extended in `20260820100003_add_age_statement_to_privacy_policy.js`)
  — the second migration removes an earlier draft's inaccurate claim that
  PayFast/Yoco/PayPal are integrated (the real, current payment method is
  manual EFT + Proof of Payment) and makes the account-deletion rights
  wording honest about being a manual, email-initiated process; the third
  adds a brief age/minors statement. On a fresh database all three run in
  order, so this ends up correct and complete immediately — the second and
  third only matter as distinct steps for a database that already had an
  earlier version of this text seeded before they existed, like dev did.
- **Cookie Policy** (seeded in `20260819100001_seed_vat_rate_and_policy_content.js`)
  — unchanged since first seeded.
- **Returns & Cancellation Policy** (`20260820100002_add_returns_policy_type.js`)
  — a third policy type alongside Privacy/Cookies (this migration also
  widens the `policies.type` enum to allow it). Covers the made-to-order
  cooling-off exemption under the ECT Act and a 7-day defect/replacement
  window. Edit the text from `/admin/configuration/returns-policy` as
  needed — it's business content, same as the other two policies, not
  meant to be authoritative forever as written here.

All of these are safe to run against a database that already has this
content — they only insert/update when the table is empty, content is
still the known-old text, or (for the enum widening) the column doesn't
already allow the new value — confirmed via direct testing against dev:
no-ops, no duplicates, no clobbered admin edits.

Still genuinely empty after migrations and worth setting deliberately
before taking real orders, at `/admin/configuration/settings`:

- **Site turnaround text** — has an app-level fallback ("7-10") if never
  set, so this one is cosmetic-only, but worth setting deliberately.

## 7. Build and deploy the frontend

**Run this on your local machine, not the server** — HostKing never needs
the frontend's source or `node_modules`, only the static output. From the
repo root locally, with the production `VITE_API_URL` set in the root
`.env` (step 2):

```
npm run build
```

Upload the contents of the resulting `dist/` to the document root for
`kingdom-thread-co.co.za` (DirectAdmin File Manager or SFTP — this is
`public_html`, unlike the backend's app root in step 3). This is a fully
static deploy — no Node process runs for the frontend itself.

## 8. SSL

Enable a free Let's Encrypt certificate (DirectAdmin → SSL Certificates) —
or your preferred cert — on **both** `kingdom-thread-co.co.za` and the API
subdomain. Required, not optional — the session cookie sets `secure: true`
whenever `NODE_ENV=production` (`server/src/middleware/session.js`), so
login/session cookies are silently dropped over plain HTTP.

## 9. Cron jobs (DirectAdmin → Cron Jobs)

Add two jobs. **A cron job's command field is a single, standalone shell
command** — it does not inherit any directory or environment from step 4,
and cron's own `PATH` typically does not include the Selector-managed
`node` binary, only whatever system Node (if any) is installed. Each
command below must therefore include the same virtual-environment
activation line from step 4, then `cd` into the Application root, then run
the script — all chained with `&&` into one line, since each cron command
runs fresh:

```
source /home/<youraccount>/nodevenv/domains/api.kingdom-thread-co.co.za/<path>/18/bin/activate && cd /home/<youraccount>/domains/api.kingdom-thread-co.co.za/<path> && node scripts/cron/ingest-emails.js
```

```
source /home/<youraccount>/nodevenv/domains/api.kingdom-thread-co.co.za/<path>/18/bin/activate && cd /home/<youraccount>/domains/api.kingdom-thread-co.co.za/<path> && node scripts/cron/cleanup-sessions.js
```

(again, replace the `<youraccount>`/`<path>` placeholders with the real
activation command from the Selector's app page, same as step 4 — don't
paste the template above verbatim.)

| Command (schematic — see full command above) | Suggested schedule | Purpose |
|---|---|---|
| `... && node scripts/cron/ingest-emails.js` | every 5–15 min | Pull customer email replies into quote threads |
| `... && node scripts/cron/cleanup-sessions.js` | daily | Delete expired session rows |

Without these, email replies never get matched to quotes, and the sessions
table grows unbounded (its own in-process cleanup is deliberately disabled
for this exact on-demand-hosting reason). If a cron job silently does
nothing, suspect the activation line first — a bare `node scripts/...`
with no activation will typically fail with "command not found" if there's
no system-wide Node install, since cron won't see the Selector's version.

## 10. Verify

- `GET https://api.kingdom-thread-co.co.za/api/health` → `{ "ok": true }`
- Confirm the database really is empty of dev data — via DirectAdmin's
  phpMyAdmin (under MySQL Management) or the `mysql` CLI over SSH:
  `SELECT COUNT(*) FROM quotes;` / `orders;` / `users;` should be `0`
  (aside from the one admin from step 6).
- Confirm the catalogue loads:
  `GET https://api.kingdom-thread-co.co.za/api/products` and
  `/api/categories` return the real shared NocoDB data, not empty lists
  (a broken `NOCODB_*` value is the usual cause if empty).
- Log in as the admin account created in step 6.
- Submit a real test customer quote end-to-end, including a reply, and
  confirm the notification/confirmation emails send and thread correctly.
  Delete or ignore this test quote afterward — same "no dev data lingering"
  principle as step 1.
- Create a test order and confirm pricing (VAT + shipping) actually
  computes rather than 500ing — proves step 6b was completed.
- Confirm the admin dashboard's status/category tiles and quote list load
  (`/admin`, `/admin/quotes`).

## Known gotchas

- **SMTP/IMAP hostname**: `smtp.kingdom-thread-co.co.za` /
  `imap.kingdom-thread-co.co.za` fail TLS certificate validation on
  HostKing — the cert covers the shared server's real hostname,
  `cyclops.hkdns.host`, not the per-domain alias. Use `cyclops.hkdns.host`
  for both `SMTP_HOST` and `IMAP_HOST`, same credentials otherwise. Already
  confirmed working this way for `quotes@kingdom-thread-co.co.za` — if email
  stops working after any future mailbox change, check this first before
  assuming credentials are wrong.
- **Outbound email rate limit**: the mailbox used during earlier development
  (a different address on the same domain) hit a hard cap of **10 outbound
  emails/day**. Confirm with HostKing whether `quotes@kingdom-thread-co.co.za`
  has the same cap before launch — quote confirmation + notification + reply
  emails add up fast under real usage.
- **No persistent process**: don't add `setInterval`/background loops to
  the Express app expecting them to survive — HostKing's Passenger-managed
  Node hosting (via DirectAdmin's Node.js Selector) can restart the process
  between requests. Anything recurring belongs in `server/scripts/cron/`,
  triggered by a HostKing cron job (see step 9).
- **No browser terminal or arbitrary command runner**: unlike cPanel,
  DirectAdmin's Node.js Selector can't run a one-off command beyond its own
  "Run NPM Install" button — steps 4 and 6 need real SSH access. Confirm
  this is available on the HostKing plan well before deploy day, not while
  mid-deploy.
- **Shared catalogue, no staging**: because dev and prod point at the same
  NocoDB instance/base, a product/category edit made from the dev admin UI
  is live on production immediately, and vice versa. There is currently no
  way to test a catalogue change in isolation before it's public.

## Pre-launch content checklist (unrelated to infra, but easy to miss)

- VAT rate, shipping rates, and all three policy pages (Privacy, Cookie,
  Returns & Cancellation) are all seeded automatically by migrations (step
  6b) — just confirm they're actually correct for launch, since "seeded"
  isn't the same as "reviewed."
- Double check no dev/test accounts (`admin@wovenblankets.test`,
  `jane@example.com`, etc. — see `DEV_CREDENTIALS.md`) exist in the
  production database — they won't, if step 1 was followed (fresh database,
  never imported from dev), but worth a final check if that step was ever
  skipped.
- Double check no leftover test quotes/orders from your own step 10
  verification pass before calling it launched.
