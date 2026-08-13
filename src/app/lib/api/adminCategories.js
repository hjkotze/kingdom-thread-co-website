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

export function uploadCategoryImage(id, file) {
  const formData = new FormData();
  formData.append("image", file);
  return apiFetch(`/admin/categories/${id}/image`, { method: "POST", body: formData });
}
