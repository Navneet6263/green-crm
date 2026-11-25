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

const DEV_SECRET = "greencrm-dev-secret";
const MIN_SECRET_LENGTH = 32;
const isDevOrTest = () => ["development", "test"].includes(process.env.NODE_ENV) || Boolean(process.env.NODE_TEST_CONTEXT);

// The well-known development secret is only allowed on a developer machine or in tests. Anywhere
// else a missing or short secret would let anyone forge a login token, so the server refuses it.
function getSigningSecret() {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || "";
  if (secret.length >= MIN_SECRET_LENGTH && secret !== DEV_SECRET) return secret;
  if (isDevOrTest()) return secret || DEV_SECRET;
  throw new Error(`JWT_SECRET (or AUTH_SECRET) must be set to a random value of at least ${MIN_SECRET_LENGTH} characters.`);
}

/** Called at start-up so a missing secret stops the server with a clear message instead of later. */
function assertSigningSecret() {
  getSigningSecret();
}

function sign(input) {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(input)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedHeader}.${encodedPayload}.${sign(`${encodedHeader}.${encodedPayload}`)}`;
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

  const expected = Buffer.from(sign(`${encodedHeader}.${encodedPayload}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return null;
  }

  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecode(encodedHeader));
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch (_error) {
    return null;
  }
  if (header?.alg !== "HS256" || !payload || typeof payload !== "object") {
    return null;
  }

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
  assertSigningSecret,
  buildAuthToken,
  buildTimedToken,
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
};
