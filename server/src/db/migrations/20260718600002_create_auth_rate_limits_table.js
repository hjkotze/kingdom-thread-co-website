// DB-backed rather than in-memory (e.g. express-rate-limit's default
// store) — an in-memory counter can't be relied on across requests on an
// on-demand host with no guaranteed persistent process, same reasoning as
// the DB-backed session store.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("auth_rate_limits", (table) => {
    table.increments("id").primary();
    table.string("ip_address", 64).notNullable();
    table.string("action", 50).notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.index(["ip_address", "action", "created_at"]);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("auth_rate_limits");
};
