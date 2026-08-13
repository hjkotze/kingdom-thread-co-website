const db = require("../../config/db");

class ShippingRateError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function listRates() {
  return db("shipping_rates").orderBy("code", "asc");
}

async function getDefaultRate() {
  return db("shipping_rates").where({ is_default: true }).first();
}

async function getRateById(id) {
  return db("shipping_rates").where({ id }).first();
}

async function validateInput({ code, description, cost }) {
  if (!code || !code.trim()) throw new ShippingRateError("Code is required.", 400);
  if (!description || !description.trim()) throw new ShippingRateError("Description is required.", 400);
  const numericCost = Number(cost);
  if (!Number.isFinite(numericCost) || numericCost < 0) {
    throw new ShippingRateError("Cost must be a non-negative number.", 400);
  }
  return { code: code.trim(), description: description.trim(), cost: numericCost };
}

// Exactly one rate may be the default — enforced here rather than at the
// DB level, same "singleton flag" approach as nothing else in this app
// currently needs.
async function setAsDefault(trx, id) {
  await trx("shipping_rates").update({ is_default: false });
  await trx("shipping_rates").where({ id }).update({ is_default: true });
}

async function createRate(input) {
  const data = await validateInput(input);
  return db.transaction(async (trx) => {
    const [id] = await trx("shipping_rates").insert(data);
    if (input.isDefault) await setAsDefault(trx, id);
    return trx("shipping_rates").where({ id }).first();
  });
}

async function updateRate(id, input) {
  const existing = await getRateById(id);
  if (!existing) throw new ShippingRateError("Shipping rate not found.", 404);
  const data = await validateInput(input);
  return db.transaction(async (trx) => {
    await trx("shipping_rates").where({ id }).update({ ...data, updated_at: new Date() });
    if (input.isDefault) await setAsDefault(trx, id);
    return trx("shipping_rates").where({ id }).first();
  });
}

async function deleteRate(id) {
  const inUse = await db("product_shipping_rates").where({ shipping_rate_id: id }).first();
  if (inUse) throw new ShippingRateError("This rate is assigned to a product — remove that override first.", 409);
  await db("shipping_rates").where({ id }).del();
}

// Highest single per-product override among the lines, falling back to
// the global default for any line whose product has no override.
async function resolveOrderShipping(productAirtableIds) {
  const defaultRate = await getDefaultRate();
  const overrides = await db("product_shipping_rates")
    .whereIn("product_airtable_id", productAirtableIds)
    .join("shipping_rates", "shipping_rates.id", "product_shipping_rates.shipping_rate_id")
    .select("product_shipping_rates.product_airtable_id", "shipping_rates.*");

  const overrideByProduct = new Map(overrides.map((o) => [o.product_airtable_id, o]));

  let winning = defaultRate || null;
  for (const productId of productAirtableIds) {
    const candidate = overrideByProduct.get(productId) || defaultRate;
    if (candidate && (!winning || Number(candidate.cost) > Number(winning.cost))) {
      winning = candidate;
    }
  }

  return {
    shippingRateId: winning ? winning.id : null,
    shippingAmount: winning ? Number(winning.cost) : 0,
  };
}

async function getOverrideForProduct(productAirtableId) {
  return db("product_shipping_rates")
    .where({ product_airtable_id: productAirtableId })
    .join("shipping_rates", "shipping_rates.id", "product_shipping_rates.shipping_rate_id")
    .select("shipping_rates.*")
    .first();
}

async function setProductOverride(productAirtableId, shippingRateId) {
  if (!shippingRateId) {
    await db("product_shipping_rates").where({ product_airtable_id: productAirtableId }).del();
    return null;
  }
  await db("product_shipping_rates")
    .insert({ product_airtable_id: productAirtableId, shipping_rate_id: shippingRateId })
    .onConflict("product_airtable_id")
    .merge({ shipping_rate_id: shippingRateId, updated_at: new Date() });
  return getOverrideForProduct(productAirtableId);
}

function rateRowToPublic(row) {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    cost: Number(row.cost),
    isDefault: Boolean(row.is_default),
  };
}

module.exports = {
  ShippingRateError,
  listRates,
  getDefaultRate,
  getRateById,
  createRate,
  updateRate,
  deleteRate,
  resolveOrderShipping,
  getOverrideForProduct,
  setProductOverride,
  rateRowToPublic,
};
