import { apiFetch, API_BASE_URL } from "./client";

export function createQuote(input) {
  return apiFetch("/quotes", { method: "POST", body: JSON.stringify(input) });
}

export function listQuotes() {
  return apiFetch("/quotes");
}

export function getQuote(id) {
  return apiFetch(`/quotes/${id}`);
}

export function acceptQuote(id) {
  return apiFetch(`/quotes/${id}/accept`, { method: "POST" });
}

export function sendCustomerReply(id, body) {
  return apiFetch(`/quotes/${id}/messages`, { method: "POST", body: JSON.stringify({ body }) });
}

export function quotePdfUrl(id) {
  return `${API_BASE_URL}/quotes/${id}/quote-pdf`;
}

export function invoicePdfUrl(id) {
  return `${API_BASE_URL}/quotes/${id}/invoice-pdf`;
}
