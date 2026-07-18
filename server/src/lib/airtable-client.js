const Airtable = require("airtable");
const env = require("../config/env");

// Short timeout (default is 5 minutes) so the live-first/cache-fallback
// pattern actually fails fast to the MySQL cache instead of hanging a
// request for minutes when Airtable is slow or unreachable.
const AIRTABLE_TIMEOUT_MS = 8000;

const base = new Airtable({
  apiKey: env.airtable.apiKey,
  requestTimeout: AIRTABLE_TIMEOUT_MS,
}).base(env.airtable.baseId);

async function listAllRecords(tableName, selectOptions = {}) {
  const records = [];
  await base(tableName)
    .select(selectOptions)
    .eachPage((pageRecords, fetchNextPage) => {
      records.push(...pageRecords);
      fetchNextPage();
    });
  return records;
}

module.exports = { base, listAllRecords };
