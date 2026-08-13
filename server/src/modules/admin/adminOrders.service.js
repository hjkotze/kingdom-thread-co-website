const db = require("../../config/db");
const ordersService = require("../orders/orders.service");
const invoicesService = require("../invoices/invoices.service");

// All orders, most recent first, each enriched with its computed lines and
// invoice/work-order detail — small dataset (one row per accepted order),
// same N+1-is-fine reasoning already used in
// orders.service.js#getEligibleQuotesForCustomer.
async function listOrders() {
  const orders = await db("orders as o")
    .join("users as u", "u.id", "o.customer_id")
    .select("o.*", "u.full_name as customer_name", "u.email as customer_email")
    .orderBy("o.created_at", "desc");

  return Promise.all(
    orders.map(async (order) => {
      const detail = await invoicesService.getInvoiceDetailForOrder(order.id);
      const lines = detail?.lines || [];
      return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        createdAt: order.created_at,
        itemCount: lines.length,
        combined: lines.length > 1,
        lines,
        invoiceNumber: detail?.invoice?.invoiceNumber || null,
        invoiceSentAt: detail?.invoice?.sentAt || null,
        total: detail?.invoice?.total ?? null,
        amountPaid: detail?.invoice?.amountPaid ?? null,
        outstanding: detail?.invoice?.outstanding ?? null,
        workOrderCount: detail?.workOrders?.length || 0,
      };
    }),
  );
}

module.exports = { listOrders };
