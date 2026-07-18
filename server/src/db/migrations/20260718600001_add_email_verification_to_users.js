/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.boolean("email_verified").notNullable().defaultTo(false);
    // SHA-256 hex digest of the raw token emailed to the user — the raw
    // value is never stored, same principle as password hashing.
    table.string("email_verification_token_hash", 64).nullable();
    table.timestamp("email_verification_expires_at").nullable();
    // Cooldown tracking for the resend endpoint.
    table.timestamp("email_verification_sent_at").nullable();
    table.index("email_verification_token_hash");
  });

  // Accounts that existed before this migration are grandfathered in —
  // only new self-registrations go through the verification gate.
  await knex("users").update({ email_verified: true });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("users", (table) => {
    table.dropColumn("email_verified");
    table.dropColumn("email_verification_token_hash");
    table.dropColumn("email_verification_expires_at");
    table.dropColumn("email_verification_sent_at");
  });
};
