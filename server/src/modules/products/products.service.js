const db = require("../../config/db");
const { listAllRecords, createRecord, updateRecord, deleteRecord, uploadAttachment } = require("../../lib/airtable-client");
const categoriesService = require("../categories/categories.service");
const ratingsService = require("../ratings/ratings.service");

const TABLE = "Products";

class ProductAdminError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function firstAttachmentUrl(field) {
  return Array.isArray(field) && field.length > 0 ? field[0].url : null;
}

// categoriesById: Map<airtableId, {slug, label}> — resolved once per fetch
// rather than per-record, since the catalogue is small enough that a
// single categories read up front is cheaper than one per product.
function mapProductRecord(record, categoriesById) {
  const f = record.fields;
  const categoryLink = f["Category"];
  const categoryId = Array.isArray(categoryLink) && categoryLink.length > 0 ? categoryLink[0] : null;
  const category = categoryId ? categoriesById.get(categoryId) : null;
  return {
    airtableId: record.id,
    name: f["Name"] || "",
    subtitle: f["Subtitle"] || "",
    categoryId,
    categorySlug: category?.slug || null,
    categoryLabel: category?.label || null,
    price: typeof f["Price"] === "number" ? f["Price"] : null,
    tag: f["Tag"] || "",
    // Embroidered vs Sublimation — determines which of Font colour/Thread
    // colour the customise flow asks for (quotes.service.js,
    // quoteSnapshots.service.js).
    printingMethod: f["Printing Method"] || null,
    // rating/reviews come from real customer ratings (product_ratings
    // table), not Airtable — attached separately by attachRatingsBatch/
    // attachRatingsSingle below, never read from the Airtable record.
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

// Batch-attaches real rating/review-count from product_ratings — one
// grouped query for the whole list rather than one per product.
async function attachRatingsBatch(products) {
  const summaries = await ratingsService.getRatingSummariesForProducts(products.map((p) => p.airtableId));
  return products.map((p) => {
    const summary = summaries.get(p.airtableId) || { average: null, count: 0 };
    return { ...p, rating: summary.average, reviews: summary.count };
  });
}

async function attachRatingsSingle(product) {
  const summary = await ratingsService.getRatingSummary(product.airtableId);
  return { ...product, rating: summary.average, reviews: summary.count };
}

async function fetchProductsLiveAll() {
  const [records, categories] = await Promise.all([listAllRecords(TABLE), categoriesService.getCategories()]);
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const mapped = records.map((r) => mapProductRecord(r, categoriesById));
  return attachRatingsBatch(mapped);
}

async function fetchProductsLive() {
  const all = await fetchProductsLiveAll();
  return all.filter((product) => product.active);
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
        category_slug: p.categorySlug,
        category_airtable_id: p.categoryId,
        price: p.price,
        tag: p.tag,
        printing_method: p.printingMethod,
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

function productRowToPublic(row) {
  return {
    id: row.airtable_id,
    name: row.name,
    subtitle: row.subtitle,
    categoryId: row.category_airtable_id,
    category: row.category_slug,
    price: row.price === null ? null : Number(row.price),
    tag: row.tag,
    printingMethod: row.printing_method,
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

function productToPublic(p) {
  return {
    id: p.airtableId,
    name: p.name,
    subtitle: p.subtitle,
    categoryId: p.categoryId,
    category: p.categorySlug,
    categoryLabel: p.categoryLabel,
    price: p.price,
    tag: p.tag,
    printingMethod: p.printingMethod,
    rating: p.rating,
    reviews: p.reviews,
    imageUrl: p.imageUrl,
    imageFallbackColour: p.imageFallbackColour,
    badge: p.badge,
    description: p.description,
    sizes: p.sizes,
    colours: p.colours,
    customisable: p.customisable,
    active: p.active,
  };
}

async function readProductsFromCache() {
  const rows = await db("products_cache").where({ active: true });
  return rows.map(productRowToPublic);
}

// Live-first with MySQL fallback (§ Airtable caching decision): try
// Airtable on every request; on success, write through to the cache; on
// failure/timeout, serve the last-known-good cache instead.
async function getProducts() {
  try {
    const products = await fetchProductsLive();
    await writeThroughProductsCache(products);
    return products.map(productToPublic);
  } catch (err) {
    console.error("Airtable products fetch failed, serving cache:", err.message);
    return readProductsFromCache();
  }
}

// Reuses getProducts() rather than a dedicated single-record fetch — the
// full catalogue is small (a handful of products), so this stays simple
// instead of duplicating the live-first/cache-fallback logic for one row.
async function getProductById(id) {
  const products = await getProducts();
  return products.find((p) => p.id === id) || null;
}

// Admin surfaces always read live (never cache-fallback), and include
// inactive products — an admin managing the catalogue needs to see and
// edit hidden products too, not just what's publicly shown.
async function listProductsForAdmin() {
  const products = await fetchProductsLiveAll();
  return products.map(productToPublic);
}

async function getProductByIdForAdmin(id) {
  const products = await listProductsForAdmin();
  return products.find((p) => p.id === id) || null;
}

const PRINTING_METHODS = ["Embroidered", "Sublimation"];

async function validateProductInput({ name, categoryId, sizes, colours, price, printingMethod }) {
  if (!name || !name.trim()) throw new ProductAdminError("Name is required.", 400);
  if (!categoryId) throw new ProductAdminError("Category is required.", 400);
  const category = await categoriesService.getCategoryByIdForAdmin(categoryId);
  if (!category) throw new ProductAdminError("Selected category does not exist.", 400);
  if (!printingMethod || !PRINTING_METHODS.includes(printingMethod)) {
    throw new ProductAdminError(`Printing method must be one of: ${PRINTING_METHODS.join(", ")}`, 400);
  }
  if (price !== undefined && price !== null && price !== "" && (isNaN(Number(price)) || Number(price) < 0)) {
    throw new ProductAdminError("Price must be a non-negative number.", 400);
  }
  if (sizes !== undefined && !Array.isArray(sizes)) throw new ProductAdminError("Sizes must be a list.", 400);
  if (colours !== undefined && !Array.isArray(colours)) throw new ProductAdminError("Colours must be a list.", 400);
}

// Rating/Reviews are deliberately absent — no longer app-writable at all,
// real customer ratings (product_ratings table) are the only source now.
function buildFields(input) {
  const {
    name,
    subtitle,
    categoryId,
    price,
    tag,
    printingMethod,
    imageFallbackColour,
    badge,
    description,
    sizes,
    colours,
    customisable,
    active,
  } = input;
  return {
    Name: name.trim(),
    Subtitle: subtitle || "",
    Category: [categoryId],
    Price: price === undefined || price === null || price === "" ? null : Number(price),
    Tag: tag || "",
    "Printing Method": printingMethod,
    "Image Fallback Colour": imageFallbackColour || "",
    Badge: badge || "",
    Description: description || "",
    Sizes: sizes || [],
    Colours: colours || [],
    Customisable: Boolean(customisable),
    Active: active === undefined ? true : Boolean(active),
  };
}

async function createProduct(input) {
  await validateProductInput(input);
  const record = await createRecord(TABLE, buildFields(input), { typecast: true });
  const categories = await categoriesService.getCategories();
  const mapped = mapProductRecord(record, new Map(categories.map((c) => [c.id, c])));
  return productToPublic(await attachRatingsSingle(mapped));
}

async function updateProduct(id, input) {
  await validateProductInput(input);
  const existing = await getProductByIdForAdmin(id);
  if (!existing) throw new ProductAdminError("Product not found", 404);
  const record = await updateRecord(TABLE, id, buildFields(input), { typecast: true });
  const categories = await categoriesService.getCategories();
  const mapped = mapProductRecord(record, new Map(categories.map((c) => [c.id, c])));
  return productToPublic(await attachRatingsSingle(mapped));
}

async function deleteProduct(id) {
  const existing = await getProductByIdForAdmin(id);
  if (!existing) throw new ProductAdminError("Product not found", 404);
  // No referential concern — quotes snapshot product name/price/etc. at
  // creation time (quotes.service.js) rather than holding a live
  // reference, so deleting a product never corrupts historical quotes.
  await deleteRecord(TABLE, id);
}

async function setProductImage(id, { filename, contentType, buffer }) {
  const existing = await getProductByIdForAdmin(id);
  if (!existing) throw new ProductAdminError("Product not found", 404);
  // Clear first — uploadAttachment adds to the field rather than replacing
  // it, and only the first attachment is ever read (firstAttachmentUrl).
  await updateRecord(TABLE, id, { Image: [] });
  await uploadAttachment(TABLE, id, "Image", { filename, contentType, buffer });
  return getProductByIdForAdmin(id);
}

module.exports = {
  ProductAdminError,
  getProducts,
  getProductById,
  listProductsForAdmin,
  getProductByIdForAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  setProductImage,
};
