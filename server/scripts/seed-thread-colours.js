// One-off script: seeds the Thread Colours table from the manufacturer's
// Colorful Thread -> Pantone conversion chart (extracted by the project
// owner from the source PDF into colorful_thread_colors.json at the repo
// root). Not idempotent — running twice creates duplicate records.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const Airtable = require("airtable");

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);

const DATA_PATH = path.resolve(__dirname, "../../colorful_thread_colors.json");

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  if (!API_KEY || !BASE_ID) {
    console.error("AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in server/.env");
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const records = raw.map((row) => ({
    fields: {
      Code: row.code,
      Name: row.name,
      Pantone: row.pantone,
      Hex: row.hex,
    },
  }));

  console.log(`Seeding ${records.length} thread colours...`);
  let created = 0;
  for (const batch of chunk(records, 10)) {
    await base("Thread Colours").create(batch, { typecast: true });
    created += batch.length;
    process.stdout.write(`\r${created}/${records.length}`);
  }
  console.log(`\nDone.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
