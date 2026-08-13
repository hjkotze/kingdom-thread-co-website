import { apiFetch } from "./client";

export function listAdminOrders() {
  return apiFetch("/admin/orders");
}

export function updateOrderStatus(orderId, status) {
  return apiFetch(`/admin/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}
