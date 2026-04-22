const AppError = require("../../utils/appError");

function buildHeaders(extraHeaders = {}) {
  return Object.entries(extraHeaders).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      acc[key] = value;
    }
    return acc;
  }, {});
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AppError(payload.message || payload.error || "Provider request failed.", 502);
  }

  return payload;
}

async function requestForm(url, body, credentials) {
  const headers = buildHeaders({
    Authorization: credentials
      ? `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`
      : undefined,
    "Content-Type": "application/x-www-form-urlencoded",
  });

  return requestJson(url, {
    method: "POST",
    headers,
    body: new URLSearchParams(body),
  });
}

async function requestPostJson(url, body, headers = {}) {
  return requestJson(url, {
    method: "POST",
    headers: buildHeaders({
      "Content-Type": "application/json",
      ...headers,
    }),
    body: JSON.stringify(body || {}),
  });
}

module.exports = {
  requestForm,
  requestPostJson,
};
