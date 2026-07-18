/** @param {import('knex').Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("attachments", (table) => {
    table.increments("id").primary();
    table.integer("quote_id").unsigned().notNullable().references("id").inTable("quotes");
    // Nullable — set when an attachment arrives via an email reply (later
    // phase) rather than the upload UI.
    table.integer("message_id").unsigned().nullable().references("id").inTable("messages");

    table.enu("file_type", ["image", "text"]).notNullable();
    table.string("original_filename", 255).notNullable();
    // Storage filename is a generated UUID, never derived from
    // original_filename — avoids path traversal / filesystem collisions.
    table.string("storage_path", 500).notNullable();
    table.string("mime_type", 100).notNullable();
    table.integer("size_bytes").unsigned().notNullable();
    table.enu("uploaded_by", ["customer", "company"]).notNullable();

    // §6: a new upload of a given type replaces the previous one — old
    // rows are kept (§1: "kept for historical reference") but only the
    // is_current row of each type is the one actually used for production.
    table.boolean("is_current").notNullable().defaultTo(true);

    table.timestamps(true, true);
    table.index(["quote_id", "file_type", "is_current"]);
  });
};

/** @param {import('knex').Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists("attachments");
};
