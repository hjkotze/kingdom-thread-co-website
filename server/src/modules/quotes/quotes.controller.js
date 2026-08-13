const quotesService = require("./quotes.service");
const attachmentsService = require("../attachments/attachments.service");
const snapshotsService = require("../quoteSnapshots/quoteSnapshots.service");
const invoicesService = require("../invoices/invoices.service");
const ordersService = require("../orders/orders.service");

async function create(req, res, next) {
  try {
    const quote = await quotesService.createQuote(req.session.userId, req.body || {});
    res.status(201).json({ quote: quotesService.quoteRowToPublic(quote) });
  } catch (err) {
    if (err instanceof quotesService.ValidationError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const quotes = await quotesService.listQuotesForCustomer(req.session.userId);
    res.json({ quotes: quotes.map(quotesService.quoteRowToPublic) });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const result = await quotesService.getQuoteForCustomer(req.session.userId, req.params.id);
    if (!result) return res.status(404).json({ error: "Quote not found" });
    const attachments = await attachmentsService.listAttachmentsForQuote(result.quote.id);
    // Customer-facing only — never shows a formal quote admin hasn't
    // explicitly sent yet (see getLatestSentSnapshot).
    const snapshots = (await snapshotsService.getSnapshotsForQuote(result.quote.id)).filter((s) => s.sent_at);
    const invoiceDetail = await invoicesService.getInvoiceDetailForQuote(result.quote.id);
    res.json({
      quote: quotesService.quoteRowToPublic(result.quote),
      messages: result.messages.map(quotesService.messageRowToPublic),
      attachments: attachments.map(attachmentsService.attachmentRowToPublic),
      snapshots: snapshots.map(snapshotsService.snapshotRowToPublic),
      invoice: invoiceDetail?.invoice || null,
      lines: invoiceDetail?.lines || [],
      payments: invoiceDetail?.payments || [],
      customerAddress: invoiceDetail?.customerAddress || null,
    });
  } catch (err) {
    next(err);
  }
}

// Ownership-checked via getQuoteForCustomer before either PDF is built —
// no invoice/snapshot ID is trusted directly from the URL, only reached
// through a quote the requesting customer actually owns.
async function downloadQuotePdf(req, res, next) {
  try {
    const result = await quotesService.getQuoteForCustomer(req.session.userId, req.params.id);
    if (!result) return res.status(404).json({ error: "Quote not found" });
    const snapshot = await snapshotsService.getLatestSentSnapshot(result.quote.id);
    if (!snapshot) return res.status(404).json({ error: "No formal quote for this request yet." });
    const buffer = await snapshotsService.getSnapshotPdfBuffer(snapshot.id);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(snapshot.quote_number)}.pdf"`);
    res.send(buffer);
  } catch (err) {
    if (err instanceof snapshotsService.SnapshotError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function downloadInvoicePdf(req, res, next) {
  try {
    const result = await quotesService.getQuoteForCustomer(req.session.userId, req.params.id);
    if (!result) return res.status(404).json({ error: "Quote not found" });
    if (!result.quote.order_id) return res.status(404).json({ error: "No invoice for this request yet." });
    const invoice = await invoicesService.getInvoiceByOrderId(result.quote.order_id);
    if (!invoice) return res.status(404).json({ error: "No invoice for this request yet." });
    const buffer = await invoicesService.getInvoicePdfBuffer(invoice.id);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(invoice.invoice_number)}.pdf"`);
    res.send(buffer);
  } catch (err) {
    if (err instanceof invoicesService.InvoiceError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

// Single-quote acceptance — a thin call into the same unified entry point
// the combine flow uses (orders.service.js#createOrderFromQuotes), just
// with an array of one ID, rather than a separate implementation.
async function accept(req, res, next) {
  try {
    const { order, invoice } = await ordersService.createOrderFromQuotes(req.session.userId, [
      Number(req.params.id),
    ]);
    const detail = await invoicesService.getInvoiceDetailForOrder(order.id);
    res.json(detail || { order: ordersService.orderRowToPublic(order), invoice });
  } catch (err) {
    if (err instanceof ordersService.OrderError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function reply(req, res, next) {
  try {
    const message = await quotesService.sendCustomerReply(req.session.userId, req.params.id, req.body?.body);
    if (!message) return res.status(404).json({ error: "Quote not found" });
    res.status(201).json({ message: quotesService.messageRowToPublic(message) });
  } catch (err) {
    if (err instanceof quotesService.ValidationError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { create, list, getOne, accept, reply, downloadQuotePdf, downloadInvoicePdf };
