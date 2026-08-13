// One-off migration: adds a real "Printing Method" field to Products
// (Embroidered / Sublimation) so the customise flow can ask for the right
// colour field (thread colour for embroidery, font colour for
// sublimation) instead of both unconditionally. Backfills every existing
// product by matching against its current free-text Subtitle (e.g.
// "Premium · Embroidered"), which every product already contains
// unambiguously as of this writing.
//
// Safe to re-run: skips field creation if it already exists, and the
// backfill loop just re-writes the same value on a second run.
require("dotenv").config();

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.error("AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in server/.env");
  process.exit(1);
}

const PRODUCTS_TABLE_ID = "tblgtfnXHPoq4fhNF";
const FIELD_NAME = "Printing Method";
const CHOICES = ["Embroidered", "Sublimation"];

const Airtable = require("airtable");
const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

async function airtableMeta(path, options = {}) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Airtable API error (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function listAll(tableName) {
  const records = [];
  await base(tableName)
    .select()
    .eachPage((pageRecords, fetchNextPage) => {
      records.push(...pageRecords);
      fetchNextPage();
    });
  return records;
}

function detectPrintingMethod(subtitle) {
  const value = (subtitle || "").toLowerCase();
  if (value.includes("embroidered")) return "Embroidered";
  if (value.includes("sublimation")) return "Sublimation";
  return null;
}

async function main() {
  const tables = (await airtableMeta("/tables")).tables;
  const productsTable = tables.find((t) => t.id === PRODUCTS_TABLE_ID);
  const existingField = productsTable.fields.find((f) => f.name === FIELD_NAME);

  if (existingField) {
    console.log(`"${FIELD_NAME}" field already exists — skipping creation.`);
  } else {
    console.log(`Creating "${FIELD_NAME}" field...`);
    await airtableMeta(`/tables/${PRODUCTS_TABLE_ID}/fields`, {
      method: "POST",
      body: JSON.stringify({
        name: FIELD_NAME,
        type: "singleSelect",
        options: { choices: CHOICES.map((name) => ({ name })) },
      }),
    });
  }

  console.log("Backfilling from Subtitle...");
  const products = await listAll("Products");
  let matched = 0;
  let unmatched = 0;
  for (const record of products) {
    const subtitle = record.fields["Subtitle"];
    const method = detectPrintingMethod(subtitle);
    if (!method) {
      console.warn(`  Product ${record.id} ("${record.fields["Name"]}"): subtitle "${subtitle}" doesn't indicate a printing method — skipped, assign manually.`);
      unmatched++;
      continue;
    }
    await base("Products").update(record.id, { [FIELD_NAME]: method });
    matched++;
  }

  console.log(`\nDone. ${matched} product(s) set, ${unmatched} need manual assignment via the admin UI.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
