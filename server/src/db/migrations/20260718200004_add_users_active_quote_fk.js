// users.active_quote_id was added (unconstrained) in the initial users
// migration, before the quotes table existed. Add the FK now that it does.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.alterTable("users", (table) => {
    table.foreign("active_quote_id").references("id").inTable("quotes").onDelete("SET NULL");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("users", (table) => {
    table.dropForeign("active_quote_id");
  });
};
