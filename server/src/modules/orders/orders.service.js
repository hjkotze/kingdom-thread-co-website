const db = require("../../config/db");
const vatRates = require("../../lib/vatRates");
const documentNumbering = require("../../lib/documentNumbering");
const mailer = require("../../lib/mailer");
const emailTemplates = require("../../lib/emailTemplates");
const env = require("../../config/env");
const shippingRatesService = require("../shippingRates/shippingRates.service");
const invoiceSettingsService = require("../settings/invoiceSettings.service");
const { isCompleteAddress } = require("../../lib/address");
const { isValidStatus, customerLabelFor, SHIPPED_STATUSES } = require("../../lib/orderStatus");

class OrderError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function getLatestSnapshot(quoteId) {
  return db("quote_snapshots").where({ quote_id: quoteId }).orderBy("created_at", "desc").first();
}

// A quote is combinable/acceptable once it has a formal quote ("finalised")
// that admin has actually sent, and isn't already attached to an order —
// a customer can't accept a draft they were never emailed.
async function getEligibleQuoteForAccept(customerId, quoteId) {
  const quote = await db("quotes").where({ id: quoteId, customer_id: customerId }).first();
  if (!quote) throw new OrderError(`Quote #${quoteId} not found.`, 404);
  if (quote.order_id) throw new OrderError(`Quote #${quoteId} is already part of an order.`, 400);
  if (quote.status === "accepted") throw new OrderError(`Quote #${quoteId} has already been accepted.`, 400);
  const snapshot = await getLatestSnapshot(quoteId);
  if (!snapshot || !snapshot.sent_at) throw new OrderError(`Quote #${quoteId} has no formal quote to accept yet.`, 400);
  return { quote, snapshot };
}

// The customer's finalised-but-unaccepted requests — what Account.jsx
// offers to combine.
async function getEligibleQuotesForCustomer(customerId) {
  const quotes = await db("quotes").where({ customer_id: customerId, status: "finalised" }).whereNull("order_id");
  const withSnapshots = await Promise.all(
    quotes.map(async (quote) => ({ quote, snapshot: await getLatestSnapshot(quote.id) })),
  );
  return withSnapshots.filter((q) => q.snapshot && q.snapshot.sent_at);
}

function snapshotToLine(quote, snapshot) {
  const quantity = snapshot.quantity;
  const amount = snapshot.price !== null ? Number(snapshot.price) : 0;
  const unitPrice = snapshot.unit_price !== null ? Number(snapshot.unit_price) : quantity ? amount / quantity : 0;
  return {
    quoteId: quote.id,
    productAirtableId: quote.product_airtable_id,
    productName: snapshot.product_name,
    size: snapshot.size,
    colour: snapshot.colour,
    quantity,
    unitPrice,
    amount,
    requirements: snapshot.requirements_text,
    font: snapshot.font,
    fontColour: snapshot.font_colour,
    threadColourCode: snapshot.thread_colour_code,
  };
}

// Line items are never stored separately — they're derived by joining the
// order's quotes against each one's latest (now-accepted) snapshot. This
// is the single source of truth used by both the invoice/PDF rendering
// and the on-screen line-items table.
async function getOrderLines(orderId) {
  const quotes = await db("quotes").where({ order_id: orderId });
  const lines = await Promise.all(
    quotes.map(async (quote) => snapshotToLine(quote, await getLatestSnapshot(quote.id))),
  );
  return lines;
}

