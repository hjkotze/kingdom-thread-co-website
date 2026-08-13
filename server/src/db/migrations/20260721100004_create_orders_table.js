// The real parent entity above quotes — created the moment a customer
// accepts one or more finalised quotes (whether combined or a single
// quote alone; every acceptance goes through the same code path, see
// orders.service.js#createOrderFromQuotes). Snapshots the shipping amount
// and VAT rate actually used, same reasoning as invoices.banking_details_
// snapshot: a later change to the default rates must not silently rewrite
// an already-issued order.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("orders", (table) => {
    table.increments("id").primary();
    table.integer("customer_id").unsigned().notNullable().references("id").inTable("users");
    table.integer("shipping_rate_id").unsigned().nullable().references("id").inTable("shipping_rates");
    table.decimal("shipping_amount", 10, 2).notNullable().defaultTo(0);
    table.decimal("vat_rate_percent", 5, 2).notNullable();
    table.text("notes").nullable();
    table.timestamps(true, true);
    table.index("customer_id");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("orders");
};
