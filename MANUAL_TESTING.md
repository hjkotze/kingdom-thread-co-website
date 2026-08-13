# Manual testing guide

A step-by-step script for exercising the whole application by hand — every
flow, what should happen, and what should explicitly **not** happen. Written
against local dev but applies to a deployed environment too (swap URLs).

Not a substitute for `DEV_CREDENTIALS.md` (that has the actual test account
passwords, DB/Airtable/email credentials, and hosting gotchas) — use the two
together. This file has no secrets in it and is safe to commit/share;
`DEV_CREDENTIALS.md` is gitignored and is not.

## Before you start

- Backend running (`npm start` in `server/`, → `http://localhost:3001`),
  frontend running (`npx vite --port 5173` from repo root, →
  `http://localhost:5173`).
- Migrations applied (`npx knex migrate:latest` in `server/`).
- Two browser profiles/windows help — one for the customer flow, one for
  admin — since customer and admin sessions are separate cookies but easy to
  mix up in a single window.
- Real inbox access to `hjkotze@gmail.com` (or whichever mailbox you use as
  a customer test account) for verification/reset/notification emails.
- **The test mailbox caps at 10 outbound emails/day.** Every registration,
  quote submission, admin reply, and formal-quote-ready action sends one.
  Plan a session's testing around that, or expect some emails to silently
  not arrive once you hit the cap — that's the mailbox, not a bug.

Status codes and copy below are quoted from the actual code as of this
writing (`server/src/modules/**`, `src/app/pages/**`). If wording has
since changed, trust the code over this document.

---

## A. Registration & email verification

1. Go to `/register`, fill in name/email/password (min 8 characters,
   confirm-password must match), submit.
   - **Expect:** switches in-place to a "Check your email" screen. No
     redirect, no session — you are not logged in yet.
   - **Don't expect:** to be able to log in with this account immediately.
     `POST /api/auth/login` returns `403` with
     `{"error":"Please verify your email before logging in.","code":"EMAIL_NOT_VERIFIED"}`
     until the link is clicked.
2. Check the inbox for the registered address. Click the verification link
   (`/verify-email?token=...`).
   - **Expect:** "Verifying your email…" flashes briefly, then you land
     logged-in on `/account` (or `/quote/review` if you had an in-progress
     quote draft in the *same tab* — see §H).
3. Click the same link a second time.
   - **Expect:** treated as success (already-verified is idempotent), logs
     you in again. Not an error.
4. Try registering a second account with an email that already exists.
   - **Expect:** `409` — "An account with this email already exists."
5. On the "Check your email" screen, click "Didn't get it? Resend the
   email" twice in a row.
   - **Expect:** first click sends a new email; the response is always the
     generic `{"message":"If an account exists for this email and isn't
     verified yet, we've sent a new link."}` regardless of what's actually
     true (anti-enumeration by design). Second click within 2 minutes is
     silently a no-op server-side (cooldown) but the UI still shows
     "Sent — check your inbox" either way — **don't expect** a visible error
     or a second email inside the cooldown window.
6. Wait past the 24-hour token expiry (or manually expire it in the DB —
   `update users set email_verification_expires_at = now() - interval 1
   hour where email = '...'`) and click the link.
   - **Expect:** `400` — "This verification link has expired. Request a
     new one."
7. Registration/resend rate limit: submit registration 6 times from the
   same IP within an hour (vary the email each time).
   - **Expect:** the 6th attempt is blocked (rate-limited, `429`-equivalent
     per `rateLimit` middleware). This exists specifically to protect the
     mailbox's 10/day cap from being drained by abuse — expect to burn
     through most of your day's email quota if you actually run this test.

## B. Login / logout

**Customer** (`/login`), **admin** (`/admin/login`) are separate pages,
separate endpoints (`/api/auth/login` vs `/api/admin/auth/login`), and the
admin page is **not linked from anywhere in the customer UI** — by design.
Reaching it requires typing the URL.

1. Log in with a verified customer account.
   - **Expect:** redirect to wherever you were trying to go (`state.from`)
     or `/` if there wasn't one.
