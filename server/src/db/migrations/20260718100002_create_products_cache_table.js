/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("products_cache", (table) => {
    table.string("airtable_id", 32).primary();
    table.string("name", 255).notNullable();
    table.string("subtitle", 255).nullable();
    table.string("category_slug", 100).nullable();
    table.decimal("price", 10, 2).nullable();
    table.string("tag", 100).nullable();
    table.decimal("rating", 3, 1).nullable();
    table.integer("reviews").nullable();
    table.string("image_url", 1024).nullable();
    table.string("image_fallback_colour", 20).nullable();
    table.string("badge", 100).nullable();
    table.text("description").nullable();
    table.json("sizes").nullable();
    table.json("colours").nullable();
    // Internal-only — controls whether the requirements/build page (§3) is
    // shown, never rendered to the customer as a visible label.
    table.boolean("customisable").notNullable().defaultTo(false);
    table.boolean("active").notNullable().defaultTo(true);
    table.timestamp("synced_at").notNullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("products_cache");
};
