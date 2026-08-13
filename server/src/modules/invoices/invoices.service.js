const db = require("../../config/db");
const mailer = require("../../lib/mailer");
const emailTemplates = require("../../lib/emailTemplates");
const documentPdf = require("../../lib/documentPdf");
const documentNumbering = require("../../lib/documentNumbering");
const ordersService = require("../orders/orders.service");
const env = require("../../config/env");
const { formatAddress } = require("../../lib/address");

class InvoiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function getInvoiceByOrderId(orderId) {
  return db("invoices").where({ order_id: orderId }).first();
}

async function getInvoiceById(id) {
  return db("invoices").where({ id }).first();
}

async function getPaymentsForInvoice(invoiceId) {
  return db("invoice_payments").where({ invoice_id: invoiceId }).orderBy("paid_at", "asc");
}

async function getWorkOrdersForInvoice(invoiceId) {
  return db("work_orders").where({ invoice_id: invoiceId }).orderBy("sequence", "asc");
}

// Everything derived, nothing stored — subtotal/VAT/total always reflect
// the order's current lines and its snapshotted shipping/VAT rate, same
// "compute on read" approach the payment status already used last
// session, just extended to the whole document now that it's multi-line.
function computeAmounts(order, lines, payments) {
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const shippingAmount = Number(order.shipping_amount);
  const vatRatePercent = Number(order.vat_rate_percent);
  const vatAmount = Number((subtotal * (vatRatePercent / 100)).toFixed(2));
  const total = Number((subtotal + shippingAmount + vatAmount).toFixed(2));
  const amountPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = Number((total - amountPaid).toFixed(2));
  return { subtotal: Number(subtotal.toFixed(2)), shippingAmount, vatRatePercent, vatAmount, total, amountPaid, outstanding };
}

async function getInvoiceDetailForOrder(orderId) {
  const invoice = await getInvoiceByOrderId(orderId);
  if (!invoice) return null;
  const order = await db("orders").where({ id: orderId }).first();
  const [lines, payments, workOrders, customer] = await Promise.all([
    ordersService.getOrderLines(orderId),
    getPaymentsForInvoice(invoice.id),
    getWorkOrdersForInvoice(invoice.id),
    db("users").where({ id: order.customer_id }).first(),
  ]);
  const amounts = computeAmounts(order, lines, payments);
  return {
    invoice: invoiceRowToPublic(invoice, amounts),
    order: ordersService.orderRowToPublic(order),
    lines,
    payments: payments.map(paymentRowToPublic),
    workOrders: workOrders.map(workOrderRowToPublic),
    customerName: customer.full_name,
    customerAddress: formatAddress(customer),
  };
}

// Used by the admin/customer quote detail pages, which only know a
// quoteId — resolves via quotes.order_id, null if not accepted yet.
async function getInvoiceDetailForQuote(quoteId) {
  const quote = await db("quotes").where({ id: quoteId }).first();
  if (!quote || !quote.order_id) return null;
  return getInvoiceDetailForOrder(quote.order_id);
}

async function recordPayment(invoiceId, { amount, paidAt, note, adminUserId }) {
  const amt = Number(amount);
  if (!amt || Number.isNaN(amt) || amt <= 0) throw new InvoiceError("Amount must be a positive number.", 400);
  if (!paidAt) throw new InvoiceError("Payment date is required.", 400);

  let workOrdersJustGenerated = false;

  const invoice = await db.transaction(async (trx) => {
    const invoice = await trx("invoices").where({ id: invoiceId }).first();
    if (!invoice) throw new InvoiceError("Invoice not found", 404);
    const order = await trx("orders").where({ id: invoice.order_id }).first();

    await trx("invoice_payments").insert({
      invoice_id: invoiceId,
      amount: amt,
      paid_at: paidAt,
      note: note && note.trim() ? note.trim() : null,
      recorded_by_admin_id: adminUserId,
    });

    const quotes = await trx("quotes").where({ order_id: order.id });
    const lines = await Promise.all(
      quotes.map(async (quote) => {
        const snapshot = await trx("quote_snapshots").where({ quote_id: quote.id }).orderBy("created_at", "desc").first();
        const amount = snapshot.price !== null ? Number(snapshot.price) : 0;
        return { quoteId: quote.id, amount };
      }),
    );
    const payments = await trx("invoice_payments").where({ invoice_id: invoiceId });
    const { total, amountPaid } = computeAmounts(order, lines, payments);

    const existingWorkOrders = await trx("work_orders").where({ invoice_id: invoiceId });
    if (existingWorkOrders.length === 0 && amountPaid >= total) {
      workOrdersJustGenerated = true;
      const baseNumber = await documentNumbering.getNextNumber(trx, "work_order");
      let sequence = 1;
      for (const quote of quotes) {
        await trx("work_orders").insert({
          quote_id: quote.id,
          invoice_id: invoiceId,
          order_id: order.id,
          sequence,
          work_order_number: `${baseNumber}-${sequence}`,
        });
        sequence += 1;
      }
      for (const quote of quotes) {
        await trx("messages").insert({
          quote_id: quote.id,
          sender_type: "system",
          direction: "outbound",
          body_text: `Work order ${baseNumber}-${quotes.indexOf(quote) + 1} was generated (full payment received).`,
        });
      }
    }

    return trx("invoices").where({ id: invoiceId }).first();
  });

  // Best-effort, sent only once (right when the work orders are actually
  // generated, not on every subsequent payment record) — work orders are
  // internal/factory documents (see documentPdf.js), so this goes to the
  // internal notification mailbox, not the customer.
  if (workOrdersJustGenerated) {
    try {
      const order = await db("orders").where({ id: invoice.order_id }).first();
      const customer = await db("users").where({ id: order.customer_id }).first();
      const lines = await ordersService.getOrderLines(order.id);
      const buffer = await getWorkOrderBatchPdfBuffer(invoiceId);
      const notification = emailTemplates.workOrderGeneratedNotification(order, lines, customer);
      await mailer.sendMail({
        to: env.companyNotificationEmail,
        ...notification,
        attachments: [{ filename: `work-order-${order.id}.pdf`, content: buffer }],
      });
    } catch (err) {
      console.error(`Failed to send work-order-generated notification for invoice #${invoiceId}:`, err.message);
    }
  }

  return invoice;
}

