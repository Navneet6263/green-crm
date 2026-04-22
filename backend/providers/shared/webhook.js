const crypto = require("crypto");

function pickValue(payload, aliases = []) {
  for (const alias of aliases) {
    const value = String(alias || "")
      .split(".")
      .reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), payload);

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function normalizeDuration(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : null;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeHeaderName(value, fallback) {
  return String(value || fallback || "").trim().toLowerCase();
}

function readHeader(headers = {}, name) {
  return headers[normalizeHeaderName(name)] || null;
}

function verifyHmacSignature(context, options = {}) {
  const headerName = normalizeHeaderName(options.headerName, "x-webhook-signature");
  const secret = String(options.secret || "").trim();

  if (!secret || !headerName) {
    return { valid: true, mode: "token_only" };
  }

  const signature = String(readHeader(context.headers, headerName) || "")
    .trim()
    .replace(/^[a-z0-9_-]+=/i, "");
  if (!signature) {
    return { valid: false, reason: "missing_signature_header" };
  }

  const algorithm = String(options.algorithm || "sha256").trim().toLowerCase();
  const body = String(context.rawBody || "");
  const expected = crypto.createHmac(algorithm, secret).update(body).digest("hex");
  if (signature.length !== expected.length) {
    return { valid: false, reason: "signature_mismatch" };
  }

  return {
    valid: crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature)),
    reason: "signature_mismatch",
  };
}

module.exports = {
  normalizeDate,
  normalizeDuration,
  normalizeStatus,
  pickValue,
  verifyHmacSignature,
};
