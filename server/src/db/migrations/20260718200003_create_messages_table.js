// Core fields only — email-specific columns (email_message_id, in_reply_to,
// body_html) are added by a migration in the email-threading phase.
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("messages", (table) => {
    table.increments("id").primary();
    table.integer("quote_id").unsigned().notNullable().references("id").inTable("quotes");
    table.enu("sender_type", ["customer", "company", "system"]).notNullable();
    table.integer("sender_user_id").unsigned().nullable().references("id").inTable("users");
    table.enu("direction", ["inbound", "outbound"]).notNullable();
    table.text("body_text").notNullable();
    table.timestamps(true, true);
    table.index("quote_id");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("messages");
};
