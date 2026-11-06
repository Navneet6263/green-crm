const crypto = require("node:crypto");
const net = require("node:net");
const db = require("../../db/connection");
const AppError = require("../../utils/appError");
const access = require("./access");

// A key looks like gcrm_<32 characters>. Only its SHA-256 is stored, so it is shown once.
// Each call runs as the admin who made the key: if that admin is removed, the key stops.
const SCOPES = ["leads:read", "leads:write"];
const KEY_PATTERN = /^gcrm_[A-Za-z0-9_-]{32}$/;
const MAX_ACTIVE_KEYS = 20;
const EXPIRY_CHOICES = [0, 30, 90, 180, 365];
const ROLL_OVERLAP_HOURS = 24;
const MAX_IPS = 20;

/** "1.2.3.4, 10.0.0.0/24" → ["1.2.3.4", "10.0.0.0/24"]; IPv4 ranges and exact IPv6 addresses. */
function parseIps(value) {
  const list = [...new Set((Array.isArray(value) ? value : String(value || "").split(/[\s,]+/)).map((ip) => String(ip).trim()).filter(Boolean))];
  if (list.length > MAX_IPS) throw new AppError(`Add up to ${MAX_IPS} addresses.`, 400);
  const bad = list.filter((entry) => {
    const [ip, bits] = entry.split("/");
    if (bits === undefined) return !net.isIP(ip);
    return !net.isIPv4(ip) || !/^\d+$/.test(bits) || Number(bits) > 32;
  });
  if (bad.length) throw new AppError(`Not a valid address: ${bad.join(", ")}`, 400);
  return list;
}

const ipToInt = (ip) => ip.split(".").reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;

function ipAllowed(list, rawIp) {
  if (!list.length) return true;
  const ip = String(rawIp || "").replace(/^::ffff:/, "");
  return list.some((entry) => {
    const [base, bits] = entry.split("/");
    if (bits === undefined) return base === ip;
    if (!net.isIPv4(ip)) return false;
    const mask = Number(bits) === 0 ? 0 : (~0 << (32 - Number(bits))) >>> 0;
    return (ipToInt(ip) & mask) === (ipToInt(base) & mask);
  });
}

const hashKey = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

function parseScopes(value) {
  const list = (Array.isArray(value) ? value : String(value || "").split(","))
    .map((scope) => String(scope).trim()).filter(Boolean);
  const scopes = [...new Set(list)];
  if (!scopes.length) return [...SCOPES];
  const unknown = scopes.filter((scope) => !SCOPES.includes(scope));
  if (unknown.length) throw new AppError(`Unknown permission: ${unknown.join(", ")}`, 400);
  return SCOPES.filter((scope) => scopes.includes(scope));
}

function publicKey(row) {
  const expired = row.expires_at && new Date(row.expires_at).getTime() <= Date.now();
  return {
    key_id: row.key_id,
    name: row.name,
    key_prefix: row.key_prefix,
    allowed_ips: String(row.allowed_ips || "").split(",").filter(Boolean),
    scopes: String(row.scopes || "").split(",").filter(Boolean),
    created_by: row.created_by,
    created_by_name: row.created_by_name || null,
    created_at: row.created_at,
    expires_at: row.expires_at,
    last_used_at: row.last_used_at,
    last_used_ip: row.last_used_ip,
    request_count: row.request_count || 0,
    revoked_at: row.revoked_at,
    state: row.revoked_at ? "revoked" : expired ? "expired" : "active",
  };
}

async function listKeys(companyId) {
  const [rows] = await db.query(
    `SELECT k.*, u.name AS created_by_name FROM developer_api_keys k
     LEFT JOIN users u ON u.user_id = k.created_by
     WHERE k.company_id = ? ORDER BY CASE WHEN k.revoked_at IS NULL THEN 0 ELSE 1 END, k.created_at DESC`,
    [companyId]
  );
  return rows.map(publicKey);
}

async function createKey(auth, payload = {}) {
  const name = String(payload.name || "").trim().slice(0, 120);
  if (!name) throw new AppError("Give the key a name, like \"Website\" or \"Zapier\".", 400);
  const scopes = parseScopes(payload.scopes);
  const days = Number(payload.expires_in_days || 0);
  if (!EXPIRY_CHOICES.includes(days)) throw new AppError("Choose when the key expires.", 400);
  const ips = parseIps(payload.allowed_ips);
  return insertKey(auth, { name, scopes, ips, expiresAt: days ? new Date(Date.now() + days * 86400000) : null });
}

