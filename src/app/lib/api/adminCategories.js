import { apiFetch } from "./client";

export function listAdminCategories() {
  return apiFetch("/admin/categories");
}

export function createCategory(input) {
  return apiFetch("/admin/categories", { method: "POST", body: JSON.stringify(input) });
}

export function updateCategory(id, input) {
  return apiFetch(`/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteCategory(id) {
  return apiFetch(`/admin/categories/${id}`, { method: "DELETE" });
}

export function addCategoryImage(id, file) {
  const formData = new FormData();
  formData.append("image", file);
  return apiFetch(`/admin/categories/${id}/images`, { method: "POST", body: formData });
}

export function removeCategoryImage(id, attachmentId) {
  return apiFetch(`/admin/categories/${id}/images/${attachmentId}`, { method: "DELETE" });
}

export function reorderCategoryImages(id, order) {
  return apiFetch(`/admin/categories/${id}/images/order`, { method: "PUT", body: JSON.stringify({ order }) });
}
