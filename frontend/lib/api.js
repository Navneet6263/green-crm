export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;
}
