import { apiFetch } from "./client";

export function fetchInvoiceSettings() {
  return apiFetch("/admin/settings/invoicing");
}

export function updateInvoiceSettings(input) {
  return apiFetch("/admin/settings/invoicing", { method: "PATCH", body: JSON.stringify(input) });
}

export function checkEmailReplies() {
  return apiFetch("/admin/settings/check-email-replies", { method: "POST" });
}
