const db = require("../../config/db");
const { listAllRecords, createRecord, updateRecord, deleteRecord, uploadAttachment } = require("../../lib/airtable-client");

const TABLE = "Categories";

class CategoryError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// {id, url} per attachment — the minimal shape NocoDB accepts back on write
// (confirmed directly: writing an array of just {id, url} correctly
// reorders/removes without needing the rest of the attachment object), so
// it doubles as both the read shape and what removeCategoryImage/
// reorderCategoryImages send back.
function allAttachments(field) {
  return Array.isArray(field) ? field.map((a) => ({ id: a.id, url: a.url })) : [];
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
    images: allAttachments(f["Image"]),
    alt: f["Alt"] || "",
    sortOrder: typeof f["Sort Order"] === "number" ? f["Sort Order"] : 0,
    active: f["Active"] !== false,
    // Reverse link field, populated automatically by Airtable — read-only
    // here, informational only (shown in the admin category list).
    productIds: Array.isArray(f["Products"]) ? f["Products"] : [],
  };
}

async function fetchCategoriesLiveAll() {
  const records = await listAllRecords(TABLE, { sort: [{ field: "Sort Order" }] });
  return records.map(mapCategoryRecord);
}

async function fetchCategoriesLive() {
  const all = await fetchCategoriesLiveAll();
  return all.filter((category) => category.active);
}

async function writeThroughCache(categories) {
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
        images: JSON.stringify(c.images),
        alt: c.alt,
        sort_order: c.sortOrder,
        active: c.active,
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
    images: typeof row.images === "string" ? JSON.parse(row.images) : row.images || [],
    alt: row.alt,
    sortOrder: row.sort_order,
  };
}

function categoryToPublic(c) {
  return {
    id: c.airtableId,
    slug: c.slug,
    label: c.label,
    headline: c.headline,
    body: c.body,
    callout: c.callout,
    images: c.images,
    alt: c.alt,
    sortOrder: c.sortOrder,
    active: c.active,
  };
}

async function readCategoriesFromCache() {
  const rows = await db("categories_cache").where({ active: true }).orderBy("sort_order", "asc");
  return rows.map(categoryRowToPublic);
}

// Live-first with MySQL fallback, same pattern as every other
// Airtable-backed read in this app.
async function getCategories() {
  try {
    const categories = await fetchCategoriesLive();
    await writeThroughCache(categories);
    return categories.map(categoryToPublic);
  } catch (err) {
    console.error("Airtable categories fetch failed, serving cache:", err.message);
    return readCategoriesFromCache();
  }
}

// Admin surfaces always read live (never cache-fallback) — an admin editing
// the catalogue needs to see real state, not a stale snapshot, and a
// transient Airtable outage should surface as an error here rather than
// silently letting the admin edit against out-of-date data.
async function listCategoriesForAdmin() {
  const categories = await fetchCategoriesLiveAll();
  return categories.map((c) => ({ ...categoryToPublic(c), productCount: c.productIds.length }));
}

async function getCategoryByIdForAdmin(id) {
  const categories = await fetchCategoriesLiveAll();
  const found = categories.find((c) => c.airtableId === id);
  if (!found) return null;
  return { ...categoryToPublic(found), productCount: found.productIds.length };
}

function validateCategoryInput({ slug, label }) {
  if (!slug || !slug.trim()) throw new CategoryError("Slug is required.", 400);
  if (!label || !label.trim()) throw new CategoryError("Label is required.", 400);
}

function buildFields({ slug, label, headline, body, callout, alt, sortOrder, active }) {
  return {
    Slug: slug.trim(),
    Label: label.trim(),
    Headline: headline || "",
    Body: body || "",
    Callout: callout || "",
    Alt: alt || "",
    "Sort Order": Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    Active: active === undefined ? true : Boolean(active),
  };
}

async function createCategory(input) {
  validateCategoryInput(input);
  const record = await createRecord(TABLE, buildFields(input));
  const created = mapCategoryRecord(record);
  return { ...categoryToPublic(created), productCount: created.productIds.length };
}

async function updateCategory(id, input) {
  validateCategoryInput(input);
  const existing = await getCategoryByIdForAdmin(id);
  if (!existing) throw new CategoryError("Category not found", 404);
  const record = await updateRecord(TABLE, id, buildFields(input));
  const updated = mapCategoryRecord(record);
  return { ...categoryToPublic(updated), productCount: updated.productIds.length };
}

// Blocks deletion while any product still links to this category, rather
// than silently orphaning their Category field — reassign first, then
// delete. products.service.js is required lazily (inside the function, not
// at module top) since it in turn requires this module at its own top
// level to resolve each product's category label; a top-level require here
// would create a circular dependency.
async function deleteCategory(id) {
  const productsService = require("../products/products.service");
  const products = await productsService.listProductsForAdmin();
  const linked = products.filter((p) => p.categoryId === id);
  if (linked.length > 0) {
    throw new CategoryError(
      `${linked.length} product${linked.length === 1 ? " is" : "s are"} still assigned to this category — reassign them first.`,
      409,
    );
  }
  await deleteRecord(TABLE, id);
}

// Appends — uploadAttachment adds to the field rather than replacing it, so
// unlike the old single-image setCategoryImage this never clears first.
async function addCategoryImage(id, { filename, contentType, buffer }) {
  const existing = await getCategoryByIdForAdmin(id);
  if (!existing) throw new CategoryError("Category not found", 404);
  await uploadAttachment(TABLE, id, "Image", { filename, contentType, buffer });
  return getCategoryByIdForAdmin(id);
}

async function removeCategoryImage(id, attachmentId) {
  const existing = await getCategoryByIdForAdmin(id);
  if (!existing) throw new CategoryError("Category not found", 404);
  const remaining = existing.images.filter((img) => img.id !== attachmentId);
  await updateRecord(TABLE, id, { Image: remaining });
  return getCategoryByIdForAdmin(id);
}

// order: array of attachment ids in the desired display order. Silently
// drops any id that's no longer present (e.g. a stale request racing a
// concurrent removal) rather than erroring — the resulting order is still
// well-defined, just missing whatever's already gone.
async function reorderCategoryImages(id, order) {
  const existing = await getCategoryByIdForAdmin(id);
  if (!existing) throw new CategoryError("Category not found", 404);
  const byId = new Map(existing.images.map((img) => [img.id, img]));
  const reordered = order.map((imgId) => byId.get(imgId)).filter(Boolean);
  await updateRecord(TABLE, id, { Image: reordered });
  return getCategoryByIdForAdmin(id);
}

module.exports = {
  CategoryError,
  getCategories,
  listCategoriesForAdmin,
  getCategoryByIdForAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  addCategoryImage,
  removeCategoryImage,
  reorderCategoryImages,
};
