// Physical address is optional to capture but required before a quote can
// be accepted (enforced in orders.service.js#createOrderFromQuotes, not
// at the DB level, matching how nothing else in this app uses DB-level
// CHECK constraints). Landline is stored as two parts (3-digit area code,
// 7-digit number) rather than one 10-digit string, so re-editing doesn't
// require re-splitting a combined value. `phone` is renamed to
// `cell_phone` now that a second (landline) number exists alongside it.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.alterTable("users", (table) => {
    table.renameColumn("phone", "cell_phone");
    table.text("address").nullable();
    table.string("landline_area_code", 3).nullable();
    table.string("landline_number", 7).nullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("users", (table) => {
    table.dropColumn("address");
    table.dropColumn("landline_area_code");
    table.dropColumn("landline_number");
    table.renameColumn("cell_phone", "phone");
  });
};
