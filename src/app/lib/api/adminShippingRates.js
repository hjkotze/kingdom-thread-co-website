import { apiFetch } from "./client";

export function listShippingRates() {
  return apiFetch("/admin/shipping-rates");
}

export function createShippingRate(input) {
  return apiFetch("/admin/shipping-rates", { method: "POST", body: JSON.stringify(input) });
}

export function updateShippingRate(id, input) {
  return apiFetch(`/admin/shipping-rates/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteShippingRate(id) {
  return apiFetch(`/admin/shipping-rates/${id}`, { method: "DELETE" });
}

export function getProductShippingRate(productId) {
  return apiFetch(`/admin/products/${productId}/shipping-rate`);
}

export function setProductShippingRate(productId, shippingRateId) {
  return apiFetch(`/admin/products/${productId}/shipping-rate`, {
    method: "PUT",
    body: JSON.stringify({ shippingRateId }),
  });
}
