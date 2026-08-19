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

// {id, url} per attachment — the minimal shape NocoDB accepts back on write
// (confirmed directly against Categories' Image field, same attachment
// mechanics), so it doubles as both the read shape and what
// removeProductImage/reorderProductImages send back.
function allAttachments(field) {
  return Array.isArray(field) ? field.map((a) => ({ id: a.id, url: a.url })) : [];
}

// Best-effort JSON parse — malformed/empty "Size Prices" just falls back to
// no per-size pricing rather than throwing and taking the whole product
// (and every product after it in the batch) down with it.
function parseSizePrices(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// The single "Price" field is still what every existing display ("from
// R{price}" on Shop/ProductCategories cards, the admin list) reads — for a
// product with per-size pricing there's no one "the" price, so this derives
// the cheapest size as the "from" price shown before a size is picked.
// Falls back to the raw Price field for products with no sizes at all.
function computeDisplayPrice(rawPrice, sizes, sizePrices) {
  if (Array.isArray(sizes) && sizes.length > 0) {
    const values = sizes.map((s) => sizePrices[s]).filter((v) => typeof v === "number" && !Number.isNaN(v));
    if (values.length > 0) return Math.min(...values);
  }
  return rawPrice;
}

// categoriesById: Map<airtableId, {slug, label}> — resolved once per fetch
// rather than per-record, since the catalogue is small enough that a
// single categories read up front is cheaper than one per product.
function mapProductRecord(record, categoriesById) {
  const f = record.fields;
  const categoryLink = f["Category"];
  const categoryId = Array.isArray(categoryLink) && categoryLink.length > 0 ? categoryLink[0] : null;
  const category = categoryId ? categoriesById.get(categoryId) : null;
  const sizes = f["Sizes"] || [];
  const sizePrices = parseSizePrices(f["Size Prices"]);
  return {
    airtableId: record.id,
    name: f["Name"] || "",
    subtitle: f["Subtitle"] || "",
    categoryId,
    categorySlug: category?.slug || null,
    categoryLabel: category?.label || null,
    price: computeDisplayPrice(typeof f["Price"] === "number" ? f["Price"] : null, sizes, sizePrices),
    sizePrices,
    tag: f["Tag"] || "",
    // Embroidered vs Sublimation — determines which of Font colour/Thread
    // colour the customise flow asks for (quotes.service.js,
    // quoteSnapshots.service.js).
    printingMethod: f["Printing Method"] || null,
    // rating/reviews come from real customer ratings (product_ratings
    // table), not Airtable — attached separately by attachRatingsBatch/
    // attachRatingsSingle below, never read from the Airtable record.
    images: allAttachments(f["Image"]),
    imageFallbackColour: f["Image Fallback Colour"] || "",
    badge: f["Badge"] || null,
    description: f["Description"] || "",
    sizes,
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
        images: JSON.stringify(p.images),
        image_fallback_colour: p.imageFallbackColour,
        badge: p.badge,
        description: p.description,
        sizes: JSON.stringify(p.sizes),
        size_prices: JSON.stringify(p.sizePrices),
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
    images: typeof row.images === "string" ? JSON.parse(row.images) : row.images || [],
    imageFallbackColour: row.image_fallback_colour,
    badge: row.badge,
    description: row.description,
    sizes: typeof row.sizes === "string" ? JSON.parse(row.sizes) : row.sizes || [],
    sizePrices: typeof row.size_prices === "string" ? JSON.parse(row.size_prices) : row.size_prices || {},
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
    images: p.images,
    imageFallbackColour: p.imageFallbackColour,
    badge: p.badge,
    description: p.description,
    sizes: p.sizes,
    sizePrices: p.sizePrices,
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

async function validateProductInput({ name, categoryId, sizes, colours, price, sizePrices, printingMethod }) {
  if (!name || !name.trim()) throw new ProductAdminError("Name is required.", 400);
  if (!categoryId) throw new ProductAdminError("Category is required.", 400);
  const category = await categoriesService.getCategoryByIdForAdmin(categoryId);
  if (!category) throw new ProductAdminError("Selected category does not exist.", 400);
  if (!printingMethod || !PRINTING_METHODS.includes(printingMethod)) {
    throw new ProductAdminError(`Printing method must be one of: ${PRINTING_METHODS.join(", ")}`, 400);
  }
  if (sizes !== undefined && !Array.isArray(sizes)) throw new ProductAdminError("Sizes must be a list.", 400);
  if (colours !== undefined && !Array.isArray(colours)) throw new ProductAdminError("Colours must be a list.", 400);

  // A product with sizes has no single "the" price, so each size needs its
  // own — otherwise a customer picking, say, "Queen" would silently be
  // quoted whatever flat Price happened to be set (or nothing at all).
  // Products with no sizes keep using the plain Price field, unchanged.
  if (Array.isArray(sizes) && sizes.length > 0) {
    for (const size of sizes) {
      const value = sizePrices?.[size];
      if (value === undefined || value === null || value === "" || isNaN(Number(value)) || Number(value) < 0) {
        throw new ProductAdminError(`Price is required for size "${size}".`, 400);
      }
    }
  } else if (price !== undefined && price !== null && price !== "" && (isNaN(Number(price)) || Number(price) < 0)) {
    throw new ProductAdminError("Price must be a non-negative number.", 400);
  }
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
    sizePrices,
    colours,
    customisable,
    active,
  } = input;
  const sizesArr = sizes || [];
  // Only keep entries for sizes the product actually has — a size removed
  // from Sizes shouldn't leave its old price lingering in storage.
  const cleanSizePrices = {};
  for (const size of sizesArr) {
    const value = sizePrices?.[size];
    if (value !== undefined && value !== null && value !== "") cleanSizePrices[size] = Number(value);
  }
  const sizePriceValues = Object.values(cleanSizePrices);
  // Price field doubles as the "from R" display price read everywhere else
  // in the app — for a sized product that's the cheapest size, otherwise
  // the plain admin-entered price.
  const displayPrice =
    sizesArr.length > 0
      ? sizePriceValues.length > 0
        ? Math.min(...sizePriceValues)
        : null
      : price === undefined || price === null || price === ""
        ? null
        : Number(price);
  return {
    Name: name.trim(),
    Subtitle: subtitle || "",
    Category: [categoryId],
    Price: displayPrice,
    "Size Prices": sizesArr.length > 0 ? JSON.stringify(cleanSizePrices) : "",
    Tag: tag || "",
    "Printing Method": printingMethod,
    "Image Fallback Colour": imageFallbackColour || "",
    Badge: badge || "",
    Description: description || "",
    Sizes: sizesArr,
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

// Appends — uploadAttachment adds to the field rather than replacing it, so
// unlike the old single-image setProductImage this never clears first.
async function addProductImage(id, { filename, contentType, buffer }) {
  const existing = await getProductByIdForAdmin(id);
  if (!existing) throw new ProductAdminError("Product not found", 404);
  await uploadAttachment(TABLE, id, "Image", { filename, contentType, buffer });
  return getProductByIdForAdmin(id);
}

async function removeProductImage(id, attachmentId) {
  const existing = await getProductByIdForAdmin(id);
  if (!existing) throw new ProductAdminError("Product not found", 404);
  const remaining = existing.images.filter((img) => img.id !== attachmentId);
  await updateRecord(TABLE, id, { Image: remaining });
  return getProductByIdForAdmin(id);
}

// order: array of attachment ids in the desired display order. Silently
// drops any id that's no longer present (e.g. a stale request racing a
// concurrent removal) rather than erroring — the resulting order is still
// well-defined, just missing whatever's already gone.
async function reorderProductImages(id, order) {
  const existing = await getProductByIdForAdmin(id);
  if (!existing) throw new ProductAdminError("Product not found", 404);
  const byId = new Map(existing.images.map((img) => [img.id, img]));
  const reordered = order.map((imgId) => byId.get(imgId)).filter(Boolean);
  await updateRecord(TABLE, id, { Image: reordered });
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
  addProductImage,
  removeProductImage,
  reorderProductImages,
};
