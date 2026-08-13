import { apiFetch } from "./client";

// Public — no auth required, unlike everything in lib/api/adminPolicies.js.
export function fetchPublicPolicy(type) {
  return apiFetch(`/policies/${type}`);
}
