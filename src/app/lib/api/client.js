const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch(path, options = {}) {
  // FormData bodies (file uploads) must NOT get a manually-set Content-Type
  // — the browser needs to set it itself to include the multipart boundary.
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include", // send/receive the session cookie
    headers: {
      ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(data?.error || "Something went wrong.", res.status, data?.code);
  }

  return data;
}
