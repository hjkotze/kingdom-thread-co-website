import { apiFetch } from "./client";

export function listAdminProducts() {
  return apiFetch("/admin/products");
}

export function getAdminProduct(id) {
  return apiFetch(`/admin/products/${id}`);
}

export function createProduct(input) {
  return apiFetch("/admin/products", { method: "POST", body: JSON.stringify(input) });
}

export function updateProduct(id, input) {
  return apiFetch(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteProduct(id) {
  return apiFetch(`/admin/products/${id}`, { method: "DELETE" });
}

export function addProductImage(id, file) {
  const formData = new FormData();
  formData.append("image", file);
  return apiFetch(`/admin/products/${id}/images`, { method: "POST", body: formData });
}

export function removeProductImage(id, attachmentId) {
  return apiFetch(`/admin/products/${id}/images/${attachmentId}`, { method: "DELETE" });
}

export function reorderProductImages(id, order) {
  return apiFetch(`/admin/products/${id}/images/order`, { method: "PUT", body: JSON.stringify({ order }) });
}
