const db = require("../../config/db");
const { listAllRecords } = require("../../lib/airtable-client");

function mapRecord(record) {
  const f = record.fields;
  return {
    airtableId: record.id,
    code: f["Code"] || "",
    name: f["Name"] || "",
    pantone: f["Pantone"] || "",
    hex: f["Hex"] || "",
  };
}

function rowToPublic(row) {
  return {
    id: row.airtable_id,
    code: row.code,
    name: row.name,
    pantone: row.pantone,
    hex: row.hex,
  };
}

async function fetchLive() {
  const records = await listAllRecords("Thread Colours", { sort: [{ field: "Code" }] });
  return records.map(mapRecord);
}

async function writeThroughCache(colours) {
  const now = new Date();
  await db.transaction(async (trx) => {
    await trx("thread_colours_cache").del();
    if (colours.length === 0) return;
    await trx("thread_colours_cache").insert(
      colours.map((c) => ({
        airtable_id: c.airtableId,
        code: c.code,
        name: c.name,
        pantone: c.pantone,
        hex: c.hex,
        synced_at: now,
      })),
    );
  });
}

async function readFromCache() {
  const rows = await db("thread_colours_cache").orderBy("code", "asc");
  return rows.map(rowToPublic);
}

async function getThreadColours() {
  try {
    const colours = await fetchLive();
    await writeThroughCache(colours);
    return colours.map((c) => ({ id: c.airtableId, code: c.code, name: c.name, pantone: c.pantone, hex: c.hex }));
  } catch (err) {
    console.error("Airtable thread colours fetch failed, serving cache:", err.message);
    return readFromCache();
  }
}

// Used server-side to validate a submitted thread_colour_code against real
// data — always goes through the same live-first/cache-fallback path so
// validation doesn't fail just because Airtable is briefly unreachable.
async function isValidThreadColourCode(code) {
  if (!code) return false;
  const colours = await getThreadColours();
  return colours.some((c) => c.code === code);
}

module.exports = { getThreadColours, isValidThreadColourCode };
