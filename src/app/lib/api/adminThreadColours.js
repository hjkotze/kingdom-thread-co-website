import { apiFetch } from "./client";

export function listAdminThreadColours() {
  return apiFetch("/admin/thread-colours");
}

export function createThreadColour(input) {
  return apiFetch("/admin/thread-colours", { method: "POST", body: JSON.stringify(input) });
}

export function updateThreadColour(id, input) {
  return apiFetch(`/admin/thread-colours/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteThreadColour(id) {
  return apiFetch(`/admin/thread-colours/${id}`, { method: "DELETE" });
}
