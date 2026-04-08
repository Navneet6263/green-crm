const crypto = require("crypto");

const HASH_SEPARATOR = "$";

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padding = 4 - (value.length % 4 || 4);
  const normalized = `${value}${"=".repeat(padding === 4 ? 0 : padding)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return Buffer.from(normalized, "base64").toString("utf8");
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}${HASH_SEPARATOR}${derivedKey}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(HASH_SEPARATOR);

  if (!salt || !hash) {
    return false;
  }

  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derivedKey, "hex"));
}

function getSigningSecret() {
  return process.env.AUTH_SECRET || process.env.JWT_SECRET || "greencrm-dev-secret";
}

function signToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function buildTimedToken(payload, expiresInSeconds) {
  const now = Math.floor(Date.now() / 1000);

  return signToken({
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  });
}

function verifyToken(token) {
  const [encodedHeader, encodedPayload, signature] = String(token || "").split(".");

  if (!encodedHeader || !encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  if (expectedSignature !== signature) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

function buildAuthToken(user) {
  const now = Math.floor(Date.now() / 1000);

  return signToken({
    jti: crypto.randomUUID(),
    sub: user.user_id,
    company_id: user.company_id,
    role: user.role,
    email: user.email,
    name: user.name,
    iat: now,
    exp: now + 60 * 60 * 12,
  });
}

module.exports = {
  buildAuthToken,
  buildTimedToken,
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
};
