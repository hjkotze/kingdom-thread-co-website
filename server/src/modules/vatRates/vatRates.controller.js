const vatRates = require("../../lib/vatRates");

async function list(req, res, next) {
  try {
    const rates = await vatRates.listRates();
    res.json({ rates: rates.map(vatRates.rateRowToPublic) });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { ratePercent, validFrom, validTo } = req.body || {};
    const rate = await vatRates.createRate({ ratePercent, validFrom, validTo });
    res.status(201).json({ rate: vatRates.rateRowToPublic(rate) });
  } catch (err) {
    if (err instanceof vatRates.VatRateError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { list, create };
