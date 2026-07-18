// The formal "quote for acceptance" (§5) — a locked snapshot of only the
// agreed-upon details, deliberately separate from the free-form messages
// thread. Fields are duplicated from quotes rather than joined, so each
// snapshot row is fully self-contained and independently readable even if
// it was renegotiated after the original request (append-only: a later
// snapshot supersedes an earlier one for display, but nothing is deleted).
/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("quote_snapshots", (table) => {
    table.increments("id").primary();
    table.integer("quote_id").unsigned().notNullable().references("id").inTable("quotes");

    table.string("product_name", 255).notNullable();
    table.string("size", 100).notNullable();
    table.string("colour", 100).notNullable();
    table.integer("quantity").unsigned().notNullable();
    table.decimal("price", 10, 2).nullable();

    // Only populated when the underlying product is customisable —
    // mirrors quotes.requirements_text/font/font_colour/thread_colour_code.
    table.text("requirements_text").nullable();
    table.string("font", 100).nullable();
    table.string("font_colour", 20).nullable();
    table.string("thread_colour_code", 20).nullable();

    table.integer("created_by_admin_id").unsigned().notNullable().references("id").inTable("users");
    table.timestamp("accepted_at").nullable();
    table.boolean("accepted_by_customer").notNullable().defaultTo(false);

    table.timestamps(true, true);
    table.index("quote_id");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("quote_snapshots");
};
