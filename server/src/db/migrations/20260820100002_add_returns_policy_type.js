// Adds a third policy type — Returns & Cancellation — alongside the
// existing privacy/cookies ones (launch readiness audit: nothing anywhere
// disclosed goods/cancellation/delivery terms, which South Africa's ECT
// Act requires for online consumer sales).
//
// MODIFY COLUMN only changes the column's own type/nullability in MySQL —
// it does not touch the separately-defined UNIQUE index on this column,
// so that survives untouched here (verified: raw SQL used instead of
// knex's table.enu(...).alter() specifically so this is explicit rather
// than relying on knex to reconstruct the full column definition
// correctly).
const RETURNS_POLICY = `This Returns & Cancellation Policy explains your rights when you order from us, and what to do if something isn't right with your order.

1. Every Item Is Made to Order
Everything we sell is custom-made specifically for you once your order is accepted and paid for — your chosen size, colour, wording, and design. Because these goods are made to your specification, they fall outside the standard "cooling-off" cancellation right that applies to off-the-shelf online purchases under South Africa's Electronic Communications and Transactions Act. We're not able to accept a cancellation or return simply because you've changed your mind after production has started.

2. Cancelling Before Production Starts
Your order enters production once your payment is confirmed. If you need to cancel before that point, contact us as soon as possible and we'll do our best to accommodate it — but we can't guarantee a cancellation once your order has been accepted and confirmed.

3. Faulty, Damaged, or Incorrect Items
If your item arrives damaged, faulty, or doesn't match what you ordered, you're covered under the Consumer Protection Act regardless of the made-to-order nature of the goods. Contact us within 7 days of delivery with photos of the issue, and we'll arrange a replacement or refund at no cost to you.

4. Delivery Issues
If your order hasn't arrived within the expected timeframe, or arrives visibly damaged in transit, let us know and we'll help resolve it with our courier.

5. How to Contact Us
For any cancellation, return, or defect query, email us at:
Email: sales@kingdom-thread-co.co.za
`;

exports.up = async function up(knex) {
  await knex.raw("ALTER TABLE `policies` MODIFY COLUMN `type` ENUM('privacy','cookies','returns') NOT NULL");

  const existing = await knex("policies").where({ type: "returns" }).first();
  if (!existing) {
    await knex("policies").insert({ type: "returns", content: RETURNS_POLICY, updated_at: knex.fn.now() });
  }
};

exports.down = async function down(knex) {
  await knex("policies").where({ type: "returns" }).del();
  await knex.raw("ALTER TABLE `policies` MODIFY COLUMN `type` ENUM('privacy','cookies') NOT NULL");
};
