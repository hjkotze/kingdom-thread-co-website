import { apiFetch } from "./client";

export function fetchHomeStats() {
  return apiFetch("/home-stats");
}

export function updateTurnaroundText(value) {
  return apiFetch("/admin/settings/turnaround-text", { method: "PATCH", body: JSON.stringify({ value }) });
}
