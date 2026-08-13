// Work orders move from one-per-invoice to one-per-line-item within an
// order — a combined order's job sheet is one PDF page per plan, but each
// product gets its own separated section and its own suffixed number
// (e.g. WO-2026-0001-1, -2, -3), sharing one base number generated once
// per order. invoice_id is kept (existing routes are keyed by it) but is
// no longer unique, since several work_orders can now share one invoice.
/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  // MySQL won't drop a unique index while a foreign key still depends on
  // it — drop the FK first, then the unique index, then re-add the FK as
  // a plain (non-unique) constraint with its own index. Each drop is
  // wrapped so this is safe to re-run after a partial failure (MySQL DDL
  // isn't transactional, so a failed migration can leave some steps done).
  const tryStep = async (fn) => {
    try {
      await fn();
    } catch (err) {
      if (!/check that column\/key exists|Can't DROP/i.test(err.message)) throw err;
    }
  };

  await tryStep(() => knex.schema.alterTable("work_orders", (table) => table.dropForeign(["invoice_id"])));
  await tryStep(() => knex.schema.alterTable("work_orders", (table) => table.dropUnique(["invoice_id"])));

  const hasOrderId = await knex.schema.hasColumn("work_orders", "order_id");
  if (!hasOrderId) {
    await knex.schema.alterTable("work_orders", (table) => {
      table.integer("order_id").unsigned().nullable().references("id").inTable("orders");
      table.integer("sequence").unsigned().nullable();
      table.index("order_id");
    });
  }

  await tryStep(() =>
    knex.schema.alterTable("work_orders", (table) => {
      table.foreign("invoice_id").references("id").inTable("invoices");
      table.index("invoice_id");
    }),
  );
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("work_orders", (table) => {
    table.dropForeign(["order_id"]);
    table.dropColumn("order_id");
    table.dropColumn("sequence");
    table.dropForeign(["invoice_id"]);
  });
  await knex.schema.alterTable("work_orders", (table) => {
    table.unique(["invoice_id"]);
    table.foreign("invoice_id").references("id").inTable("invoices");
  });
};
