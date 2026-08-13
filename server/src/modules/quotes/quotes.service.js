const db = require("../../config/db");
const productsService = require("../products/products.service");
const threadColoursService = require("../threadColours/threadColours.service");
const { FONTS } = require("../../lib/fonts");
const mailer = require("../../lib/mailer");
const emailTemplates = require("../../lib/emailTemplates");
const env = require("../../config/env");

const HEX_COLOUR_RE = /^#[0-9A-Fa-f]{6}$/;

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

// Re-derives everything from real product/thread-colour data server-side —
// never trusts client-sent price, customisable flag, or the validity of a
// size/colour/font/thread-colour choice.
async function validateAndBuildQuoteInput(input) {
  const { productId, size, colour, quantity, requirements, font, fontColour, threadColourCode } = input;

  if (!productId) throw new ValidationError("productId is required.");
  const product = await productsService.getProductById(productId);
  if (!product) throw new ValidationError("Product not found.");

  if (!size || !product.sizes.includes(size)) {
    throw new ValidationError(`Invalid size for this product. Choose one of: ${product.sizes.join(", ")}`);
  }
  if (!colour || !product.colours.includes(colour)) {
    throw new ValidationError(`Invalid colour for this product. Choose one of: ${product.colours.join(", ")}`);
  }

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new ValidationError("Quantity must be a positive whole number.");
  }

  const result = {
    productAirtableId: product.id,
    productNameSnapshot: product.name,
    priceSnapshot: product.price,
    customisableSnapshot: product.customisable,
    size,
    colour,
    quantity: qty,
    requirementsText: null,
    font: null,
    fontColour: null,
    threadColourCode: null,
  };

  if (product.customisable) {
    if (!requirements || !requirements.trim()) {
      throw new ValidationError("Requirements/wording is required for this product.");
    }
    if (!font || !FONTS.includes(font)) {
      throw new ValidationError("Invalid font selection.");
    }

    // Embroidered products: the visible text colour *is* the thread
    // colour — no independent font colour. Sublimation (or an unset
    // printing method, as a safe default): no physical thread, so font
    // colour is the only one that applies. Exactly one of the two is ever
    // asked for/stored, never both — matches every display component
    // already rendering each field conditionally on it being non-null.
    if (product.printingMethod === "Embroidered") {
      if (!threadColourCode || !(await threadColoursService.isValidThreadColourCode(threadColourCode))) {
        throw new ValidationError("Invalid thread colour selection.");
      }
      result.threadColourCode = threadColourCode;
    } else {
      if (!fontColour || !HEX_COLOUR_RE.test(fontColour)) {
        throw new ValidationError("Invalid font colour.");
      }
      result.fontColour = fontColour;
    }

    result.requirementsText = requirements.trim();
    result.font = font;
  }

  return result;
}

async function createQuote(customerId, input) {
  const quoteData = await validateAndBuildQuoteInput(input);
  const now = new Date();

  const { quote, initialMessageId } = await db.transaction(async (trx) => {
    const [id] = await trx("quotes").insert({
      customer_id: customerId,
      product_airtable_id: quoteData.productAirtableId,
      product_name_snapshot: quoteData.productNameSnapshot,
      price_snapshot: quoteData.priceSnapshot,
      customisable_snapshot: quoteData.customisableSnapshot,
      size: quoteData.size,
      colour: quoteData.colour,
      quantity: quoteData.quantity,
      requirements_text: quoteData.requirementsText,
      font: quoteData.font,
      font_colour: quoteData.fontColour,
      thread_colour_code: quoteData.threadColourCode,
      status: "new",
      last_customer_message_at: now,
    });

    const initialMessageBody = quoteData.requirementsText
      ? quoteData.requirementsText
      : `Quote request for ${quoteData.productNameSnapshot} (${quoteData.size}, ${quoteData.colour}, qty ${quoteData.quantity}).`;

    const [messageId] = await trx("messages").insert({
      quote_id: id,
      sender_type: "customer",
      sender_user_id: customerId,
      direction: "inbound",
      body_text: initialMessageBody,
    });

    return { quote: await trx("quotes").where({ id }).first(), initialMessageId: messageId };
  });

  // Best-effort: the quote is already committed above, so a mail failure
  // here shouldn't fail the request — it just means no confirmation email
  // went out, which is logged for manual follow-up.
  try {
    const customer = await db("users").where({ id: customerId }).first();
    const emailMessageId = mailer.generateMessageId(quote.id);
    const confirmation = emailTemplates.quoteConfirmationEmail(quote);
    await mailer.sendMail({ to: customer.email, messageId: emailMessageId, ...confirmation });
    // This Message-ID becomes the thread anchor future replies get matched
    // against (see scripts/cron/ingest-emails.js).
    await db("messages").where({ id: initialMessageId }).update({ email_message_id: emailMessageId });

    const notification = emailTemplates.newQuoteNotification(quote, customer);
    await mailer.sendMail({ to: env.companyNotificationEmail, ...notification });
  } catch (err) {
    console.error(`Failed to send quote confirmation/notification email for quote #${quote.id}:`, err.message);
  }

  return quote;
}

