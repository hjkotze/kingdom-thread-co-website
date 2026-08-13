// One-off script: creates the "Hero Images" table in the configured NocoDB
// base via its Meta API. Not idempotent — intended to be run once against a
// fresh base. Re-running against a base that already has this table will
// fail with a "table already exists" error from NocoDB.
//
// Backs the homepage Hero section's two images (src/app/components/Hero.jsx)
// so they can be swapped/reordered directly in NocoDB without a redeploy —
// same pattern as Categories/Products. A flexible row list (Sort Order +
// Active), not fixed "Image 1"/"Image 2" columns, so a 3rd image can be
// added later without a schema change; the site just renders every Active
// row in Sort Order.
require("dotenv").config();

const BASE_URL = process.env.NOCODB_BASE_URL;
const TOKEN = process.env.NOCODB_API_TOKEN;
const BASE_ID = process.env.NOCODB_BASE_ID;

if (!BASE_URL || !TOKEN || !BASE_ID) {
  console.error("NOCODB_BASE_URL, NOCODB_API_TOKEN, and NOCODB_BASE_ID must be set in server/.env");
  process.exit(1);
}

async function nocodbMeta(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "xc-token": TOKEN,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`NocoDB API error (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

const heroImagesTable = {
  table_name: "Hero_Images",
  title: "Hero Images",
  columns: [
    { column_name: "Alt", title: "Alt", uidt: "SingleLineText" },
    { column_name: "Image", title: "Image", uidt: "Attachment" },
    { column_name: "Sort_Order", title: "Sort Order", uidt: "Decimal" },
    { column_name: "Active", title: "Active", uidt: "Checkbox" },
  ],
};

async function main() {
  console.log("Creating Hero Images table...");
  const table = await nocodbMeta(`/api/v2/meta/bases/${BASE_ID}/tables`, {
    method: "POST",
    body: JSON.stringify(heroImagesTable),
  });

  const imageColumn = table.columns.find((c) => c.title === "Image");

  console.log("\nDone. Add these to TABLE_IDS / ATTACHMENT_FIELD_IDS in server/src/lib/airtable-client.js:");
  console.log(`  Table ID:  ${table.id}`);
  console.log(`  Image field ID: ${imageColumn.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
