// Triggered by a HostKing cron job every 5-15 minutes — there is no
// persistent process to run IMAP IDLE or polling loops in-app. Thin
// process wrapper around the shared ingestion logic in
// src/lib/emailIngestion.js (also used by the admin "check for replies
// now" button) — this file owns only the standalone-process lifecycle:
// loading .env and tearing down the DB pool on exit, neither of which the
// shared module may do since it also runs inside the long-lived server.
require("dotenv").config();
const db = require("../../src/config/db");
const { ingestEmails } = require("../../src/lib/emailIngestion");

ingestEmails()
  .then((summary) => {
    console.log(
      `Done. Found ${summary.found}, matched ${summary.matched}, unmatched ${summary.unmatched}, ignored ${summary.ignored}, errors ${summary.errors}.`,
    );
  })
  .catch((err) => {
    console.error("Email ingestion failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
