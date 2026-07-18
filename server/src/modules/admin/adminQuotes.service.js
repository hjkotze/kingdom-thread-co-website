const db = require("../../config/db");
const mailer = require("../../lib/mailer");
const emailTemplates = require("../../lib/emailTemplates");

class AdminQuoteError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function listAllQuotes() {
  return db("quotes as q")
    .join("users as u", "u.id", "q.customer_id")
    .select("q.*", "u.full_name as customer_name", "u.email as customer_email")
    .orderBy("q.created_at", "desc");
}

async function getQuoteWithThread(quoteId) {
  const quote = await db("quotes").where({ id: quoteId }).first();
  if (!quote) return null;
  const customer = await db("users").where({ id: quote.customer_id }).first();
  const messages = await db("messages").where({ quote_id: quoteId }).orderBy("created_at", "asc");
  const attachments = await db("attachments").where({ quote_id: quoteId }).orderBy("created_at", "desc");
  return { quote, customer, messages, attachments };
}

// Sends the reply by email, threaded against the most recent message that
// has a Message-ID (normally always present — set on the initial
// confirmation email and on every subsequent inbound/outbound message).
async function sendCompanyReply(adminUserId, quoteId, bodyText) {
  const quote = await db("quotes").where({ id: quoteId }).first();
  if (!quote) throw new AdminQuoteError("Quote not found", 404);
  if (!bodyText || !bodyText.trim()) throw new AdminQuoteError("Reply body is required.", 400);

  const customer = await db("users").where({ id: quote.customer_id }).first();
  const anchor = await db("messages")
    .where({ quote_id: quoteId })
    .whereNotNull("email_message_id")
    .orderBy("created_at", "desc")
    .first();

  const newMessageId = mailer.generateMessageId(quote.id);
  const { subject, text } = emailTemplates.companyReplyEmail(quote, bodyText.trim());

  await mailer.sendMail({
    to: customer.email,
    subject,
    text,
    messageId: newMessageId,
    inReplyTo: anchor?.email_message_id,
    references: anchor?.email_message_id,
  });

  const now = new Date();
  const [messageRowId] = await db("messages").insert({
    quote_id: quoteId,
    sender_type: "company",
    sender_user_id: adminUserId,
    direction: "outbound",
    body_text: bodyText.trim(),
    email_message_id: newMessageId,
    in_reply_to: anchor?.email_message_id || null,
  });

  await db("quotes").where({ id: quoteId }).update({
    status: "awaiting_customer",
    last_company_message_at: now,
    updated_at: now,
  });

  return db("messages").where({ id: messageRowId }).first();
}

function quoteRowToAdminPublic(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
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
    lastCustomerMessageAt: row.last_customer_message_at,
    lastCompanyMessageAt: row.last_company_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  AdminQuoteError,
  listAllQuotes,
  getQuoteWithThread,
  sendCompanyReply,
  quoteRowToAdminPublic,
};
