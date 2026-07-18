/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("email", 255).notNullable().unique();
    table.string("password_hash", 255).notNullable();
    table.enu("role", ["customer", "admin"]).notNullable().defaultTo("customer");
    table.string("full_name", 255).notNullable();
    table.string("phone", 50).nullable();
    // Admin-only: the one quote this admin currently has as their "active" item (§7).
    // FK added in a later migration once the quotes table exists.
    table.integer("active_quote_id").unsigned().nullable();
    table.timestamps(true, true);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("users");
};