async function buildInvoicePdfData(invoice) {
  const order = await db("orders").where({ id: invoice.order_id }).first();
  const customer = await db("users").where({ id: order.customer_id }).first();
  const lines = await ordersService.getOrderLines(invoice.order_id);
  const payments = await getPaymentsForInvoice(invoice.id);
  const amounts = computeAmounts(order, lines, payments);

  return {
    invoiceNumber: invoice.invoice_number,
    date: invoice.created_at,
    customerName: customer.full_name,
    customerEmail: customer.email,
    customerAddress: formatAddress(customer),
    lines,
    ...amounts,
    payments: payments.map((p) => ({ amount: Number(p.amount), paidAt: p.paid_at, note: p.note })),
    notes: invoice.notes,
    bankingDetails: invoice.banking_details_snapshot,
  };
}

async function getInvoicePdfBuffer(invoiceId) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new InvoiceError("Invoice not found", 404);
  const data = await buildInvoicePdfData(invoice);
  return documentPdf.renderInvoicePdf(data);
}

async function getWorkOrderBatchPdfBuffer(invoiceId) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new InvoiceError("Invoice not found", 404);
  const workOrders = await getWorkOrdersForInvoice(invoiceId);
  if (workOrders.length === 0) throw new InvoiceError("Work orders not generated yet.", 404);

  const order = await db("orders").where({ id: invoice.order_id }).first();
  const customer = await db("users").where({ id: order.customer_id }).first();

  const jobs = await Promise.all(
    workOrders.map(async (wo) => {
      const snapshot = await db("quote_snapshots").where({ quote_id: wo.quote_id }).orderBy("created_at", "desc").first();
      return {
        workOrderNumber: wo.work_order_number,
        productName: snapshot.product_name,
        size: snapshot.size,
        colour: snapshot.colour,
        quantity: snapshot.quantity,
        requirements: snapshot.requirements_text,
        font: snapshot.font,
        fontColour: snapshot.font_colour,
        threadColourCode: snapshot.thread_colour_code,
        notes: wo.notes,
      };
    }),
  );

  return documentPdf.renderWorkOrderBatchPdf({
    date: workOrders[0].created_at,
    customerName: customer.full_name,
    jobs,
  });
}

// Regenerates the PDF from current data (so a resend always reflects
// whatever's been paid so far) and marks sent_at on first send — quote
// and invoice creation no longer auto-email, this is the only path that
// actually sends either document to the customer.
async function sendInvoiceEmail(invoiceId) {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new InvoiceError("Invoice not found", 404);
  const data = await buildInvoicePdfData(invoice);
  const buffer = await documentPdf.renderInvoicePdf(data);
  const order = await db("orders").where({ id: invoice.order_id }).first();
  const quotes = await db("quotes").where({ order_id: order.id });

  const quoteUrl = quotes[0] ? `${env.frontendUrl}/account/quotes/${quotes[0].id}` : null;
  const { subject, text } = emailTemplates.invoiceEmail(invoice, data, quoteUrl);
  await mailer.sendMail({
    to: data.customerEmail,
    subject,
    text,
    attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: buffer }],
  });

  await db("invoices").where({ id: invoiceId }).update({ sent_at: new Date() });

  for (const quote of quotes) {
    await db("messages").insert({
      quote_id: quote.id,
      sender_type: "system",
      direction: "outbound",
      body_text: `Invoice ${invoice.invoice_number} was emailed to the customer.`,
    });
  }
}

function invoiceRowToPublic(row, amounts) {
  return {
    id: row.id,
    orderId: row.order_id,
    invoiceNumber: row.invoice_number,
    notes: row.notes,
    bankingDetails: row.banking_details_snapshot,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    ...amounts,
  };
}

function paymentRowToPublic(row) {
  return { id: row.id, amount: Number(row.amount), paidAt: row.paid_at, note: row.note, createdAt: row.created_at };
}

function workOrderRowToPublic(row) {
  return {
    id: row.id,
    quoteId: row.quote_id,
    workOrderNumber: row.work_order_number,
    sequence: row.sequence,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

module.exports = {
  InvoiceError,
  getInvoiceByOrderId,
  getInvoiceById,
  getInvoiceDetailForOrder,
  getInvoiceDetailForQuote,
  recordPayment,
  getInvoicePdfBuffer,
  getWorkOrderBatchPdfBuffer,
  sendInvoiceEmail,
};
