const db = require("../../config/db");
const productsService = require("../products/products.service");
const threadColoursService = require("../threadColours/threadColours.service");
const { FONTS } = require("../../lib/fonts");
const mailer = require("../../lib/mailer");
const emailTemplates = require("../../lib/emailTemplates");
const env = require("../../config/env");

const HEX_COLOUR_RE = /^#[0-9A-Fa-f]{6}$/;

class SnapshotError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Re-derives against the quote's original product (size/colour options,
// customisable flag) the same way quote creation does — an admin typing a
// snapshot by hand shouldn't be able to lock in a size/colour/thread-colour
// combination that was never actually valid for this product.
async function validateSnapshotInput(quote, input) {
  const { size, colour, quantity, requirements, font, fontColour, threadColourCode, price } = input;
  const product = await productsService.getProductById(quote.product_airtable_id);
  if (!product) throw new SnapshotError("The original product is no longer available.", 400);

  if (!size || !product.sizes.includes(size)) {
    throw new SnapshotError(`Invalid size. Choose one of: ${product.sizes.join(", ")}`, 400);
  }
  if (!colour || !product.colours.includes(colour)) {
    throw new SnapshotError(`Invalid colour. Choose one of: ${product.colours.join(", ")}`, 400);
  }
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new SnapshotError("Quantity must be a positive whole number.", 400);
  }
  if (price !== undefined && price !== null && price !== "" && (isNaN(Number(price)) || Number(price) < 0)) {
    throw new SnapshotError("Price must be a non-negative number.", 400);
  }

  const result = {
    productName: quote.product_name_snapshot,
    size,
    colour,
    quantity: qty,
    price: price === undefined || price === null || price === "" ? null : Number(price),
    requirementsText: null,
    font: null,
    fontColour: null,
    threadColourCode: null,
  };

  if (quote.customisable_snapshot) {
    if (!requirements || !requirements.trim()) throw new SnapshotError("Requirements/wording is required.", 400);
    if (!font || !FONTS.includes(font)) throw new SnapshotError("Invalid font selection.", 400);
    if (!fontColour || !HEX_COLOUR_RE.test(fontColour)) throw new SnapshotError("Invalid font colour.", 400);
    if (!threadColourCode || !(await threadColoursService.isValidThreadColourCode(threadColourCode))) {
      throw new SnapshotError("Invalid thread colour selection.", 400);
    }
    result.requirementsText = requirements.trim();
    result.font = font;
    result.fontColour = fontColour;
    result.threadColourCode = threadColourCode;
  }

  return result;
}

async function createSnapshot(adminUserId, quoteId, input) {
  const quote = await db("quotes").where({ id: quoteId }).first();
  if (!quote) throw new SnapshotError("Quote not found", 404);

  const snapshotData = await validateSnapshotInput(quote, input);
  const now = new Date();

  const [snapshotId] = await db("quote_snapshots").insert({
    quote_id: quoteId,
    product_name: snapshotData.productName,
    size: snapshotData.size,
    colour: snapshotData.colour,
    quantity: snapshotData.quantity,
    price: snapshotData.price,
    requirements_text: snapshotData.requirementsText,
    font: snapshotData.font,
    font_colour: snapshotData.fontColour,
    thread_colour_code: snapshotData.threadColourCode,
    created_by_admin_id: adminUserId,
  });

  await db("quotes").where({ id: quoteId }).update({ status: "finalised", updated_at: now });
  await db("messages").insert({
    quote_id: quoteId,
    sender_type: "system",
    direction: "outbound",
    body_text: "A formal quote was created for this request — see the Formal Quote section for the agreed details.",
  });

  const snapshot = await db("quote_snapshots").where({ id: snapshotId }).first();

  // Best-effort — the snapshot is already committed and visible in-app
  // regardless of whether this notification email goes out.
  try {
    const customer = await db("users").where({ id: quote.customer_id }).first();
    const { subject, text } = emailTemplates.formalQuoteReadyEmail(quote, snapshot);
    await mailer.sendMail({ to: customer.email, subject, text });
  } catch (err) {
    console.error(`Failed to send formal-quote-ready email for quote #${quoteId}:`, err.message);
  }

  return snapshot;
}

async function getLatestSnapshot(quoteId) {
  return db("quote_snapshots").where({ quote_id: quoteId }).orderBy("created_at", "desc").first();
}

async function getSnapshotsForQuote(quoteId) {
  return db("quote_snapshots").where({ quote_id: quoteId }).orderBy("created_at", "desc");
}

async function acceptSnapshot(customerId, quoteId) {
  const quote = await db("quotes").where({ id: quoteId, customer_id: customerId }).first();
  if (!quote) throw new SnapshotError("Quote not found", 404);
  if (quote.status === "accepted") throw new SnapshotError("This quote has already been accepted.", 400);

  const snapshot = await getLatestSnapshot(quoteId);
  if (!snapshot) throw new SnapshotError("There's no formal quote to accept yet.", 400);

  const now = new Date();
  await db("quote_snapshots").where({ id: snapshot.id }).update({ accepted_at: now, accepted_by_customer: true });
  await db("quotes").where({ id: quoteId }).update({ status: "accepted", updated_at: now });
  await db("messages").insert({
    quote_id: quoteId,
    sender_type: "system",
    direction: "outbound",
    body_text: "The customer accepted the formal quote.",
  });

  try {
    const notification = emailTemplates.customerAcceptedNotification(quote);
    await mailer.sendMail({ to: env.companyNotificationEmail, ...notification });
  } catch (err) {
    console.error(`Failed to send acceptance notification for quote #${quoteId}:`, err.message);
  }

  return db("quote_snapshots").where({ id: snapshot.id }).first();
}

function snapshotRowToPublic(row) {
  return {
    id: row.id,
    quoteId: row.quote_id,
    productName: row.product_name,
    size: row.size,
    colour: row.colour,
    quantity: row.quantity,
    price: row.price === null ? null : Number(row.price),
    requirements: row.requirements_text,
    font: row.font,
    fontColour: row.font_colour,
    threadColourCode: row.thread_colour_code,
    acceptedAt: row.accepted_at,
    acceptedByCustomer: Boolean(row.accepted_by_customer),
    createdAt: row.created_at,
  };
}

module.exports = {
  SnapshotError,
  createSnapshot,
  getLatestSnapshot,
  getSnapshotsForQuote,
  acceptSnapshot,
  snapshotRowToPublic,
};
