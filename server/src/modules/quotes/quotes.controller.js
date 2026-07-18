const quotesService = require("./quotes.service");
const attachmentsService = require("../attachments/attachments.service");
const snapshotsService = require("../quoteSnapshots/quoteSnapshots.service");

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
    const snapshots = await snapshotsService.getSnapshotsForQuote(result.quote.id);
    res.json({
      quote: quotesService.quoteRowToPublic(result.quote),
      messages: result.messages.map(quotesService.messageRowToPublic),
      attachments: attachments.map(attachmentsService.attachmentRowToPublic),
      snapshots: snapshots.map(snapshotsService.snapshotRowToPublic),
    });
  } catch (err) {
    next(err);
  }
}

async function accept(req, res, next) {
  try {
    const snapshot = await snapshotsService.acceptSnapshot(req.session.userId, req.params.id);
    res.json({ snapshot: snapshotsService.snapshotRowToPublic(snapshot) });
  } catch (err) {
    if (err instanceof snapshotsService.SnapshotError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { create, list, getOne, accept };
