import { apiFetch } from "./client";

export function fetchThreadColours() {
  return apiFetch("/thread-colours");
}
