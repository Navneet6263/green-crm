const crypto = require("crypto");

const DEFAULT_SECRET = "greencrm-dev-config-key";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getSecret() {
  return String(
    process.env.CONFIG_ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      process.env.DB_PASSWORD ||
      DEFAULT_SECRET
  );
}

function getKey() {
  return crypto.createHash("sha256").update(getSecret()).digest();
}

function parseJson(value) {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return {};
    }
  }

  return typeof value === "object" ? value : {};
}

function encryptJson(value) {
  const payload = JSON.stringify(value || {});
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  });
}

function decryptJson(value) {
  const parsed = parseJson(value);

  if (!parsed.iv || !parsed.tag || !parsed.data) {
    return parseJson(value);
  }

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(parsed.iv, "base64")
    );

    decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(parsed.data, "base64")),
      decipher.final(),
    ]);

    return parseJson(decrypted.toString("utf8"));
  } catch (_error) {
    return {};
  }
}

module.exports = {
  decryptJson,
  encryptJson,
  parseJson,
};
