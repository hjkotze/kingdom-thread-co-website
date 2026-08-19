// One-off migration: adds a "Size Prices" LongText field to the NocoDB
// Products table, storing a JSON map of size -> price (e.g.
// {"Single":899,"Queen":1299}) so products with multiple sizes can be
// priced per size instead of a single flat price. The existing "Price"
// field is kept and, for products with sizes, is now written by the app as
// the minimum of the per-size prices — still usable as a "from R" display
// price everywhere the app already reads it, no other field consumer needs
// to change.
//
// Safe to re-run: skips field creation if it already exists.
require("dotenv").config();

const BASE_URL = process.env.NOCODB_BASE_URL;
const API_TOKEN = process.env.NOCODB_API_TOKEN;

if (!BASE_URL || !API_TOKEN) {
  console.error("NOCODB_BASE_URL and NOCODB_API_TOKEN must be set in server/.env");
  process.exit(1);
}

const PRODUCTS_TABLE_ID = "muf73xtpol8t9gh";
const FIELD_NAME = "Size Prices";

async function nocodbMeta(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "xc-token": API_TOKEN,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`NocoDB API error (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  const table = await nocodbMeta(`/api/v2/meta/tables/${PRODUCTS_TABLE_ID}`);
  const existing = table.columns.find((c) => c.title === FIELD_NAME);

  if (existing) {
    console.log(`"${FIELD_NAME}" field already exists — skipping.`);
    return;
  }

  console.log(`Creating "${FIELD_NAME}" field...`);
  await nocodbMeta(`/api/v2/meta/tables/${PRODUCTS_TABLE_ID}/columns`, {
    method: "POST",
    body: JSON.stringify({ title: FIELD_NAME, column_name: FIELD_NAME, uidt: "LongText" }),
  });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