2. Log in with wrong password, non-existent email, and a real admin
   account's email+password on the *customer* login form.
   - **Expect:** all three return the identical `401` — "Invalid email or
     password." **Don't expect** any of them to reveal which case it was
     (no "no such user", no "wrong password", no "that's an admin
     account") — this is deliberate anti-enumeration.
3. Log in with an unverified account's correct credentials.
   - **Expect:** `403` with `EMAIL_NOT_VERIFIED`, and the login page shows
     a "Resend verification email" link inline. **Note:** this check only
     fires *after* the password is confirmed correct — an unverified
     account with a wrong password still gets the generic 401, not the
     verification-needed message (prevents a second enumeration channel).
4. Log out.
   - **Expect:** session destroyed, cookie cleared, redirected home (or to
     `/admin/login` if logging out as admin).
5. Cross-role login attempts: try a customer account's credentials on
   `/admin/login`, and an admin account's credentials on `/login`.
   - **Expect:** generic `401` in both directions, same as #2.

## C. Forgot / reset password

Role-agnostic — one flow (`/forgot-password`, `/reset-password`) works for
both customer and admin accounts by email; there's no separate admin
version.

1. Go to `/forgot-password`, submit a registered email.
   - **Expect:** always the same confirmation screen — "If an account
     exists for `<email>`, we've sent a password reset link. It expires in
     1 hour" — **regardless of whether that email is actually registered.**
     Submit a made-up email too and confirm the screen is identical.
2. Click the emailed link (`/reset-password?token=...`), enter a new
   password (≥8 chars) twice.
   - **Expect:** redirected to `/account` (or `/admin` for an admin
     account, or `/quote/review` if a same-tab draft exists), and you're
     now logged in with the new password.
3. Before doing step 2, open the app in a second browser/incognito window
   and log in with the *old* password to establish a session there. Then
   complete the reset in the first window.
   - **Expect:** the second window's session is invalidated — its next
     request (e.g. a page refresh hitting `/api/auth/me`) returns `401`.
     Resetting a password logs out every other active session for that
     account, on the theory that "I forgot my password" often means
     "someone else might know it."
4. Try the same reset link a second time after already using it.
   - **Expect:** `400` — "Invalid or expired reset link." (token is
     single-use, cleared on success).
5. Let the link sit unused for over an hour, then try it.
   - **Expect:** `400` — "This reset link has expired. Request a new one."
6. Submit `/forgot-password` twice in under 2 minutes for the same email.
   - **Expect:** identical generic confirmation both times; only the first
     actually sends an email (server-side cooldown, invisible in the UI).
7. Check the inbox after a successful reset.
   - **Expect:** a separate "your password was changed" notification email
     arrives (best-effort — if it fails to send, the reset itself still
     succeeded; check server logs, not user-facing behavior, if it's
     missing).

## D. Initial admin bootstrap (first deployment)

Two ways to get the first admin account onto a fresh deployment:

- **`npm run create-admin -- --email=... --password=... --name="..."`** —
  run once, manually, if you have shell/terminal access on the host.
  Refuses if the email is already taken.
- **Env-var bootstrap** — set `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`
  / `INITIAL_ADMIN_NAME` in `server/.env` before first boot. The server
  creates that admin automatically on startup (`server/src/lib/bootstrapAdmin.js`,
  called from `app.js`), but **only if the `users` table has zero admin
  rows.** Once any admin exists — this way or via the CLI script — it's
  permanently a no-op, so leaving the vars set afterward is harmless (though
  removing `INITIAL_ADMIN_PASSWORD` once you've logged in is good hygiene).

To test the env-var path without touching real data, verify it the same way
it was verified during development: temporarily demote your only admin to
`customer` in the DB, set the env vars, restart the server, confirm the new
admin row appears (`email_verified` already `true`, no verification email
needed), restart again and confirm it doesn't create a duplicate or touch
the existing row, then restore the original admin's role.

- **Expect:** creation only ever happens once, only when zero admins exist.
- **Don't expect:** setting `INITIAL_ADMIN_PASSWORD` to a new value and
  restarting to ever change an existing admin's password — this mechanism
  cannot reset credentials, only bootstrap the very first admin.

## E. Product browsing

Products and categories come from Airtable (source of truth), cached into
MySQL (`categories_cache` / `products_cache`) as a fallback. No login
required.

1. Load the homepage, scroll to "What we make" (categories) and "Shop"
   (products grid).
   - **Expect:** categories expand/collapse on click; the shop grid filters
     by the category buttons above it (All Products, Budget Blankets,
     etc.).
2. In Airtable, edit a product's price or a category's headline, save, then
   reload the page (no cache-clear needed — reads are live-first).
   - **Expect:** the change appears on reload.
3. Temporarily break Airtable access (wrong API key in `.env`, or just
   note this rather than actually doing it) and reload.
   - **Expect:** the app falls back to the last-synced MySQL cache rather
     than showing an empty page — this is the resilience the caching layer
     exists for. **Don't expect** a hard error or blank shop section from a
     transient Airtable outage.
4. Click "Order this product" on any product card.
   - **Expect:** navigates to `/quote/:productId` (step 1 of the quote
     flow, §F/§G below).

## F. Quote request — non-customisable product

A product with the `customisable` flag off in Airtable (internal-only field,
never shown to the customer).

1. From the shop, order a non-customisable product. Pick size/colour/qty,
   continue.
   - **Expect:** skips straight to the review step — no design/customise
     page, since there's nothing to customise.
2. On the review screen, confirm the summary (product, size, colour,
   quantity) and submit.
   - **Expect:** if signed out, first redirected to `/login` (see §H); once
     authenticated, submits and lands on `/account/quotes/:id` with the
     quote visible, status "New."
3. Check the customer's inbox and the company notification inbox
   (`COMPANY_NOTIFICATION_EMAIL` in `.env`).
   - **Expect:** a confirmation email to the customer and a new-quote
     notification to the company, both sent best-effort — a mail failure
     here does **not** roll back the quote (it already exists; only the
     email is best-effort).
4. On the quote detail page.
   - **Don't expect:** a "Design files" section — file uploads are gated
     entirely on `customisable`, and this product isn't.

## G. Quote request — customisable product

Every product is either **Embroidered** or **Sublimation**-printed (a real
`Printing Method` field on Products now, not just free text in the
Subtitle) — the customise step asks for exactly one of Font colour /
Thread colour based on that, never both. An embroidered product's visible
text colour *is* whatever thread is chosen; a sublimation-printed product
has no physical thread at all.

1. Order a customisable **Embroidered** product (e.g. Embroidered Duvet
   Cover, Monogram Blanket), pick size/colour/qty, continue.
   - **Expect:** lands on "Your design" (step 2 of 2) — requirements,
     optional image/text upload, font, and **Thread colour only**
     (dropdown sourced live from the thread-colour Airtable table, code +
     name, swatch + Pantone reference once picked). **Don't expect** a
     Font colour field to appear at all for this product.
2. Order a customisable **Sublimation** product (e.g. Pattern Throw,
   Custom Pillow Case) instead.
   - **Expect:** the same step shows **Font colour only** (preset swatches
     or the raw colour picker) — **don't expect** a Thread colour field.
3. Leave requirements blank and submit.
   - **Expect:** inline error — "Please describe your requirements." Same
     pattern for missing font ("Please choose a font.") and, on an
     Embroidered product only, missing thread colour ("Please choose a
     thread colour.").
4. Fill everything in, attach an image and a text file, continue to
   review, submit.
   - **Expect:** quote created first; then the two files upload
     best-effort in the background. If a file upload fails, the customer
     still lands on the quote detail page — **don't expect** a failed
     upload to block quote submission; retry the upload from the quote
     detail page instead.
5. On the resulting quote detail page.
   - **Expect:** a "Design files" section with both uploaded files, plus
     the customisation fields in the summary card — **exactly one** of
     Font colour / Thread colour, matching whichever the product actually
     used.
6. Try submitting a size or colour that isn't one of the product's actual
   Airtable options, or the "wrong" colour field for the product's
   printing method (e.g. a thread colour on a Sublimation product), via a
   direct API call rather than the UI (which only ever offers the correct
   one).
   - **Expect:** `400` in every case — everything is re-validated
     server-side against the live product record; client-sent price,
     `customisable`, printing method, and option validity are never
     trusted.

## H. Auth-gate-and-resume (starting a quote signed out)

The product-selection and customisation steps are reachable while signed
out; only the final review/submit step requires an account.

1. While logged out, order a product, fill in size/colour (and design
   details if customisable), and continue to review.
   - **Expect:** redirected to `/login` (with a `from` state pointing back
     at the flow).
2. Register a new account from that login screen (or log in with an
   existing one), then verify the email if registering fresh.
   - **Expect:** after verifying (or logging in), you land back on
     `/quote/review` with your selections intact — **only if this is the
     same browser tab** the draft was started in (it's `sessionStorage`,
     tab-scoped). Opening the verification link from a different
     tab/device lands you on `/account` instead, with the draft lost —
     this is expected, not a bug; re-do the selection.
3. Note: any **File objects** selected before the redirect (image/text
   uploads on the customise step) do **not** survive the redirect even in
   the same tab — `sessionStorage` can't hold binary File objects. Only
   the text fields (size, colour, requirements, font, etc.) resume.
   - **Expect:** re-select any files after resuming, if you'd chosen any
     before being sent to log in.

## I. Customer account & quote detail

1. `/account` while logged in as a customer.
   - **Expect:** a list of that customer's own quotes only, each showing
     product, size/colour/qty, submission date, and a status badge.
     Pending items (`awaiting_customer` or `finalised` — see status list
     below) are visually distinguished (accent-coloured badge) from
     everything else.
2. Open a quote you don't own by guessing another customer's quote ID in
   the URL (`/account/quotes/:id`).
   - **Expect:** `404` — "Quote not found." Ownership is checked
     server-side on every request; **don't expect** this to be reachable
     even by URL-guessing.
3. On a quote's detail page, type a message in the reply box below
   Communication and send it.
   - **Expect:** appears immediately in the thread as "You"; the quote's
     status flips to `awaiting_company` and it now shows up as
     "Needs reply" on the admin dashboard. The message is also emailed to
     the company's mailbox (threaded via `In-Reply-To`/`References` against
     the same anchor message the rest of the thread uses), so replying
     in-app and replying by email land in the same conversation either way.
4. Try sending an empty reply (whitespace only).
   - **Expect:** the button does nothing — client-side guard skips the
     call entirely; the server would also reject it with `400` — "Reply
     body is required" if called directly.
5. Every page in the quote request flow and account area (`/account`,
   a quote's detail page, product selection, the customise step, and the
   final review step) now has the full site header — logo, Products/How It
   Works/Shop links, and the login/account indicator.
   - **Expect:** clicking "Shop" or "Products" from any of these pages
     takes you home and scrolls to that section, whether you were on the
     homepage already or somewhere deep in the quote flow. **Don't expect**
     to ever get stranded on a quote confirmation or account page with no
     way back to the shop — that was the original gap this closes.

Quote status values you'll see: `new`, `awaiting_customer`,
`awaiting_company`, `finalised`, `accepted`. (`cancelled` exists as a label
in the frontend but nothing in the current backend ever sets it — not a
bug, just an unused status for now.)

## J. File uploads

Gated entirely on the product's `customisable` flag — a non-customisable
quote's attachment endpoints return `403` even if called directly.

1. On a customisable quote's detail page, upload an image (PNG/JPG/WEBP/SVG,
   max 20MB) via the dropzone.
   - **Expect:** `201`, appears immediately as the "current" file for that
     slot.
2. Upload a second image to the same quote.
   - **Expect:** a warning panel appears — "This will replace your current
     image (`<old filename>`) with `<new filename>`. The previous file
     stays on record but won't be used going forward." — with "Replace
     file" / "Cancel" buttons. **Don't expect** the replacement to happen
     without this explicit confirmation step; the raw upload without
     `confirmOverwrite=true` returns `409`.
3. Click "Replace file."
   - **Expect:** new file becomes current; old one moves into a collapsed
     "Show previous uploads (1)" history list, still downloadable, never
     deleted from disk.
4. Try uploading a `.exe` renamed to `.png`, or a file over 20MB.
   - **Expect:** rejected. Declared MIME type is checked against an
     allowlist *and* the actual file bytes are sniffed (magic-byte check)
     for image types — a mismatched declared-vs-actual type is rejected
     with "File content doesn't match its declared type," not silently
     accepted.
5. Download any uploaded file (current or from history).
   - **Expect:** forces a browser download (`Content-Disposition:
     attachment`) rather than rendering inline — this is deliberate, even
     for images, since an uploaded SVG could otherwise execute as a
     top-level document (stored-XSS mitigation).
6. As the admin, open the same quote and download a customer's file.
   - **Expect:** works — admins can view/download any quote's attachments,
     not just the owning customer.

## K. Email reply threading

There's no persistent IMAP connection (HostKing constraint) — incoming mail
is picked up by a script you run manually in dev, and by a cron job in
production, not automatically:

```
node server/scripts/cron/ingest-emails.js
```

1. As the company, reply (via the admin dashboard, §L) to a quote's
   confirmation email — or just reply from a real mail client to the
   confirmation email the customer received.
2. Run the ingestion script.
   - **Expect:** console output naming the message and whether it matched
     a quote (`Matched: <message-id> -> quote #<id>`). The quote's status
     flips to `awaiting_company` (if the customer replied) and
     `last_customer_message_at` updates, feeding the admin dashboard's
     "needs response"/"stale" flags.
3. Reply again to the *same* email thread (so your mail client sets
   `In-Reply-To`/`References` back to the original Message-ID) vs. sending
   a fresh email with `Quote #<id>` somewhere in the subject line but no
   header relationship.
   - **Expect:** both match to the correct quote — header-based matching
     is tried first, the `Quote #<id>` subject token is the fallback.
4. Send an email to the mailbox that has no relation to any quote (no
   matching headers, no `Quote #` in the subject).
   - **Expect:** logged as `unmatched` and **left alone, still unread, in
     the inbox** — not silently discarded, not attached to a random quote.
     A human is meant to notice it manually. Running the script again
     doesn't reprocess or re-flag it (dedup via `email_ingestion_log`).
5. Cause a real bounce (e.g. reply to an intentionally-broken address) or
   check for autoresponder/out-of-office replies.
   - **Expect:** logged as `ignored`, never attached to a quote as if it
     were customer content — detected via sender pattern
     (`mailer-daemon@`, etc.), the `Auto-Submitted` header, or
     `multipart/report` content type.
6. If your test setup sends company notifications to the same mailbox this
   script scans (common in a single-mailbox dev setup): confirm those
   notification emails don't loop back in as fake customer replies.
   - **Expect:** ignored — a message is never treated as customer content
     if its `From` matches the SMTP send address.
7. Send an email with an attachment to a matched quote thread.
   - **Expect:** the attachment is saved and shows up on the quote, but
     **never becomes the "current" file** for its slot — emailed
     attachments are part of the conversation record only; promoting a
     file to "current" only ever happens through the explicit,
     warned upload-UI flow in §J.

## L. Formal quote snapshot & acceptance

The "formal quote" is a locked, separate snapshot of agreed terms — shown
apart from the raw back-and-forth message thread.

1. As admin, open a quote with no formal quote yet, fill in the "Formal
   quote" form (size/colour/qty prefilled from the request; price is
   optional; customisation fields shown only if the product is
   customisable — and, same as the customer's own customise step §G,
   exactly one of Font colour/Thread colour depending on the product's
   Printing Method, never both), submit.
   - **Expect:** quote status flips to `finalised`; a system message
     ("A formal quote was created…") appears in the thread; the customer
     gets a "formal quote ready" email (best-effort).