// The single entry point for accepting a quote — whether it's one quote
// accepted alone or several combined. Both the customer's plain "Accept
// this quote" button and the new combine flow call this with an array of
// one or many IDs, so there's exactly one implementation of what
// "accepted" means.
async function createOrderFromQuotes(customerId, quoteIds) {
  if (!Array.isArray(quoteIds) || quoteIds.length === 0) {
    throw new OrderError("No quotes selected.", 400);
  }

  // Address is optional to capture at registration/anytime, but required
  // from this point on — we're about to commit to shipping something.
  const customer = await db("users").where({ id: customerId }).first();
  if (!isCompleteAddress(customer)) {
    throw new OrderError("Please add a delivery address to your profile before accepting a quote.", 400);
  }

  const pairs = await Promise.all(quoteIds.map((id) => getEligibleQuoteForAccept(customerId, id)));
  const productAirtableIds = pairs.map(({ quote }) => quote.product_airtable_id);

  const [vatRate, shipping, invoiceSettings] = await Promise.all([
    vatRates.getCurrentRate(),
    shippingRatesService.resolveOrderShipping(productAirtableIds),
    invoiceSettingsService.getInvoiceSettings(),
  ]);

  const now = new Date();
  const combined = pairs.length > 1;

  return db.transaction(async (trx) => {
    const orderNumber = await documentNumbering.getNextNumber(trx, "order");
    const [orderId] = await trx("orders").insert({
      customer_id: customerId,
      order_number: orderNumber,
      shipping_rate_id: shipping.shippingRateId,
      shipping_amount: shipping.shippingAmount,
      vat_rate_percent: vatRate.rate_percent,
    });

    for (const { quote, snapshot } of pairs) {
      await trx("quotes").where({ id: quote.id }).update({ order_id: orderId, status: "accepted", updated_at: now });
      await trx("quote_snapshots").where({ id: snapshot.id }).update({ accepted_at: now, accepted_by_customer: true });
      await trx("messages").insert({
        quote_id: quote.id,
        sender_type: "system",
        direction: "outbound",
        body_text: combined
          ? "The customer accepted this request as part of a combined order."
          : "The customer accepted the formal quote.",
      });
    }

    const invoiceNumber = await documentNumbering.getNextNumber(trx, "invoice");
    const [invoiceId] = await trx("invoices").insert({
      order_id: orderId,
      invoice_number: invoiceNumber,
      notes: invoiceSettings.defaultInvoiceNotes || null,
      banking_details_snapshot: invoiceSettings.bankingDetails || null,
    });

    return {
      order: await trx("orders").where({ id: orderId }).first(),
      invoice: await trx("invoices").where({ id: invoiceId }).first(),
    };
  }).then(async (result) => {
    // Best-effort — the order/invoice are already committed regardless of
    // whether these emails go out.
    try {
      const customer = await db("users").where({ id: customerId }).first();
      const lines = await getOrderLines(result.order.id);
      const notification = emailTemplates.orderAcceptedNotification(result.order, lines, customer);
      await mailer.sendMail({ to: env.companyNotificationEmail, ...notification });
    } catch (err) {
      console.error(`Failed to send order-accepted notification for order #${result.order.id}:`, err.message);
    }
    try {
      // Sends immediately rather than waiting on a manual admin "Send
      // invoice" click — the customer expects payment details the moment
      // they accept, not whenever admin next checks the dashboard. Still
      // safe to re-send later (e.g. after admin adjusts shipping/notes)
      // via the same "Resend invoice" button.
      //
      // Required lazily (not at module top-level): invoices.service.js
      // already requires this module, and a top-level require here would
      // create a circular require where whichever module finishes loading
      // second silently captures a stale, pre-`module.exports =`
      // reference to the other.
      const invoicesService = require("../invoices/invoices.service");
      await invoicesService.sendInvoiceEmail(result.invoice.id);
    } catch (err) {
      console.error(`Failed to send invoice email for order #${result.order.id}:`, err.message);
    }
    return result;
  });
}

async function listOrdersForCustomer(customerId) {
  return db("orders").where({ customer_id: customerId }).orderBy("created_at", "desc");
}

// Admin-only status transition (see adminOrders — the dropdown that calls
// this is never shown to customers). Logs a system message on every quote
// in the order regardless of the customer's notification preference — the
// in-app communication thread (and its reply box, already on
// QuoteDetail.jsx) is the always-visible record; email is just a
// best-effort nudge on top of it, so a failed/opted-out send never leaves
// the change invisible to the customer.
async function updateOrderStatus(orderId, status) {
  if (!isValidStatus(status)) throw new OrderError("Invalid order status.", 400);

  const order = await db("orders").where({ id: orderId }).first();
  if (!order) throw new OrderError("Order not found.", 404);

  await db("orders").where({ id: orderId }).update({ status, updated_at: new Date() });

  const quotes = await db("quotes").where({ order_id: orderId });
  const label = customerLabelFor(status);
  for (const quote of quotes) {
    await db("messages").insert({
      quote_id: quote.id,
      sender_type: "system",
      direction: "outbound",
      body_text: `Order status updated to "${label}".`,
    });
  }

  const updatedOrder = await db("orders").where({ id: orderId }).first();

  try {
    const customer = await db("users").where({ id: order.customer_id }).first();
    if (customer.notify_order_status_changes) {
      const quoteUrl = quotes[0] ? `${env.frontendUrl}/account/quotes/${quotes[0].id}` : null;
      const notification = emailTemplates.orderStatusChangedEmail(updatedOrder, label, customer, quoteUrl);
      await mailer.sendMail({ to: customer.email, ...notification });
    }
  } catch (err) {
    console.error(`Failed to send status-change email for order #${orderId}:`, err.message);
  }

  return updatedOrder;
}

// The three "at a glance" counts behind the header's shopping-bag badges.
async function getOrderSummaryCountsForCustomer(customerId) {
  const [awaitingReplyCount, eligibleQuotes, unshippedOrders] = await Promise.all([
    db("quotes").where({ customer_id: customerId }).whereIn("status", ["awaiting_customer", "finalised"]).count({ count: "*" }).first(),
    // Reuses the same eligibility rule Account.jsx's combine flow relies
    // on (a finalised status alone isn't enough — the snapshot must have
    // actually been sent) rather than a looser raw count that could drift
    // out of sync with what's really offerable.
    getEligibleQuotesForCustomer(customerId),
    db("orders").where({ customer_id: customerId }).whereNotIn("status", SHIPPED_STATUSES).count({ count: "*" }).first(),
  ]);

  return {
    awaitingReplyCount: Number(awaitingReplyCount.count),
    eligibleForOrderCount: eligibleQuotes.length,
    unshippedOrdersCount: Number(unshippedOrders.count),
  };
}

function orderRowToPublic(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    customerId: row.customer_id,
    shippingAmount: Number(row.shipping_amount),
    vatRatePercent: Number(row.vat_rate_percent),
    notes: row.notes,
    createdAt: row.created_at,
  };
}

module.exports = {
  OrderError,
  getEligibleQuotesForCustomer,
  getEligibleQuoteForAccept,
  getOrderLines,
  createOrderFromQuotes,
  listOrdersForCustomer,
  updateOrderStatus,
  getOrderSummaryCountsForCustomer,
  orderRowToPublic,
};
