// Same reasoning as 20260819100001_seed_vat_rate_and_policy_content.js:
// `shipping_rates` starts empty on a fresh production database, and
// pricing would silently be wrong (no shipping cost applied) until an
// admin adds rates manually. Seeds the real, currently-live dev rates
// (copied as of 2026-08-19) so a new deploy has correct shipping pricing
// from day one — still editable afterward from
// /admin/configuration/settings exactly as before.
const CURRENT_SHIPPING_RATES = [
  { code: "Extra freight", description: "Special shipping on request", cost: "300.00", is_default: true },
  { code: "FREIGHT", description: "Parcel weighing less than 2KG", cost: "150.00", is_default: false },
];

exports.up = async function up(knex) {
  // Only seed if genuinely empty — running this against dev's existing
  // database (which already has these same real rates) must stay a no-op
  // rather than inserting duplicates.
  const { count } = await knex("shipping_rates").count("* as count").first();
  if (Number(count) === 0) {
    await knex("shipping_rates").insert(CURRENT_SHIPPING_RATES);
  }
};

exports.down = async function down(knex) {
  await knex("shipping_rates")
    .whereIn(
      "code",
      CURRENT_SHIPPING_RATES.map((r) => r.code),
    )
    .del();
};