async function insertKey(auth, { name, scopes, ips, expiresAt }) {

  const [[count]] = await db.query(
    "SELECT COUNT(*) AS total FROM developer_api_keys WHERE company_id = ? AND revoked_at IS NULL",
    [auth.companyId]
  );
  if (Number(count?.total || 0) >= MAX_ACTIVE_KEYS) {
    throw new AppError(`You can have ${MAX_ACTIVE_KEYS} keys at a time. Revoke one you no longer use.`, 400);
  }

  const raw = `gcrm_${crypto.randomBytes(24).toString("base64url")}`;
  const keyId = `key_${crypto.randomBytes(8).toString("hex")}`;
  await db.query(
    `INSERT INTO developer_api_keys (key_id, company_id, name, key_prefix, key_hash, scopes, created_by, expires_at, allowed_ips)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [keyId, auth.companyId, name, raw.slice(0, 12), hashKey(raw), scopes.join(","), auth.userId, expiresAt, ips.length ? ips.join(",") : null]
  );
  const [rows] = await db.query("SELECT * FROM developer_api_keys WHERE key_id = ?", [keyId]);
  return { ...publicKey({ ...rows[0], created_by_name: auth.name }), secret: raw };
}

/** A new key with the same settings; the old one keeps working for 24 hours so apps can switch over. */
async function rollKey(auth, keyId) {
  const [rows] = await db.query(
    "SELECT * FROM developer_api_keys WHERE key_id = ? AND company_id = ? AND revoked_at IS NULL",
    [keyId, auth.companyId]
  );
  const old = rows[0];
  if (!old) throw new AppError("Key not found or already revoked.", 404);
  if (old.expires_at && new Date(old.expires_at).getTime() <= Date.now()) throw new AppError("This key has expired. Create a new one instead.", 400);
  const overlap = new Date(Date.now() + ROLL_OVERLAP_HOURS * 3600000);
  const created = await insertKey(auth, {
    name: old.name, scopes: String(old.scopes).split(",").filter(Boolean),
    ips: String(old.allowed_ips || "").split(",").filter(Boolean), expiresAt: old.expires_at,
  });
  await db.query(
    "UPDATE developer_api_keys SET expires_at = CASE WHEN expires_at IS NULL OR expires_at > ? THEN ? ELSE expires_at END WHERE key_id = ?",
    [overlap, overlap, keyId]
  );
  return { ...created, replaces: keyId, old_key_expires_at: overlap.toISOString() };
}

async function revokeKey(auth, keyId) {
  const [rows] = await db.query(
    `UPDATE developer_api_keys SET revoked_at = SYSUTCDATETIME(), revoked_by = ?
     OUTPUT INSERTED.key_id, INSERTED.name
     WHERE key_id = ? AND company_id = ? AND revoked_at IS NULL`,
    [auth.userId, keyId, auth.companyId]
  );
  if (!rows.length) throw new AppError("Key not found or already revoked.", 404);
  return rows[0];
}

function readKey(req) {
  const header = String(req.headers.authorization || "");
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return String(req.headers["x-api-key"] || "").trim();
}

/** Express middleware for /api/v1: checks the key and makes req.auth the admin who made it. */
async function authenticateApiKey(req, _res, next) {
  try {
    const raw = readKey(req);
    if (!raw) throw new AppError("Send your API key as: Authorization: Bearer gcrm_...", 401, null, "API_KEY_MISSING");
    if (!KEY_PATTERN.test(raw)) throw new AppError("This API key is not valid.", 401, null, "API_KEY_INVALID");

    const [rows] = await db.query(
      `SELECT TOP 1 k.key_id, k.company_id, k.name, k.scopes, k.expires_at, k.revoked_at, k.allowed_ips,
              u.user_id, u.id, u.name AS user_name, u.email, u.role, u.is_active, u.company_id AS user_company_id
       FROM developer_api_keys k LEFT JOIN users u ON u.user_id = k.created_by
       WHERE k.key_hash = ?`,
      [hashKey(raw)]
    );
    const key = rows[0];
    if (!key || key.revoked_at) throw new AppError("This API key is not valid or was revoked.", 401, null, "API_KEY_INVALID");
    req.developer = { kind: "api", companyId: key.company_id, sourceId: key.key_id, sourceName: key.name };
    if (key.expires_at && new Date(key.expires_at).getTime() <= Date.now()) {
      throw new AppError("This API key has expired. Create a new one on the Developer page.", 401, null, "API_KEY_EXPIRED");
    }
    if (!key.user_id || !key.is_active || key.role !== "admin" || key.user_company_id !== key.company_id) {
      throw new AppError("The admin who created this key is no longer active. Create a new key.", 401, null, "API_KEY_OWNER_INACTIVE");
    }
    if (!ipAllowed(String(key.allowed_ips || "").split(",").filter(Boolean), req.ip)) {
      throw new AppError(`This key cannot be used from ${String(req.ip || "").replace(/^::ffff:/, "")}. Add the address to the key on the Developer page.`, 403, null, "IP_NOT_ALLOWED");
    }
    if (!(await access.isEnabled(key.company_id))) {
      throw new AppError("Developer API is switched off for this company.", 403, null, "DEVELOPER_OFF");
    }

    req.apiKey = { keyId: key.key_id, name: key.name, scopes: String(key.scopes || "").split(",").filter(Boolean) };
    req.auth = {
      userId: key.user_id, id: key.id, companyId: key.company_id, email: key.email, name: key.user_name,
      role: key.role, managedCompanyIds: [], via: "api_key", __teamScopeCache: new Map(),
    };
    db.query(
      "UPDATE developer_api_keys SET last_used_at = SYSUTCDATETIME(), last_used_ip = ?, request_count = request_count + 1 WHERE key_id = ?",
      [String(req.ip || "").slice(0, 64), key.key_id]
    ).catch(() => {});
    next();
  } catch (error) {
    next(error);
  }
}

function requireScope(scope) {
  return (req, _res, next) => {
    if (req.apiKey?.scopes.includes(scope)) return next();
    return next(new AppError(`This key does not have the "${scope}" permission.`, 403, null, "SCOPE_MISSING"));
  };
}

module.exports = { EXPIRY_CHOICES, SCOPES, authenticateApiKey, createKey, hashKey, ipAllowed, listKeys, parseIps, parseScopes, requireScope, revokeKey, rollKey };
