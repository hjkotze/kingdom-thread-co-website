const service = require("./adminQuotes.service");
const quotesService = require("../quotes/quotes.service");
const attachmentsService = require("../attachments/attachments.service");
const snapshotsService = require("../quoteSnapshots/quoteSnapshots.service");

async function list(req, res, next) {
  try {
    const quotes = await service.listAllQuotes();
    res.json({ quotes: quotes.map(service.quoteRowToAdminPublic) });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const result = await service.getQuoteWithThread(req.params.id);
    if (!result) return res.status(404).json({ error: "Quote not found" });
    const snapshots = await snapshotsService.getSnapshotsForQuote(result.quote.id);
    res.json({
      quote: service.quoteRowToAdminPublic({
        ...result.quote,
        customer_name: result.customer.full_name,
        customer_email: result.customer.email,
      }),
      messages: result.messages.map(quotesService.messageRowToPublic),
      attachments: result.attachments.map(attachmentsService.attachmentRowToPublic),
      snapshots: snapshots.map(snapshotsService.snapshotRowToPublic),
    });
  } catch (err) {
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

module.exports = { list, getOne, reply, createSnapshot };
