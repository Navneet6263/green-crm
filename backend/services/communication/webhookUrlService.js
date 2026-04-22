const crypto = require("crypto");

function getWebhookSecret() {
  return String(
    process.env.COMMUNICATION_WEBHOOK_SECRET ||
      process.env.AUTH_SECRET ||
      process.env.JWT_SECRET ||
      "greencrm-dev-secret"
  ).trim();
}

function getApiBaseUrl(req) {
  const configured = String(
    process.env.API_PUBLIC_BASE_URL || process.env.BACKEND_PUBLIC_URL || ""
  ).trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (req?.headers?.host) {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    return `${protocol}://${req.headers.host}`.replace(/\/$/, "");
  }

  return `http://localhost:${process.env.PORT || 5000}`;
}

function buildCallWebhookToken(callLogId) {
  return crypto.createHmac("sha256", getWebhookSecret()).update(String(callLogId || "")).digest("hex");
}

function verifyCallWebhookToken(callLogId, token) {
  const expected = buildCallWebhookToken(callLogId);
  const provided = String(token || "");

  if (!provided || provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

function buildCallWebhookUrl(req, providerName, callLogId) {
  const url = new URL(`/api/communications/webhooks/call/${providerName}`, getApiBaseUrl(req));
  url.searchParams.set("call_log_id", callLogId);
  url.searchParams.set("token", buildCallWebhookToken(callLogId));
  return url.toString();
}

module.exports = {
  buildCallWebhookToken,
  buildCallWebhookUrl,
  getApiBaseUrl,
  verifyCallWebhookToken,
};
