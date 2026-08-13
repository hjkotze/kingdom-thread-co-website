const { ingestEmails } = require("../../lib/emailIngestion");

// Manual trigger for the same ingestion the cron job runs on a schedule —
// for when admin wants to check for replies right now rather than
// waiting for the next scheduled run.
async function run(req, res, next) {
  try {
    const summary = await ingestEmails();
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

module.exports = { run };
