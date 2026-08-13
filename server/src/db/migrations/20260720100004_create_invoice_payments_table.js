// A ledger rather than a single "amount paid" column — supports a deposit
// entry followed by a balance entry (or any number of partial payments)
// without needing separate columns for each. Admin-recorded only: there is
// no payment gateway in this app, payments happen offline (EFT) and are
// entered here after the fact.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("invoice_payments", (table) => {
    table.increments("id").primary();
    table.integer("invoice_id").unsigned().notNullable().references("id").inTable("invoices");
    table.decimal("amount", 10, 2).notNullable();
    table.date("paid_at").notNullable();
    table.text("note").nullable();
    table.integer("recorded_by_admin_id").unsigned().notNullable().references("id").inTable("users");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.index("invoice_id");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("invoice_payments");
};
