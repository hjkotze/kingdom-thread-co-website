// Extends the formal quote with a human-readable number (Q-2026-0001),
// an optional deposit amount (set by the admin, known before customer
// acceptance so it can gate work-order generation), and free-text notes
// (pre-filled from the default_quote_notes site setting, editable per
// quote).
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.alterTable("quote_snapshots", (table) => {
    table.string("quote_number", 20).nullable().unique();
    table.decimal("deposit_amount", 10, 2).nullable();
    table.text("notes").nullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("quote_snapshots", (table) => {
    table.dropColumn("quote_number");
    table.dropColumn("deposit_amount");
    table.dropColumn("notes");
  });
};
