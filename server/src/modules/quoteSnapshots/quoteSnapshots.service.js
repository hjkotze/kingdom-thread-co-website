const db = require("../../config/db");
const productsService = require("../products/products.service");
const threadColoursService = require("../threadColours/threadColours.service");
const { FONTS } = require("../../lib/fonts");
const mailer = require("../../lib/mailer");
const emailTemplates = require("../../lib/emailTemplates");
const documentPdf = require("../../lib/documentPdf");
const documentNumbering = require("../../lib/documentNumbering");
const vatRates = require("../../lib/vatRates");
const shippingRatesService = require("../shippingRates/shippingRates.service");
const { formatAddress } = require("../../lib/address");
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
  const { size, colour, quantity, requirements, font, fontColour, threadColourCode, price, unitPrice, notes } = input;
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
  if (
    unitPrice !== undefined &&
    unitPrice !== null &&
    unitPrice !== "" &&
    (isNaN(Number(unitPrice)) || Number(unitPrice) < 0)
  ) {
    throw new SnapshotError("Unit price must be a non-negative number.", 400);
  }

  const result = {
    productName: quote.product_name_snapshot,
    size,
    colour,
    quantity: qty,
    price: price === undefined || price === null || price === "" ? null : Number(price),
    unitPrice: unitPrice === undefined || unitPrice === null || unitPrice === "" ? null : Number(unitPrice),
    notes: notes && notes.trim() ? notes.trim() : null,
    requirementsText: null,
    font: null,
    fontColour: null,
    threadColourCode: null,
  };

  if (quote.customisable_snapshot) {
    if (!requirements || !requirements.trim()) throw new SnapshotError("Requirements/wording is required.", 400);
    if (!font || !FONTS.includes(font)) throw new SnapshotError("Invalid font selection.", 400);

    // Same printing-method branch as quotes.service.js's
    // validateAndBuildQuoteInput — exactly one of font colour/thread
    // colour, never both.
    if (product.printingMethod === "Embroidered") {
      if (!threadColourCode || !(await threadColoursService.isValidThreadColourCode(threadColourCode))) {
        throw new SnapshotError("Invalid thread colour selection.", 400);
      }
      result.threadColourCode = threadColourCode;
    } else {
      if (!fontColour || !HEX_COLOUR_RE.test(fontColour)) throw new SnapshotError("Invalid font colour.", 400);
      result.fontColour = fontColour;
    }

    result.requirementsText = requirements.trim();
    result.font = font;
  }

  return result;
}

// Creates and saves the formal quote but does NOT email it — quote/invoice
// creation no longer auto-sends (admin reviews, then explicitly sends via
// sendSnapshotEmail, mirroring how invoices work).
async function createSnapshot(adminUserId, quoteId, input) {
  const quote = await db("quotes").where({ id: quoteId }).first();
  if (!quote) throw new SnapshotError("Quote not found", 404);

  const snapshotData = await validateSnapshotInput(quote, input);
  const now = new Date();

  const snapshotId = await db.transaction(async (trx) => {
    const quoteNumber = await documentNumbering.getNextNumber(trx, "quote");

    const [id] = await trx("quote_snapshots").insert({
      quote_id: quoteId,
      product_name: snapshotData.productName,
      size: snapshotData.size,
      colour: snapshotData.colour,
      quantity: snapshotData.quantity,
      price: snapshotData.price,
      unit_price: snapshotData.unitPrice,
      requirements_text: snapshotData.requirementsText,
      font: snapshotData.font,
      font_colour: snapshotData.fontColour,
      thread_colour_code: snapshotData.threadColourCode,
      created_by_admin_id: adminUserId,
      quote_number: quoteNumber,
      notes: snapshotData.notes,
    });

    await trx("quotes").where({ id: quoteId }).update({ status: "finalised", updated_at: now });
    await trx("messages").insert({
      quote_id: quoteId,
      sender_type: "system",
      direction: "outbound",
      body_text: "A formal quote was created for this request — see the Formal Quote section for the agreed details.",
    });

    return id;
  });

  return db("quote_snapshots").where({ id: snapshotId }).first();
}

