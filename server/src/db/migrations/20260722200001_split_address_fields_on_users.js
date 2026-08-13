exports.up = async function up(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.string("address_line1", 255).nullable();
    table.string("address_complex", 255).nullable();
    table.string("address_suburb", 255).nullable();
    table.string("address_postal_code", 10).nullable();
    table.string("address_province", 50).nullable();
  });

  // Best-effort preservation of whatever free text was already entered —
  // lands in the street field, other fields stay blank for the customer
  // to fill in on next edit.
  await knex("users").whereNotNull("address").update({
    address_line1: knex.raw("address"),
  });

  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("address");
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.text("address").nullable();
  });

  await knex("users").whereNotNull("address_line1").update({
    address: knex.raw("address_line1"),
  });

  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("address_line1");
    table.dropColumn("address_complex");
    table.dropColumn("address_suburb");
    table.dropColumn("address_postal_code");
    table.dropColumn("address_province");
  });
};
