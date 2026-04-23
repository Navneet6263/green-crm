const dashboardRepository = require("../repositories/dashboardRepository");
const { ROLES } = require("../constants/roles");
const { getAccessibleCompanyIds, isPlatformOperatorRole } = require("../utils/tenant");
const { parseRequestedTeamIds, resolveTeamScope } = require("./accessScopeService");

const dashboardCache = new Map();

function getAssignedViewerColumns(role) {
  if (role === ROLES.LEGAL_TEAM) {
    return ["assigned_to_legal", "assigned_to"];
  }

  if (role === ROLES.FINANCE_TEAM) {
    return ["assigned_to_finance", "assigned_to"];
  }

  return ["assigned_to"];
}

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

function buildScopeKey(teamIds) {
  if (!Array.isArray(teamIds)) {
    return "all";
  }

  if (!teamIds.length) {
    return "none";
  }

  return teamIds.slice().sort().join(",");
}

function buildCacheKey(auth, scopeKey = "all") {
  if (auth.role === ROLES.SUPER_ADMIN) {
    return "dashboard:platform";
  }

  if (isPlatformOperatorRole(auth.role)) {
    const companyKey = (getAccessibleCompanyIds(auth) || []).slice().sort().join(",");
    return `dashboard:platform:${auth.role}:${auth.userId}:${companyKey}`;
  }

  if ([ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)) {
    const identityKey = auth.role === ROLES.MANAGER ? `:${auth.userId}` : "";
    return `dashboard:company:${auth.companyId}:${auth.role}${identityKey}:${scopeKey}`;
  }

  if (auth.role === ROLES.SALES) {
    return `dashboard:user:${auth.companyId}:${auth.role}:${auth.userId}:assigned:${scopeKey}`;
  }

  if (auth.role === ROLES.MARKETING) {
    return `dashboard:user:${auth.companyId}:${auth.role}:${auth.userId}:assigned:${scopeKey}`;
  }

  return `dashboard:user:${auth.companyId}:${auth.role}:${auth.userId}:company:${scopeKey}`;
}

async function resolveDashboardTeamScope(auth, query = {}) {
  if (!auth.companyId) {
    return null;
  }

  const { teamIds } = await resolveTeamScope(auth, auth.companyId, parseRequestedTeamIds(query), {
    includeManaged: true,
    includeMembership: true,
  });

  return teamIds;
}

async function loadSummary(auth, query = {}) {
  if (auth.role === ROLES.SUPER_ADMIN) {
    return dashboardRepository.getPlatformSummary();
  }

  if (isPlatformOperatorRole(auth.role)) {
    return dashboardRepository.getPlatformSummary(getAccessibleCompanyIds(auth));
  }

  if ([ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)) {
    const teamIds = await resolveDashboardTeamScope(auth, query);
    return dashboardRepository.getCompanySummary(auth.companyId, teamIds);
  }

  if ([ROLES.SALES, ROLES.MARKETING, ROLES.LEGAL_TEAM, ROLES.FINANCE_TEAM, ROLES.SUPPORT, ROLES.VIEWER].includes(auth.role)) {
    const teamIds = await resolveDashboardTeamScope(auth, query);
    return dashboardRepository.getUserSummary({
      companyId: auth.companyId,
      userId: auth.userId,
      scope: "assigned",
      teamIds,
      viewerAccessColumns: getAssignedViewerColumns(auth.role),
    });
  }

  const teamIds = await resolveDashboardTeamScope(auth, query);
  return dashboardRepository.getUserSummary({
    companyId: auth.companyId,
    userId: auth.userId,
    scope: "company",
    teamIds,
  });
}

async function getSummary(auth, query = {}) {
  const ttlMs = getCacheTtlMs();
  const scopeKey = buildScopeKey(
    auth.companyId ? await resolveDashboardTeamScope(auth, query) : null
  );

  if (ttlMs === 0 || parseCacheControl(query.refresh) || parseCacheControl(query.fresh) || parseCacheControl(query.no_cache)) {
    return loadSummary(auth, query);
  }

  const cacheKey = buildCacheKey(auth, scopeKey);
  const cached = readCache(cacheKey);

  if (cached) {
    return cached;
  }

  const summary = await loadSummary(auth, query);
  writeCache(cacheKey, summary, ttlMs);
  return summary;
}

module.exports = {
  getSummary,
};