2. As the customer, open the same quote.
   - **Expect:** a "Formal quote" section above the Communication thread,
     showing only what was locked in (not the raw messages), with an
     "Accept this quote" button and a banner noting a pending action.
3. Click "Accept this quote."
   - **Expect:** status flips to `accepted`, a system message logs the
     acceptance, a notification email goes to the company, and the button
     is replaced with "Accepted `<date>`."
4. Try accepting again (e.g. by resubmitting the request).
   - **Expect:** `400` — "This quote has already been accepted."
5. As admin, on an already-accepted quote, click "Create new version" and
   submit a changed formal quote.
   - **Expect:** a second snapshot is created; the quote's status returns
     to `finalised` and the customer needs to accept again — the previous
     accepted snapshot remains in history, not deleted.
6. Try creating a formal quote with a size/colour that isn't valid for the
   product (bypass the UI's `<select>` to test this, since the dropdown
   only offers valid options).
   - **Expect:** `400` — re-validated server-side the same way quote
     creation is; an admin typing by hand can't lock in a combination that
     was never actually valid.

## M. Admin dashboard queue

1. Log in at `/admin/login`, land on the dashboard.
   - **Expect:** every quote across all customers, sorted **overdue
     first, then needs-a-reply (oldest-waiting first), then everything
     else by recency** — a working queue, not a chronological log. A
     header count shows "`N` overdue" / "`N` need(s) a reply" when
     applicable.
