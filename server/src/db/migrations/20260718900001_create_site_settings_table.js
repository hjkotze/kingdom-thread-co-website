/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("site_settings", (table) => {
    // Generic key-value store — not turnaround-specific — so future
    // admin-editable text doesn't need another migration.
    table.string("key", 100).primary();
    table.text("value").nullable();
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("site_settings");
};
