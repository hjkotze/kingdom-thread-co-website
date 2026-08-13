const service = require("./invoiceSettings.service");

async function getInvoiceSettings(req, res, next) {
  try {
    res.json(await service.getInvoiceSettings());
  } catch (err) {
    next(err);
  }
}

async function updateInvoiceSettings(req, res, next) {
  try {
    const { bankingDetails, defaultQuoteNotes, defaultInvoiceNotes } = req.body || {};
    res.json(await service.updateInvoiceSettings({ bankingDetails, defaultQuoteNotes, defaultInvoiceNotes }));
  } catch (err) {
    next(err);
  }
}

module.exports = { getInvoiceSettings, updateInvoiceSettings };
