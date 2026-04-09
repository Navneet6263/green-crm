const DEFAULT_TTL_MS = 10_000;

const authStateCache = new Map();
const pendingAuthState = new Map();
const revokedAuthKeys = new Map();

function getTtlMs() {
  const parsed = Number(process.env.AUTH_CACHE_TTL_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_TTL_MS;
}

function pruneExpiredEntries(store) {
  const now = Date.now();

  for (const [key, entry] of store.entries()) {
    if (!entry || entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

function getAuthCacheKey(payload, token = "") {
  return payload?.jti || String(token || "");
}

function getExpiryTime(expSeconds) {
  const ttlMs = getTtlMs();
  const ttlExpiry = Date.now() + ttlMs;

  if (!expSeconds) {
    return ttlExpiry;
  }

  return Math.min(ttlExpiry, Number(expSeconds) * 1000);
}

function isAuthKeyRevoked(key) {
  if (!key) {
    return false;
  }

  pruneExpiredEntries(revokedAuthKeys);
  return revokedAuthKeys.has(key);
}

function rememberRevokedAuthKey(key, expSeconds) {
  if (!key) {
    return;
  }

  const expiresAt = getExpiryTime(expSeconds);
  revokedAuthKeys.set(key, { expiresAt });
  authStateCache.delete(key);
  pendingAuthState.delete(key);
}

function getCachedAuthState(key) {
  if (!key) {
    return null;
  }

  pruneExpiredEntries(authStateCache);
  return authStateCache.get(key)?.value || null;
}

function cacheAuthState(key, value, expSeconds) {
  if (!key || !value || getTtlMs() === 0) {
    return;
  }

  authStateCache.set(key, {
    value,
    expiresAt: getExpiryTime(expSeconds),
  });
}

function getPendingAuthState(key) {
  return key ? pendingAuthState.get(key) || null : null;
}

function setPendingAuthState(key, promise) {
  if (!key || !promise) {
    return;
  }

  pendingAuthState.set(key, promise);
}

function clearPendingAuthState(key, promise) {
  if (!key) {
    return;
  }

  if (!promise || pendingAuthState.get(key) === promise) {
    pendingAuthState.delete(key);
  }
}

module.exports = {
  cacheAuthState,
  clearPendingAuthState,
  getAuthCacheKey,
  getCachedAuthState,
  getPendingAuthState,
  isAuthKeyRevoked,
  rememberRevokedAuthKey,
  setPendingAuthState,
};
