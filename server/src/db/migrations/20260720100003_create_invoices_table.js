// Auto-generated the moment a customer accepts a formal quote
// (quoteSnapshots.service.js#acceptSnapshot). No stored status enum —
// paid/outstanding is computed on read from total/deposit_amount and the
// SUM of invoice_payments, matching the existing computeFlags-on-read
// pattern in adminQuotes.service.js rather than duplicating that state.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("invoices", (table) => {
    table.increments("id").primary();
    table.integer("quote_id").unsigned().notNullable().references("id").inTable("quotes");
    table.integer("quote_snapshot_id").unsigned().notNullable().references("id").inTable("quote_snapshots");
    table.string("invoice_number", 20).notNullable().unique();

    table.decimal("total", 10, 2).notNullable();
    table.decimal("deposit_amount", 10, 2).nullable();

    table.text("notes").nullable();
    // Copied from the banking_details site setting at generation time —
    // so a later edit to the company's banking details doesn't silently
    // rewrite what an already-issued invoice told the customer to pay into.
    table.text("banking_details_snapshot").nullable();

    table.timestamps(true, true);
    table.index("quote_id");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("invoices");
};
