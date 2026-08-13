const db = require("../../config/db");
const { listAllRecords } = require("../../lib/airtable-client");

const TABLE = "Hero Images";

function firstAttachmentUrl(field) {
  return Array.isArray(field) && field.length > 0 ? field[0].url : null;
}

function mapHeroImageRecord(record) {
  const f = record.fields;
  return {
    id: record.id,
    imageUrl: firstAttachmentUrl(f["Image"]),
    alt: f["Alt"] || "",
    sortOrder: typeof f["Sort Order"] === "number" ? f["Sort Order"] : 0,
    active: Boolean(f["Active"]),
  };
}

function heroImageToPublic(img) {
  return { id: img.id, imageUrl: img.imageUrl, alt: img.alt };
}

async function fetchHeroImagesLive() {
  const records = await listAllRecords(TABLE, { sort: [{ field: "Sort Order" }] });
  return records.map(mapHeroImageRecord).filter((img) => img.active && img.imageUrl);
}

async function writeThroughCache(images) {
  const now = new Date();
  await db.transaction(async (trx) => {
    await trx("hero_images_cache").del();
    if (images.length === 0) return;
    await trx("hero_images_cache").insert(
      images.map((img) => ({
        airtable_id: img.id,
        image_url: img.imageUrl,
        alt: img.alt,
        sort_order: img.sortOrder,
        synced_at: now,
      })),
    );
  });
}

function cacheRowToPublic(row) {
  return { id: row.airtable_id, imageUrl: row.image_url, alt: row.alt };
}

async function readHeroImagesFromCache() {
  const rows = await db("hero_images_cache").orderBy("sort_order", "asc");
  return rows.map(cacheRowToPublic);
}

// Live-first with MySQL fallback, same pattern as every other
// NocoDB-backed read in this app (see categories.service.js).
async function getHeroImages() {
  try {
    const images = await fetchHeroImagesLive();
    await writeThroughCache(images);
    return images.map(heroImageToPublic);
  } catch (err) {
    console.error("NocoDB hero images fetch failed, serving cache:", err.message);
    return readHeroImagesFromCache();
  }
}

module.exports = { getHeroImages };
