import { apiFetch } from "./client";

export function fetchProductRating(productId) {
  return apiFetch(`/products/${productId}/rating`);
}

export function fetchMyRating(productId) {
  return apiFetch(`/products/${productId}/rating/me`);
}

export function submitRating(productId, rating) {
  return apiFetch(`/products/${productId}/rating`, { method: "POST", body: JSON.stringify({ rating }) });
}