2. A quote with status `new` or `awaiting_company` and no company reply
   yet.
   - **Expect:** badge reads "Needs reply."
3. The same quote, once `last_customer_message_at` is more than 3 days in
   the past with still no company reply (backdate it in the DB to test
   without waiting 3 real days:
   `update quotes set last_customer_message_at = now() - interval 4 day
   where id = ...`).
   - **Expect:** badge escalates to "Overdue" (destructive/red styling)
     and it sorts to the very top of the queue.
4. Open any quote from the dashboard.
   - **Expect:** it becomes this admin's "active item" — a border
     highlight and "Currently active" label appear on it in the dashboard
     list. Open a *different* quote next.
   - **Expect:** the previous one loses the active marker; only one quote
     can be active per admin at a time — opening a new one always
     supersedes the old one, there's no way to have two "active"
     simultaneously.
5. On a quote's detail page, check the "Needs attention" sidebar.
   - **Expect:** up to 6 *other* quotes still needing a response, so the
     admin can keep working the queue without bouncing back to the
     dashboard. The quote currently open is excluded from this list (it's
     already being handled).
6. Send a reply from the admin quote detail page.
   - **Expect:** quote status flips to `awaiting_customer`; the reply
     shows in the thread as "You"; it's sent by email threaded against the
     most recent message that has a Message-ID (so the customer's mail
     client shows it in the same conversation).

