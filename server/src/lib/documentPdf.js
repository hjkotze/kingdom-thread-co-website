// Plain pdfkit (no headless browser) — HostKing's Node hosting is
// on-demand with no persistent process (see src/middleware/session.js),
// a poor fit for Puppeteer/Chromium-based PDF generation. Every render*
// function here takes a flat plain-object shape assembled by the calling
// service, not raw DB rows, so this module stays decoupled from schema.
const PDFDocument = require("pdfkit");

const COMPANY_NAME = "Kingdom Thread Co";
const PAGE_MARGIN = 50;
const CONTENT_WIDTH = 495; // A4 (595pt) minus left+right margins
const CONTENT_RIGHT = PAGE_MARGIN + CONTENT_WIDTH;

// Column layout shared by the Quote and Invoice line-items table — same
// columns both documents, per the redesign: Description (wraps over
// multiple lines) | Qty | Unit Price | Amount, with Shipping/VAT/Total
// rows sitting in the same Amount column position underneath.
const COL = {
  description: { x: PAGE_MARGIN, width: 255 },
  qty: { x: PAGE_MARGIN + 255, width: 50 },
  unitPrice: { x: PAGE_MARGIN + 305, width: 85 },
  amount: { x: PAGE_MARGIN + 390, width: 105 },
};

function renderToBuffer(buildFn) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    buildFn(doc);
    doc.end();
  });
}

function money(value) {
  return `R${Number(value).toFixed(2)}`;
}

function drawHeader(doc, { title, number, date }) {
  doc.fontSize(20).fillColor("#000").text(COMPANY_NAME);
  doc.moveDown(0.2);
  doc.fontSize(14).fillColor("#555").text(title);
  doc.fontSize(10).fillColor("#000");
  doc.moveDown(0.5);
  doc.text(`Number: ${number}`);
  doc.text(`Date: ${new Date(date).toLocaleDateString()}`);
  doc.moveDown(1);
  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(CONTENT_RIGHT, doc.y).strokeColor("#cccccc").stroke();
  doc.moveDown(1);
  doc.fillColor("#000");
}

// Two columns, both starting on the same line — "Bill to" on the left,
// "Delivery address" on the right — rather than stacked, which used to
// push the line-items table needlessly far down the page. Since pdfkit
// doesn't auto-flow side-by-side text blocks, each column is drawn at an
// explicit x with its own running y, and doc.y is set to whichever
// column ends lower so nothing below overlaps either one.
const BILL_TO_COL = { x: PAGE_MARGIN, width: 230 };
const DELIVERY_COL = { x: PAGE_MARGIN + 265, width: CONTENT_WIDTH - 265 };

function drawCustomer(doc, { customerName, customerEmail, customerAddress }) {
  if (!customerName) return;
  const startY = doc.y;

  doc.fontSize(11).text("Bill to:", BILL_TO_COL.x, startY, { width: BILL_TO_COL.width, underline: true });
  doc.fontSize(10).text(customerName, BILL_TO_COL.x, doc.y, { width: BILL_TO_COL.width });
  if (customerEmail) doc.text(customerEmail, BILL_TO_COL.x, doc.y, { width: BILL_TO_COL.width });
  const billToEndY = doc.y;

  let deliveryEndY = startY;
  if (customerAddress) {
    doc.fontSize(11).text("Delivery address:", DELIVERY_COL.x, startY, { width: DELIVERY_COL.width, underline: true });
    doc.fontSize(10).text(customerAddress, DELIVERY_COL.x, doc.y, { width: DELIVERY_COL.width });
    deliveryEndY = doc.y;
  }

  doc.y = Math.max(billToEndY, deliveryEndY);
  doc.moveDown(1);
}

function drawTextBlock(doc, heading, text) {
  if (!text) return;
  doc.fontSize(11).text(heading, { underline: true });
  doc.fontSize(10).text(text);
  doc.moveDown(1);
}

