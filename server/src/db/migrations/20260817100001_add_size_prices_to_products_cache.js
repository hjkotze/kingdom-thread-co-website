/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.alterTable("products_cache", (table) => {
    table.json("size_prices").nullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("products_cache", (table) => {
    table.dropColumn("size_prices");
  });
};
