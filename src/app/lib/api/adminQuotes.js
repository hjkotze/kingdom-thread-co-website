import { apiFetch } from "./client";

export function listAdminQuotes() {
  return apiFetch("/admin/quotes");
}

export function getAdminQuote(id) {
  return apiFetch(`/admin/quotes/${id}`);
}

export function sendAdminReply(id, body) {
  return apiFetch(`/admin/quotes/${id}/messages`, { method: "POST", body: JSON.stringify({ body }) });
}

export function createSnapshot(id, input) {
  return apiFetch(`/admin/quotes/${id}/snapshots`, { method: "POST", body: JSON.stringify(input) });
}