// Product name on its own single line, then size/colour/qty-relevant
// details wrapped as additional lines within the same Description cell —
// "product in a single line, description can be over multiple lines".
function describeLine(line) {
  const parts = [`${line.size} · ${line.colour}`];
  if (line.requirements) parts.push(line.requirements);
  if (line.font) parts.push(`Font: ${line.font}`);
  if (line.fontColour) parts.push(`Font colour: ${line.fontColour}`);
  if (line.threadColourCode) parts.push(`Thread colour: ${line.threadColourCode}`);
  return { name: line.productName, detail: parts.join(" · ") };
}

function drawTableHeader(doc) {
  doc.fontSize(9).fillColor("#555");
  doc.text("Description", COL.description.x, doc.y, { width: COL.description.width, continued: false });
  const headerY = doc.y - doc.currentLineHeight();
  doc.text("Qty", COL.qty.x, headerY, { width: COL.qty.width, align: "right" });
  doc.text("Unit Price", COL.unitPrice.x, headerY, { width: COL.unitPrice.width, align: "right" });
  doc.text("Amount", COL.amount.x, headerY, { width: COL.amount.width, align: "right" });
  doc.moveDown(0.3);
  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(CONTENT_RIGHT, doc.y).strokeColor("#cccccc").stroke();
  doc.moveDown(0.5);
  doc.fillColor("#000").fontSize(10);
}

function drawLineRow(doc, line) {
  const { name, detail } = describeLine(line);
  const startY = doc.y;

  doc.fontSize(10).font("Helvetica-Bold").text(name, COL.description.x, startY, { width: COL.description.width });
  doc.font("Helvetica").fontSize(9).fillColor("#555");
  if (detail) doc.text(detail, COL.description.x, doc.y, { width: COL.description.width });
  doc.fillColor("#000");

  const rowBottom = doc.y;

  doc.fontSize(10);
  doc.text(String(line.quantity), COL.qty.x, startY, { width: COL.qty.width, align: "right" });
  doc.text(money(line.unitPrice), COL.unitPrice.x, startY, { width: COL.unitPrice.width, align: "right" });
  doc.text(money(line.amount), COL.amount.x, startY, { width: COL.amount.width, align: "right" });

  doc.y = Math.max(rowBottom, startY + doc.currentLineHeight());
  doc.moveDown(0.6);
}

function drawSummaryRow(doc, label, value, { bold = false } = {}) {
  doc.fontSize(10);
  if (bold) doc.font("Helvetica-Bold");
  doc.text(label, COL.unitPrice.x, doc.y, { width: COL.unitPrice.width, align: "right" });
  const y = doc.y - doc.currentLineHeight();
  doc.text(value, COL.amount.x, y, { width: COL.amount.width, align: "right" });
  if (bold) doc.font("Helvetica");
  doc.moveDown(0.4);
}

// The shared table used by both renderQuotePdf and renderInvoicePdf —
// "must be the same [layout] for Quote and Invoice" — same columns, same
// Shipping/VAT/Total rows underneath, whether there's one line or many.
function drawLineItemsTable(doc, { lines, shippingAmount, vatRatePercent, vatAmount, total }) {
  drawTableHeader(doc);
  lines.forEach((line) => drawLineRow(doc, line));

  doc.moveDown(0.4);
  doc.moveTo(COL.unitPrice.x, doc.y).lineTo(CONTENT_RIGHT, doc.y).strokeColor("#cccccc").stroke();
  doc.moveDown(0.4);

  drawSummaryRow(doc, "Shipping", money(shippingAmount));
  drawSummaryRow(doc, `VAT (${Number(vatRatePercent).toFixed(2)}%)`, money(vatAmount));
  doc.moveDown(0.2);
  doc.moveTo(COL.unitPrice.x, doc.y).lineTo(CONTENT_RIGHT, doc.y).strokeColor("#000000").stroke();
  doc.moveDown(0.3);
  drawSummaryRow(doc, "Total", money(total), { bold: true });
  doc.moveDown(0.6);
}

