// Unset until the customer accepts (with or without combining) — see
// orders.service.js#createOrderFromQuotes, which assigns the same
// order_id to every quote being accepted together.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.alterTable("quotes", (table) => {
    table.integer("order_id").unsigned().nullable().references("id").inTable("orders");
    table.index("order_id");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("quotes", (table) => {
    table.dropColumn("order_id");
  });
};
