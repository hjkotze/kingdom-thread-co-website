const express = require("express");
const controller = require("../homeStats/homeStats.controller");
const invoiceSettingsController = require("../settings/invoiceSettings.controller");
const emailIngestionController = require("./adminEmailIngestion.controller");
const { requireRole } = require("../../middleware/requireAuth");

// Deliberately narrow — a handful of specific editable settings, not a
// generic settings CRUD surface. Add more specific routes here if more
// settings become admin-editable, rather than building a generic
// key-value admin UI ahead of need.
const router = express.Router();

router.use(requireRole("admin"));
router.patch("/turnaround-text", controller.updateTurnaroundText);
router.get("/invoicing", invoiceSettingsController.getInvoiceSettings);
router.patch("/invoicing", invoiceSettingsController.updateInvoiceSettings);
router.post("/check-email-replies", emailIngestionController.run);

module.exports = router;
