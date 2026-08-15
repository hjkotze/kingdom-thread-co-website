/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("categories_cache", (table) => {
    table.json("images").nullable();
  });
  await knex.schema.alterTable("products_cache", (table) => {
    table.json("images").nullable();
  });
  // Disposable cache — repopulated on the next successful live fetch, so no
  // data migration needed, just drop the old single-image column.
  await knex.schema.alterTable("categories_cache", (table) => {
    table.dropColumn("image_url");
  });
  await knex.schema.alterTable("products_cache", (table) => {
    table.dropColumn("image_url");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("categories_cache", (table) => {
    table.string("image_url", 1024).nullable();
  });
  await knex.schema.alterTable("products_cache", (table) => {
    table.string("image_url", 1024).nullable();
  });
  await knex.schema.alterTable("categories_cache", (table) => {
    table.dropColumn("images");
  });
  await knex.schema.alterTable("products_cache", (table) => {
    table.dropColumn("images");
  });
};
