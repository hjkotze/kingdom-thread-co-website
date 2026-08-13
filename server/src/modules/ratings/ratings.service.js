const db = require("../../config/db");

class RatingError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function summaryRowToPublic(row) {
  const count = Number(row.count) || 0;
  return {
    average: count > 0 ? Math.round(Number(row.average) * 10) / 10 : null,
    count,
  };
}

async function getRatingSummary(productId) {
  const row = await db("product_ratings")
    .where({ product_airtable_id: productId })
    .avg("rating as average")
    .count("rating as count")
    .first();
  return summaryRowToPublic(row);
}

// Batch version — one grouped query for a whole product list, avoiding
// N+1 queries when the Shop grid renders every product's rating at once.
async function getRatingSummariesForProducts(productIds) {
  if (productIds.length === 0) return new Map();
  const rows = await db("product_ratings")
    .whereIn("product_airtable_id", productIds)
    .groupBy("product_airtable_id")
    .select("product_airtable_id")
    .avg("rating as average")
    .count("rating as count");
  const map = new Map(rows.map((row) => [row.product_airtable_id, summaryRowToPublic(row)]));
  for (const id of productIds) {
    if (!map.has(id)) map.set(id, { average: null, count: 0 });
  }
  return map;
}

async function getMyRating(customerId, productId) {
  const row = await db("product_ratings")
    .where({ customer_id: customerId, product_airtable_id: productId })
    .first();
  return row ? row.rating : null;
}

// Only a customer who has an actual quote for this product may rate it —
// reuses the quotes table as the eligibility source rather than a
// separate "verified purchase" table, since the data already exists there.
async function submitRating(customerId, productId, ratingValue) {
  const rating = Number(ratingValue);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new RatingError("Rating must be a whole number from 1 to 5.", 400);
  }

  const eligible = await db("quotes")
    .where({ customer_id: customerId, product_airtable_id: productId })
    .first();
  if (!eligible) {
    throw new RatingError("You can only rate products you've requested a quote for.", 403);
  }

  const now = new Date();
  await db("product_ratings")
    .insert({ product_airtable_id: productId, customer_id: customerId, rating, created_at: now, updated_at: now })
    .onConflict(["product_airtable_id", "customer_id"])
    .merge({ rating, updated_at: now });

  return rating;
}

module.exports = {
  RatingError,
  getRatingSummary,
  getRatingSummariesForProducts,
  getMyRating,
  submitRating,
};
