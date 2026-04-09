const dashboardRepository = require("../repositories/dashboardRepository");
const { ROLES } = require("../constants/roles");
const { getAccessibleCompanyIds, isPlatformOperatorRole } = require("../utils/tenant");

const dashboardCache = new Map();

function parseCacheControl(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function getCacheTtlMs() {
  const ttlSeconds = Number(process.env.DASHBOARD_CACHE_TTL_SECONDS || 30);
  return Number.isFinite(ttlSeconds) ? Math.max(ttlSeconds, 0) * 1000 : 30000;
}

function readCache(key) {
  const entry = dashboardCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    dashboardCache.delete(key);
    return null;
  }

  return entry.value;
}

function writeCache(key, value, ttlMs) {
  dashboardCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function buildCacheKey(auth) {
  if (auth.role === ROLES.SUPER_ADMIN) {
    return "dashboard:platform";
  }

  if (isPlatformOperatorRole(auth.role)) {
    const companyKey = (getAccessibleCompanyIds(auth) || []).slice().sort().join(",");
    return `dashboard:platform:${auth.role}:${auth.userId}:${companyKey}`;
  }

  if ([ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)) {
    return `dashboard:company:${auth.companyId}:${auth.role}`;
  }

  if (auth.role === ROLES.SALES) {
    return `dashboard:user:${auth.companyId}:${auth.role}:${auth.userId}:created`;
  }

  if (auth.role === ROLES.MARKETING) {
    return `dashboard:user:${auth.companyId}:${auth.role}:${auth.userId}:created`;
  }

  return `dashboard:user:${auth.companyId}:${auth.role}:${auth.userId}:company`;
}

async function loadSummary(auth) {
  if (auth.role === ROLES.SUPER_ADMIN) {
    return dashboardRepository.getPlatformSummary();
  }

  if (isPlatformOperatorRole(auth.role)) {
    return dashboardRepository.getPlatformSummary(getAccessibleCompanyIds(auth));
  }

  if ([ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)) {
    return dashboardRepository.getCompanySummary(auth.companyId);
  }

  if (auth.role === ROLES.SALES) {
    return dashboardRepository.getUserSummary({
      companyId: auth.companyId,
      userId: auth.userId,
      scope: "created",
    });
  }

  if (auth.role === ROLES.MARKETING) {
    return dashboardRepository.getUserSummary({
      companyId: auth.companyId,
      userId: auth.userId,
      scope: "created",
    });
  }

  return dashboardRepository.getUserSummary({
    companyId: auth.companyId,
    userId: auth.userId,
    scope: "company",
  });
}

async function getSummary(auth, query = {}) {
  const ttlMs = getCacheTtlMs();

  if (ttlMs === 0 || parseCacheControl(query.refresh) || parseCacheControl(query.fresh) || parseCacheControl(query.no_cache)) {
    return loadSummary(auth);
  }

  const cacheKey = buildCacheKey(auth);
  const cached = readCache(cacheKey);

  if (cached) {
    return cached;
  }

  const summary = await loadSummary(auth);
  writeCache(cacheKey, summary, ttlMs);
  return summary;
}

module.exports = {
  getSummary,
};
