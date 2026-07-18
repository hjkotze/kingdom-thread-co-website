// One-off script: creates the Categories and Products tables/fields in the
// configured Airtable base via the Meta API. Not idempotent — intended to be
// run once against a fresh base. Re-running against a base that already has
// these tables will fail with "table already exists" errors from Airtable.
require("dotenv").config();

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.error("AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in server/.env");
  process.exit(1);
}

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
  if (!res.ok) {
    throw new Error(`Airtable API error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

const categoriesTable = {
  name: "Categories",
  description: "Product category sections shown on the homepage (replaces the hardcoded CATEGORIES array).",
  fields: [
    { name: "Slug", type: "singleLineText" },
    { name: "Label", type: "singleLineText" },
    { name: "Headline", type: "singleLineText" },
    { name: "Body", type: "multilineText" },
    { name: "Callout", type: "singleLineText" },
    { name: "Image", type: "multipleAttachments" },
    { name: "Alt", type: "singleLineText" },
    { name: "Sort Order", type: "number", options: { precision: 0 } },
  ],
};

function productsTable(categoriesTableId) {
  return {
    name: "Products",
    description: "Product catalogue shown in the Shop section (replaces the hardcoded PRODUCTS array).",
    fields: [
      { name: "Name", type: "singleLineText" },
      { name: "Subtitle", type: "singleLineText" },
      {
        name: "Category",
        type: "multipleRecordLinks",
        options: { linkedTableId: categoriesTableId },
      },
      { name: "Price", type: "number", options: { precision: 2 } },
      { name: "Tag", type: "singleLineText" },
      { name: "Rating", type: "number", options: { precision: 1 } },
      { name: "Reviews", type: "number", options: { precision: 0 } },
      { name: "Image", type: "multipleAttachments" },
      { name: "Image Fallback Colour", type: "singleLineText" },
      { name: "Badge", type: "singleLineText" },
      { name: "Description", type: "multilineText" },
      { name: "Sizes", type: "multipleSelects", options: { choices: [] } },
      { name: "Colours", type: "multipleSelects", options: { choices: [] } },
      {
        name: "Customisable",
        type: "checkbox",
        options: { icon: "check", color: "greenBright" },
      },
      { name: "Active", type: "checkbox", options: { icon: "check", color: "greenBright" } },
    ],
  };
}

async function main() {
  console.log("Creating Categories table...");
  const categories = await airtableMeta("/tables", {
    method: "POST",
    body: JSON.stringify(categoriesTable),
  });
  console.log(`Created Categories table (${categories.id})`);

  console.log("Creating Products table...");
  const products = await airtableMeta("/tables", {
    method: "POST",
    body: JSON.stringify(productsTable(categories.id)),
  });
  console.log(`Created Products table (${products.id})`);

  console.log("\nDone. Table IDs:");
  console.log(`  Categories: ${categories.id}`);
  console.log(`  Products:   ${products.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
