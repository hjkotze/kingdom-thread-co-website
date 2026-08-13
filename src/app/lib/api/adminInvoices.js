import { apiFetch, API_BASE_URL } from "./client";

export function recordInvoicePayment(invoiceId, { amount, paidAt, note }) {
  return apiFetch(`/admin/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify({ amount, paidAt, note }),
  });
}

export function sendInvoice(invoiceId) {
  return apiFetch(`/admin/invoices/${invoiceId}/send`, { method: "POST" });
}

export function invoicePdfUrl(invoiceId) {
  return `${API_BASE_URL}/admin/invoices/${invoiceId}/pdf`;
}

export function workOrderPdfUrl(invoiceId) {
  return `${API_BASE_URL}/admin/invoices/${invoiceId}/work-order/pdf`;
}

export function quotePdfUrl(quoteId) {
  return `${API_BASE_URL}/admin/quotes/${quoteId}/quote-pdf`;
}
