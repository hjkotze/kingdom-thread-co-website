import { apiFetch } from "./client";

export function fetchPolicy(type) {
  return apiFetch(`/admin/policies/${type}`);
}

export function updatePolicy(type, content) {
  return apiFetch(`/admin/policies/${type}`, { method: "PATCH", body: JSON.stringify({ content }) });
}
