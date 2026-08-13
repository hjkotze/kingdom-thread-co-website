const db = require("../config/db");

class VatRateError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function toDateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

// "Current" = the rate whose window contains `date` — open-ended
// (valid_to IS NULL) unless the admin explicitly scheduled an end date.
async function getCurrentRate(date = new Date()) {
  const d = toDateOnly(date);
  const row = await db("vat_rates")
    .where("valid_from", "<=", d)
    .andWhere((qb) => qb.whereNull("valid_to").orWhere("valid_to", ">=", d))
    .orderBy("valid_from", "desc")
    .first();
  if (!row) throw new VatRateError("No VAT rate configured for this date.", 500);
  return row;
}

async function listRates() {
  return db("vat_rates").orderBy("valid_from", "desc");
}

// Creating a new open-ended rate auto-closes whatever was previously open
// (valid_to = new.valid_from - 1 day) so there's never an overlap or gap
// at the boundary. If the admin also sets validTo on the new rate (a
// scheduled/temporary rate), the previously-open rate is left alone only
// if the new rate doesn't start before it — kept simple: always close the
// prior open rate the same way, regardless of whether the new one has its
// own end date.
async function createRate({ ratePercent, validFrom, validTo }) {
  const rate = Number(ratePercent);
  if (!Number.isFinite(rate) || rate < 0) throw new VatRateError("Rate must be a non-negative number.", 400);
  if (!validFrom) throw new VatRateError("Valid-from date is required.", 400);

  return db.transaction(async (trx) => {
    const priorOpen = await trx("vat_rates").whereNull("valid_to").orderBy("valid_from", "desc").first();
    if (priorOpen) {
      const dayBefore = new Date(validFrom);
      dayBefore.setDate(dayBefore.getDate() - 1);
      await trx("vat_rates").where({ id: priorOpen.id }).update({ valid_to: toDateOnly(dayBefore) });
    }

    const [id] = await trx("vat_rates").insert({
      rate_percent: rate,
      valid_from: toDateOnly(validFrom),
      valid_to: validTo ? toDateOnly(validTo) : null,
    });
    return trx("vat_rates").where({ id }).first();
  });
}

function rateRowToPublic(row) {
  return {
    id: row.id,
    ratePercent: Number(row.rate_percent),
    validFrom: row.valid_from,
    validTo: row.valid_to,
    createdAt: row.created_at,
  };
}

module.exports = { VatRateError, getCurrentRate, listRates, createRate, rateRowToPublic };
