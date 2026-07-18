import { apiFetch } from "./client";

export function createQuote(input) {
  return apiFetch("/quotes", { method: "POST", body: JSON.stringify(input) });
}

export function listQuotes() {
  return apiFetch("/quotes");
}

export function getQuote(id) {
  return apiFetch(`/quotes/${id}`);
}
