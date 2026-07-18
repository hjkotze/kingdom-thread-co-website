// Deletes expired session rows. connect-session-knex's own cleanup timer
// is disabled (see src/middleware/session.js) since a setInterval can't
// live anywhere on an on-demand host — this is the cron-triggered
// replacement, same pattern as email ingestion.
require("dotenv").config();
const db = require("../../src/config/db");

async function main() {
  const deleted = await db("sessions").where("expired", "<", new Date()).del();
  console.log(`Deleted ${deleted} expired session(s).`);
}

main()
  .catch((err) => {
    console.error("Session cleanup failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
