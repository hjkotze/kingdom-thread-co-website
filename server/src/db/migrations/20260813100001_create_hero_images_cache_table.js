/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("hero_images_cache", (table) => {
    table.string("airtable_id", 32).primary();
    table.string("image_url", 1024).nullable();
    table.string("alt", 255).nullable();
    table.integer("sort_order").notNullable().defaultTo(0);
    table.timestamp("synced_at").notNullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("hero_images_cache");
};
