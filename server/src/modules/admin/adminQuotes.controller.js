const service = require("./adminQuotes.service");
const quotesService = require("../quotes/quotes.service");
const attachmentsService = require("../attachments/attachments.service");
const snapshotsService = require("../quoteSnapshots/quoteSnapshots.service");
const invoicesService = require("../invoices/invoices.service");

async function list(req, res, next) {
  try {
    const [quotes, activeQuoteId] = await Promise.all([
      service.listAllQuotes(),
      service.getActiveQuoteId(req.session.userId),
    ]);
    res.json({ quotes: quotes.map(service.quoteRowToAdminPublic), activeQuoteId });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const result = await service.getQuoteWithThread(req.params.id);
    if (!result) return res.status(404).json({ error: "Quote not found" });

    // Opening a quote's detail claims it as this admin's active item (§7) —
    // superseding whatever was previously active, since only one is
    // allowed at a time.
    await service.setActiveQuote(req.session.userId, result.quote.id);

    const snapshots = await snapshotsService.getSnapshotsForQuote(result.quote.id);
    const invoiceDetail = await invoicesService.getInvoiceDetailForQuote(result.quote.id);
    res.json({
      quote: service.quoteRowToAdminPublic({
        ...result.quote,
        customer_name: result.customer.full_name,
        customer_email: result.customer.email,
      }),
      messages: result.messages.map(quotesService.messageRowToPublic),
      attachments: result.attachments.map(attachmentsService.attachmentRowToPublic),
      snapshots: snapshots.map(snapshotsService.snapshotRowToPublic),
      invoice: invoiceDetail?.invoice || null,
      order: invoiceDetail?.order || null,
      lines: invoiceDetail?.lines || [],
      payments: invoiceDetail?.payments || [],
      workOrders: invoiceDetail?.workOrders || [],
      customerAddress: invoiceDetail?.customerAddress || null,
    });
  } catch (err) {
    next(err);
  }
}

async function downloadQuotePdf(req, res, next) {
  try {
    const snapshot = await snapshotsService.getLatestSnapshot(req.params.id);
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

async function reply(req, res, next) {
  try {
    const message = await service.sendCompanyReply(req.session.userId, req.params.id, req.body?.body);
    res.status(201).json({ message: quotesService.messageRowToPublic(message) });
  } catch (err) {
    if (err instanceof service.AdminQuoteError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function createSnapshot(req, res, next) {
  try {
    const snapshot = await snapshotsService.createSnapshot(req.session.userId, req.params.id, req.body || {});
    res.status(201).json({ snapshot: snapshotsService.snapshotRowToPublic(snapshot) });
  } catch (err) {
    if (err instanceof snapshotsService.SnapshotError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function sendSnapshot(req, res, next) {
  try {
    const snapshot = await snapshotsService.getLatestSnapshot(req.params.id);
    if (!snapshot) return res.status(404).json({ error: "No formal quote for this request yet." });
    await snapshotsService.sendSnapshotEmail(snapshot.id);
    res.status(204).end();
  } catch (err) {
    if (err instanceof snapshotsService.SnapshotError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { list, getOne, reply, createSnapshot, sendSnapshot, downloadQuotePdf };