## N. Admin catalogue management (Products, Categories, Thread Colours)

Full add/edit/delete for the Airtable-backed catalogue, reachable via the
nav tabs on every admin page (Quotes / Products / Categories / Thread
Colours). Airtable stays the source of truth — these write straight to it,
the same base every other product/category/thread-colour read already
uses.

1. Open any admin page and check the nav tabs.
   - **Expect:** the current section is visually highlighted; all four tabs
     (Quotes, Products, Categories, Thread Colours) work from anywhere.
2. `/admin/products`: open an existing product.
   - **Expect:** the form pre-fills from live Airtable data — Category
     shows the resolved category **label** (e.g. "Premium Home Textiles"),
     not a raw ID or the old legacy slug; Sizes/Colours render as removable
     chips.
3. Upload a product image (PNG/JPG/WEBP, under 5MB), save.
   - **Expect:** the image appears on the edit form, the products list
     thumbnail, and the public Shop grid — same Airtable attachment field
     every public read already uses (`firstAttachmentUrl`), so there's no
     separate "publish" step.
4. Upload a second image to the same product.
   - **Expect:** it replaces the first — the old one is not still attached
     underneath. (The Airtable attachment-upload API only *adds*
     attachments; the app explicitly clears the field first on every
     replace specifically so this can't accumulate.)
5. Change a product's category and save, then check the public Shop page's
   category filter buttons.
   - **Expect:** the product now appears under the new category's filter
     and no longer under the old one — filtering works by the real
     Category link (`categoryId`), not a free-text slug.
6. Try saving a product with no category selected.
   - **Expect:** `400` — "Category is required." A product can only ever
     belong to **one** category (the Airtable field is a link that the app
     always writes as a single ID, even though Airtable's own UI still
     shows it as a multi-add picker — Airtable's API doesn't expose a way
     to lock that down beyond what this app already enforces).
7. Try saving a product with no "Printing method" selected.
   - **Expect:** `400` — "Printing method must be one of: Embroidered,
     Sublimation." Required for every product (not just customisable
     ones) — it's what drives the Font colour vs Thread colour split in
     the customise flow (§G) once a product is customisable.
