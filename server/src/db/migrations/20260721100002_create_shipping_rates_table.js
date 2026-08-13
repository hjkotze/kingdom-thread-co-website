// Admin-managed shipping rate list. Exactly one row may be is_default —
// enforced in shippingRates service, not the DB — used as the fallback
// whenever a product has no entry in product_shipping_rates.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("shipping_rates", (table) => {
    table.increments("id").primary();
    table.string("code", 50).notNullable().unique();
    table.string("description", 255).notNullable();
    table.decimal("cost", 10, 2).notNullable();
    table.boolean("is_default").notNullable().defaultTo(false);
    table.timestamps(true, true);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("shipping_rates");
};
