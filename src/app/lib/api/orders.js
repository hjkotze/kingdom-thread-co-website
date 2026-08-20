import { apiFetch } from "./client";

export function listEligibleOrders(ids) {
  const query = ids && ids.length > 0 ? `?ids=${ids.join(",")}` : "";
  return apiFetch(`/account/orders/eligible${query}`);
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