8. Toggle a product's "Active" checkbox off and save.
   - **Expect:** it disappears from the public Shop grid and from the
     homepage but **remains visible in `/admin/products`** (admin views
     always show everything, active or not — customer-facing views filter
     to active only).
9. Delete a product.
   - **Expect:** succeeds unconditionally, no confirmation needed beyond
     the browser's own confirm dialog. Existing quotes that reference this
     product are unaffected — quotes snapshot the product's name/price at
     creation time rather than holding a live reference.
10. `/admin/categories`: check the product count shown next to each
    category.
    - **Expect:** matches the number of products actually assigned to it
      (read from Airtable's own reverse-link field, so it's always live,
      never a stale cache).
11. Try deleting a category that still has products assigned.
    - **Expect:** `409` — "N products are still assigned to this category
      — reassign them first." Reassign every product first (via the
      Products form), then deletion succeeds.
12. Create a new category with an image, confirm it shows up immediately
    on the homepage's category section with a working "View products"
    button that filters the Shop grid to exactly that category.
13. `/admin/thread-colours`: use the search box.
    - **Expect:** filters the list (270 rows) by code or name as you type,
      client-side, instantly — no network request per keystroke.
14. Edit a thread colour's hex value, then start a customisable product's
    quote flow and open the thread colour dropdown.
    - **Expect:** the updated hex/name is reflected there immediately —
      same live Airtable read the admin list uses.
