import { apiFetch } from "./client";

export function fetchProducts() {
  return apiFetch("/products");
}

export function fetchCategories() {
  return apiFetch("/categories");
}