function renderQuotePdf(data) {
  return renderToBuffer((doc) => {
    drawHeader(doc, { title: "Quote", number: data.quoteNumber, date: data.date });
    drawCustomer(doc, data);
    drawLineItemsTable(doc, {
      lines: [data.line],
      shippingAmount: data.shippingAmount,
      vatRatePercent: data.vatRatePercent,
      vatAmount: data.vatAmount,
      total: data.total,
    });
    drawTextBlock(doc, "Notes", data.notes);
  });
}

function renderInvoicePdf(data) {
  return renderToBuffer((doc) => {
    drawHeader(doc, { title: "Invoice", number: data.invoiceNumber, date: data.date });
    drawCustomer(doc, data);
    drawLineItemsTable(doc, {
      lines: data.lines,
      shippingAmount: data.shippingAmount,
      vatRatePercent: data.vatRatePercent,
      vatAmount: data.vatAmount,
      total: data.total,
    });

    if (data.payments && data.payments.length > 0) {
      doc.fontSize(11).text("Payments received", { underline: true });
      data.payments.forEach((p) => {
        doc
          .fontSize(10)
          .text(`${new Date(p.paidAt).toLocaleDateString()} — ${money(p.amount)}${p.note ? ` (${p.note})` : ""}`);
      });
      doc.moveDown(1);
    }

    drawTextBlock(doc, "Notes", data.notes);
    drawTextBlock(doc, "Payment details", data.bankingDetails);
  });
}

// Internal-only, one PDF per order — every job gets its own clearly
// separated section sharing a base work-order number with a job suffix
// (WO-2026-0001-1, -2, -3), plus a summary line telling the factory how
// many items are in this batch.
function renderWorkOrderBatchPdf({ date, customerName, jobs }) {
  return renderToBuffer((doc) => {
    doc.fontSize(20).fillColor("#000").text(COMPANY_NAME);
    doc.moveDown(0.2);
    doc.fontSize(14).fillColor("#555").text("Work order (internal)");
    doc.fontSize(10).fillColor("#000");
    doc.moveDown(0.5);
    doc.text(`Date: ${new Date(date).toLocaleDateString()}`);
    doc.font("Helvetica-Bold").text(
      `This order contains ${jobs.length} item${jobs.length === 1 ? "" : "s"} for ${customerName}.`,
    );
    doc.font("Helvetica");
    doc.moveDown(1);

    jobs.forEach((job, index) => {
      if (index > 0) doc.moveDown(0.5);
      doc
        .rect(PAGE_MARGIN, doc.y, CONTENT_WIDTH, 1)
        .fillColor("#000")
        .fill();
      doc.fillColor("#000");
      doc.moveDown(0.5);

      doc.fontSize(12).font("Helvetica-Bold").text(`Job ${job.workOrderNumber}`);
      doc.font("Helvetica").fontSize(10);
      doc.moveDown(0.3);

      const rows = [
        ["Product", job.productName],
        ["Size", job.size],
        ["Colour", job.colour],
        ["Quantity", job.quantity],
      ];
      if (job.requirements) rows.push(["Requirements", job.requirements]);
      if (job.font) rows.push(["Font", job.font]);
      if (job.fontColour) rows.push(["Font colour", job.fontColour]);
      if (job.threadColourCode) rows.push(["Thread colour", job.threadColourCode]);

      rows.forEach(([label, value]) => {
        doc.text(label, PAGE_MARGIN, doc.y, { continued: true, width: 250 });
        doc.text(String(value), { align: "right" });
      });

      if (job.notes) {
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor("#555").text(`Production notes: ${job.notes}`);
        doc.fillColor("#000").fontSize(10);
      }
      doc.moveDown(0.8);
    });
  });
}

module.exports = { renderQuotePdf, renderInvoicePdf, renderWorkOrderBatchPdf };
