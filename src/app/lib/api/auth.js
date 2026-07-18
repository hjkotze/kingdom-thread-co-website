import { apiFetch } from "./client";

export function registerCustomer({ email, password, fullName, phone }) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, fullName, phone }),
  });
}

export function verifyEmail(token) {
  return apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
}

export function resendVerification(email) {
  return apiFetch("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
}

export function loginCustomer({ email, password }) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function loginAdmin({ email, password }) {
  return apiFetch("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout({ asAdmin = false } = {}) {
  return apiFetch(asAdmin ? "/admin/auth/logout" : "/auth/logout", { method: "POST" });
}

export function fetchCurrentUser() {
  return apiFetch("/auth/me");
}
