/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.alterTable("products_cache", (table) => {
    table.string("printing_method", 20).nullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("products_cache", (table) => {
    table.dropColumn("printing_method");
  });
};
