// One-off script: seeds the "Hero Images" NocoDB table (see
// create-hero-images-table.js) with two empty rows matching what the Hero
// section (src/app/components/Hero.jsx) previously had hardcoded. Doesn't
// attach placeholder images — the old hardcoded Unsplash URLs are dead
// links, and the whole point of this table is that real photos get
// uploaded directly in NocoDB, not seeded from code. Not idempotent —
// running twice creates duplicate rows.
const { createRecord } = require("../src/lib/airtable-client");

const TABLE = "Hero Images";

const SEED_ROWS = [
  { Alt: "Colourful custom blanket", "Sort Order": 0, Active: true },
  { Alt: "Custom patterned socks", "Sort Order": 1, Active: true },
];

async function main() {
  for (const fields of SEED_ROWS) {
    const record = await createRecord(TABLE, fields);
    console.log(`Created "${fields.Alt}" (record ${record.id}) — attach its image directly in NocoDB.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
