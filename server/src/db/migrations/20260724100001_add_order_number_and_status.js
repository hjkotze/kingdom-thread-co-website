const documentNumbering = require("../../lib/documentNumbering");

exports.up = async function up(knex) {
  // document_sequences.doc_type is a fixed MySQL ENUM — must widen it
  // before documentNumbering.getNextNumber(trx, "order") can insert a
  // counter row for the new doc type.
  await knex.raw("ALTER TABLE document_sequences MODIFY doc_type ENUM('quote','invoice','work_order','order') NOT NULL");

  await knex.schema.alterTable("orders", (table) => {
    table.string("order_number", 20).nullable();
    table
      .enu("status", ["not_started", "started", "in_progress", "complete", "packaged", "collected_by_courier", "completed"])
      .notNullable()
      .defaultTo("not_started");
  });

  await knex.schema.alterTable("users", (table) => {
    table.boolean("notify_order_status_changes").notNullable().defaultTo(true);
  });

  // Backfill existing orders with a real ORD-2026-NNNN number, oldest
  // first, through the same sequence every future order uses — so the
  // numbering stays contiguous rather than leaving pre-existing rows
  // permanently numberless.
  const existingOrders = await knex("orders").orderBy("id", "asc");
  for (const order of existingOrders) {
    const orderNumber = await knex.transaction((trx) => documentNumbering.getNextNumber(trx, "order"));
    await knex("orders").where({ id: order.id }).update({ order_number: orderNumber });
  }
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("notify_order_status_changes");
  });

  await knex.schema.alterTable("orders", (table) => {
    table.dropColumn("order_number");
    table.dropColumn("status");
  });

  await knex("document_sequences").where({ doc_type: "order" }).del();
  await knex.raw("ALTER TABLE document_sequences MODIFY doc_type ENUM('quote','invoice','work_order') NOT NULL");
};
