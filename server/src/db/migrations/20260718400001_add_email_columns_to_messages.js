/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.alterTable("messages", (table) => {
    // The RFC 5322 Message-ID this row was sent/received with — used as
    // the thread anchor. Our own outbound Message-IDs are generated;
    // inbound ones come from the customer's mail client.
    table.string("email_message_id", 255).nullable();
    // The Message-ID this row's In-Reply-To/References header pointed at,
    // when known — kept mainly for debugging thread-matching decisions.
    table.string("in_reply_to", 255).nullable();
    table.text("body_html").nullable();
    table.index("email_message_id");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.alterTable("messages", (table) => {
    table.dropColumn("email_message_id");
    table.dropColumn("in_reply_to");
    table.dropColumn("body_html");
  });
};
