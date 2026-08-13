const settingsService = require("./settings.service");

const BANKING_DETAILS_KEY = "banking_details";
const DEFAULT_QUOTE_NOTES_KEY = "default_quote_notes";
const DEFAULT_INVOICE_NOTES_KEY = "default_invoice_notes";

// Global defaults for quote/invoice PDFs — banking details rarely change,
// and default notes just pre-fill the per-document notes field (admin can
// always override per quote/invoice). Reuses the generic site_settings
// key-value store rather than dedicated columns, same as turnaround_text.
async function getInvoiceSettings() {
  const [bankingDetails, defaultQuoteNotes, defaultInvoiceNotes] = await Promise.all([
    settingsService.getSetting(BANKING_DETAILS_KEY, ""),
    settingsService.getSetting(DEFAULT_QUOTE_NOTES_KEY, ""),
    settingsService.getSetting(DEFAULT_INVOICE_NOTES_KEY, ""),
  ]);
  return { bankingDetails, defaultQuoteNotes, defaultInvoiceNotes };
}

async function updateInvoiceSettings({ bankingDetails, defaultQuoteNotes, defaultInvoiceNotes }) {
  await Promise.all([
    bankingDetails !== undefined ? settingsService.setSetting(BANKING_DETAILS_KEY, bankingDetails) : null,
    defaultQuoteNotes !== undefined ? settingsService.setSetting(DEFAULT_QUOTE_NOTES_KEY, defaultQuoteNotes) : null,
    defaultInvoiceNotes !== undefined
      ? settingsService.setSetting(DEFAULT_INVOICE_NOTES_KEY, defaultInvoiceNotes)
      : null,
  ]);
  return getInvoiceSettings();
}

module.exports = { getInvoiceSettings, updateInvoiceSettings };
