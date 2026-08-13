// Local-only per-product shipping override, deliberately kept OUT of
// products_cache — that table is fully del()+reinserted on every live
// Airtable sync (products.service.js#writeThroughProductsCache), so
// anything stored directly on it would be wiped. Same precedent as
// product_ratings: keyed by product_airtable_id, no FK to products_cache,
// survives cache rewrites. Never round-tripped to Airtable.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("product_shipping_rates", (table) => {
    table.increments("id").primary();
    table.string("product_airtable_id", 32).notNullable().unique();
    table.integer("shipping_rate_id").unsigned().notNullable().references("id").inTable("shipping_rates");
    table.timestamps(true, true);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("product_shipping_rates");
};
