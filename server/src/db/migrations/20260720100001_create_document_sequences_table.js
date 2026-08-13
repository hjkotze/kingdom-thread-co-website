// Backs the human-readable Q-/INV-/WO- numbering scheme (yearly-reset,
// e.g. INV-2026-0001) — one row per doc_type+year, incremented inside a
// transaction (see src/lib/documentNumbering.js) so concurrent requests
// can never hand out the same number twice.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("document_sequences", (table) => {
    table.increments("id").primary();
    table.enu("doc_type", ["quote", "invoice", "work_order"]).notNullable();
    table.integer("year").unsigned().notNullable();
    table.integer("next_number").unsigned().notNullable().defaultTo(1);
    table.unique(["doc_type", "year"]);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("document_sequences");
};
