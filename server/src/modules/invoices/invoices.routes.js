const express = require("express");
const controller = require("./invoices.controller");
const { requireRole } = require("../../middleware/requireAuth");

// Admin-only — payment recording and work-order visibility are internal
// actions. Customers get their own read-only invoice view/PDF via
// /quotes/:id/invoice (see quotes.routes.js).
const router = express.Router();

router.use(requireRole("admin"));
router.post("/:id/payments", controller.recordPayment);
router.post("/:id/send", controller.sendInvoice);
router.get("/:id/pdf", controller.downloadInvoicePdf);
router.get("/:id/work-order/pdf", controller.downloadWorkOrderPdf);

module.exports = router;
