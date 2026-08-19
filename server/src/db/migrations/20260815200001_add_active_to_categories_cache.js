/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.alterTable("categories_cache", (table) => {
    table.boolean("active").notNullable().defaultTo(true);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("categories_cache", (table) => {
    table.dropColumn("active");
  });
};
