// Dedup safety net for the cron-triggered IMAP ingestion script,
// independent of whatever \Seen flag / folder-move state the mailbox ends
// up in (e.g. if the move fails partway through, this still stops the
// message being processed twice on the next cron run).
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("email_ingestion_log", (table) => {
    table.increments("id").primary();
    table.string("email_message_id", 255).notNullable();
    table.string("mailbox", 255).notNullable();
    // "ignored" = a detected bounce/autoresponder/DSN (see
    // isAutomatedMessage in ingest-emails.js) — matchable by header/subject
    // but deliberately not treated as customer content.
    table.enu("status", ["matched", "unmatched", "error", "ignored"]).notNullable();
    table.integer("quote_id").unsigned().nullable().references("id").inTable("quotes");
    table.text("error_message").nullable();
    table.timestamp("processed_at").notNullable();
    table.unique(["email_message_id", "mailbox"]);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("email_ingestion_log");
};
