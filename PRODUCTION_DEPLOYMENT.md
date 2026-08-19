# Production deployment — HostKing

Process for taking this app from local development to production on
HostKing, for `kingdom-thread-co.co.za`. No secrets in this file — it's
committed to git, same as `MANUAL_TESTING.md`. Real credentials go in
`DEV_CREDENTIALS.md` (gitignored, local reference only) or directly into
HostKing's env var UI / a server-side `.env` file (also never committed).

## Architecture recap (why the steps below look the way they do)

- **Frontend**: a Vite/React static build (`npm run build` → `dist/`). No
  server-side rendering — deploy the built files to static hosting.
- **Backend**: an Express API (`server/`), deployed separately as a HostKing
  Node.js app (cPanel "Setup Node.js App", backed by Phusion Passenger).
- **Database**: MySQL, provisioned through cPanel. **A brand-new, empty
  database** — production does not reuse or import the dev database. See
  step 1.
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

- HostKing cPanel access with: MySQL database creation, "Setup Node.js App"
  (Node ≥ 18, matching `server/package.json` `engines`), Cron Jobs, and
  SSL/AutoSSL for both the main domain and whatever subdomain hosts the API.
- The `quotes@kingdom-thread-co.co.za` mailbox — this is already the live
  production mailbox in use (confirmed working for both SMTP send and IMAP
  read via `cyclops.hkdns.host`); see the Known Gotchas section for the
  hostname caveat.
- The dev `NOCODB_BASE_URL` / `NOCODB_API_TOKEN` / `NOCODB_BASE_ID` values
  from `server/.env` — copied as-is into production's env (same instance,
  same base, see Architecture recap above).
- A generated `SESSION_SECRET` (`openssl rand -hex 32`) — do **not** reuse
  the dev value.
- Your local branch committed and pushed, and confirmation of exactly which
  commit is being deployed (`git log -1`) — check `git status` before
  starting; uncommitted local work won't be on the server no matter how it's
  deployed.

## 1. Provision MySQL — start empty, no dev data

Create a **new, empty** database and a scoped user via cPanel (not the
account's root MySQL user — same pattern as the local dev setup in
`DEV_CREDENTIALS.md`). Note host/port/db/user/password for step 2.

**Do not dump/import the dev database.** The dev database has real test
quotes, orders, messages, and accounts accumulated from testing — none of
that belongs in production. Step 4 (`knex migrate:latest`) creates every
table from scratch, empty, on this new database — that's the entire "data
migration" this deploy needs. Three exceptions are seeded automatically by
that same migration run (the current VAT rate, shipping rates, and the
Privacy/Cookie Policy text — see step 6b) since those are real business
content, not test data. Everything else production and dev share comes
from the NocoDB-hosted catalogue (see Architecture recap); anything still
empty after migrations (just site turnaround text) needs to be re-entered
deliberately, also step 6b.

## 2. Write the production env files (do this on the server, not by copying dev files)

Both `.env` (root) and `server/.env` are gitignored — they never deploy via
git and must be created directly on HostKing, either as files (SFTP/File
Manager) or through the Node app's environment-variable UI in cPanel.

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
- `VITE_API_URL=https://<api-subdomain>.kingdom-thread-co.co.za/api` (or
  whatever URL the backend ends up reachable at — see step 3) — this gets
  baked into the static JS bundle at build time in step 7, so it must be
  correct *before* running `npm run build`.

## 3. Deploy the backend (cPanel → Setup Node.js App)

- Application root: the `server/` directory of this repo, uploaded to
  HostKing (via git pull on the server, SFTP, or cPanel's Git Version
  Control feature).
- Application URL: a subdomain (e.g. `api.kingdom-thread-co.co.za`) — cPanel
  wires up the reverse proxy for you.
- Application startup file: `src/server.js`.
- Node version: ≥ 18.
- Run "NPM Install" through the cPanel UI (or `npm install` via its
  terminal) to install `server/package.json` dependencies.
- Set the env vars from step 2 through cPanel's Node app environment
  variables UI, or ensure `server/.env` is present in the app root (either
  works — `server/src/config/env.js` reads via `dotenv`).

## 4. Run database migrations

