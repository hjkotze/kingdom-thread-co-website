/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.alterTable("users", (table) => {
    // Same pattern as email verification — SHA-256 hash stored, raw token
    // only ever exists in the emailed link.
    table.string("password_reset_token_hash", 64).nullable();
    table.timestamp("password_reset_expires_at").nullable();
    // Cooldown tracking for repeated forgot-password requests.
    table.timestamp("password_reset_sent_at").nullable();
    table.index("password_reset_token_hash");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("users", (table) => {
    table.dropColumn("password_reset_token_hash");
    table.dropColumn("password_reset_expires_at");
    table.dropColumn("password_reset_sent_at");
  });
};
