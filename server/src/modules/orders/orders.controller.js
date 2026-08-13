const service = require("./orders.service");
const invoicesService = require("../invoices/invoices.service");
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
// requests, each shown as a would-be line item.
async function listEligible(req, res, next) {
  try {
    const pairs = await service.getEligibleQuotesForCustomer(req.session.userId);
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
    res.json({ lines });
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
