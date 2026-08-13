const PREFIXES = { quote: "Q", invoice: "INV", work_order: "WO", order: "ORD" };

// Must be called with an active transaction (trx) — the SELECT ... FOR
// UPDATE row lock only prevents two concurrent callers from getting the
// same number if they're both inside a transaction against the same row.
// Yearly-reset: e.g. INV-2026-0001, resetting to 0001 each calendar year.
async function getNextNumber(trx, docType) {
  const year = new Date().getFullYear();

  // Idempotent: creates the counter row on first use for this doc_type+year,
  // no-ops if it already exists (both paths then converge on the SELECT
  // ... FOR UPDATE below).
  await trx("document_sequences").insert({ doc_type: docType, year, next_number: 1 }).onConflict(["doc_type", "year"]).ignore();

  const row = await trx("document_sequences").where({ doc_type: docType, year }).forUpdate().first();
  await trx("document_sequences").where({ id: row.id }).update({ next_number: row.next_number + 1 });

  const prefix = PREFIXES[docType];
  return `${prefix}-${year}-${String(row.next_number).padStart(4, "0")}`;
}

module.exports = { getNextNumber };
