const quotesService = require("./quotes.service");

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
    res.json({
      quote: quotesService.quoteRowToPublic(result.quote),
      messages: result.messages.map(quotesService.messageRowToPublic),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, getOne };
