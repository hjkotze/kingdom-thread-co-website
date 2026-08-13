import { apiFetch } from "./client";

export function listEligibleOrders() {
  return apiFetch("/account/orders/eligible");
}

export function createOrder(quoteIds) {
  return apiFetch("/account/orders", { method: "POST", body: JSON.stringify({ quoteIds }) });
}

export function listMyOrders() {
  return apiFetch("/account/orders");
}

export function fetchOrderSummaryCounts() {
  return apiFetch("/account/orders/summary-counts");
}
