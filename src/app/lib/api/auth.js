import { apiFetch } from "./client";

export function registerCustomer({ email, password, fullName, cellPhone }) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, fullName, cellPhone }),
  });
}

export function updateProfile({
  fullName,
  addressLine1,
  addressComplex,
  addressSuburb,
  addressPostalCode,
  addressProvince,
  cellPhone,
  landlineAreaCode,
  landlineNumber,
  notifyOrderStatusChanges,
}) {
  return apiFetch("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({
      fullName,
      addressLine1,
      addressComplex,
      addressSuburb,
      addressPostalCode,
      addressProvince,
      cellPhone,
      landlineAreaCode,
      landlineNumber,
      notifyOrderStatusChanges,
    }),
  });
}

export function verifyEmail(token) {
  return apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
}

export function resendVerification(email) {
  return apiFetch("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
}

export function forgotPassword(email) {
  return apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

export function resetPassword(token, password) {
  return apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
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

export function fetchCurrentAdminUser() {
  return apiFetch("/admin/auth/me");
}
