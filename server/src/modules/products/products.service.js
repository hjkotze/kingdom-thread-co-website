const db = require("../../config/db");
const { listAllRecords } = require("../../lib/airtable-client");

function firstAttachmentUrl(field) {
  return Array.isArray(field) && field.length > 0 ? field[0].url : null;
}

function mapCategoryRecord(record) {
  const f = record.fields;
  return {
    airtableId: record.id,
    slug: f["Slug"] || "",
    label: f["Label"] || "",
    headline: f["Headline"] || "",
    body: f["Body"] || "",
    callout: f["Callout"] || "",
    imageUrl: firstAttachmentUrl(f["Image"]),
    alt: f["Alt"] || "",
    sortOrder: typeof f["Sort Order"] === "number" ? f["Sort Order"] : 0,
  };
}

function mapProductRecord(record) {
  const f = record.fields;
  return {
    airtableId: record.id,
    name: f["Name"] || "",
    subtitle: f["Subtitle"] || "",
    // Plain string matching Shop.jsx's existing filter values (e.g.
    // "pillow-premium"), not a relational link — the current frontend
    // treats category as a loose naming convention, not a hierarchy shared
    // with the Categories table's 5 display groupings, so this migration
    // preserves that rather than forcing a redesign.
    category: f["Category"] || null,
    price: typeof f["Price"] === "number" ? f["Price"] : null,
    tag: f["Tag"] || "",
    rating: typeof f["Rating"] === "number" ? f["Rating"] : null,
    reviews: typeof f["Reviews"] === "number" ? f["Reviews"] : null,
    imageUrl: firstAttachmentUrl(f["Image"]),
    imageFallbackColour: f["Image Fallback Colour"] || "",
    badge: f["Badge"] || null,
    description: f["Description"] || "",
    sizes: f["Sizes"] || [],
    colours: f["Colours"] || [],
    customisable: Boolean(f["Customisable"]),
    active: f["Active"] !== false,
  };
}

async function fetchCategoriesLive() {
  const records = await listAllRecords("Categories", { sort: [{ field: "Sort Order" }] });
  return records.map(mapCategoryRecord);
}

async function fetchProductsLive() {
  const records = await listAllRecords("Products");
  return records.map(mapProductRecord).filter((product) => product.active);
}

async function writeThroughCategoriesCache(categories) {
  const now = new Date();
  await db.transaction(async (trx) => {
    await trx("categories_cache").del();
    if (categories.length === 0) return;
    await trx("categories_cache").insert(
      categories.map((c) => ({
        airtable_id: c.airtableId,
        slug: c.slug,
        label: c.label,
        headline: c.headline,
        body: c.body,
        callout: c.callout,
        image_url: c.imageUrl,
        alt: c.alt,
        sort_order: c.sortOrder,
        synced_at: now,
      })),
    );
  });
}

async function writeThroughProductsCache(products) {
  const now = new Date();
  await db.transaction(async (trx) => {
    await trx("products_cache").del();
    if (products.length === 0) return;
    await trx("products_cache").insert(
      products.map((p) => ({
        airtable_id: p.airtableId,
        name: p.name,
        subtitle: p.subtitle,
        category_slug: p.category,
        price: p.price,
        tag: p.tag,
        rating: p.rating,
        reviews: p.reviews,
        image_url: p.imageUrl,
        image_fallback_colour: p.imageFallbackColour,
        badge: p.badge,
        description: p.description,
        sizes: JSON.stringify(p.sizes),
        colours: JSON.stringify(p.colours),
        customisable: p.customisable,
        active: p.active,
        synced_at: now,
      })),
    );
  });
}

function categoryRowToPublic(row) {
  return {
    id: row.airtable_id,
    slug: row.slug,
    label: row.label,
    headline: row.headline,
    body: row.body,
    callout: row.callout,
    imageUrl: row.image_url,
    alt: row.alt,
    sortOrder: row.sort_order,
  };
}

function productRowToPublic(row) {
  return {
    id: row.airtable_id,
    name: row.name,
    subtitle: row.subtitle,
    category: row.category_slug,
    price: row.price === null ? null : Number(row.price),
    tag: row.tag,
    rating: row.rating === null ? null : Number(row.rating),
    reviews: row.reviews,
    imageUrl: row.image_url,
    imageFallbackColour: row.image_fallback_colour,
    badge: row.badge,
    description: row.description,
    sizes: typeof row.sizes === "string" ? JSON.parse(row.sizes) : row.sizes || [],
    colours: typeof row.colours === "string" ? JSON.parse(row.colours) : row.colours || [],
    customisable: Boolean(row.customisable),
  };
}

async function readCategoriesFromCache() {
  const rows = await db("categories_cache").orderBy("sort_order", "asc");
  return rows.map(categoryRowToPublic);
}

async function readProductsFromCache() {
  const rows = await db("products_cache").where({ active: true });
  return rows.map(productRowToPublic);
}

// Live-first with MySQL fallback (§ Airtable caching decision): try
// Airtable on every request; on success, write through to the cache; on
// failure/timeout, serve the last-known-good cache instead.
async function getCategories() {
  try {
    const categories = await fetchCategoriesLive();
    await writeThroughCategoriesCache(categories);
    return categories.map((c) => ({
      id: c.airtableId,
      slug: c.slug,
      label: c.label,
      headline: c.headline,
      body: c.body,
      callout: c.callout,
      imageUrl: c.imageUrl,
      alt: c.alt,
      sortOrder: c.sortOrder,
    }));
  } catch (err) {
    console.error("Airtable categories fetch failed, serving cache:", err.message);
    return readCategoriesFromCache();
  }
}

async function getProducts() {
  try {
    const products = await fetchProductsLive();
    await writeThroughProductsCache(products);
    return products.map((p) => ({
      id: p.airtableId,
      name: p.name,
      subtitle: p.subtitle,
      category: p.category,
      price: p.price,
      tag: p.tag,
      rating: p.rating,
      reviews: p.reviews,
      imageUrl: p.imageUrl,
      imageFallbackColour: p.imageFallbackColour,
      badge: p.badge,
      description: p.description,
      sizes: p.sizes,
      colours: p.colours,
      customisable: p.customisable,
    }));
  } catch (err) {
    console.error("Airtable products fetch failed, serving cache:", err.message);
    return readProductsFromCache();
  }
}

module.exports = { getCategories, getProducts };
