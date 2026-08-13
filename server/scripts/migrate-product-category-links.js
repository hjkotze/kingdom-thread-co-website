// One-off migration: repurposes the orphaned linked-record field pair left
// over from an earlier (reverted) attempt at a real Products<->Categories
// relationship. Products.Category is currently a plain text field holding a
// slug string (e.g. "blanket-budget") that happens to match the frontend's
// old hardcoded filter values — not a real link to the Categories table.
// There's also an unused linked-record field, "Category Link (unused)",
// created during that earlier attempt and never deleted (Airtable's API
// can't delete fields). This script:
//   1. Renames the legacy text field out of the way (kept, not deleted, as
//      a backfill reference).
//   2. Renames the unused link field to "Category".
//   3. Backfills every product's new Category link from its legacy slug.
//
// Note: Airtable's Meta API rejects PATCHing a linked-record field's
// `prefersSingleRecordLink` option (confirmed with an isolated request —
// 422 INVALID_REQUEST_UNKNOWN even alone, name-only PATCHes succeed fine).
// It's apparently UI-only, not exposed for API writes. The "one category
// per product" constraint is therefore enforced entirely at the
// application layer (admin product form + backend validation), not by
// Airtable's own single-vs-multiple link UI toggle — the Airtable UI will
// still show this as a multi-add link picker.
//
// Field renames are safe to skip if already applied (checked at runtime).
// The backfill loop is safe to re-run any time.
require("dotenv").config();

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.error("AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in server/.env");
  process.exit(1);
}

const PRODUCTS_TABLE_ID = "tblgtfnXHPoq4fhNF";
const CATEGORIES_TABLE_ID = "tbluhkBJ89bykriKq";
const LEGACY_CATEGORY_FIELD_ID = "fldo8Kjl9xAFiyNE6"; // Products."Category" (text)
const LINK_FIELD_ID = "fldlVnwoVJ5J8kdxq"; // Products."Category Link (unused)"

const LEGACY_FIELD_NEW_NAME = "Category (legacy slug — do not use)";
const LINK_FIELD_NEW_NAME = "Category";

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

async function listAll(tableName, selectOptions = {}) {
  const records = [];
  await base(tableName)
    .select(selectOptions)
    .eachPage((pageRecords, fetchNextPage) => {
      records.push(...pageRecords);
      fetchNextPage();
    });
  return records;
}

async function main() {
  const tables = (await airtableMeta("/tables")).tables;
  const currentFields = tables.find((t) => t.id === PRODUCTS_TABLE_ID).fields;
  const legacyFieldNow = currentFields.find((f) => f.id === LEGACY_CATEGORY_FIELD_ID);
  const linkFieldNow = currentFields.find((f) => f.id === LINK_FIELD_ID);

  if (legacyFieldNow.name === LEGACY_FIELD_NEW_NAME) {
    console.log("Legacy text field already renamed — skipping.");
  } else {
    console.log(`Renaming legacy text field -> "${LEGACY_FIELD_NEW_NAME}"...`);
    await airtableMeta(`/tables/${PRODUCTS_TABLE_ID}/fields/${LEGACY_CATEGORY_FIELD_ID}`, {
      method: "PATCH",
      body: JSON.stringify({ name: LEGACY_FIELD_NEW_NAME }),
    });
  }

  if (linkFieldNow.name === LINK_FIELD_NEW_NAME) {
    console.log('Link field already renamed to "Category" — skipping.');
  } else {
    console.log(`Renaming link field -> "${LINK_FIELD_NEW_NAME}"...`);
    await airtableMeta(`/tables/${PRODUCTS_TABLE_ID}/fields/${LINK_FIELD_ID}`, {
      method: "PATCH",
      body: JSON.stringify({ name: LINK_FIELD_NEW_NAME }),
    });
  }

  // Read the legacy slug values under whatever name that field currently
  // has (post-rename, always LEGACY_FIELD_NEW_NAME by this point).
  console.log("Reading current products (legacy Category slug values)...");
  const products = await listAll("Products");
  const legacyByRecordId = new Map(products.map((r) => [r.id, r.fields[LEGACY_FIELD_NEW_NAME] || null]));
  console.log(`  ${products.length} product(s) read.`);

  console.log("Reading categories (Slug -> record ID)...");
  const categories = await listAll("Categories");
  const categoryIdBySlug = new Map(categories.map((r) => [r.fields["Slug"], r.id]));
  console.log(`  ${categories.length} categor${categories.length === 1 ? "y" : "ies"} read.`);

  // The Categories table only has 5 coarse groupings (blanket-budget,
  // blanket-premium, home-budget, home-premium, socks) but the legacy
  // per-product slugs were more granular for pillows/duvets
  // (pillow-budget, duvet-budget, pillow-premium, duvet-premium) — both
  // pillow and duvet products fall under the corresponding "home-*"
  // category. Mirrors the same grouping ProductCategories.jsx's old
  // slug-replace logic was working around on the frontend side.
  function resolveCategoryId(legacySlug) {
    if (categoryIdBySlug.has(legacySlug)) return categoryIdBySlug.get(legacySlug);
    const homeEquivalent = legacySlug.replace(/^(pillow|duvet)-/, "home-");
    return categoryIdBySlug.get(homeEquivalent) || null;
  }

  console.log("Backfilling product -> category links...");
  let matched = 0;
  let unmatched = 0;
  for (const [recordId, legacySlug] of legacyByRecordId) {
    if (!legacySlug) {
      console.warn(`  Product ${recordId} has no legacy Category value — skipped, assign manually.`);
      unmatched++;
      continue;
    }
    const categoryId = resolveCategoryId(legacySlug);
    if (!categoryId) {
      console.warn(`  Product ${recordId}: no category matches legacy slug "${legacySlug}" — skipped, assign manually.`);
      unmatched++;
      continue;
    }
    await base("Products").update(recordId, { [LINK_FIELD_NEW_NAME]: [categoryId] });
    matched++;
  }

  console.log(`\nDone. ${matched} product(s) linked, ${unmatched} need manual assignment via the admin UI.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
