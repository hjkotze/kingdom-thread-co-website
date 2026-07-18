/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("thread_colours_cache", (table) => {
    table.string("airtable_id", 32).primary();
    table.string("code", 20).notNullable();
    table.string("name", 100).notNullable();
    table.string("pantone", 50).nullable();
    table.string("hex", 20).nullable();
    table.timestamp("synced_at").notNullable();
    table.index("code");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("thread_colours_cache");
};
