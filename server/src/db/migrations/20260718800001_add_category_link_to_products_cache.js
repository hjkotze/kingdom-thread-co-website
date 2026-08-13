/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.alterTable("products_cache", (table) => {
    // Resolved from the real Products<->Categories link field (§ admin
    // catalogue management) — category_slug stays as a denormalized
    // convenience copy of the linked category's slug, refreshed on every
    // write-through sync.
    table.string("category_airtable_id", 32).nullable();
    table.index("category_airtable_id");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("products_cache", (table) => {
    table.dropColumn("category_airtable_id");
  });
};