15. Delete a thread colour that was used on a past quote.
    - **Expect:** succeeds — no referential-integrity block, since a
      quote's thread colour is stored as a plain snapshot string, not a
      live reference.
16. **Browser-automation-specific, not an app bug:** clicking a category or
    thread colour's "Delete" button triggers a native browser
    `window.confirm()` dialog. If you're driving this through scripted
    browser automation (rather than a human clicking), that dialog blocks
    all further commands on that tab/page until a human dismisses it —
    open a new tab to keep testing, or dismiss it manually. Real users
    clicking normally never hit this; it's purely a headless-automation
    interaction hazard.

## O. Homepage stats & product ratings

The Hero section's three stats and every product's star rating are now
computed from real data instead of the hardcoded/Airtable-static numbers
they used to be.

1. Load the homepage and check the three Hero stats (below the "Browse
   Products" / "How it works" buttons).
   - **Expect:** "Orders fulfilled" = the real count of `accepted` quotes;
     "Custom designs %" = the real percentage of all quotes ever submitted
     that were for a customisable product; "Day turnaround" = whatever the
     admin has set (§ below), defaulting to "7-10" if never set. **Don't
     expect** turnaround to be calculated — there's no
     shipping/production/delivery tracking anywhere in the app to compute
     it from, so it's the one manually-set value here by design.
2. Accept a formal quote as a customer (§L), then reload the homepage.
   - **Expect:** "Orders fulfilled" increases by exactly one — computed
     live on every request, not cached.
3. As admin, on the dashboard, find the "Site settings" card and change
   the turnaround text, save.
   - **Expect:** confirmation ("Saved"); reload the homepage and confirm
     the Hero section shows the new value.
4. On the Shop grid, check star ratings on products with no real ratings
   yet.
   - **Expect:** "No ratings yet" — **don't expect** to see a leftover
     Airtable-static number like "4.7 (89)" anywhere; those fields are no
     longer read by the app at all (still visible in Airtable itself,
     just inert).
5. Open one of your own quotes (`/account/quotes/:id`) and use the "Rate
   `<product>`" star widget.
   - **Expect:** clicking a star saves immediately (no separate submit
     button), shows "Saved", and the label switches to "Your rating for
     `<product>`" with that value pre-filled on reload.
6. Try rating a product you've never requested a quote for (e.g. by
   calling `POST /api/products/:id/rating` directly for a product ID you
   don't have a quote for).
   - **Expect:** `403` — "You can only rate products you've requested a
     quote for." The widget itself is only ever shown on your own quote
     pages, so you shouldn't be able to reach this case through the UI at
     all — this is a server-side guard, not just a hidden button.
7. Rate the same product a second time with a different star count.
   - **Expect:** your rating updates in place (the average/count reflect
     only your latest rating) — it does **not** count as a second review.
8. Check the Shop grid again after rating.
   - **Expect:** the star average and review count update to include your
     new rating.
9. `/admin/products/:id` for a rated product.
   - **Expect:** shows the real rating read-only ("Rating comes from real
     customer ratings and can't be set manually") — **don't expect** an
     editable Rating/Reviews field anymore; admins can no longer set a
     product's rating by hand.

## P. Cross-cutting access control

Run these regardless of which feature you're focused on — they apply
everywhere.

1. Hit any `/api/admin/*` endpoint (dashboard list, quote detail, reply,
   snapshot creation) with a customer session or no session at all.
   - **Expect:** `401`/`403` — every admin route is behind
     `requireRole("admin")` server-side. Client-side route guarding
     (`ProtectedRoute`) is a UX convenience only; it is **not** the actual
     security boundary, so don't treat "the UI hid the link" as proof of
     anything — verify the API call itself is rejected.
2. Hit `/api/quotes` (customer quote list/detail/accept) with an admin
   session.
   - **Expect:** `403` — these routes are locked to `requireRole("customer")`,
     admins use the separate `/api/admin/quotes/*` surface instead.
3. As Customer A, try to view/download Customer B's attachments by quote
   ID/attachment ID.
   - **Expect:** `404`, not `403` — the app deliberately doesn't reveal
     that the quote exists at all to a non-owner, non-admin requester.
4. Try registering with a password under 8 characters, an invalid email
   format, or a blank full name.
   - **Expect:** `400` with a specific message for each case, checked
     client-side too but re-validated server-side regardless.

## Q. Known limitations — don't file these as bugs

- **No payments anywhere.** Explicitly out of scope for this build.
  "Accept this quote" confirms terms; it doesn't charge anything.
- **No live IMAP polling.** Email ingestion only happens when
  `ingest-emails.js` is actually run (manually in dev, via cron in
  production). If a reply doesn't show up, check whether the script has
  run recently before assuming something's broken.
- **10 emails/day cap** on the current test mailbox. Confirmation,
  notification, reply, and formal-quote emails all count against it —
  expect some to silently not arrive once you've hit it during a heavy
  testing session. Not an app bug.
- **`cancelled` quote status** exists in frontend label maps but nothing
  in the backend currently transitions a quote to it — there's no cancel
  action anywhere yet.
- **Session cleanup cron
  (`node server/scripts/cron/cleanup-sessions.js`)** also has to be run
  manually in dev / scheduled in production — expired session rows won't
  disappear on their own between runs. This doesn't affect login/logout
  correctness, only table housekeeping.
- **Airtable's own UI still shows Products→Category as a multi-add link
  picker**, not a locked single-select — Airtable's Meta API rejects
  PATCHing a linked-record field's `prefersSingleRecordLink` option
  (confirmed, not just undocumented), so that constraint is enforced
  entirely by this app's own validation, not by Airtable's UI. If someone
  edits a product directly in Airtable and adds a second linked category
  by hand, only the first linked record this app reads will ever be used
  (first-of-array wins) — not a data-loss bug, just something to know if
  you ever bypass the admin UI.
