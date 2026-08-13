// Invoices move from quote-scoped to order-scoped — one invoice per order
// (whether the order has one line or many). total/subtotal/VAT amount are
// no longer stored: they're computed on read from the order's lines
// (orders -> quotes.order_id -> each quote's latest quote_snapshot) plus
// the order's snapshotted shipping_amount/vat_rate_percent, matching the
// existing "compute payment status on read" approach already used for
// amountPaid/outstanding. sent_at replaces the old auto-send-on-accept
// behaviour with an explicit not-yet-sent state.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.alterTable("invoices", (table) => {
    table.dropForeign(["quote_id"]);
    table.dropForeign(["quote_snapshot_id"]);
    table.dropColumn("quote_id");
    table.dropColumn("quote_snapshot_id");
    table.dropColumn("total");
    table.dropColumn("deposit_amount");
    table.integer("order_id").unsigned().nullable().unique().references("id").inTable("orders");
    table.timestamp("sent_at").nullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("invoices", (table) => {
    table.dropForeign(["order_id"]);
    table.dropColumn("order_id");
    table.dropColumn("sent_at");
    table.integer("quote_id").unsigned().nullable();
    table.integer("quote_snapshot_id").unsigned().nullable();
    table.decimal("total", 10, 2).nullable();
    table.decimal("deposit_amount", 10, 2).nullable();
  });
};
