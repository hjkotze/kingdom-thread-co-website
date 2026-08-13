const db = require("../../config/db");
const { listAllRecords, createRecord, updateRecord, deleteRecord } = require("../../lib/airtable-client");

const TABLE = "Thread Colours";

class ThreadColourError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

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
  const records = await listAllRecords(TABLE, { sort: [{ field: "Code" }] });
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

// Admin surfaces always read live (never cache-fallback), same reasoning
// as products/categories admin reads — an admin editing this list needs
// real state, not a stale snapshot.
async function listThreadColoursForAdmin() {
  const colours = await fetchLive();
  return colours.map((c) => ({ id: c.airtableId, code: c.code, name: c.name, pantone: c.pantone, hex: c.hex }));
}

async function getThreadColourByIdForAdmin(id) {
  const colours = await listThreadColoursForAdmin();
  return colours.find((c) => c.id === id) || null;
}

function validateThreadColourInput({ code, name, hex }) {
  if (!code || !code.trim()) throw new ThreadColourError("Code is required.", 400);
  if (!name || !name.trim()) throw new ThreadColourError("Name is required.", 400);
  if (hex && !HEX_RE.test(hex)) throw new ThreadColourError("Hex must look like #RRGGBB.", 400);
}

function buildFields({ code, name, pantone, hex }) {
  return {
    Code: code.trim(),
    Name: name.trim(),
    Pantone: pantone || "",
    Hex: hex || "",
  };
}

function toPublic(mapped) {
  return { id: mapped.airtableId, code: mapped.code, name: mapped.name, pantone: mapped.pantone, hex: mapped.hex };
}

async function createThreadColour(input) {
  validateThreadColourInput(input);
  const record = await createRecord(TABLE, buildFields(input));
  return toPublic(mapRecord(record));
}

async function updateThreadColour(id, input) {
  validateThreadColourInput(input);
  const existing = await getThreadColourByIdForAdmin(id);
  if (!existing) throw new ThreadColourError("Thread colour not found", 404);
  const record = await updateRecord(TABLE, id, buildFields(input));
  return toPublic(mapRecord(record));
}

// No referential-integrity concern — thread_colour_code is stored as a
// plain string snapshot on quotes/snapshots (quotes.service.js,
// quoteSnapshots.service.js), never a live foreign key, so deleting a
// colour that was used historically is harmless.
async function deleteThreadColour(id) {
  const existing = await getThreadColourByIdForAdmin(id);
  if (!existing) throw new ThreadColourError("Thread colour not found", 404);
  await deleteRecord(TABLE, id);
}

module.exports = {
  ThreadColourError,
  getThreadColours,
  isValidThreadColourCode,
  listThreadColoursForAdmin,
  getThreadColourByIdForAdmin,
  createThreadColour,
  updateThreadColour,
  deleteThreadColour,
};
