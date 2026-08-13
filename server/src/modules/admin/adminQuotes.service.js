const db = require("../../config/db");
const mailer = require("../../lib/mailer");
const emailTemplates = require("../../lib/emailTemplates");

const STALE_THRESHOLD_DAYS = 3;

class AdminQuoteError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Flags are computed on read, not stored (§7) — "needs response" covers a
// brand-new request with no reply yet or a customer reply awaiting one;
// "stale" is the same but waiting more than 3 days. last_customer_message_at
// is populated from quote creation onward, so it works as the reference
// point for both cases without a separate "first response" timestamp.
function computeFlags(row) {
  const needsResponse = row.status === "new" || row.status === "awaiting_company";
  const referenceTime = row.last_customer_message_at;
  const daysSinceCustomerMessage = referenceTime
    ? (Date.now() - new Date(referenceTime).getTime()) / (1000 * 60 * 60 * 24)
    : null;
  const isStale = needsResponse && daysSinceCustomerMessage !== null && daysSinceCustomerMessage > STALE_THRESHOLD_DAYS;
  return { needsResponse, isStale };
}

// Queue ordering: overdue first, then everything else needing a response
// (longest-waiting first), then the rest by recency — a working queue, not
// a chronological log.
function sortForQueue(rows) {
  return [...rows].sort((a, b) => {
    const flagsA = computeFlags(a);
    const flagsB = computeFlags(b);
    const tierOf = (flags) => (flags.isStale ? 0 : flags.needsResponse ? 1 : 2);
    const tierDiff = tierOf(flagsA) - tierOf(flagsB);
    if (tierDiff !== 0) return tierDiff;

    if (flagsA.needsResponse && flagsB.needsResponse) {
      return new Date(a.last_customer_message_at) - new Date(b.last_customer_message_at);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

async function listAllQuotes() {
  const rows = await db("quotes as q")
    .join("users as u", "u.id", "q.customer_id")
    .leftJoin("products_cache as pc", "pc.airtable_id", "q.product_airtable_id")
    .leftJoin("categories_cache as cc", "cc.airtable_id", "pc.category_airtable_id")
    .select(
      "q.*",
      "u.full_name as customer_name",
      "u.email as customer_email",
      "cc.slug as category_slug",
      "cc.label as category_label"
    );

  // Latest snapshot's quote_number per quote, merged in JS rather than a
  // correlated subquery — simplest way to get a "last one wins" value per
  // group without complicating the query above.
  const snapshots = await db("quote_snapshots").select("quote_id", "quote_number").orderBy("id", "desc");
  const quoteNumberByQuoteId = new Map();
  for (const s of snapshots) {
    if (!quoteNumberByQuoteId.has(s.quote_id)) quoteNumberByQuoteId.set(s.quote_id, s.quote_number);
  }
  rows.forEach((row) => {
    row.quote_number = quoteNumberByQuoteId.get(row.id) || null;
  });

  return sortForQueue(rows);
}

async function getQuoteWithThread(quoteId) {
  const quote = await db("quotes").where({ id: quoteId }).first();
  if (!quote) return null;
  const customer = await db("users").where({ id: quote.customer_id }).first();
  const messages = await db("messages").where({ quote_id: quoteId }).orderBy("created_at", "asc");
  const attachments = await db("attachments").where({ quote_id: quoteId }).orderBy("created_at", "desc");
  return { quote, customer, messages, attachments };
}

async function getActiveQuoteId(adminUserId) {
  const admin = await db("users").where({ id: adminUserId }).first();
  return admin?.active_quote_id ?? null;
}

// "Only one active item at a time" (§7) is enforced by this single column —
// claiming a new one always supersedes whatever was previously active.
async function setActiveQuote(adminUserId, quoteId) {
  await db("users").where({ id: adminUserId }).update({ active_quote_id: quoteId });
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
  const { needsResponse, isStale } = computeFlags(row);
  return {
    id: row.id,
    quoteNumber: row.quote_number || null,
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
    orderId: row.order_id || null,
    categorySlug: row.category_slug || null,
    categoryLabel: row.category_label || null,
    needsResponse,
    isStale,
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
  getActiveQuoteId,
  setActiveQuote,
  sendCompanyReply,
  quoteRowToAdminPublic,
};