async function listQuotesForCustomer(customerId) {
  return db("quotes").where({ customer_id: customerId }).orderBy("created_at", "desc");
}

async function getQuoteForCustomer(customerId, quoteId) {
  const quote = await db("quotes").where({ id: quoteId, customer_id: customerId }).first();
  if (!quote) return null;
  const messages = await db("messages").where({ quote_id: quoteId }).orderBy("created_at", "asc");
  return { quote, messages };
}

// Mirrors adminQuotes.service.js's sendCompanyReply, reversed — a customer
// typing a reply in-app is emailed to the company's monitored mailbox
// (threaded via In-Reply-To/References against the same anchor message),
// so the mailbox stays the single source of truth for the whole
// conversation regardless of which side is replying from the app vs a
// real email client. Not wrapped in a try/catch around the send: the
// entire point of this action is notifying the company, so a failed send
// should fail the request rather than silently recording an unsent reply
// (same reasoning as sendCompanyReply).
async function sendCustomerReply(customerId, quoteId, bodyText) {
  if (!bodyText || !bodyText.trim()) throw new ValidationError("Reply body is required.");

  const quote = await db("quotes").where({ id: quoteId, customer_id: customerId }).first();
  if (!quote) return null;

  const anchor = await db("messages")
    .where({ quote_id: quoteId })
    .whereNotNull("email_message_id")
    .orderBy("created_at", "desc")
    .first();

  const newMessageId = mailer.generateMessageId(quote.id);
  const { subject, text } = emailTemplates.customerReplyEmail(quote, bodyText.trim());

  await mailer.sendMail({
    to: env.companyNotificationEmail,
    subject,
    text,
    messageId: newMessageId,
    inReplyTo: anchor?.email_message_id,
    references: anchor?.email_message_id,
  });

  const now = new Date();
  const [messageRowId] = await db("messages").insert({
    quote_id: quoteId,
    sender_type: "customer",
    sender_user_id: customerId,
    direction: "outbound",
    body_text: bodyText.trim(),
    email_message_id: newMessageId,
    in_reply_to: anchor?.email_message_id || null,
  });

  await db("quotes").where({ id: quoteId }).update({
    status: "awaiting_company",
    last_customer_message_at: now,
    updated_at: now,
  });

  return db("messages").where({ id: messageRowId }).first();
}

function quoteRowToPublic(row) {
  return {
    id: row.id,
    productId: row.product_airtable_id,
    productName: row.product_name_snapshot,
    price: row.price_snapshot === null ? null : Number(row.price_snapshot),
    customisable: Boolean(row.customisable_snapshot),
    size: row.size,
    colour: row.colour,
    quantity: row.quantity,
    requirements: row.requirements_text,
    font: row.font,
    fontColour: row.font_colour,
    threadColourCode: row.thread_colour_code,
    status: row.status,
    orderId: row.order_id || null,
    lastCustomerMessageAt: row.last_customer_message_at,
    lastCompanyMessageAt: row.last_company_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function messageRowToPublic(row) {
  return {
    id: row.id,
    senderType: row.sender_type,
    direction: row.direction,
    body: row.body_text,
    createdAt: row.created_at,
  };
}

module.exports = {
  ValidationError,
  createQuote,
  listQuotesForCustomer,
  getQuoteForCustomer,
  sendCustomerReply,
  quoteRowToPublic,
  messageRowToPublic,
};
