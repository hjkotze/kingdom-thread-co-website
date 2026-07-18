/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("quotes", (table) => {
    table.increments("id").primary();
    table.integer("customer_id").unsigned().notNullable().references("id").inTable("users");

    // Snapshotted at request time — Airtable product data can change later,
    // this is what the customer actually saw when they asked.
    table.string("product_airtable_id", 32).notNullable();
    table.string("product_name_snapshot", 255).notNullable();
    table.decimal("price_snapshot", 10, 2).nullable();
    table.boolean("customisable_snapshot").notNullable();

    table.string("size", 100).notNullable();
    table.string("colour", 100).notNullable();
    table.integer("quantity").unsigned().notNullable().defaultTo(1);

    // Only populated when customisable_snapshot is true (§3).
    table.text("requirements_text").nullable();
    table.string("font", 100).nullable();
    table.string("font_colour", 20).nullable();
    table.string("thread_colour_code", 20).nullable();

    table
      .enu("status", ["new", "awaiting_customer", "awaiting_company", "finalised", "accepted", "cancelled"])
      .notNullable()
      .defaultTo("new");

    // Denormalized for the admin queue's unanswered/stale-reply
    // highlighting (§7) — computed on read from these rather than a
    // separate admin_flags table.
    table.timestamp("last_customer_message_at").nullable();
    table.timestamp("last_company_message_at").nullable();

    table.timestamps(true, true);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("quotes");
};
