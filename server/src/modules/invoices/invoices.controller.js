const service = require("./invoices.service");

function handleError(err, res, next) {
  if (err instanceof service.InvoiceError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  next(err);
}

async function recordPayment(req, res, next) {
  try {
    const { amount, paidAt, note } = req.body || {};
    const invoice = await service.recordPayment(req.params.id, {
      amount,
      paidAt,
      note,
      adminUserId: req.session.userId,
    });
    const detail = await service.getInvoiceDetailForOrder(invoice.order_id);
    res.status(201).json(detail);
  } catch (err) {
    handleError(err, res, next);
  }
}

async function sendInvoice(req, res, next) {
  try {
    await service.sendInvoiceEmail(req.params.id);
    res.status(204).end();
  } catch (err) {
    handleError(err, res, next);
  }
}

async function downloadInvoicePdf(req, res, next) {
  try {
    const invoice = await service.getInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    const buffer = await service.getInvoicePdfBuffer(req.params.id);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(invoice.invoice_number)}.pdf"`);
    res.send(buffer);
  } catch (err) {
    handleError(err, res, next);
  }
}

async function downloadWorkOrderPdf(req, res, next) {
  try {
    const buffer = await service.getWorkOrderBatchPdfBuffer(req.params.id);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="work-orders-${req.params.id}.pdf"`);
    res.send(buffer);
  } catch (err) {
    handleError(err, res, next);
  }
}

module.exports = { recordPayment, sendInvoice, downloadInvoicePdf, downloadWorkOrderPdf };