// Standalone preview — combination isn't decided yet at quote stage, so
// this resolves shipping/VAT as if this one product were the whole order
// (its own shipping override or the default, current VAT rate). If the
// customer later combines this with others, the invoice recomputes both
// for the real combined order (see invoices.service.js#computeAmounts).
async function buildQuotePdfData(quote, snapshot, customer) {
  const amount = snapshot.price === null ? 0 : Number(snapshot.price);
  const unitPrice = snapshot.unit_price === null ? (snapshot.quantity ? amount / snapshot.quantity : 0) : Number(snapshot.unit_price);

  const [vatRate, shipping] = await Promise.all([
    vatRates.getCurrentRate(),
    shippingRatesService.resolveOrderShipping([quote.product_airtable_id]),
  ]);
  const vatRatePercent = Number(vatRate.rate_percent);
  const vatAmount = Number((amount * (vatRatePercent / 100)).toFixed(2));
  const total = Number((amount + shipping.shippingAmount + vatAmount).toFixed(2));

  return {
    quoteNumber: snapshot.quote_number,
    date: snapshot.created_at,
    customerName: customer.full_name,
    customerEmail: customer.email,
    customerAddress: formatAddress(customer),
    line: {
      productName: snapshot.product_name,
      size: snapshot.size,
      colour: snapshot.colour,
      quantity: snapshot.quantity,
      requirements: snapshot.requirements_text,
      font: snapshot.font,
      fontColour: snapshot.font_colour,
      threadColourCode: snapshot.thread_colour_code,
      unitPrice,
      amount,
    },
    shippingAmount: shipping.shippingAmount,
    vatRatePercent,
    vatAmount,
    total,
    notes: snapshot.notes,
  };
}

async function getSnapshotPdfBuffer(snapshotId) {
  const snapshot = await db("quote_snapshots").where({ id: snapshotId }).first();
  if (!snapshot) throw new SnapshotError("Formal quote not found", 404);
  const quote = await db("quotes").where({ id: snapshot.quote_id }).first();
  const customer = await db("users").where({ id: quote.customer_id }).first();
  return documentPdf.renderQuotePdf(await buildQuotePdfData(quote, snapshot, customer));
}

// The one and only path that actually emails a formal quote to the
// customer — explicit, admin-triggered, so notes/pricing can be reviewed
// first. Sets sent_at; safe to call again (re-send) after edits.
async function sendSnapshotEmail(snapshotId) {
  const snapshot = await db("quote_snapshots").where({ id: snapshotId }).first();
  if (!snapshot) throw new SnapshotError("Formal quote not found", 404);
  const quote = await db("quotes").where({ id: snapshot.quote_id }).first();
  const customer = await db("users").where({ id: quote.customer_id }).first();

  const quoteUrl = `${env.frontendUrl}/account/quotes/${quote.id}`;
  const { subject, text } = emailTemplates.formalQuoteReadyEmail(quote, snapshot, quoteUrl);
  const pdfBuffer = await documentPdf.renderQuotePdf(await buildQuotePdfData(quote, snapshot, customer));
  await mailer.sendMail({
    to: customer.email,
    subject,
    text,
    attachments: [{ filename: `${snapshot.quote_number}.pdf`, content: pdfBuffer }],
  });

  await db("quote_snapshots").where({ id: snapshotId }).update({ sent_at: new Date() });
  await db("messages").insert({
    quote_id: quote.id,
    sender_type: "system",
    direction: "outbound",
    body_text: `Formal quote ${snapshot.quote_number} was emailed to the customer.`,
  });
}

async function getLatestSnapshot(quoteId) {
  return db("quote_snapshots").where({ quote_id: quoteId }).orderBy("created_at", "desc").first();
}

// Customer-facing surfaces must never expose a formal quote admin hasn't
// explicitly sent yet — quote creation no longer auto-emails, so an
// unsent snapshot is still a draft as far as the customer is concerned.
async function getLatestSentSnapshot(quoteId) {
  return db("quote_snapshots").where({ quote_id: quoteId }).whereNotNull("sent_at").orderBy("created_at", "desc").first();
}

async function getSnapshotsForQuote(quoteId) {
  return db("quote_snapshots").where({ quote_id: quoteId }).orderBy("created_at", "desc");
}

function snapshotRowToPublic(row) {
  return {
    id: row.id,
    quoteId: row.quote_id,
    quoteNumber: row.quote_number,
    productName: row.product_name,
    size: row.size,
    colour: row.colour,
    quantity: row.quantity,
    price: row.price === null ? null : Number(row.price),
    unitPrice: row.unit_price === null ? null : Number(row.unit_price),
    notes: row.notes,
    requirements: row.requirements_text,
    font: row.font,
    fontColour: row.font_colour,
    threadColourCode: row.thread_colour_code,
    acceptedAt: row.accepted_at,
    acceptedByCustomer: Boolean(row.accepted_by_customer),
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

module.exports = {
  SnapshotError,
  createSnapshot,
  getLatestSnapshot,
  getLatestSentSnapshot,
  getSnapshotsForQuote,
  getSnapshotPdfBuffer,
  sendSnapshotEmail,
  snapshotRowToPublic,
};
