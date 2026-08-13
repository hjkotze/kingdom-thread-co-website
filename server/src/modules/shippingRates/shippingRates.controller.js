const service = require("./shippingRates.service");

function handleError(err, res, next) {
  if (err instanceof service.ShippingRateError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  next(err);
}

async function list(req, res, next) {
  try {
    const rates = await service.listRates();
    res.json({ rates: rates.map(service.rateRowToPublic) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const rate = await service.createRate(req.body || {});
    res.status(201).json({ rate: service.rateRowToPublic(rate) });
  } catch (err) {
    handleError(err, res, next);
  }
}

async function update(req, res, next) {
  try {
    const rate = await service.updateRate(req.params.id, req.body || {});
    res.json({ rate: service.rateRowToPublic(rate) });
  } catch (err) {
    handleError(err, res, next);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteRate(req.params.id);
    res.status(204).end();
  } catch (err) {
    handleError(err, res, next);
  }
}

// Product overrides live here rather than in adminProducts — they're
// local-only data (product_shipping_rates), never round-tripped to
// Airtable, unlike everything else on a product. Mounted at
// /admin/products/:productId/shipping-rate (see routes/index.js).
async function getProductOverride(req, res, next) {
  try {
    const override = await service.getOverrideForProduct(req.params.productId);
    res.json({ shippingRate: override ? service.rateRowToPublic(override) : null });
  } catch (err) {
    next(err);
  }
}

async function setProductOverride(req, res, next) {
  try {
    const override = await service.setProductOverride(req.params.productId, req.body?.shippingRateId || null);
    res.json({ shippingRate: override ? service.rateRowToPublic(override) : null });
  } catch (err) {
    handleError(err, res, next);
  }
}

module.exports = { list, create, update, remove, getProductOverride, setProductOverride };
