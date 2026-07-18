// Schema matches what connect-session-knex expects when createtable: false
// is passed and the table is managed by our own migrations instead.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("sessions", (table) => {
    table.string("sid").primary();
    table.json("sess").notNullable();
    table.dateTime("expired").notNullable().index();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("sessions");
};
