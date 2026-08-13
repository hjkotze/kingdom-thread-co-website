// Effective-dated VAT history — admin sets a new rate with a valid_from
// date; the previously-open rate is auto-closed (valid_to = new.valid_from
// - 1 day) unless the admin also gives the new rate its own valid_to
// (a scheduled/temporary rate). "Current" = valid_from <= today AND
// (valid_to IS NULL OR valid_to >= today). See src/lib/vatRates.js.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("vat_rates", (table) => {
    table.increments("id").primary();
    table.decimal("rate_percent", 5, 2).notNullable();
    table.date("valid_from").notNullable();
    table.date("valid_to").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("vat_rates");
};
