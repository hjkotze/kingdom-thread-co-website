import { apiFetch } from "./client";

export function listVatRates() {
  return apiFetch("/admin/vat-rates");
}

export function createVatRate({ ratePercent, validFrom, validTo }) {
  return apiFetch("/admin/vat-rates", {
    method: "POST",
    body: JSON.stringify({ ratePercent, validFrom, validTo }),
  });
}
