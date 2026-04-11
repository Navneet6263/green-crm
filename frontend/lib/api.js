export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

const IN_FLIGHT_GET_REQUESTS = new Map();
const RECENT_GET_RESPONSES = new Map();
const DEFAULT_DEDUPE_WINDOW_MS = 5000;

function getDedupeWindowMs() {
  const parsed = Number(process.env.NEXT_PUBLIC_API_DEDUPE_WINDOW_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_DEDUPE_WINDOW_MS;
}

function buildRequestKey(path, options) {
  return JSON.stringify({
    path,
    method: options.method || "GET",
    token: options.token || "",
    body: options.body || null,
  });
}

function pruneRecentResponses() {
  const now = Date.now();

  for (const [key, entry] of RECENT_GET_RESPONSES.entries()) {
    if (!entry || entry.expiresAt <= now) {
      RECENT_GET_RESPONSES.delete(key);
    }
  }
}

function invalidateGetCache() {
  RECENT_GET_RESPONSES.clear();
}

function clonePayload(payload) {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof structuredClone === "function") {
    return structuredClone(payload);
  }

  return JSON.parse(JSON.stringify(payload));
}

export async function apiRequest(path, options = {}) {
  const method = options.method || "GET";
  const isGet = method === "GET";
  const requestKey = isGet ? buildRequestKey(path, options) : null;

  if (requestKey) {
    pruneRecentResponses();

    const recentResponse = RECENT_GET_RESPONSES.get(requestKey);
    if (recentResponse) {
      return clonePayload(recentResponse.payload);
    }

    const pendingRequest = IN_FLIGHT_GET_REQUESTS.get(requestKey);
    if (pendingRequest) {
      return clonePayload(await pendingRequest);
    }
  }

  const requestPromise = (async () => {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
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
  })();

  if (requestKey) {
    IN_FLIGHT_GET_REQUESTS.set(requestKey, requestPromise);
  }

  try {
    const result = await requestPromise;

    if (requestKey && getDedupeWindowMs() > 0) {
      RECENT_GET_RESPONSES.set(requestKey, {
        payload: clonePayload(result),
        expiresAt: Date.now() + getDedupeWindowMs(),
      });
    }

    if (!requestKey) {
      invalidateGetCache();
    }

    return clonePayload(result);
  } finally {
    if (requestKey) {
      IN_FLIGHT_GET_REQUESTS.delete(requestKey);
    }
  }
}