From the app's terminal (cPanel Terminal or SSH), inside `server/`:

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
- **Manual**: from the app's terminal, inside `server/`:
  ```
  npm run create-admin -- --email=you@kingdom-thread-co.co.za --password=... --name="Your Name"
  ```

There is no self-service admin registration endpoint by design — this is
the only way to create one.

## 6b. Confirm business settings (VAT, shipping, and policies are seeded automatically)

A handful of settings live in MySQL, not NocoDB, and would otherwise leave
their tables **empty** (breaking checkout or leaving legal pages blank) on
a fresh deploy. Two migrations seed real current values for these as part
of step 4 (`knex migrate:latest`) — no manual entry needed for any of them:

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
- **Privacy Policy / Cookie Policy** (also in
  `20260819100001_seed_vat_rate_and_policy_content.js`) — seeded with the
  real current text at `/admin/configuration/privacy-policy` and
  `/admin/configuration/cookie-policy`.

All three seed migrations only insert when their table is empty (or, for
policies, when content is still `null`) — safe to run against dev's
existing database (confirmed: no-op, no duplicates) and will never
overwrite an admin edit made before a later deploy.

Still genuinely empty after migrations and worth setting deliberately
before taking real orders, at `/admin/configuration/settings`:

- **Site turnaround text** — has an app-level fallback ("7-10") if never
  set, so this one is cosmetic-only, but worth setting deliberately.

## 7. Build and deploy the frontend

From the repo root, with the production `VITE_API_URL` set (step 2):

```
npm run build
```

Upload the contents of the resulting `dist/` to the document root for
`kingdom-thread-co.co.za` (cPanel File Manager or SFTP). This is a fully
static deploy — no Node process runs for the frontend itself.

## 8. SSL

Enable AutoSSL (or your preferred cert) on **both** `kingdom-thread-co.co.za`
and the API subdomain. Required, not optional — the session cookie sets
`secure: true` whenever `NODE_ENV=production` (`server/src/middleware/session.js`),
so login/session cookies are silently dropped over plain HTTP.

## 9. Cron jobs (cPanel → Cron Jobs)

Add two jobs, both `cd`'d into the deployed `server/` directory first:

| Script | Suggested schedule | Purpose |
|---|---|---|
| `node scripts/cron/ingest-emails.js` | every 5–15 min | Pull customer email replies into quote threads |
| `node scripts/cron/cleanup-sessions.js` | daily | Delete expired session rows |

Without these, email replies never get matched to quotes, and the sessions
table grows unbounded (its own in-process cleanup is deliberately disabled
for this exact on-demand-hosting reason).

## 10. Verify

- `GET https://<api-subdomain>/api/health` → `{ "ok": true }`
- Confirm the database really is empty of dev data — from the app's MySQL
  terminal: `SELECT COUNT(*) FROM quotes;` / `orders;` / `users;` should be
  `0` (aside from the one admin from step 6).
- Confirm the catalogue loads: `GET https://<api-subdomain>/api/products`
  and `/api/categories` return the real shared NocoDB data, not empty lists
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
  the Express app expecting them to survive — HostKing's Node hosting can
  restart the process between requests. Anything recurring belongs in
  `server/scripts/cron/`, triggered by a HostKing cron job (see step 9).
- **Shared catalogue, no staging**: because dev and prod point at the same
  NocoDB instance/base, a product/category edit made from the dev admin UI
  is live on production immediately, and vice versa. There is currently no
  way to test a catalogue change in isolation before it's public.

## Pre-launch content checklist (unrelated to infra, but easy to miss)

- VAT rate, shipping rates, and Privacy/Cookie Policy text are all seeded
  automatically by migrations (step 6b) — just confirm they're actually
  correct for launch, since "seeded" isn't the same as "reviewed."
- Double check no dev/test accounts (`admin@wovenblankets.test`,
  `jane@example.com`, etc. — see `DEV_CREDENTIALS.md`) exist in the
  production database — they won't, if step 1 was followed (fresh database,
  never imported from dev), but worth a final check if that step was ever
  skipped.
- Double check no leftover test quotes/orders from your own step 10
  verification pass before calling it launched.
