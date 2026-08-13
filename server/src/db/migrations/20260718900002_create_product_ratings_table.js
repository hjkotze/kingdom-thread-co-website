/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("product_ratings", (table) => {
    table.increments("id").primary();
    table.string("product_airtable_id", 32).notNullable();
    table.integer("customer_id").unsigned().notNullable().references("id").inTable("users");
    table.tinyint("rating").notNullable();
    table.timestamps(true, true);

    // One rating per customer per product — rating again updates this row
    // (upsert) rather than creating a duplicate.
    table.unique(["product_airtable_id", "customer_id"]);
    table.index("product_airtable_id");
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("product_ratings");
};
