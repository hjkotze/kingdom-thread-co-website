// Deposits removed entirely (confirmed decision: full amount due on
// acceptance, no partial deposit) — drop deposit_amount. Add unit_price:
// previously computed client-side in AdminFormalQuoteSection.jsx to drive
// the Total price field, but discarded after submit; now persisted since
// the redesigned quote/invoice documents show it as its own column.
// sent_at: quote creation no longer auto-emails — see
// quoteSnapshots.service.js — admin explicitly sends after reviewing.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.alterTable("quote_snapshots", (table) => {
    table.dropColumn("deposit_amount");
    table.decimal("unit_price", 10, 2).nullable();
    table.timestamp("sent_at").nullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("quote_snapshots", (table) => {
    table.decimal("deposit_amount", 10, 2).nullable();
    table.dropColumn("unit_price");
    table.dropColumn("sent_at");
  });
};
