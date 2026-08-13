// Falls back to whatever host the page itself was loaded from (dev machine
// localhost, or a LAN IP when testing from another device) rather than a
// hardcoded value — a single build then works from any of them, since the
// API is always on the same box as the frontend in dev, just port 3001.
// Production sets VITE_API_URL explicitly (frontend/API live on different
// domains there), which always takes priority over this.
// Exported so any code building a raw URL (file/PDF download links, which
// use a plain <a href> rather than apiFetch) resolves the API host the
// same way — duplicating this fallback elsewhere previously caused
// download links to break under the same localhost/LAN mismatch this
// fixes for apiFetch.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001/api`;

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
