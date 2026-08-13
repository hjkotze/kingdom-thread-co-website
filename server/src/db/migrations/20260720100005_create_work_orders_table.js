// Internal production document only — never emailed to the customer.
// Generated either immediately on quote acceptance (no deposit required)
// or once a payment recorded against the invoice meets the deposit amount
// (see invoices.service.js#maybeGenerateWorkOrder). One per invoice.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("work_orders", (table) => {
    table.increments("id").primary();
    table.integer("quote_id").unsigned().notNullable().references("id").inTable("quotes");
    table.integer("invoice_id").unsigned().notNullable().references("id").inTable("invoices").unique();
    table.string("work_order_number", 20).notNullable().unique();
    table.text("notes").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("work_orders");
};
