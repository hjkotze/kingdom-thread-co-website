const service = require("./orders.service");
const invoicesService = require("../invoices/invoices.service");
const vatRates = require("../../lib/vatRates");
const shippingRatesService = require("../shippingRates/shippingRates.service");
const { customerLabelFor } = require("../../lib/orderStatus");

// The customer's own order history, most recent first — each order
// enriched with its computed invoice/line/work-order detail so the
// account page can show combined orders (and their sub-items) without a
// second round trip per order.
async function listMine(req, res, next) {
  try {
    const orders = await service.listOrdersForCustomer(req.session.userId);
    const detailed = await Promise.all(
      orders.map(async (order) => {
        const detail = await invoicesService.getInvoiceDetailForOrder(order.id);
        return {
          orderId: order.id,
          orderNumber: order.order_number,
          status: order.status,
          statusLabel: customerLabelFor(order.status),
          createdAt: order.created_at,
          itemCount: detail?.lines.length || 0,
          combined: (detail?.lines.length || 0) > 1,
          lines: detail?.lines || [],
          invoice: detail?.invoice || null,
          workOrders: detail?.workOrders || [],
        };
      }),
    );
    res.json({ orders: detailed });
  } catch (err) {
    next(err);
  }
}

async function summaryCounts(req, res, next) {
  try {
    const counts = await service.getOrderSummaryCountsForCustomer(req.session.userId);
    res.json(counts);
  } catch (err) {
    next(err);
  }
}

// Preview of what the customer can combine — their finalised, unaccepted
// requests, each shown as a would-be line item. Also previews the total
// they'd actually be charged (subtotal + shipping + VAT), computed from
// the exact same vatRates/shippingRates lookups createOrderFromQuotes
// uses at acceptance time — so what's shown here before accepting always
// matches what the order is created with, never a separately-guessed
// number that could drift from reality.
//
// Optional ?ids=1,2,3 narrows both the returned lines and the totals to
// just that subset — OrderReview.jsx's only real caller, since a
// customer can select fewer than all of their eligible quotes to
// combine. Without it, every eligible quote is included (unfiltered).
async function listEligible(req, res, next) {
  try {
    const requestedIds = req.query.ids
      ? new Set(
          String(req.query.ids)
            .split(",")
            .map(Number)
            .filter(Number.isFinite),
        )
      : null;

    let pairs = await service.getEligibleQuotesForCustomer(req.session.userId);
    if (requestedIds) pairs = pairs.filter(({ quote }) => requestedIds.has(quote.id));

    const lines = pairs.map(({ quote, snapshot }) => ({
      quoteId: quote.id,
      quoteNumber: snapshot.quote_number,
      productName: snapshot.product_name,
      size: snapshot.size,
      colour: snapshot.colour,
      quantity: snapshot.quantity,
      unitPrice: snapshot.unit_price === null ? null : Number(snapshot.unit_price),
      amount: snapshot.price === null ? null : Number(snapshot.price),
    }));

    const subtotal = lines.reduce((sum, l) => sum + (l.amount || 0), 0);
    let vatRatePercent = null;
    let shippingAmount = 0;
    if (lines.length > 0) {
      const productAirtableIds = pairs.map(({ quote }) => quote.product_airtable_id);
      const [vatRate, shipping] = await Promise.all([
        vatRates.getCurrentRate(),
        shippingRatesService.resolveOrderShipping(productAirtableIds),
      ]);
      vatRatePercent = Number(vatRate.rate_percent);
      shippingAmount = shipping.shippingAmount;
    }
    // Matches invoices.service.js#computeAmounts exactly (VAT applies to
    // subtotal only, not shipping) — this is a preview of that same real
    // calculation, not a separate approximation of it.
    const vatAmount = vatRatePercent === null ? 0 : Number((subtotal * (vatRatePercent / 100)).toFixed(2));
    const total = Number((subtotal + shippingAmount + vatAmount).toFixed(2));

    res.json({ lines, subtotal, shippingAmount, vatRatePercent, vatAmount, total });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const quoteIds = Array.isArray(req.body?.quoteIds) ? req.body.quoteIds : [];
    const { order, invoice } = await service.createOrderFromQuotes(req.session.userId, quoteIds);
    const detail = await invoicesService.getInvoiceDetailForOrder(order.id);
    res.status(201).json({ order: service.orderRowToPublic(order), invoice: detail });
  } catch (err) {
    if (err instanceof service.OrderError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { listEligible, create, listMine, summaryCounts };
