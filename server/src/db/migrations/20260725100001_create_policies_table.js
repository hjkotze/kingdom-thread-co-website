exports.up = async function up(knex) {
  await knex.schema.createTable("policies", (table) => {
    table.increments("id").unsigned().primary();
    table.enu("type", ["privacy", "cookies"]).notNullable().unique();
    // longtext (not text, which caps at 64KB in MySQL) — these are
    // full legal documents, effectively unbounded in practice.
    table.specificType("content", "longtext").nullable();
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });

  // Seed both rows up front so admin always has something to fetch/edit —
  // no "row doesn't exist yet" branch needed anywhere in the app.
  await knex("policies").insert([
    { type: "privacy", content: null },
    { type: "cookies", content: null },
  ]);
};

exports.down = function down(knex) {
  return knex.schema.dropTable("policies");
};
